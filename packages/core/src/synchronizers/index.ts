// packages/core/src/synchronizers/index.ts
/**
 * @file Aggregates and exports various data synchronizer modules and related types.
 * Synchronizers are responsible for managing the flow of data between the client and server,
 * often handling pagination, real-time updates, and ensuring data consistency.
 *
 * This file re-exports specific synchronizer implementations (like those for node updates,
 * users, reactions, etc.) and defines core types for working with synchronizers, such as
 * `SynchronizerMap` and `SynchronizerInput`.
 */

/** @module synchronizers/nodes-updates Exports synchronizers related to updates for Node entities. */
export * from './nodes-updates';
/** @module synchronizers/users Exports synchronizers related to user data. */
export * from './users';
/** @module synchronizers/node-reactions Exports synchronizers for node reactions (e.g., emojis). */
export * from './node-reactions';
/** @module synchronizers/node-interactions Exports synchronizers for node interactions (e.g., seen, opened). */
export * from './node-interactions';
/** @module synchronizers/node-tombstones Exports synchronizers for handling node deletion markers (tombstones). */
export * from './node-tombstones';
/** @module synchronizers/collaborations Exports synchronizers related to collaboration data (e.g., collaborator lists, permissions). */
export * from './collaborations';
/** @module synchronizers/document-updates Exports synchronizers for real-time updates to document content (CRDT updates). */
export * from './document-updates';

/**
 * An empty interface intended to be augmented via module declaration merging.
 * Each specific synchronizer module (e.g., `nodes-updates`, `users`) should declare
 * its own entry in this map, mapping its synchronizer type string to its specific
 * input and output data structures.
 *
 * This allows for type-safe access to synchronizer-specific types based on a
 * generic synchronizer type string.
 *
 * @example
 * // In another file (e.g., packages/core/src/synchronizers/nodes-updates.ts):
 * declare module '@colanode/core/synchronizers' {
 *   interface SynchronizerMap {
 *     'nodes-updates': {
 *       input: NodesUpdatesInput; // Defined in nodes-updates.ts
 *       data: NodesUpdatesData;   // Defined in nodes-updates.ts
 *     };
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SynchronizerMap {}

/**
 * A utility type that extracts a union of all possible input types for any synchronizer
 * defined in the {@link SynchronizerMap}. This is useful for creating generic functions
 * or components that can handle various synchronizer inputs.
 *
 * It works by taking all keys (synchronizer type strings) of `SynchronizerMap`,
 * looking up the corresponding value (the `{ input: ..., data: ... }` object),
 * and then extracting the `input` type from that object.
 */
export type SynchronizerInput = SynchronizerMap[keyof SynchronizerMap]['input'];
