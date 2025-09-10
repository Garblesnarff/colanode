# AI Chat Integration

This document describes the AI chat integration in Colanode, which provides contextual AI assistance by leveraging the workspace's knowledge base including documents, nodes, and database records.

## Features

### Multi-Provider Support
- **OpenAI**: GPT-4o, GPT-4o-mini, and other OpenAI models
- **Google Gemini**: Gemini Pro and other Google models  
- **OpenRouter**: Access to Claude, Llama, and other models via OpenRouter

### Contextual AI Assistance
- **Smart Context Retrieval**: AI queries automatically find relevant content from your workspace
- **Hybrid Search**: Combines semantic and keyword search for better context matching
- **Citation Support**: AI responses include citations showing source material
- **Expandable Context**: Automatically includes descendant nodes when you select parent nodes

### Real-time Chat
- **WebSocket Integration**: Real-time message delivery and streaming responses
- **Provider Switching**: Change AI providers per conversation or per message
- **Streaming Responses**: See AI responses as they're generated (OpenRouter support)

## Configuration

### Environment Variables

See `.env.ai-chat.example` for full configuration. Key variables:

```bash
# Enable AI features
AI_ENABLED=true

# Provider Configuration
OPENAI_ENABLED=true
OPENAI_API_KEY=your_openai_key

GOOGLE_ENABLED=true
GOOGLE_API_KEY=your_google_key

OPENROUTER_ENABLED=true
OPENROUTER_API_KEY=your_openrouter_key

# Default Model Configuration
RESPONSE_PROVIDER=openai
RESPONSE_MODEL=gpt-4o-mini
RESPONSE_TEMPERATURE=0.7
```

### Supported Models

#### OpenAI
- `gpt-4o` - Latest GPT-4 Omni model
- `gpt-4o-mini` - Faster, cost-effective option
- `gpt-4-turbo` - High-performance model
- `gpt-3.5-turbo` - Fast and economical

#### Google Gemini
- `gemini-1.5-pro` - Advanced reasoning and long context
- `gemini-1.5-flash` - Fast responses
- `gemini-pro` - Balanced performance

#### OpenRouter
- `anthropic/claude-3.5-sonnet` - Advanced reasoning
- `meta-llama/llama-3.1-70b-instruct` - Open source option
- `mistralai/mixtral-8x7b-instruct` - Efficient multilingual
- And 100+ other models available via OpenRouter

## API Endpoints

### Chat Management

#### Create Chat Session
```http
POST /v1/workspaces/{workspaceId}/chats
Content-Type: application/json

{
  "name": "My AI Chat",
  "contextNodeIds": ["node1", "node2"],
  "providerConfig": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7
  }
}
```

#### Send Message
```http
POST /v1/workspaces/{workspaceId}/chats/{chatId}/messages
Content-Type: application/json

{
  "content": "What is this document about?",
  "contextNodeIds": ["doc123"],
  "providerOverride": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  }
}
```

#### Get Chat History
```http
GET /v1/workspaces/{workspaceId}/chats/{chatId}/messages?limit=50&before=msgId
```

#### List Chats
```http
GET /v1/workspaces/{workspaceId}/chats?limit=20
```

#### Update Context
```http
PUT /v1/workspaces/{workspaceId}/chats/{chatId}/context
Content-Type: application/json

{
  "contextNodeIds": ["node1", "node2", "node3"]
}
```

## WebSocket Events

### Chat Messages
```javascript
// Send message via WebSocket
socket.send(JSON.stringify({
  type: 'chat.message.sent',
  chatId: 'chat123',
  messageId: 'msg456',
  content: 'Hello AI!',
  senderId: 'user789'
}));

// Receive streaming response
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'chat.response.streaming') {
    console.log('Chunk:', message.chunk);
    console.log('Done:', message.done);
  }
};
```

## Database Schema

### Chat Sessions
```sql
CREATE TABLE chats (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  name VARCHAR(500) NOT NULL,
  context_node_ids JSONB DEFAULT '[]',
  provider_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_at TIMESTAMPTZ,
  updated_by VARCHAR(36)
);
```

### Chat Messages
```sql
CREATE TABLE chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  chat_id VARCHAR(36) NOT NULL,
  parent_id VARCHAR(36),
  type VARCHAR(50) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  context_node_ids JSONB,
  citations JSONB,
  provider_used VARCHAR(100),
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(36) NOT NULL
);
```

## Usage Examples

### Basic AI Chat
```javascript
// Create a chat session
const chat = await fetch('/v1/workspaces/ws123/chats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Project Discussion',
    providerConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini'
    }
  })
});

// Send a message
const response = await fetch(`/v1/workspaces/ws123/chats/${chat.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Summarize the project requirements'
  })
});
```

### Contextual Chat with Specific Documents
```javascript
// Send message with specific context
const response = await fetch(`/v1/workspaces/ws123/chats/${chat.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'What are the main risks mentioned in these documents?',
    contextNodeIds: ['doc1', 'doc2', 'database3']
  })
});
```

### Using Different AI Providers
```javascript
// Use Claude via OpenRouter
const claudeResponse = await fetch(`/v1/workspaces/ws123/chats/${chat.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Analyze this data and provide insights',
    providerOverride: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      temperature: 0.3
    }
  })
});

// Use Gemini
const geminiResponse = await fetch(`/v1/workspaces/ws123/chats/${chat.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Generate creative ideas based on this content',
    providerOverride: {
      provider: 'google',
      model: 'gemini-1.5-pro',
      temperature: 0.8
    }
  })
});
```

## Testing

Run the test script to validate your AI chat setup:

```bash
# Set environment variables
export TEST_WORKSPACE_ID="your-workspace-id"
export TEST_AUTH_TOKEN="your-auth-token"
export API_BASE="http://localhost:3000"

# Run the test
node scripts/test-ai-chat.js
```

## Architecture

### Components
- **Chat Service**: Manages chat sessions and message processing
- **Provider System**: Handles multiple AI providers (OpenAI, Google, OpenRouter)
- **Context Retrieval**: Semantic search and hybrid retrieval system
- **WebSocket Handler**: Real-time communication and streaming
- **Citation System**: Links AI responses to source content

### Data Flow
1. User sends message via API or WebSocket
2. Context resolver expands selected nodes and retrieves relevant content
3. AI provider processes message with context
4. Response includes citations linking back to source material
5. Real-time delivery via WebSocket with optional streaming

### Performance Considerations
- Context retrieval uses vector embeddings for fast semantic search
- Hybrid search combines semantic and keyword matching
- Provider failover ensures reliability
- Background processing for embeddings and indexing

## Security

- All chat access controlled by workspace permissions
- Context filtering respects node-level permissions
- API keys stored securely in environment variables
- WebSocket connections authenticated per workspace

## Migration

The chat functionality integrates with the existing Colanode data model:
- Uses existing node and document embedding infrastructure
- Respects collaboration and permission systems
- Leverages existing real-time WebSocket architecture

Run database migrations:
```bash
npm run migrate
```

This adds the new `chats` and `chat_messages` tables while preserving all existing data.