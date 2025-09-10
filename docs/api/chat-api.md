# Chat API Documentation

This document provides detailed information about the Chat API endpoints available in Colanode. These endpoints allow you to create chat sessions, send messages, and manage chat context.

## Base URL

All endpoints are relative to the server's base URL.

## Authentication

All chat endpoints require authentication via a valid JWT token passed in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Chat Management Endpoints

### Create a New Chat Session

Creates a new chat session within a workspace.

**Endpoint**: `POST /v1/workspaces/{workspaceId}/chats`

**Permissions**: Requires `write` permission in the workspace.

#### Request

```typescript
interface CreateChatRequest {
  name?: string; // Optional name for the chat session
  contextNodeIds?: string[]; // Optional array of node IDs to use as context
  providerConfig?: { // Optional provider configuration
    provider: string; // Provider name (openai, google, openrouter)
    model: string; // Model name
    temperature?: number; // Optional temperature parameter
  };
}
```

#### Response

```typescript
interface CreateChatResponse {
  id: string; // Unique identifier for the chat session
  name: string; // Name of the chat session
  workspaceId: string; // ID of the workspace containing the chat
  createdAt: string; // ISO 8601 timestamp of creation
  contextNodeIds: string[]; // Array of context node IDs
}
```

#### Example

```bash
curl -X POST "https://your-colanode-server.com/v1/workspaces/ws123/chats" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Planning Discussion",
    "contextNodeIds": ["node1", "node2"],
    "providerConfig": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.7
    }
  }'
```

### List Chat Sessions

Lists all chat sessions in a workspace.

**Endpoint**: `GET /v1/workspaces/{workspaceId}/chats`

**Permissions**: Requires membership in the workspace.

#### Response

```typescript
interface ListChatsResponse {
  chats: Array<{
    id: string; // Unique identifier for the chat session
    name: string; // Name of the chat session
    lastMessageAt?: string; // ISO 8601 timestamp of last message
    messageCount: number; // Total number of messages in the chat
  }>;
}
```

### Get Chat Details

Gets details about a specific chat session.

**Endpoint**: `GET /v1/chats/{chatId}`

**Permissions**: Requires membership in the workspace containing the chat.

#### Response

```typescript
interface GetChatResponse {
  id: string;
  workspaceId: string;
  name: string;
  contextNodeIds: string[];
  providerConfig: {
    provider: string;
    model: string;
    temperature?: number;
  };
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
```

## Message Management Endpoints

### Send a Message to Chat

Sends a message to a chat session and receives an AI response.

**Endpoint**: `POST /v1/chats/{chatId}/messages`

**Permissions**: Requires `write` permission in the workspace.

#### Request

```typescript
interface SendMessageRequest {
  content: string; // The message content
  contextNodeIds?: string[]; // Optional array of additional context node IDs
  providerOverride?: { // Optional provider override for this message
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}
```

#### Response

```typescript
interface SendMessageResponse {
  userMessage: {
    id: string;
    chatId: string;
    type: 'user';
    content: string;
    contextNodeIds?: string[];
    createdAt: string;
    createdBy: string;
  };
  assistantMessage?: {
    id: string;
    chatId: string;
    type: 'assistant';
    content: string;
    contextNodeIds?: string[];
    citations?: Array<{
      sourceId: string;
      sourceType: 'document' | 'node' | 'record';
      quote: string;
      relevanceScore: number;
    }>;
    providerUsed?: string;
    modelUsed?: string;
    createdAt: string;
    createdBy: string;
  };
}
```

### Get Chat Message History

Retrieves the message history for a chat session.

**Endpoint**: `GET /v1/chats/{chatId}/messages[?limit=50][&before=messageId]`

**Permissions**: Requires membership in the workspace.

#### Query Parameters

- `limit` (optional): Maximum number of messages to return (default: 50)
- `before` (optional): Return messages before this message ID

#### Response

```typescript
interface GetMessagesResponse {
  messages: Array<{
    id: string;
    chatId: string;
    parentId?: string;
    type: 'user' | 'assistant';
    content: string;
    contextNodeIds?: string[];
    citations?: Array<{
      sourceId: string;
      sourceType: 'document' | 'node' | 'record';
      quote: string;
      relevanceScore: number;
    }>;
    providerUsed?: string;
    modelUsed?: string;
    createdAt: string;
    createdBy: string;
  }>;
}
```

## Provider Configuration Endpoints

### List Available AI Providers

Lists all available AI providers and their capabilities.

**Endpoint**: `GET /v1/ai/providers`

**Permissions**: Requires authentication.

#### Response

```typescript
interface ProvidersResponse {
  providers: Array<{
    id: string; // Provider identifier
    name: string; // Human-readable name
    enabled: boolean; // Whether the provider is enabled
    models: string[]; // Available models
    capabilities: string[]; // Provider capabilities (chat, embedding, etc.)
  }>;
}
```

### Update Provider Configuration

Updates the configuration for a specific AI provider.

**Endpoint**: `PUT /v1/ai/providers/{providerId}/config`

**Permissions**: Requires admin permissions.

#### Request

```typescript
interface UpdateProviderRequest {
  enabled: boolean; // Whether to enable the provider
  apiKey?: string; // API key for the provider
  baseUrl?: string; // Base URL for the provider (if applicable)
  defaultModel?: string; // Default model to use
}
```

## Error Responses

All endpoints may return the following error responses:

- `400 Bad Request`: Invalid input or request format
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses follow this format:

```typescript
interface ErrorResponse {
  code: string; // Error code
  message: string; // Human-readable error message
}
```