// packages/client/src/mutations/index.ts
/**
 * @file Main entry point for mutation definitions and related types within the `@colanode/client` package.
 *
 * This module serves as a central export point for all available client-side mutations.
 * Mutations are used to modify data, which can involve updating local state/database
 * and/or sending requests to the server to persist changes. Each exported item
 * typically represents a specific data modification operation.
 *
 * Additionally, this file defines:
 * - `MutationMap`: An interface intended to map mutation types to their input/output shapes
 *   (though currently empty, it suggests a pattern for future strong typing).
 * - `MutationInput`: A utility type to extract input types from `MutationMap`.
 * - `MutationResult`, `SuccessMutationResult`, `ErrorMutationResult`: Types for mutation outcomes.
 * - `MutationError` and `MutationErrorCode`: Custom error handling for mutation operations,
 *   including a comprehensive list of potential error codes.
 *
 * The numerous exports like `account-logout`, `channel-create`, etc., correspond to
 * individual mutation handlers or definitions for specific data modification tasks.
 */
export * from './accounts/account-logout';
export * from './accounts/account-metadata-delete';
export * from './accounts/account-metadata-update';
export * from './accounts/account-update';
export * from './accounts/email-login';
export * from './accounts/email-password-reset-complete';
export * from './accounts/email-password-reset-init';
export * from './accounts/email-register';
export * from './accounts/email-verify';
export * from './accounts/google-login';
export * from './apps/app-metadata-delete';
export * from './apps/app-metadata-update';
export * from './avatars/avatar-upload';
export * from './channels/channel-create';
export * from './channels/channel-delete';
export * from './channels/channel-update';
export * from './chats/chat-create';
export * from './databases/database-create';
export * from './databases/database-delete';
export * from './databases/database-update';
export * from './databases/field-create';
export * from './databases/field-delete';
export * from './databases/field-name-update';
export * from './databases/select-option-create';
export * from './databases/select-option-delete';
export * from './databases/select-option-update';
export * from './databases/view-create';
export * from './databases/view-delete';
export * from './databases/view-name-update';
export * from './databases/view-update';
export * from './documents/document-update';
export * from './files/file-create';
export * from './files/file-delete';
export * from './files/file-download';
export * from './files/file-save-temp';
export * from './folders/folder-create';
export * from './folders/folder-delete';
export * from './folders/folder-update';
export * from './messages/message-create';
export * from './messages/message-delete';
export * from './nodes/node-collaborator-create';
export * from './nodes/node-collaborator-delete';
export * from './nodes/node-collaborator-update';
export * from './nodes/node-interaction-opened';
export * from './nodes/node-interaction-seen';
export * from './nodes/node-reaction-create';
export * from './nodes/node-reaction-delete';
export * from './pages/page-create';
export * from './pages/page-delete';
export * from './pages/page-update';
export * from './records/record-avatar-update';
export * from './records/record-create';
export * from './records/record-delete';
export * from './records/record-field-value-delete';
export * from './records/record-field-value-set';
export * from './records/record-name-update';
export * from './servers/server-create';
export * from './servers/server-delete';
export * from './spaces/space-avatar-update';
export * from './spaces/space-create';
export * from './spaces/space-delete';
export * from './spaces/space-description-update';
export * from './spaces/space-name-update';
export * from './workspaces/workspace-create';
export * from './workspaces/workspace-delete';
export * from './workspaces/workspace-metadata-delete';
export * from './workspaces/workspace-metadata-update';
export * from './workspaces/workspace-update';
export * from './users/user-role-update';
export * from './users/users-create';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
/**
 * An empty interface intended to be augmented via module declaration merging.
 * Each specific mutation file (e.g., `accounts/email-login.ts`) should declare
 * its own entry in this map. The key should be the mutation type string (e.g., "email.login"),
 * and the value should be an object `{ input: YourMutationInputType; output: YourMutationOutputType; }`.
 * This allows for type-safe dispatch and handling of mutations throughout the client.
 *
 * @example
 * // In a specific mutation file (e.g., packages/client/src/mutations/accounts/email-login.ts):
 * declare module '@colanode/client/mutations' {
 *   interface MutationMap {
 *     'email.login': {
 *       input: EmailLoginInput;   // Defined in this specific mutation file
 *       output: EmailLoginOutput;  // Defined in this specific mutation file
 *     };
 *   }
 * }
 */
