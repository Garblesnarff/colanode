import { generateId, IdType } from '@colanode/core';
import { database } from '@colanode/server/data/database';
import { SelectChat, SelectChatMessage, CreateChat, CreateChatMessage } from '@colanode/server/data/schema';
import { runAssistantResponseChain } from '@colanode/server/lib/ai/assistants';
import { config } from '@colanode/server/lib/config';
import { fetchNode, fetchNodeDescendants } from '@colanode/server/lib/nodes';
import { 
  ChatCreateInput, 
  ChatSession, 
  SendMessageInput, 
  ChatMessage, 
  ChatResponse,
  ProviderConfig 
} from '@colanode/server/types/chat';

/**
 * Chat Management System
 * 
 * This module provides the core functionality for managing chat sessions and messages
 * in Colanode. It handles:
 * - Creating and retrieving chat sessions
 * - Sending messages and getting AI responses
 * - Managing chat context and history
 * 
 * Integration with AI System:
 * When a user sends a message, this module:
 * 1. Stores the user's message in the database
 * 2. Calls the AI assistant system (runAssistantResponseChain) to generate a response
 * 3. Stores the AI response in the database
 * 4. Returns both messages to the client
 * 
 * The chat service acts as the primary interface between user interactions and AI processing.
 * It handles all data persistence for chat sessions and messages, ensuring that conversations
 * are maintained across sessions and devices.
 * 
 * Data Flow:
 * Client -> API Routes -> Chat Service -> AI Assistant -> LLM Providers -> Chat Service -> Database -> Client
 * 
 * Key Responsibilities:
 * - Session Management: Create, retrieve, and update chat sessions
 * - Message Processing: Handle user messages and AI responses
 * - Context Management: Maintain and update chat context
 * - Data Persistence: Store all chat data in the database
 * - Error Handling: Gracefully handle AI processing errors
 * 
 * Data Flow Diagram:
 * 
 * ```text
 * User Input
 *     ↓
 * [Chat Service] → [Database: Store User Message]
 *     ↓
 * [AI Assistant Chain] ←→ [Context Retrieval]
 *     ↓                       ↑
 * [LLM Providers] ←───────────┘
 *     ↓
 * [Database: Store AI Response]
 *     ↓
 * Response to Client
 * ```
 * 
 * Component Interaction:
 * 
 * ```text
 * Client
 *    ↓ ↑
 * API Routes
 *    ↓ ↑
 * Chat Service ◎─────────→ Database
 *    ↓ ↑                    ↑ ↓
 * AI Assistant ← Context Retrieval
 *    ↓ ↑
 * LLM Providers
 * ```
 */

/**
 * Create a new chat session
 * 
 * This function creates a new chat session in the database with the provided configuration.
 * If no provider configuration is provided, it defaults to OpenAI's gpt-4o-mini model.
 * 
 * @param input - Chat creation parameters including workspace ID, name, and context
 * @param userId - ID of the user creating the chat
 * @returns Promise resolving to the created chat session
 */
export const createChat = async (
  input: ChatCreateInput,
  userId: string
): Promise<ChatSession> => {
  const id = generateId(IdType.Node); // Using existing ID generation
  
  const defaultProviderConfig: ProviderConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  };

  const chatData: CreateChat = {
    id,
    workspace_id: input.workspaceId,
    name: input.name || `Chat ${new Date().toISOString().split('T')[0]}`,
    context_node_ids: input.contextNodeIds || [],
    provider_config: JSON.stringify(input.providerConfig || defaultProviderConfig),
    created_at: new Date(),
    created_by: userId,
  };

  const result = await database
    .insertInto('chats')
    .values(chatData)
    .returningAll()
    .executeTakeFirstOrThrow();

  return selectChatToSession(result);
};

/**
 * Get chat session by ID
 * 
 * Retrieves a chat session from the database by its ID and workspace ID.
 * 
 * @param chatId - ID of the chat session to retrieve
 * @param workspaceId - ID of the workspace containing the chat
 * @returns Promise resolving to the chat session or null if not found
 */
