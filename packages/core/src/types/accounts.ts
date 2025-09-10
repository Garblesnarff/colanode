// packages/core/src/types/accounts.ts
/**
 * @file Defines Zod schemas and TypeScript types related to user accounts,
 * including account status, various input/output structures for authentication,
 * registration, and account updates.
 */
import { z } from 'zod/v4';

import { workspaceOutputSchema, WorkspaceOutput } from '@colanode/core/types/workspaces';

/**
 * Enumerates the possible statuses of a user account.
 * - `Pending`: Account created but not yet fully active or verified.
 * - `Active`: Account is active and verified.
 * - `Unverified`: Account requires verification (e.g., email verification).
 */
export enum AccountStatus {
  /** Account creation is pending, possibly awaiting initial verification or setup. */
  Pending = 0,
  /** Account is fully active and can be used. */
  Active = 1,
  /** Account has been created but requires verification (e.g., email OTP) to become active. */
  Unverified = 2,
}

/**
 * Zod schema for the standard output structure of an account's public information.
 *
 * @property id - Unique identifier of the account.
 * @property name - Display name of the account user.
 * @property email - Email address associated with the account.
 * @property avatar - Optional URL or identifier for the user's avatar.
 */
export const accountOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional().nullable(), // Ensure avatar is a URL if present
});
/** TypeScript type for the standard account output data. */
export type AccountOutput = z.infer<typeof accountOutputSchema>;

/**
 * Zod schema for input data when updating an account's mutable information.
 *
 * @property name - The new display name for the account.
 * @property avatar - Optional new URL or identifier for the user's avatar.
 */
export const accountUpdateInputSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  avatar: z.string().url().nullable().optional(),
});
/** TypeScript type for account update input data. */
export type AccountUpdateInput = z.infer<typeof accountUpdateInputSchema>;

/**
 * Zod schema for the output data after successfully updating an account.
 * Echoes the updated fields.
 *
 * @property id - Unique identifier of the account.
 * @property name - The updated display name.
 * @property avatar - The updated avatar URL or identifier.
 */
export const accountUpdateOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().url().nullable().optional(),
});
/** TypeScript type for account update output data. */
export type AccountUpdateOutput = z.infer<typeof accountUpdateOutputSchema>;

/**
 * Zod schema for input data during email-based registration.
 *
 * @property name - User's desired display name.
 * @property email - User's email address for registration.
 * @property password - User's chosen password.
 */
export const emailRegisterInputSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, "Name cannot be empty"),
  email: z.string({ required_error: 'Email is required' }).email({
    message: 'Invalid email address',
  }),
  password: z.string({ required_error: 'Password is required' }).min(8, "Password must be at least 8 characters"), // Added min length
});
/** TypeScript type for email registration input data. */
export type EmailRegisterInput = z.infer<typeof emailRegisterInputSchema>;

/**
 * Zod schema for input data during email-based login.
 *
 * @property email - User's email address.
 * @property password - User's password.
 */
export const emailLoginInputSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email({
    message: 'Invalid email address',
  }),
  password: z.string({ required_error: 'Password is required' }),
});
/** TypeScript type for email login input data. */
export type EmailLoginInput = z.infer<typeof emailLoginInputSchema>;

/**
 * Zod schema for the output data upon successful login.
 *
 * @property type - Discriminator literal, "success".
 * @property account - The {@link AccountOutput} data for the logged-in user.
 * @property workspaces - An array of {@link WorkspaceOutput} data the user is part of.
 * @property deviceId - Identifier for the device used for login, for session management.
 * @property token - Authentication token (e.g., JWT) for the session.
 */
export const loginSuccessOutputSchema = z.object({
  type: z.literal('success'),
  account: accountOutputSchema,
  workspaces: z.array(workspaceOutputSchema),
  deviceId: z.string(),
  token: z.string(),
});
/** TypeScript type for successful login output data. */
export type LoginSuccessOutput = z.infer<typeof loginSuccessOutputSchema>;

/**
 * Zod schema for the output data when login requires an additional verification step (e.g., OTP).
 *
 * @property type - Discriminator literal, "verify".
 * @property id - Identifier for the verification process (e.g., verification attempt ID).
 * @property expiresAt - ISO 8601 timestamp indicating when the verification attempt/OTP expires.
 */