export interface MutationMap {}

/**
 * A utility type that extracts a union of all possible input types for any mutation
 * defined in the {@link MutationMap}. This is useful for generic mutation handling logic.
 * It works by taking all keys of `MutationMap`, looking up the corresponding value
 * (the `{ input: ..., output: ... }` object), and then extracting the `input` type.
 */
export type MutationInput = MutationMap[keyof MutationMap]['input'];

/**
 * Represents the standardized structure for error data returned when a mutation fails.
 *
 * @property code - A specific {@link MutationErrorCode} indicating the type of error.
 * @property message - A human-readable message describing the error.
 */
export type MutationErrorData = {
  /** Specific error code from {@link MutationErrorCode}. */
  code: MutationErrorCode;
  /** Human-readable error message. */
  message: string;
};

/**
 * Represents the structure of a successful mutation result.
 *
 * @template T - The specific type of {@link MutationInput} this result corresponds to.
 * @property success - Always `true` for a successful result.
 * @property output - The actual output data of the mutation, typed according to
 *                    `MutationMap[T['type']]['output']` for the specific mutation type.
 */
export type SuccessMutationResult<T extends MutationInput> = {
  /** Indicates the mutation was successful. */
  success: true;
  /** The output data from the successful mutation. */
  output: MutationMap[T['type']]['output'];
};

/**
 * Represents the structure of a failed mutation result.
 *
 * @property success - Always `false` for a failed result.
 * @property error - A {@link MutationErrorData} object containing details about the error.
 */
export type ErrorMutationResult = {
  /** Indicates the mutation failed. */
  success: false;
  /** Detailed error information. */
  error: MutationErrorData;
};

/**
 * A union type representing the outcome of any mutation.
 * It can be either a {@link SuccessMutationResult} or an {@link ErrorMutationResult}.
 *
 * @template T - The specific type of {@link MutationInput} this result is for.
 */
export type MutationResult<T extends MutationInput> =
  | SuccessMutationResult<T>
  | ErrorMutationResult;

/**
 * Custom error class for mutations.
 * Allows mutations to throw errors with a specific {@link MutationErrorCode} and message,
 * which can then be caught and transformed into a standard {@link ErrorMutationResult}
 * by the `Mediator` or other central error handling logic.
 */
export class MutationError extends Error {
  /**
   * Constructs a `MutationError`.
   * @param code - The {@link MutationErrorCode} for this error.
   * @param message - The human-readable error message.
   */
  constructor(
    public readonly code: MutationErrorCode, // Made readonly for clarity
    message: string
  ) {
    super(message);
    this.name = 'MutationError'; // Standard practice to set error name
    // Ensure `code` is an enumerable property if needed for `JSON.stringify` or `Object.assign`
    Object.defineProperty(this, 'code', {
        value: code,
        enumerable: true, // Make 'code' appear in Object.keys, JSON.stringify, etc.
        writable: false,
        configurable: true,
    });
  }
}

/**
 * Enumerates standardized error codes specific to mutation operations.
 * These codes provide more granular error information than generic HTTP status codes
 * and are used in {@link MutationErrorData} and {@link MutationError}.
 */
export enum MutationErrorCode {
  // General Errors
  /** An unknown or unspecified error occurred during the mutation. */
  Unknown = 'unknown',
  /** An error occurred while making an API request to the server. */
  ApiError = 'api_error',

  // Account & Auth Errors
  /** The specified account could not be found. */
  AccountNotFound = 'account_not_found',
  /** Login attempt failed due to incorrect credentials or other auth issues. */
  AccountLoginFailed = 'account_login_failed',
  /** Account registration attempt failed. */
  AccountRegisterFailed = 'account_register_failed',
  /** Email verification process failed (e.g., invalid OTP, expired request). */
  EmailVerificationFailed = 'email_verification_failed',