export const getChatById = async (
  chatId: string,
  workspaceId: string
): Promise<ChatSession | null> => {
  const result = await database
    .selectFrom('chats')
    .where('id', '=', chatId)
    .where('workspace_id', '=', workspaceId)
    .selectAll()
    .executeTakeFirst();

  return result ? selectChatToSession(result) : null;
};

/**
 * List chats for a workspace
 * 
 * Retrieves all chat sessions in a workspace, ordered by most recently updated.
 * 
 * @param workspaceId - ID of the workspace
 * @param userId - ID of the user requesting the list
 * @param limit - Maximum number of chats to return (default: 50)
 * @returns Promise resolving to an array of chat sessions
 */
export const listChatsInWorkspace = async (
  workspaceId: string,
  userId: string,
  limit: number = 50
): Promise<ChatSession[]> => {
  const results = await database
    .selectFrom('chats')
    .where('workspace_id', '=', workspaceId)
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .selectAll()
    .execute();

  return results.map(selectChatToSession);
};

/**
 * Send a message in a chat and get AI response
 * 
 * This is the core function for chat interactions. It:
 * 1. Stores the user's message in the database
 * 2. Expands the context with descendant nodes if needed
 * 3. Calls the AI assistant system to generate a response
 * 4. Stores the AI response in the database
 * 5. Returns both messages to the client
 * 
 * @param input - Message sending parameters including chat ID, content, and context
 * @returns Promise resolving to both the user and assistant messages
 */
export const sendMessage = async (
  input: SendMessageInput
): Promise<{ userMessage: ChatMessage; assistantMessage?: ChatMessage }> => {
  if (!config.ai.enabled) {
    throw new Error('AI is not enabled');
  }

  // Create user message
  const userMessageId = generateId(IdType.Message);
  const userMessageData: CreateChatMessage = {
    id: userMessageId,
    chat_id: input.chatId,
    type: 'user',
    content: input.content,
    context_node_ids: input.contextNodeIds ? JSON.stringify(input.contextNodeIds) : null,
    created_at: new Date(),
    created_by: input.userId,
  };

  const userMessage = await database
    .insertInto('chat_messages')
    .values(userMessageData)
    .returningAll()
    .executeTakeFirstOrThrow();

  // Get full context if contextNodeIds provided
  let fullContextNodeIds: string[] = [];
  if (input.contextNodeIds && input.contextNodeIds.length > 0) {
    fullContextNodeIds = await getFullContextNodeIds(input.contextNodeIds);
  }

  try {
    // Get AI response using existing assistant response chain
    const chainResult = await runAssistantResponseChain({
      userInput: input.content,
      workspaceId: (await getChatById(input.chatId, '')).workspaceId, // We need workspace from chat
      userId: input.userId,
      userDetails: await getUserDetails(input.userId),
      selectedContextNodeIds: fullContextNodeIds,
    });

    // Create assistant message
    const assistantMessageId = generateId(IdType.Message);
    const assistantMessageData: CreateChatMessage = {
      id: assistantMessageId,
      chat_id: input.chatId,
      parent_id: userMessageId,
      type: 'assistant',
      content: chainResult.finalAnswer,
      context_node_ids: fullContextNodeIds.length > 0 ? JSON.stringify(fullContextNodeIds) : null,
      citations: chainResult.citations ? JSON.stringify(chainResult.citations) : null,
      provider_used: input.providerOverride?.provider,
      model_used: input.providerOverride?.model,
      created_at: new Date(),
      created_by: 'colanode_ai',
    };

    const assistantMessage = await database
      .insertInto('chat_messages')
      .values(assistantMessageData)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      userMessage: selectChatMessageToMessage(userMessage),
      assistantMessage: selectChatMessageToMessage(assistantMessage),
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Create error message
    const errorMessageId = generateId(IdType.Message);
    const errorMessageData: CreateChatMessage = {
      id: errorMessageId,
      chat_id: input.chatId,
      parent_id: userMessageId,
      type: 'assistant',
      content: 'Sorry, I encountered an error while processing your request. Please try again.',
      created_at: new Date(),
      created_by: 'colanode_ai',
    };

    const errorMessage = await database
      .insertInto('chat_messages')
      .values(errorMessageData)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      userMessage: selectChatMessageToMessage(userMessage),
      assistantMessage: selectChatMessageToMessage(errorMessage),
    };
  }
};

