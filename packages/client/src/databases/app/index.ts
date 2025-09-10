// packages/client/src/databases/app/index.ts
/**
 * @file Entry point for the main application-level local database module.
 * This module typically manages data that is global to the client application,
 * rather than specific to a single workspace. Examples might include user preferences,
 * server list, or cached global assets.
 *
 * It re-exports schema definitions and migration logic for this database.
 */

/** @module databases/app/schema Exports the Kysely schema definition for the application database. */
export * from './schema';
/** @module databases/app/migrations Exports migration functions or definitions for the application database. */
export * from './migrations';
