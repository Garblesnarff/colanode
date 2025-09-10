// packages/client/src/databases/index.ts
/**
 * @file Main entry point for database-related modules within the `@colanode/client` package.
 *
 * This module re-exports key components and utilities for managing the client-side
 * local databases (likely SQLite). This includes database instances, schema definitions,
 * migration logic, and data access objects or services.
 *
 * Key exports typically involve:
 * - Database connection/instance providers.
 * - Schema definitions (e.g., Kysely schema).
 * - Migration runners or definitions.
 * - Repositories or DAOs for specific data entities.
 *
 * This organization centralizes database access and management for the client.
 */

/** @module databases/app Exports functionalities related to the main application-level local database. */
export * from './app';
/** @module databases/emojis Exports functionalities related to a local database for emojis cache or data. */
export * from './emojis';
/** @module databases/icons Exports functionalities related to a local database for icons cache or data. */
export * from './icons';
/** @module databases/workspace Exports functionalities related to workspace-specific local databases. */
export * from './workspace';
