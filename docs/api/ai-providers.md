# AI Provider Integration

Colanode supports multiple AI providers to give users flexibility in choosing their preferred LLM services. This document explains how to configure and use each provider.

## Supported Providers

1. **OpenAI** - OpenAI's GPT models
2. **Google** - Google's Gemini models
3. **OpenRouter** - Unified API for multiple providers

## Provider Configuration

All provider configurations are managed through the server configuration system. Each provider can be enabled/disabled and configured with appropriate API keys.

### Common Configuration Options

All providers support these common configuration options:

- `enabled` (boolean) - Whether the provider is enabled
- `apiKey` (string) - API key for the provider
- `defaultModel` (string) - Default model to use
- `baseUrl` (string) - Base URL for the provider (if applicable)

## OpenAI Provider

The OpenAI provider uses the official OpenAI API and supports all GPT models.

### Configuration

```env
AI_PROVIDERS_OPENAI_ENABLED=true
AI_PROVIDERS_OPENAI_API_KEY=your-openai-api-key
AI_PROVIDERS_OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

### Supported Models

- `gpt-4o-mini` - Fast, affordable model for most tasks
- `gpt-4o` - More capable model for complex tasks
- `gpt-4-turbo` - Previous generation powerful model

### Capabilities

- Text generation
- Streaming responses
- Function calling
- Embeddings (text-embedding-3-large, text-embedding-3-small)

## Google Provider

The Google provider uses the Google AI API and supports Gemini models.

### Configuration

```env
AI_PROVIDERS_GOOGLE_ENABLED=true
AI_PROVIDERS_GOOGLE_API_KEY=your-google-api-key
AI_PROVIDERS_GOOGLE_DEFAULT_MODEL=gemini-1.5-pro
```

### Supported Models

- `gemini-1.5-pro` - Most capable model for complex tasks
- `gemini-1.5-flash` - Fast, efficient model for simpler tasks

### Capabilities

- Text generation
- Streaming responses
- Function calling
- Embeddings

## OpenRouter Provider

The OpenRouter provider offers access to models from multiple providers through a single API.

### Configuration

```env
AI_PROVIDERS_OPENROUTER_ENABLED=true
AI_PROVIDERS_OPENROUTER_API_KEY=your-openrouter-api-key
AI_PROVIDERS_OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
```

### Supported Models

OpenRouter supports models from many providers:

- **OpenAI**: `openai/gpt-4o-mini`, `openai/gpt-4o`
- **Anthropic**: `anthropic/claude-3-haiku`, `anthropic/claude-3-sonnet`
- **Google**: `google/gemini-pro`, `google/gemini-pro-vision`
- **Meta**: `meta-llama/llama-3-70b-instruct`
- And many more...

### Capabilities

- Text generation
- Streaming responses
- Function calling (provider dependent)

### Special Features

OpenRouter provides some unique features:

- **Model Fallbacks**: Automatically fall back to alternative models if one is unavailable
- **Cost Optimization**: Choose models based on cost/performance trade-offs
- **Unified Interface**: Access to models from multiple providers through a single API

### Configuration Options

The OpenRouter provider supports additional configuration options:

- `httpReferer` - HTTP referer header (defaults to 'https://colanode.com')
- `xTitle` - X-Title header (defaults to 'Colanode')

## Provider Selection

When creating a chat or sending a message, you can specify which provider to use. If no provider is specified, the system will use the default provider configured for the chat session.

### Per-Message Override

You can override the provider for individual messages:

```json
{
  "content": "Hello, AI assistant!",
  "providerOverride": {
    "provider": "openrouter",
    "model": "anthropic/claude-3-haiku",
    "temperature": 0.7
  }
}
```

## Adding New Providers

To add support for a new provider:

1. Create a new provider class in `apps/server/src/lib/ai/providers/`
2. Implement the required interface methods
3. Add configuration options to the server configuration
4. Register the provider in the LLM selection logic

The provider class should extend the LangChain BaseLLM class and implement the necessary methods for text generation and streaming.