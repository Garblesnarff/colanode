// packages/core/src/types/files.ts
/**
 * @file Defines Zod schemas, TypeScript types, and enums related to file handling,
 * including file uploads, subtypes, and statuses.
 */
import { z } from 'zod/v4';

/**
 * Zod schema for the output data after initiating a file upload process.
 * This typically indicates that the server is ready to receive file chunks or the complete file.
 *
 * @property success - A boolean indicating whether the upload initialization was successful.
 * @property uploadId - A unique identifier for this specific upload transaction.
 *                      This ID is often used in subsequent requests to upload file parts or complete the upload.
 */
export const fileUploadOutputSchema = z.object({
  /** Indicates if the file upload initialization was successful. */
  success: z.boolean(),
  /** Unique identifier for the upload transaction. */
  uploadId: z.string(),
});

/**
 * TypeScript type for the output data of a file upload initialization.
 * Inferred from `fileUploadOutputSchema`.
 */
export type FileUploadOutput = z.infer<typeof fileUploadOutputSchema>;

/**
 * Zod enum schema defining broad categories or subtypes for files.
 * This helps in categorizing files for display or specific handling logic
 * based on their general type derived from MIME types.
 * See `extractFileSubtype` in `packages/core/src/lib/files.ts`.
 *
 * - `image`: For image files (e.g., JPEG, PNG, GIF).
 * - `video`: For video files (e.g., MP4, WebM, AVI).
 * - `audio`: For audio files (e.g., MP3, WAV, OGG).
 * - `pdf`: For PDF documents.
 * - `other`: For any other file types not fitting the above categories.
 */
export const fileSubtypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'pdf',
  'other',
]);

/**
 * TypeScript type representing the general subtype of a file.
 * Inferred from `fileSubtypeSchema`.
 */
export type FileSubtype = z.infer<typeof fileSubtypeSchema>;

/**
 * Enumerates the possible statuses of a file, often in the context of uploads or processing.
 * - `Pending`: The file operation (e.g., upload, processing) is initiated but not yet complete.
 * - `Ready`: The file is successfully uploaded/processed and available for use.
 * - `Error`: An error occurred during the file operation.
 */
export enum FileStatus {
  /** File operation is pending or in progress. */
  Pending = 0,
  /** File is ready and available. */
  Ready = 1,
  /** An error occurred during the file operation. */
  Error = 2,
}
