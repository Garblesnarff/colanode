# Client Mutations

This directory contains all the client-side mutation functions for interacting with the Colanode API.

## Directory Structure

The mutations are organized by entity type:

- `account/` - Account-related mutations
- `apps/` - Application mutations
- `avatars/` - Avatar mutations
- `channels/` - Channel mutations
- `chats/` - Chat-related mutations
- `databases/` - Database mutations
- `documents/` - Document mutations
- `files/` - File mutations
- `folders/` - Folder mutations
- `index.ts` - Main export file
- `messages/` - Message mutations
- `nodes/` - Node mutations
- `pages/` - Page mutations
- `records/` - Database record mutations
- `servers/` - Server mutations
- `spaces/` - Space mutations
- `users/` - User mutations
- `workspaces/` - Workspace mutations

## Mutation Pattern

All mutations follow a consistent pattern:

1. **Type Definitions**: Each mutation file exports TypeScript interfaces for input and output types
2. **Mutation Function**: An async function that makes the API call
3. **Error Handling**: Proper error handling and validation
4. **Response Parsing**: Parsing and transforming API responses into client-friendly formats

## Usage Example

```typescript
import { createChat } from '@colanode/client/mutations/chats';

const chat = await createChat({
  workspaceId: 'workspace123',
  name: 'My New Chat',
  contextNodeIds: ['node1', 'node2']
});
```

## Key Concepts

### Optimistic Updates
Many mutations implement optimistic updates to provide immediate UI feedback while the server processes the request.

### Error Handling
All mutations include proper error handling with meaningful error messages.

### Type Safety
Full TypeScript support with strict typing for inputs and outputs.