// packages/core/src/types/avatars.ts
/**
 * @file Defines Zod schemas and TypeScript types related to avatar uploads.
 * Avatars can be associated with users, workspaces, or other entities.
 */
import { z } from 'zod/v4';

/**
 * Zod schema for the output data after a successful avatar upload.
 * This typically confirms the upload and provides an identifier for the uploaded avatar.
 *
 * @property success - A boolean indicating whether the avatar upload was successful.
 * @property id - The unique identifier assigned to the uploaded avatar image.
 *                This ID can then be used to reference the avatar (e.g., in a user's profile).
 */
export const avatarUploadOutputSchema = z.object({
  /** Indicates if the avatar upload operation was successful. */
  success: z.boolean(),
  /** The unique identifier for the newly uploaded avatar. */
  id: z.string(), // This might be a file ID, a specific avatar entity ID, etc.
});

/**
 * TypeScript type for the output data of an avatar upload operation.
 * Inferred from `avatarUploadOutputSchema`.
 */
export type AvatarUploadOutput = z.infer<typeof avatarUploadOutputSchema>;