  // Server & Workspace Errors
  /** The target server could not be found or is not registered. */
  ServerNotFound = 'server_not_found',
  /** The specified workspace could not be found. */
  WorkspaceNotFound = 'workspace_not_found',
  /** Failed to create the workspace. */
  WorkspaceNotCreated = 'workspace_not_created',
  /** Failed to update the workspace. */
  WorkspaceNotUpdated = 'workspace_not_updated',

  // Space (within Workspace) Errors
  /** The specified space could not be found. */
  SpaceNotFound = 'space_not_found',
  /** User is not permitted to update the space. */
  SpaceUpdateForbidden = 'space_update_forbidden',
  /** An error occurred while updating the space. */
  SpaceUpdateFailed = 'space_update_failed',
  /** User is not permitted to create a space. */
  SpaceCreateForbidden = 'space_create_forbidden',
  /** An error occurred while creating the space. */
  SpaceCreateFailed = 'space_create_failed',

  // Server Management Errors
  /** User is not permitted to delete the server entry. */
  ServerDeleteForbidden = 'server_delete_forbidden',
  /** The provided server URL was invalid. */
  ServerUrlInvalid = 'server_url_invalid',
  /** Failed to initialize or connect to the server. */
  ServerInitFailed = 'server_init_failed',

  // Channel & Chat Errors
  /** The specified channel could not be found. */
  ChannelNotFound = 'channel_not_found',
  /** User is not permitted to update the channel. */
  ChannelUpdateForbidden = 'channel_update_forbidden',
  /** An error occurred while updating the channel. */
  ChannelUpdateFailed = 'channel_update_failed',

  // Database & Field Errors
  /** The specified database could not be found. */
  DatabaseNotFound = 'database_not_found',
  /** User is not permitted to update the database. */
  DatabaseUpdateForbidden = 'database_update_forbidden',
  /** An error occurred while updating the database. */
  DatabaseUpdateFailed = 'database_update_failed',
  /** A related database (e.g., for a relation field) could not be found. */
  RelationDatabaseNotFound = 'relation_database_not_found',
  /** The specified field could not be found. */
  FieldNotFound = 'field_not_found',
  /** The provided file data is invalid. */
  FileInvalid = 'file_invalid',
  /** User is not permitted to create the field. */
  FieldCreateForbidden = 'field_create_forbidden',
  /** An error occurred while creating the field. */
  FieldCreateFailed = 'field_create_failed',
  /** User is not permitted to update the field. */
  FieldUpdateForbidden = 'field_update_forbidden',
  /** An error occurred while updating the field. */
  FieldUpdateFailed = 'field_update_failed',
  /** User is not permitted to delete the field. */
  FieldDeleteForbidden = 'field_delete_forbidden',
  /** An error occurred while deleting the field. */
  FieldDeleteFailed = 'field_delete_failed',
  /** The type of the field is invalid or unsupported for the operation. */
  FieldTypeInvalid = 'field_type_invalid',

  // Select Option (for Database Fields) Errors
  /** User is not permitted to create a select option. */
  SelectOptionCreateForbidden = 'select_option_create_forbidden',
  /** An error occurred while creating a select option. */
  SelectOptionCreateFailed = 'select_option_create_failed',
  /** The specified select option could not be found. */
  SelectOptionNotFound = 'select_option_not_found',
  /** User is not permitted to update the select option. */
  SelectOptionUpdateForbidden = 'select_option_update_forbidden',
  /** An error occurred while updating the select option. */
  SelectOptionUpdateFailed = 'select_option_update_failed',
  /** User is not permitted to delete the select option. */
  SelectOptionDeleteForbidden = 'select_option_delete_forbidden',
  /** An error occurred while deleting the select option. */
  SelectOptionDeleteFailed = 'select_option_delete_failed',

  // Database View Errors
  /** The specified database view could not be found. */
  ViewNotFound = 'view_not_found',
  /** User is not permitted to create the database view. */
  ViewCreateForbidden = 'view_create_forbidden',
  /** An error occurred while creating the database view. */
  ViewCreateFailed = 'view_create_failed',
  /** User is not permitted to update the database view. */
  ViewUpdateForbidden = 'view_update_forbidden',
  /** An error occurred while updating the database view. */
  ViewUpdateFailed = 'view_update_failed',
  /** User is not permitted to delete the database view. */
  ViewDeleteForbidden = 'view_delete_forbidden',
  /** An error occurred while deleting the database view. */
  ViewDeleteFailed = 'view_delete_failed',

