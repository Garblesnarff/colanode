# Server Library

This directory contains the core business logic for the Colanode server, organized by functional domains.

## Directory Structure

- `accounts.ts` - User account management
- `ai/` - AI functionality (see separate README)
- `blocks.ts` - Content block management
- `chats.ts` - Chat session and message management
- `chats-streaming.ts` - Streaming chat functionality
- `collaborations.ts` - Collaboration features
- `config/` - Configuration management
- `counters.ts` - System counters
- `documents.ts` - Document management
- `event-bus.ts` - Event handling system
- `files.ts` - File management
- `node-interactions.ts` - Node interaction tracking
- `node-reactions.ts` - Node reaction management
- `nodes.ts` - Core node functionality
- `otps.ts` - One-time password management
- `rate-limits.ts` - Rate limiting
- `records.ts` - Database record management
- `tokens.ts` - Token management
- `utils.ts` - Utility functions
- `workspaces.ts` - Workspace management

## Module Relationships

The modules in this directory work together to provide the core functionality of Colanode:

- **User Management**: Accounts, tokens, OTPs
- **Content Management**: Nodes, documents, blocks, records
- **Collaboration**: Chats, collaborations, reactions, interactions
- **Infrastructure**: Config, event-bus, rate-limits, counters
- **AI Integration**: AI functionality (separate module)

Each module is designed to be loosely coupled but highly cohesive, following the single responsibility principle.