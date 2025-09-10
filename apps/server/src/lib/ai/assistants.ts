import { Document } from '@langchain/core/documents';
import { StateGraph } from '@langchain/langgraph';
import { CallbackHandler } from 'langfuse-langchain';

import {
  DatabaseAttributes,
  getNodeModel,
  RecordAttributes,
} from '@colanode/core';
import { database } from '@colanode/server/data/database';
import { SelectNode } from '@colanode/server/data/schema';
import { retrieveDocuments } from '@colanode/server/lib/ai/document-retrievals';
import {
  rewriteQuery,
  assessUserIntent,
  generateNoContextAnswer,
  rerankDocuments,
  generateFinalAnswer,
  generateDatabaseFilters,
} from '@colanode/server/lib/ai/llms';
import { fetchMetadataForContextItems } from '@colanode/server/lib/ai/metadata';
import { retrieveNodes } from '@colanode/server/lib/ai/node-retrievals';
import {
  formatChatHistory,
  formatContextDocuments,
  selectTopContext,
  formatMetadataForPrompt,
} from '@colanode/server/lib/ai/utils';
import { config } from '@colanode/server/lib/config';
import { fetchNode, fetchNodeDescendants } from '@colanode/server/lib/nodes';
import { retrieveByFilters } from '@colanode/server/lib/records';
import {
  AssistantChainState,
  ResponseState,
  DatabaseFilters,
  DatabaseContextItem,
  AssistantResponse,
  AssistantInput,
} from '@colanode/server/types/assistant';

/**
 * AI Assistant Chain
 * 
 * This module implements the main AI assistant using LangChain's StateGraph.
 * It orchestrates the entire process of:
 * 1. Query rewriting for better context retrieval
 * 2. Intent assessment to understand user needs
 * 3. Context retrieval from nodes, documents, and databases
 * 4. Document reranking for relevance
 * 5. Response generation with citations
 * 
 * The assistant uses a state graph approach to process user queries:
 * - State Management: Maintains conversation context and intermediate results
 * - Parallel Processing: Some steps can be executed in parallel for efficiency
 * - Conditional Logic: Different paths based on user intent and available context
 * 
 * Data Flow:
 * User Input -> Query Rewriting -> Intent Assessment -> Context Retrieval -> 
 * Document Reranking -> Response Generation -> Citation Extraction -> Final Output
 * 
 * Key Components:
 * - Query Rewriter: Improves search queries for better context retrieval
 * - Intent Classifier: Determines if the query requires context or is general knowledge
 * - Context Retriever: Finds relevant nodes, documents, and database records
 * - Document Reranker: Prioritizes context items by relevance
 * - Response Generator: Creates the final AI response with context
 * - Citation Extractor: Identifies source materials referenced in the response
 * 
 * Interaction with Chat Service:
 * 
 * The AI assistant is invoked by the chat service (chats.ts and chats-streaming.ts)
 * when a user sends a message. The interaction flow is:
 * 
 * 1. Chat Service receives user message
 * 2. Chat Service stores user message in database
 * 3. Chat Service calls runAssistantResponseChain() with user input and context
 * 4. AI Assistant processes the input through its state graph
 * 5. AI Assistant returns final response and citations
 * 6. Chat Service stores AI response in database
 * 7. Chat Service returns both messages to client
 * 
 * Data Flow Diagram:
 * 
 * ```text
 * [Chat Service]          [AI Assistant Chain]
 *        │                        │
 *        │  userInput, context    │
 *        └────────────────────────→
 *        │                        │
 *        │  finalAnswer, citations│
 *        ←────────────────────────┘
 *        │                        │
 * [Database]              [LLM Providers]
 * ```
 * 
 * The assistant is designed to be stateless between calls, with all
 * necessary context passed in through the input parameters.
 */

const generateRewrittenQuery = async (state: AssistantChainState) => {
  const rewrittenQuery = await rewriteQuery(state.userInput);
  return { rewrittenQuery };
};

const assessIntent = async (state: AssistantChainState) => {
  const chatHistory = formatChatHistory(state.chatHistory);
  const intent = await assessUserIntent(state.userInput, chatHistory);
  return { intent };
};

