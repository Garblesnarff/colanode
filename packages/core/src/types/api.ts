// packages/core/src/types/api.ts
/**
 * @file Defines enums for API headers and error codes, and a Zod schema
 * and TypeScript type for standard API error responses.
 */
import { z } from 'zod/v4';

/**
 * Enumerates custom HTTP headers used in API requests to provide client information.
 *
 * @property ClientType - Header name for specifying the client type (e.g., "web", "desktop", "mobile").
 * @property ClientPlatform - Header name for specifying the client's operating system or platform (e.g., "windows", "macos", "linux", "ios", "android").
 * @property ClientVersion - Header name for specifying the version of the client application.
 */
export enum ApiHeader {
  /** Specifies the type of client making the request (e.g., 'web', 'desktop'). */
  ClientType = 'colanode-client-type',
  /** Specifies the platform the client is running on (e.g., 'windows', 'ios'). */
  ClientPlatform = 'colanode-client-platform',
  /** Specifies the version of the client application. */
  ClientVersion = 'colanode-client-version',
}

/**
 * Enumerates standardized error codes that can be returned by the API.
 * These codes provide a more granular way for clients to handle errors
 * beyond generic HTTP status codes.
 */
export enum ApiErrorCode {
  // Account Errors
  AccountNotFound = 'account_not_found',
  DeviceNotFound = 'device_not_found',
  AccountMismatch = 'account_mismatch',
  AccountOtpInvalid = 'account_otp_invalid',
  AccountOtpTooManyAttempts = 'account_otp_too_many_attempts',
  AccountPendingVerification = 'account_pending_verification',
  EmailOrPasswordIncorrect = 'email_or_password_incorrect',
  GoogleAuthFailed = 'google_auth_failed',
  AccountCreationFailed = 'account_creation_failed',
  EmailAlreadyExists = 'email_already_exists',

  // Avatar Errors
  AvatarNotFound = 'avatar_not_found',
  AvatarDownloadFailed = 'avatar_download_failed',
  AvatarFileNotUploaded = 'avatar_file_not_uploaded',
  AvatarUploadFailed = 'avatar_upload_failed',

  // Workspace Errors
  WorkspaceNameRequired = 'workspace_name_required',
  WorkspaceDeleteNotAllowed = 'workspace_delete_not_allowed',
  WorkspaceNotFound = 'workspace_not_found',
  WorkspaceNoAccess = 'workspace_no_access',
  WorkspaceUpdateNotAllowed = 'workspace_update_not_allowed',
  WorkspaceUpdateFailed = 'workspace_update_failed',

  // File Errors
  FileNotFound = 'file_not_found',
  FileNoAccess = 'file_no_access',
  FileNotReady = 'file_not_ready',
  FileOwnerMismatch = 'file_owner_mismatch',
  FileAlreadyUploaded = 'file_already_uploaded',
  FileUploadInitFailed = 'file_upload_init_failed',
  WorkspaceMismatch = 'workspace_mismatch', // Often related to file operations in wrong workspace
  FileError = 'file_error', // Generic file error
  FileSizeMismatch = 'file_size_mismatch',
  FileMimeTypeMismatch = 'file_mime_type_mismatch',
  FileUploadCompleteFailed = 'file_upload_complete_failed',
  FileUploadNotFound = 'file_upload_not_found',

  // User/Permissions Errors
  UserEmailRequired = 'user_email_required',
  UserInviteNoAccess = 'user_invite_no_access',
  UserUpdateNoAccess = 'user_update_no_access',
  UserNotFound = 'user_not_found',

  // Authentication/Token Errors
  TokenMissing = 'token_missing',
  TokenInvalid = 'token_invalid',

  // Generic Node/Resource Errors
  RootNotFound = 'root_not_found', // e.g., when a base entity for an operation is missing

  // General API Errors
  ValidationError = 'validation_error', // Input data failed validation
  TooManyRequests = 'too_many_requests', // Rate limiting
  Unauthorized = 'unauthorized', // Missing or invalid authentication
  Forbidden = 'forbidden', // Authenticated but not permitted to perform action
  NotFound = 'not_found', // Generic resource not found
  BadRequest = 'bad_request', // Malformed request or invalid parameters not covered by ValidationError
  Unknown = 'unknown', // Unspecified server-side error
}

/**
 * Zod schema for the standard structure of an API error response.
 *
 * @property message - A human-readable message describing the error.
 * @property code - An {@link ApiErrorCode} providing a machine-readable error type.
 */
export const apiErrorOutputSchema = z.object({
  /** Human-readable description of the error. */
  message: z.string(),
  /** Machine-readable error code from {@link ApiErrorCode}. */
  code: z.nativeEnum(ApiErrorCode), // Use nativeEnum for string enums
});

/**
 * TypeScript type for the standard API error response structure.
 * Inferred from `apiErrorOutputSchema`.
 */
export type ApiErrorOutput = z.infer<typeof apiErrorOutputSchema>;
