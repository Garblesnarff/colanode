# AI Library

This directory contains all the AI-related functionality for Colanode, including LLM integrations, prompt management, and retrieval systems.

## Directory Structure

- `assistants.ts` - Main AI assistant implementation using LangChain
- `chunking.ts` - Text chunking utilities for document processing
- `document-retrievals.ts` - Document retrieval logic for context
- `embeddings.ts` - Text embedding generation
- `llms.ts` - LLM interaction functions
- `metadata.ts` - Context metadata handling
- `node-retrievals.ts` - Node retrieval logic for context
- `prompts.ts` - Prompt templates
- `providers/` - LLM provider implementations
- `utils.ts` - Utility functions for AI processing

## Architecture Overview

The AI system follows this data flow:

1. **Input Processing**: User queries are processed and potentially rewritten
2. **Context Retrieval**: Relevant context is retrieved from nodes, documents, and databases
3. **Document Reranking**: Retrieved context is reranked for relevance
4. **Response Generation**: Final response is generated using the LLM with context
5. **Citation Extraction**: Citations are extracted from the response

## Provider System

Colanode supports multiple LLM providers:

- **OpenAI**: Primary provider with GPT models
- **Google**: Google's Gemini models
- **OpenRouter**: Unified API for multiple providers

Each provider is implemented as a separate class in the `providers/` directory.

## Key Components

### Assistant Chain

The main AI assistant is implemented as a LangChain StateGraph in `assistants.ts`. It orchestrates the entire process of:

1. Query rewriting
2. Intent assessment
3. Context retrieval
4. Document reranking
5. Response generation

### Retrieval System

The retrieval system can fetch context from multiple sources:

- **Nodes**: Individual items in the Colanode system
- **Documents**: Rich text content
- **Databases**: Structured data with records

### Provider Interface

All LLM providers implement a common interface that supports:

- Regular text generation
- Streaming responses
- Model configuration