const generateNoContextResponse = async (state: AssistantChainState) => {
  const chatHistory = formatChatHistory(state.chatHistory);
  const finalAnswer = await generateNoContextAnswer(
    state.userInput,
    chatHistory
  );
  return { finalAnswer };
};

const fetchContextDocuments = async (state: AssistantChainState) => {
  if (!config.ai.enabled) {
    return { contextDocuments: [] };
  }

  const [nodeResults, documentResults] = await Promise.all([
    retrieveNodes(
      state.rewrittenQuery,
      state.workspaceId,
      state.userId,
      config.ai.retrieval.hybridSearch.maxResults,
      state.selectedContextNodeIds
    ),
    retrieveDocuments(
      state.rewrittenQuery,
      state.workspaceId,
      state.userId,
      config.ai.retrieval.hybridSearch.maxResults,
      state.selectedContextNodeIds
    ),
  ]);
  let databaseResults: Document[] = [];
  if (state.databaseFilters.shouldFilter) {
    const filteredRecords = await Promise.all(
      state.databaseFilters.filters.map(async (filter) => {
        const records = await retrieveByFilters(
          filter.databaseId,
          state.workspaceId,
          state.userId,
          { filters: filter.filters, sorts: [], page: 1, count: 10 }
        );
        const dbNode = await fetchNode(filter.databaseId);
        if (!dbNode || dbNode.type !== 'database') return [];
        return records.map((record) => {
          const fields = Object.entries(
            (record.attributes as RecordAttributes).fields || {}
          )
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          const content = `Database Record from ${dbNode.type === 'database' ? (dbNode.attributes as DatabaseAttributes).name || 'Database' : 'Database'}:\n${fields}`;
          return new Document({
            pageContent: content,
            metadata: {
              id: record.id,
              type: 'record',
              createdAt: record.created_at,
              author: record.created_by,
              databaseId: filter.databaseId,
            },
          });
        });
      })
    );
    databaseResults = filteredRecords.flat();
  }
  return {
    contextDocuments: [...nodeResults, ...documentResults, ...databaseResults],
  };
};

const fetchChatHistory = async (state: AssistantChainState) => {
  const messages = await database
    .selectFrom('nodes')
    .where('parent_id', '=', state.parentMessageId)
    .where('type', '=', 'message')
    .where('id', '!=', state.currentMessageId)
    .where('workspace_id', '=', state.workspaceId)
    .orderBy('created_at', 'asc')
    .selectAll()
    .execute();
  const chatHistory = messages.map((message) => {
    const isAI = message.created_by === 'colanode_ai';
    const extracted = (message &&
      message.attributes &&
      getNodeModel(message.type)?.extractText(
        message.id,
        message.attributes
      )) || { attributes: '' };
    const text = extracted.attributes;
    return new Document({
      pageContent: text || '',
      metadata: {
        id: message.id,
        type: 'message',
        createdAt: message.created_at,
        author: message.created_by,
        authorName: isAI ? 'Colanode AI' : 'User',
      },
    });
  });

  return { chatHistory };
};

const rerankContextDocuments = async (state: AssistantChainState) => {
  const docsForRerank = state.contextDocuments.map((doc) => ({
    content: doc.pageContent,
    type: doc.metadata.type,
    sourceId: doc.metadata.id,
  }));
  const rerankedContext = await rerankDocuments(
    docsForRerank,
    state.rewrittenQuery.semanticQuery
  );

  return { rerankedContext };
};

const selectRelevantDocuments = async (state: AssistantChainState) => {
  if (state.rerankedContext.length === 0) {
    return { topContext: [] };
  }

  const maxContext = 10;
  const topContext = selectTopContext(
    state.rerankedContext,
    maxContext,
    state.contextDocuments
  );

  const contextItemsWithType = topContext.map((doc) => ({
    id: doc.metadata.id,
    type: doc.metadata.type,
  }));

  const metadata = await fetchMetadataForContextItems(contextItemsWithType);

  topContext.forEach((doc) => {
    const id = doc.metadata.id;
    if (metadata[id]) {
      doc.metadata.formattedMetadata = formatMetadataForPrompt(metadata[id]);
    }
  });

  return { topContext };
};

const fetchWorkspaceDetails = async (workspaceId: string) => {
  return database
    .selectFrom('workspaces')