  // Record (Database Entry) Errors
  /** User is not permitted to update the record. */
  RecordUpdateForbidden = 'record_update_forbidden',
  /** An error occurred while updating the record. */
  RecordUpdateFailed = 'record_update_failed',

  // Page Errors
  /** User is not permitted to update the page. */
  PageUpdateForbidden = 'page_update_forbidden',
  /** An error occurred while updating the page. */
  PageUpdateFailed = 'page_update_failed',

  // Node Collaborator Errors
  /** User is not permitted to add a collaborator to the node. */
  NodeCollaboratorCreateForbidden = 'node_collaborator_create_forbidden',
  /** An error occurred while adding a collaborator. */
  NodeCollaboratorCreateFailed = 'node_collaborator_create_failed',
  /** User is not permitted to remove a collaborator from the node. */
  NodeCollaboratorDeleteForbidden = 'node_collaborator_delete_forbidden',
  /** An error occurred while removing a collaborator. */
  NodeCollaboratorDeleteFailed = 'node_collaborator_delete_failed',
  /** User is not permitted to update a collaborator's role on the node. */
  NodeCollaboratorUpdateForbidden = 'node_collaborator_update_forbidden',
  /** An error occurred while updating a collaborator's role. */
  NodeCollaboratorUpdateFailed = 'node_collaborator_update_failed',

  // General Node/User Errors
  /** The specified user could not be found. */
  UserNotFound = 'user_not_found',
  /** The specified node could not be found. */
  NodeNotFound = 'node_not_found',
  /** The root entity for an operation could not be found. */
  RootNotFound = 'root_not_found',

  // File Operation Errors
  /** User is not permitted to create/upload the file. */
  FileCreateForbidden = 'file_create_forbidden',
  /** An error occurred while creating/uploading the file. */
  FileCreateFailed = 'file_create_failed',
  /** The specified file could not be found. */
  FileNotFound = 'file_not_found',
  /** The file is not yet ready for access (e.g., still uploading/processing). */
  FileNotReady = 'file_not_ready',
  /** User is not permitted to delete the file. */
  FileDeleteForbidden = 'file_delete_forbidden',
  /** An error occurred while deleting the file. */
  FileDeleteFailed = 'file_delete_failed',

  // Folder Errors
  /** User is not permitted to update the folder. */
  FolderUpdateForbidden = 'folder_update_forbidden',
  /** An error occurred while updating the folder. */
  FolderUpdateFailed = 'folder_update_failed', // This was missing in the original list

  // Resource Limit Errors
  /** The user or workspace has exceeded their storage limit. */
  StorageLimitExceeded = 'storage_limit_exceeded',
  /** The uploaded file exceeds the maximum allowed file size. */
  FileTooLarge = 'file_too_large',

  // Message Errors
  /** User is not permitted to create a message in this context. */
  MessageCreateForbidden = 'message_create_forbidden',
  /** An error occurred while creating the message. */
  MessageCreateFailed = 'message_create_failed',
  /** User is not permitted to delete the message. */
  MessageDeleteForbidden = 'message_delete_forbidden',
  /** An error occurred while deleting the message. */
  MessageDeleteFailed = 'message_delete_failed',
  /** The specified message could not be found. */
  MessageNotFound = 'message_not_found',

