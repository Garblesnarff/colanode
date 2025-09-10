export interface ProviderConfig {
  provider: 'openai' | 'google' | 'openrouter';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface OpenRouterConfig extends ProviderConfig {
  provider: 'openrouter';
  httpReferer?: string;
  xTitle?: string;
}

export interface ChatCreateInput {
  workspaceId: string;
  name?: string;
  contextNodeIds?: string[];
  providerConfig?: ProviderConfig;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  parentId?: string;
  type: 'user' | 'assistant';
  content: string;
  contextNodeIds?: string[];
  citations?: Citation[];
  providerUsed?: string;
  modelUsed?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Citation {
  sourceId: string;
  sourceType: 'document' | 'node' | 'record';
  quote: string;
  relevanceScore: number;
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  name: string;
  contextNodeIds: string[];
  providerConfig: ProviderConfig;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SendMessageInput {
  chatId: string;
  content: string;
  contextNodeIds?: string[];
  providerOverride?: ProviderConfig;
  userId: string;
}

export interface ChatResponse {
  messageId: string;
  content: string;
  citations?: Citation[];
}

export interface ChatProvider {
  id: string;
  name: string;
  enabled: boolean;
  models: string[];
  capabilities: ('chat' | 'embedding' | 'function_calling' | 'vision')[];
}

export interface ChatContextItem {
  nodeId: string;
  content: string;
  type: 'document' | 'node' | 'record';
  metadata: Record<string, any>;
}