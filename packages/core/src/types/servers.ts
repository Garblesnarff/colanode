// packages/core/src/types/servers.ts
/**
 * @file Defines Zod schemas and TypeScript types related to server configuration.
 * This includes settings for authentication methods (like Google OAuth) and general server information.
 */
import { z } from 'zod/v4';

/**
 * Zod schema for Google OAuth configuration on the server.
 * This is a discriminated union based on the `enabled` property.
 * If enabled, a `clientId` is required.
 *
 * @property enabled - Boolean indicating if Google OAuth is enabled.
 * @property clientId - (Only if enabled=true) The Google OAuth client ID for this server.
 */
export const serverGoogleConfigSchema = z.discriminatedUnion('enabled', [
  z.object({
    enabled: z.literal(true),
    clientId: z.string().min(1, { message: "Google Client ID cannot be empty when enabled" }),
  }),
  z.object({
    enabled: z.literal(false),
    // No clientId needed if not enabled
  }),
]);
/** TypeScript type for server's Google OAuth configuration. */
export type ServerGoogleConfig = z.infer<typeof serverGoogleConfigSchema>;


/**
 * Zod schema for server-side account configuration, potentially including various authentication methods.
 *
 * @property google - Configuration for Google OAuth, as defined by {@link serverGoogleConfigSchema}.
 */
export const serverAccountConfigSchema = z.object({
  google: serverGoogleConfigSchema,
  // Potentially other auth methods here, e.g., emailPassword: z.object({ enabled: z.boolean() })
});
/** TypeScript type for server's account configuration. */
export type ServerAccountConfig = z.infer<typeof serverAccountConfigSchema>;

/**
 * Zod schema for the overall server configuration.
 * This data is typically fetched by clients to understand server capabilities and display information.
 *
 * @property name - The display name of the Colanode server.
 * @property avatar - URL or identifier for the server's avatar/logo.
 * @property version - The version of the Colanode server software.
 * @property sha - The Git commit SHA (short hash) of the server build.
 * @property ip - Optional public IP address of the server (may not always be available or relevant).
 * @property pathPrefix - Optional URL path prefix if the server is hosted under a subpath (e.g., "/colanode").
 * @property account - Optional account configuration settings, including authentication methods ({@link ServerAccountConfig}).
 */
export const serverConfigSchema = z.object({
  /** Display name of the server. */
  name: z.string().min(1, { message: "Server name cannot be empty" }),
  /** URL or identifier for the server's avatar or logo. */
  avatar: z.string().url({ message: "Invalid avatar URL" }), // Assuming avatar is a URL
  /** Version of the server software (e.g., "1.0.0"). */
  version: z.string(),
  /** Git commit SHA (short hash) of the server build. */
  sha: z.string(),
  /** Optional public IP address of the server. */
  ip: z.string().ip({ message: "Invalid IP address" }).nullable().optional(), // Validate as IP if present
  /** Optional URL path prefix if the server is not at the root of its domain. */
  pathPrefix: z.string().startsWith('/', { message: "Path prefix must start with /" }).nullable().optional(),
  /** Optional server-side account and authentication configuration. */
  account: serverAccountConfigSchema.nullable().optional(),
});

/**
 * TypeScript type for the overall server configuration.
 * Inferred from `serverConfigSchema`.
 */
export type ServerConfig = z.infer<typeof serverConfigSchema>;
