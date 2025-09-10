// packages/core/src/types/sockets.ts
/**
 * @file Defines Zod schemas and TypeScript types related to WebSocket communication.
 * This includes messages for initializing socket connections, handling data synchronization,
 * and broadcasting various entity update events.
 */
import { z } from 'zod/v4';

import {
  SynchronizerInput, // Represents the input structure for any synchronizer
  SynchronizerMap,   // Maps synchronizer types to their specific output data structures
} from '@colanode/core/synchronizers';

/**
 * Zod schema for the output data sent by the server upon successful WebSocket initialization.
 *
 * @property id - A unique identifier for the established WebSocket connection (socket ID).
 */
export const socketInitOutputSchema = z.object({
  /** Unique identifier for this WebSocket connection. */
  id: z.string(),
});
/** TypeScript type for WebSocket initialization output. */
export type SocketInitOutput = z.infer<typeof socketInitOutputSchema>;

/**
 * Represents a message sent from a client to the server to request data via a synchronizer.
 * This is typically used for fetching paginated data or subscribing to updates.
 *
 * @property type - Discriminator, must be "synchronizer.input".
 * @property id - A unique identifier for this specific synchronization request message.
 * @property userId - The ID of the user making the request.
 * @property input - The {@link SynchronizerInput} object, specifying the type of synchronizer and its parameters.
 * @property cursor - A cursor string indicating the starting point for data retrieval (for pagination).
 */
export type SynchronizerInputMessage = {
  type: 'synchronizer.input';
  id: string; // Unique ID for this request message
  userId: string;
  input: SynchronizerInput; // Specific synchronizer type and its params
  cursor: string; // For pagination
};

/**
 * Represents a message sent from the server to a client, containing data from a synchronizer.
 * This is the response to a {@link SynchronizerInputMessage} or a push update.
 *
 * @template TInput - Constrains the `data` property based on the type of the original {@link SynchronizerInput}.
 * @property type - Discriminator, must be "synchronizer.output".
 * @property userId - The ID of the user this message is intended for.
 * @property id - Identifier that often correlates with the `id` from the {@link SynchronizerInputMessage} if it's a direct response.
 * @property items - An array of data items, each with a `cursor` for subsequent pagination and the actual `data`.
 *                   The structure of `data` is determined by `SynchronizerMap[TInput['type']]['data']`.
 */
export type SynchronizerOutputMessage<TInput extends SynchronizerInput> = {
  type: 'synchronizer.output';
  userId: string;
  id: string; // Correlates with the input message ID or a subscription ID
  items: {
    cursor: string; // Cursor for the next page of this item type
    data: SynchronizerMap[TInput['type']]['data']; // Type-safe data based on input
  }[];
};

/**
 * Message type indicating that an account's details have been updated.
 * Clients can listen for this to refresh account information.
 *
 * @property type - Discriminator, "account.updated".
 * @property accountId - The ID of the account that was updated.
 */
export type AccountUpdatedMessage = {
  type: 'account.updated';
  accountId: string;
};

/**
 * Message type indicating that a workspace's details have been updated.
 *
 * @property type - Discriminator, "workspace.updated".
 * @property workspaceId - The ID of the workspace that was updated.
 */
export type WorkspaceUpdatedMessage = {
  type: 'workspace.updated';
  workspaceId: string;
};

/**
 * Message type indicating that a workspace has been deleted.
 *
 * @property type - Discriminator, "workspace.deleted".
 * @property accountId - The ID of the account which might be affected by this deletion (e.g., if it was their workspace).
 *                       This property might need clarification: typically, it would be `workspaceId`.
 *                       If it's for notifying users of an account that a workspace they *had access to* was deleted,
 *                       then `accountId` makes sense in that context.
 */
export type WorkspaceDeletedMessage = {
  type: 'workspace.deleted';
  accountId: string; // Consider if this should be workspaceId, or if it's for user notification context.
};

/**
 * Message type indicating that a new user has been created/added (e.g., to a workspace).
 *
 * @property type - Discriminator, "user.created".
 * @property accountId - The account ID of the newly created/added user.
 * @property workspaceId - The ID of the workspace to which the user was added (if applicable).
 * @property userId - The specific user ID within the workspace context (if different from accountId or for clarity).
 */
export type UserCreatedMessage = {
  type: 'user.created';
  accountId: string;
  workspaceId: string;
  userId: string;
};

/**
 * Message type indicating that a user's details (e.g., role in a workspace) have been updated.
 *
 * @property type - Discriminator, "user.updated".
 * @property accountId - The account ID of the user who was updated.
 * @property userId - The specific user ID that was updated.
 */
export type UserUpdatedMessage = {
  type: 'user.updated';
  accountId: string;
  userId: string;
};

/**
 * Union type representing all possible WebSocket message structures defined in this file.
 * This is used for type checking and handling incoming/outgoing WebSocket messages.
 */
export type Message =
  | AccountUpdatedMessage
  | WorkspaceUpdatedMessage
  | WorkspaceDeletedMessage
  | UserCreatedMessage
  | UserUpdatedMessage
  | SynchronizerInputMessage
  | SynchronizerOutputMessage<SynchronizerInput>; // Generic form for any synchronizer output
