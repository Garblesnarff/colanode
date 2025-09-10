// packages/core/src/types/workspaces.ts
/**
 * @file Defines Zod schemas, TypeScript types, and enums related to Workspaces
 * and Users within the context of a workspace. This includes workspace status,
 * user status within a workspace, workspace roles, and various input/output
 * structures for workspace and user management operations.
 */
// packages/core/src/types/workspaces.ts
/**
 * @file Defines Zod schemas, TypeScript types, and enums related to Workspaces
 * and Users within the context of a workspace. This includes workspace status,
 * user status within a workspace, workspace roles, and various input/output
 * structures for workspace and user management operations.
 */
import { z } from 'zod/v4';

/**
 * Enumerates the possible statuses of a Workspace.
 * - `Active`: The workspace is active and usable.
 * - `Inactive`: The workspace is inactive (e.g., archived, suspended).
 */
export enum WorkspaceStatus {
  /** Workspace is active and operational. */
  Active = 1,
  /** Workspace is not currently active (e.g., archived, disabled). */
  Inactive = 2,
}

/**
 * Enumerates the possible statuses of a User within a specific Workspace.
 * - `Active`: The user is an active member of the workspace.
 * - `Removed`: The user has been removed from the workspace.
 */
export enum UserStatus {
  /** User is an active member of the workspace. */
  Active = 1,
  /** User has been removed or is no longer part of the workspace. */
  Removed = 2,
}

/**
 * Zod enum schema for defining the roles a user can have within a Workspace.
 * - `owner`: Highest level of control, typically the creator of the workspace.
 * - `admin`: Administrative privileges within the workspace.
 * - `collaborator`: Standard member with rights to create and edit content.
 * - `guest`: Limited access, often restricted to viewing or specific items.
 * - `none`: Represents no specific role or an unassigned state (less common for active users).
 */
export const workspaceRoleSchema = z.enum([
  'owner',
  'admin',
  'collaborator',
  'guest',
  'none', // 'none' might indicate a user invited but not yet accepted, or a default.
]);
/** TypeScript type for workspace roles. */
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

/**
 * Zod schema for input data when creating a new Workspace.
 *
 * @property name - The desired name for the new workspace.
 * @property description - Optional description for the workspace.
 * @property avatar - Optional URL or identifier for the workspace's avatar/logo.
 */
export const workspaceCreateInputSchema = z.object({
  name: z.string().min(1, { message: "Workspace name cannot be empty" }),
  description: z.string().nullable().optional(),
  avatar: z.string().url({ message: "Invalid avatar URL" }).nullable().optional(),
});
/** TypeScript type for workspace creation input data. */
export type WorkspaceCreateInput = z.infer<typeof workspaceCreateInputSchema>;

/**
 * Zod schema for representing a user's specific details and context within a workspace.
 * This is often part of a larger {@link WorkspaceOutput} structure.
 *
 * @property id - The user's unique identifier within this workspace context (might be a specific UserWorkspaceLink ID).
 * @property accountId - The global account ID of the user.
 * @property role - The user's {@link WorkspaceRole} in this workspace.
 * @property storageLimit - String representation of the user's storage limit in this workspace (e.g., "10GB").
 * @property maxFileSize - String representation of the maximum allowed file size for uploads by this user (e.g., "100MB").
 */
export const workspaceUserOutputSchema = z.object({
  id: z.string(), // User's ID specific to this workspace context (e.g., a membership ID)
  accountId: z.string(), // Global account ID of the user
  role: workspaceRoleSchema,
  storageLimit: z.string(), // e.g., "10GB", "unlimited"
  maxFileSize: z.string(), // e.g., "100MB"
});
/** TypeScript type for workspace-specific user output data. */
export type WorkspaceUserOutput = z.infer<typeof workspaceUserOutputSchema>;

/**
 * Zod schema for the standard output structure of a Workspace, including details about the current user's context within it.
 *
 * @property id - Unique identifier of the workspace.
 * @property name - Display name of the workspace.
 * @property description - Optional description of the workspace.
 * @property avatar - Optional URL or identifier for the workspace's avatar.
 * @property user - The {@link WorkspaceUserOutput} data for the current user in relation to this workspace.
 */
export const workspaceOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  user: workspaceUserOutputSchema, // Current user's context within this workspace
});
/** TypeScript type for standard workspace output data. */
export type WorkspaceOutput = z.infer<typeof workspaceOutputSchema>;