  // Reaction Errors
  /** User is not permitted to create a reaction on this node. */
  NodeReactionCreateForbidden = 'node_reaction_create_forbidden',
  // Add other reaction error codes if needed (e.g., DeleteForbidden, AlreadyExists)
}
  AccountNotFound = 'account_not_found',
  AccountLoginFailed = 'account_login_failed',
  AccountRegisterFailed = 'account_register_failed',
  EmailVerificationFailed = 'email_verification_failed',
  ServerNotFound = 'server_not_found',
  WorkspaceNotFound = 'workspace_not_found',
  WorkspaceNotCreated = 'workspace_not_created',
  WorkspaceNotUpdated = 'workspace_not_updated',
  SpaceNotFound = 'space_not_found',
  SpaceUpdateForbidden = 'space_update_forbidden',
  SpaceUpdateFailed = 'space_update_failed',
  SpaceCreateForbidden = 'space_create_forbidden',
  SpaceCreateFailed = 'space_create_failed',
  ServerDeleteForbidden = 'server_delete_forbidden',
  ServerUrlInvalid = 'server_url_invalid',
  ServerInitFailed = 'server_init_failed',
  ChannelNotFound = 'channel_not_found',
  ChannelUpdateForbidden = 'channel_update_forbidden',
  ChannelUpdateFailed = 'channel_update_failed',
  DatabaseNotFound = 'database_not_found',
  DatabaseUpdateForbidden = 'database_update_forbidden',
  DatabaseUpdateFailed = 'database_update_failed',
  RelationDatabaseNotFound = 'relation_database_not_found',
  FieldNotFound = 'field_not_found',
  FileInvalid = 'file_invalid',
  FieldCreateForbidden = 'field_create_forbidden',
  FieldCreateFailed = 'field_create_failed',
  FieldUpdateForbidden = 'field_update_forbidden',
  FieldUpdateFailed = 'field_update_failed',
  FieldDeleteForbidden = 'field_delete_forbidden',
  FieldDeleteFailed = 'field_delete_failed',
  FieldTypeInvalid = 'field_type_invalid',
  SelectOptionCreateForbidden = 'select_option_create_forbidden',
  SelectOptionCreateFailed = 'select_option_create_failed',
  SelectOptionNotFound = 'select_option_not_found',
  SelectOptionUpdateForbidden = 'select_option_update_forbidden',
  SelectOptionUpdateFailed = 'select_option_update_failed',
  SelectOptionDeleteForbidden = 'select_option_delete_forbidden',
  SelectOptionDeleteFailed = 'select_option_delete_failed',
  ViewNotFound = 'view_not_found',
  ViewCreateForbidden = 'view_create_forbidden',
  ViewCreateFailed = 'view_create_failed',
  ViewUpdateForbidden = 'view_update_forbidden',
  ViewUpdateFailed = 'view_update_failed',
  ViewDeleteForbidden = 'view_delete_forbidden',
  ViewDeleteFailed = 'view_delete_failed',
  RecordUpdateForbidden = 'record_update_forbidden',
  RecordUpdateFailed = 'record_update_failed',
  PageUpdateForbidden = 'page_update_forbidden',
  PageUpdateFailed = 'page_update_failed',
  NodeCollaboratorCreateForbidden = 'node_collaborator_create_forbidden',
  NodeCollaboratorCreateFailed = 'node_collaborator_create_failed',
  NodeCollaboratorDeleteForbidden = 'node_collaborator_delete_forbidden',
  NodeCollaboratorDeleteFailed = 'node_collaborator_delete_failed',
  NodeCollaboratorUpdateForbidden = 'node_collaborator_update_forbidden',
  NodeCollaboratorUpdateFailed = 'node_collaborator_update_failed',
  UserNotFound = 'user_not_found',
  NodeNotFound = 'node_not_found',
  RootNotFound = 'root_not_found',
  FileCreateForbidden = 'file_create_forbidden',
  FileCreateFailed = 'file_create_failed',
  FileNotFound = 'file_not_found',
  FileNotReady = 'file_not_ready',
  FileDeleteForbidden = 'file_delete_forbidden',
  FileDeleteFailed = 'file_delete_failed',
  FolderUpdateForbidden = 'folder_update_forbidden',
  StorageLimitExceeded = 'storage_limit_exceeded',
  FileTooLarge = 'file_too_large',
  FolderUpdateFailed = 'folder_update_failed',
  MessageCreateForbidden = 'message_create_forbidden',
  MessageCreateFailed = 'message_create_failed',
  MessageDeleteForbidden = 'message_delete_forbidden',
  MessageDeleteFailed = 'message_delete_failed',
  MessageNotFound = 'message_not_found',
  NodeReactionCreateForbidden = 'node_reaction_create_forbidden',
}
