import { generateId, IdType } from '@colanode/core';
import { database } from '@colanode/server/data/database';
import { CreateChatMessage } from '@colanode/server/data/schema';
import { runAssistantResponseChain } from '@colanode/server/lib/ai/assistants';
import { OpenRouterLLM } from '@colanode/server/lib/ai/providers/openrouter';
import { config } from '@colanode/server/lib/config';
import { fetchNodeDescendants } from '@colanode/server/lib/nodes';
import { socketService } from '@colanode/server/services/socket-service';
import { SendMessageInput, ChatMessage, ProviderConfig } from '@colanode/server/types/chat';

/**
 * Streaming Chat Service
 * 
 * This module extends the basic chat functionality to support real-time streaming
 * of AI responses. It's particularly useful for chat applications where users
 * should see responses as they are being generated.
 * 
 * Relationship to Regular Chat Functions:
 * This module works in conjunction with the regular chat functions in chats.ts.
 * While chats.ts handles standard request/response interactions, this module
 * provides real-time streaming capabilities for a more interactive user experience.
 * 
 * Key Differences from Regular Chat:
 * 1. Real-time response streaming via WebSocket
 * 2. Direct integration with streaming-capable LLM providers (like OpenRouter)
 * 3. Immediate feedback to users as responses are generated
 * 4. Callback-based architecture for handling response chunks
 * 
 * Integration Flow:
 * 1. User sends message through WebSocket
 * 2. User message is stored in database (same as regular chat)
 * 3. If using streaming provider, stream response chunks to client
 * 4. If using regular provider, generate full response and send to client
 * 5. Assistant message is stored in database (same as regular chat)
 * 
 * Data Flow:
 * Client -> WebSocket -> Chat Streaming Service -> AI Assistant/LLM -> 
 * Streaming Response Chunks -> Client (real-time) -> 
 * Complete Response -> Database Storage
 */

/**
 * Send a message with streaming AI response
 * 
 * This function handles sending messages with real-time streaming responses.
 * It supports both streaming providers (like OpenRouter) and regular providers.
 * 
 * For streaming providers:
 * - Streams response chunks directly to the client via callback
 * - Stores the complete response in the database after streaming completes
 * 
 * For regular providers:
 * - Generates the full response using the standard assistant chain
 * - Sends the complete response to the client via callback
 * 
 * Relationship to chats.ts:
 * This function parallels the sendMessage function in chats.ts but adds
 * streaming capabilities. Both functions:
 * - Store user messages in the database
 * - Generate AI responses
 * - Store assistant messages in the database
 * - Return both user and assistant messages
 * 
 * The key difference is that this function can stream responses in real-time
 * for supported providers, while chats.ts always returns complete responses.
 * 
 * @param input - Message sending parameters
 * @param callback - Function to call with response chunks and completion status
 * @returns Promise resolving to both the user and assistant messages
 */
export const sendMessageWithStreaming = async (
  input: SendMessageInput,
  callback: (chunk: string, done: boolean) => void
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

  // Create assistant message placeholder
  const assistantMessageId = generateId(IdType.Message);
  let assistantContent = '';

  // Get full context if contextNodeIds provided
  let fullContextNodeIds: string[] = [];
  if (input.contextNodeIds && input.contextNodeIds.length > 0) {
    fullContextNodeIds = await getFullContextNodeIds(input.contextNodeIds);
  }

  try {
    const providerConfig = input.providerOverride;
    
    // If using a streaming provider like OpenRouter, handle streaming
    if (providerConfig?.provider === 'openrouter' && config.ai.providers.openrouter.enabled) {
      const openRouterConfig = {
        apiKey: config.ai.providers.openrouter.apiKey,
        model: providerConfig.model,
        temperature: providerConfig.temperature,
      };

      const openRouterLLM = new OpenRouterLLM(openRouterConfig);
      
      // Create formatted messages for the LLM
      const messages = [
        {
          role: 'user' as const,
          content: input.content,
        },
      ];

      const baseMessages = messages.map(msg => ({
        content: msg.content,
        additional_kwargs: {},
        response_metadata: {},
        type: 'human' as const,
        name: undefined,
        id: undefined,
      }));

      // Stream the response
      for await (const chunk of openRouterLLM.stream(baseMessages)) {
        assistantContent += chunk;
        callback(chunk, false);
      }
      
      callback('', true); // Signal completion
    } else {
      // Use existing assistant response chain for non-streaming providers
      const chainResult = await runAssistantResponseChain({
        userInput: input.content,
        workspaceId: await getWorkspaceIdFromChat(input.chatId),
        userId: input.userId,
        userDetails: await getUserDetails(input.userId),
        selectedContextNodeIds: fullContextNodeIds,
      });

      assistantContent = chainResult.finalAnswer;
      callback(assistantContent, true);
    }

    // Save the completed assistant message
    const assistantMessageData: CreateChatMessage = {
      id: assistantMessageId,
      chat_id: input.chatId,
      parent_id: userMessageId,
      type: 'assistant',
      content: assistantContent,
      context_node_ids: fullContextNodeIds.length > 0 ? JSON.stringify(fullContextNodeIds) : null,
      provider_used: providerConfig?.provider,
      model_used: providerConfig?.model,
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
    const errorContent = 'Sorry, I encountered an error while processing your request. Please try again.';
    callback(errorContent, true);

    const errorMessageData: CreateChatMessage = {
      id: assistantMessageId,
      chat_id: input.chatId,
      parent_id: userMessageId,
      type: 'assistant',
      content: errorContent,
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

// Helper functions
const selectChatMessageToMessage = (message: any): ChatMessage => ({
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

const getWorkspaceIdFromChat = async (chatId: string): Promise<string> => {
  const chat = await database
    .selectFrom('chats')
    .where('id', '=', chatId)
    .select('workspace_id')
    .executeTakeFirst();
  
  if (!chat) {
    throw new Error('Chat not found');
  }
  
  return chat.workspace_id;
};