export const loginVerifyOutputSchema = z.object({
  type: z.literal('verify'),
  id: z.string(), // e.g., OTP request ID or verification session ID
  expiresAt: z.date(), // Consider z.string().datetime() if serialized as string over network
});
/** TypeScript type for login verification output data. */
export type LoginVerifyOutput = z.infer<typeof loginVerifyOutputSchema>;

/**
 * Zod discriminated union schema for the overall login output.
 * Can be either a {@link LoginSuccessOutput} or a {@link LoginVerifyOutput}.
 */
export const loginOutputSchema = z.discriminatedUnion('type', [
  loginSuccessOutputSchema,
  loginVerifyOutputSchema,
]);
/** TypeScript type for the overall login output. */
export type LoginOutput = z.infer<typeof loginOutputSchema>;

/**
 * Zod schema for data returned during an account synchronization process (e.g., after reconnecting).
 *
 * @property account - The user's {@link AccountOutput} data.
 * @property workspaces - An array of {@link WorkspaceOutput} data.
 * @property token - Optional new authentication token if the session was refreshed.
 */
export const accountSyncOutputSchema = z.object({
  account: accountOutputSchema,
  workspaces: z.array(workspaceOutputSchema),
  token: z.string().optional(),
});
/** TypeScript type for account synchronization output data. */
export type AccountSyncOutput = z.infer<typeof accountSyncOutputSchema>;

/**
 * Zod schema for input data when verifying an email using an OTP.
 *
 * @property id - Identifier of the verification process (e.g., from {@link LoginVerifyOutput} or password reset init).
 * @property otp - The One-Time Password entered by the user.
 */
export const emailVerifyInputSchema = z.object({
  id: z.string(), // Verification process ID
  otp: z.string().length(6, "OTP must be 6 digits"), // Assuming OTP is a 6-digit string
});
/** TypeScript type for email verification input data. */
export type EmailVerifyInput = z.infer<typeof emailVerifyInputSchema>;

/**
 * Zod schema for input data when initiating an email password reset.
 *
 * @property email - The email address for which the password reset is requested.
 */
export const emailPasswordResetInitInputSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});
/** TypeScript type for email password reset initiation input data. */
export type EmailPasswordResetInitInput = z.infer<
  typeof emailPasswordResetInitInputSchema
>;

/**
 * Zod schema for input data when completing an email password reset.
 *
 * @property id - Identifier of the password reset process (from {@link EmailPasswordResetInitOutput}).
 * @property otp - The One-Time Password received by the user.
 * @property password - The new password chosen by the user.
 */
export const emailPasswordResetCompleteInputSchema = z.object({
  id: z.string(), // Reset process ID
  otp: z.string().length(6, "OTP must be 6 digits"),
  password: z.string().min(8, "New password must be at least 8 characters"),
});
/** TypeScript type for email password reset completion input data. */
export type EmailPasswordResetCompleteInput = z.infer<
  typeof emailPasswordResetCompleteInputSchema
>;

/**
 * Zod schema for the output data after successfully initiating a password reset.
 *
 * @property id - Identifier for this password reset process.
 * @property expiresAt - ISO 8601 timestamp indicating when the OTP/reset link expires.
 */
export const emailPasswordResetInitOutputSchema = z.object({
  id: z.string(), // Password reset process ID
  expiresAt: z.date(), // Consider z.string().datetime() for network transfer
});
/** TypeScript type for password reset initiation output data. */
export type EmailPasswordResetInitOutput = z.infer<
  typeof emailPasswordResetInitOutputSchema
>;

/**
 * Zod schema for the output data after attempting to complete a password reset.
 *
 * @property success - Boolean indicating if the password reset was successful.
 */
export const emailPasswordResetCompleteOutputSchema = z.object({
  success: z.boolean(),
});
/** TypeScript type for password reset completion output data. */
export type EmailPasswordResetCompleteOutput = z.infer<
  typeof emailPasswordResetCompleteOutputSchema
>;

/**
 * Zod schema for input data when logging in via Google (OAuth).
 *
 * @property code - The authorization code received from Google after user authentication.
 */
export const googleLoginInputSchema = z.object({
  code: z.string(), // OAuth authorization code
});
/** TypeScript type for Google login input data. */
export type GoogleLoginInput = z.infer<typeof googleLoginInputSchema>;