/**
 * Get chat message history
 * 
 * Retrieves message history for a chat session, optionally paginated.
 * 
 * @param chatId - ID of the chat session
 * @param limit - Maximum number of messages to return (default: 50)
 * @param before - Return messages before this message ID (for pagination)
 * @returns Promise resolving to an array of chat messages
 */
export const getChatMessages = async (
  chatId: string,
  limit: number = 50,
  before?: string
): Promise<ChatMessage[]> => {
  let query = database
    .selectFrom('chat_messages')
    .where('chat_id', '=', chatId)
    .orderBy('created_at', 'desc');

  if (before) {
    const beforeDate = await database
      .selectFrom('chat_messages')
      .where('id', '=', before)
      .select('created_at')
      .executeTakeFirst();
    
    if (beforeDate) {
      query = query.where('created_at', '<', beforeDate.created_at);
    }
  }

  const results = await query.limit(limit).selectAll().execute();
  
  return results.reverse().map(selectChatMessageToMessage);
};

/**
 * Update chat context
 * 
 * Updates the context node IDs associated with a chat session.
 * 
 * @param chatId - ID of the chat session to update
 * @param contextNodeIds - Array of node IDs to use as context
 * @param userId - ID of the user making the update
 * @returns Promise resolving when the update is complete
 */
export const updateChatContext = async (
  chatId: string,
  contextNodeIds: string[],
  userId: string
): Promise<void> => {
  await database
    .updateTable('chats')
    .set({
      context_node_ids: JSON.stringify(contextNodeIds),
      updated_at: new Date(),
      updated_by: userId,
    })
    .where('id', '=', chatId)
    .execute();
};

// Helper functions
const selectChatToSession = (chat: SelectChat): ChatSession => ({
  id: chat.id,
  workspaceId: chat.workspace_id,
  name: chat.name,
  contextNodeIds: chat.context_node_ids as string[],
  providerConfig: JSON.parse(chat.provider_config as string),
  createdAt: chat.created_at,
  createdBy: chat.created_by,
  updatedAt: chat.updated_at || undefined,
  updatedBy: chat.updated_by || undefined,
});

const selectChatMessageToMessage = (message: SelectChatMessage): ChatMessage => ({
  id: message.id,
  chatId: message.chat_id,
  parentId: message.parent_id || undefined,
  type: message.type,
  content: message.content,
  contextNodeIds: message.context_node_ids ? JSON.parse(message.context_node_ids as string) : undefined,
  citations: message.citations ? JSON.parse(message.citations as string) : undefined,
  providerUsed: message.provider_used || undefined,
  modelUsed: message.model_used || undefined,
  createdAt: message.created_at,
  createdBy: message.created_by,
});

const getFullContextNodeIds = async (selectedIds: string[]): Promise<string[]> => {
  const fullSet = new Set<string>();
  for (const id of selectedIds) {
    fullSet.add(id);
    try {
      const descendants = await fetchNodeDescendants(id);
      descendants.forEach((descId) => fullSet.add(descId));
    } catch (error) {
      console.error(`Error fetching descendants for node ${id}:`, error);
    }
  }
  return Array.from(fullSet);
};

const getUserDetails = async (userId: string) => {
  const user = await database
    .selectFrom('users')
    .where('id', '=', userId)
    .select(['name', 'email'])
    .executeTakeFirst();
  
  return {
    name: user?.name || 'User',
    email: user?.email || '',
  };
};