/**
 * Zod schema for input data when updating an existing Workspace.
 *
 * @property name - The new name for the workspace.
 * @property description - Optional new description for the workspace.
 * @property avatar - Optional new URL or identifier for the workspace's avatar.
 */
export const workspaceUpdateInputSchema = z.object({
  name: z.string().min(1, { message: "Workspace name cannot be empty" }),
  description: z.string().nullable().optional(),
  avatar: z.string().url({ message: "Invalid avatar URL" }).nullable().optional(),
});
/** TypeScript type for workspace update input data. */
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateInputSchema>;

/**
 * Zod schema for input data when inviting/creating a single user within a workspace.
 *
 * @property email - Email address of the user to be invited/created.
 * @property role - The {@link WorkspaceRole} to assign to the user in the workspace.
 */
export const userCreateInputSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: workspaceRoleSchema,
});
/** TypeScript type for single user creation/invitation input. */
export type UserCreateInput = z.infer<typeof userCreateInputSchema>;

/**
 * Zod schema for input data when inviting/creating multiple users within a workspace.
 *
 * @property users - An array of {@link UserCreateInput} objects.
 */
export const usersCreateInputSchema = z.object({
  users: z.array(userCreateInputSchema),
});
/** TypeScript type for multiple user creation/invitation input. */
export type UsersCreateInput = z.infer<typeof usersCreateInputSchema>;

/**
 * Zod schema for the output data representing a user within a workspace context.
 *
 * @property id - User's unique identifier in this workspace (e.g., membership ID).
 * @property email - User's email address.
 * @property name - User's global display name.
 * @property avatar - Optional URL for the user's global avatar.
 * @property role - User's {@link WorkspaceRole} in this workspace.
 * @property customName - Optional custom display name for the user within this specific workspace.
 * @property customAvatar - Optional custom avatar URL for the user within this specific workspace.
 * @property createdAt - ISO 8601 timestamp of when the user joined/was added to the workspace.
 * @property updatedAt - Optional ISO 8601 timestamp of the last update to the user's workspace-specific details.
 * @property revision - A revision string or number, perhaps for optimistic concurrency control.
 * @property status - The user's {@link UserStatus} within this workspace.
 */
export const userOutputSchema = z.object({
  id: z.string(), // User-Workspace link ID or specific User ID in this context
  email: z.string().email(),
  name: z.string(), // Global name
  avatar: z.string().url().nullable().optional(), // Global avatar
  role: workspaceRoleSchema,
  customName: z.string().nullable().optional(), // Workspace-specific display name
  customAvatar: z.string().url().nullable().optional(), // Workspace-specific avatar
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable().optional(),
  revision: z.string(), // Or z.number()
  status: z.nativeEnum(UserStatus),
});
/** TypeScript type for user output data within a workspace context. */
export type UserOutput = z.infer<typeof userOutputSchema>;

/**
 * Zod schema for an error object when creating/inviting a single user fails.
 *
 * @property email - The email address for which the creation/invitation failed.
 * @property error - A string message describing the error.
 */
export const userCreateErrorOutputSchema = z.object({
  email: z.string().email(),
  error: z.string(),
});
/** TypeScript type for user creation error output. */
export type UserCreateErrorOutput = z.infer<typeof userCreateErrorOutputSchema>;

/**
 * Zod schema for the output data after attempting to create/invite multiple users.
 * Includes lists of successfully created users and any errors encountered.
 *
 * @property users - An array of {@link UserOutput} for successfully created/invited users.
 * @property errors - An array of {@link UserCreateErrorOutput} for users that failed.
 */
export const usersCreateOutputSchema = z.object({
  users: z.array(userOutputSchema),
  errors: z.array(userCreateErrorOutputSchema),
});
/** TypeScript type for multiple user creation output. */
export type UsersCreateOutput = z.infer<typeof usersCreateOutputSchema>;

/**
 * Zod schema for input data when updating a user's role within a workspace.
 *
 * @property role - The new {@link WorkspaceRole} to assign to the user.
 */
export const userRoleUpdateInputSchema = z.object({
  role: workspaceRoleSchema,
});
/** TypeScript type for user role update input. */
export type UserRoleUpdateInput = z.infer<typeof userRoleUpdateInputSchema>;
