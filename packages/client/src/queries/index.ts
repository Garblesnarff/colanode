// packages/client/src/queries/index.ts
/**
 * @file Main entry point for query definitions and related types within the `@colanode/client` package.
 *
 * This module serves as a central export point for all available client-side queries.
 * Queries are used to fetch data, either from the local cache/database or by making
 * requests to the server. Each exported item typically represents a specific data retrieval operation.
 *
 * Additionally, this file defines:
 * - `QueryMap`: An interface intended to map query types to their input/output shapes (though currently empty,
 *   it suggests a pattern for future strong typing of queries).
 * - `QueryInput`: A utility type to extract input types from `QueryMap`.
 * - `QueryError` and `QueryErrorCode`: Custom error handling for query operations.
 *
 * The numerous exports like `account-get`, `chat-list`, etc., correspond to individual
 * query handlers or definitions for retrieving specific pieces of application data.
 */
export * from './accounts/account-get';
export * from './accounts/account-list';
export * from './accounts/account-metadata-list';
export * from './apps/app-metadata-list';
export * from './chats/chat-list';
export * from './databases/database-list';
export * from './databases/database-view-list';
export * from './documents/document-get';
export * from './documents/document-state-get';
export * from './documents/document-updates-list';
export * from './emojis/emoji-category-list';
export * from './emojis/emoji-get-by-skin-id';
export * from './emojis/emoji-get';
export * from './emojis/emoji-list';
export * from './emojis/emoji-search';
export * from './files/file-list';
export * from './files/file-state-get';
export * from './icons/icon-category-list';
export * from './icons/icon-list';
export * from './icons/icon-search';
export * from './interactions/radar-data-get';
export * from './messages/message-list';
export * from './nodes/node-children-get';
export * from './nodes/node-get';
export * from './nodes/node-reaction-list';
export * from './nodes/node-reactions-aggregate';
export * from './nodes/node-tree-get';
export * from './records/record-list';
export * from './records/record-search';
export * from './servers/server-list';
export * from './spaces/space-list';
export * from './users/user-get';
export * from './users/user-list';
export * from './users/user-search';
export * from './workspaces/workspace-get';
export * from './workspaces/workspace-list';
export * from './workspaces/workspace-metadata-list';
export * from './avatars/avatar-url-get';
export * from './files/file-url-get';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
/**
 * An empty interface intended to be augmented via module declaration merging.
 * Each specific query file (e.g., `accounts/account-get.ts`) should declare
 * its own entry in this map. The key should be the query type string (e.g., "account.get"),
 * and the value should be an object `{ input: YourQueryInputType; output: YourQueryOutputType; }`.
 * This enables type-safe dispatch and handling of queries.
 *
 * @example
 * // In a specific query file (e.g., packages/client/src/queries/accounts/account-get.ts):
 * declare module '@colanode/client/queries' {
 *   interface QueryMap {
 *     'account.get': {
 *       input: AccountGetInput;   // Defined in this specific query file
 *       output: AccountGetOutput;  // Defined in this specific query file
 *     };
 *   }
 * }
 */
export interface QueryMap {}

/**
 * A utility type that extracts a union of all possible input types for any query
 * defined in the {@link QueryMap}. This is useful for generic query handling logic.
 */
export type QueryInput = QueryMap[keyof QueryMap]['input'];

/**
 * Custom error class for query operations.
 * Allows queries or query handlers to throw errors with a specific {@link QueryErrorCode}
 * and message, which can be caught and handled by the client application.
 */
export class QueryError extends Error {
  /**
   * Constructs a `QueryError`.
   * @param code - The {@link QueryErrorCode} for this error.
   * @param message - The human-readable error message.
   */
  constructor(
    public readonly code: QueryErrorCode, // Made readonly
    message: string
  ) {
    super(message);
    this.name = 'QueryError'; // Standard practice to set error name
    Object.defineProperty(this, 'code', {
        value: code,
        enumerable: true,
        writable: false,
        configurable: true,
    });
  }
}

/**
 * Enumerates standardized error codes specific to query operations.
 */
export enum QueryErrorCode {
  /** An unknown or unspecified error occurred during the query. */
  Unknown = 'unknown',
  /** The specified account could not be found. */
  AccountNotFound = 'account_not_found',
  /** The specified workspace could not be found. */
  WorkspaceNotFound = 'workspace_not_found',
  // TODO: Add more specific query error codes as needed, e.g.:
  // NodeNotFound = 'node_not_found',
  // DocumentNotFound = 'document_not_found',
  // InvalidInput = 'invalid_query_input',
  // NetworkError = 'query_network_error',
  // PermissionDenied = 'query_permission_denied',
}
