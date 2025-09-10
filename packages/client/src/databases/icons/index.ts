// packages/client/src/databases/icons/index.ts
/**
 * @file Entry point for the icons local database module.
 * This module is responsible for managing a local cache or store of icon data,
 * which can be used throughout the application for UI elements, node representations, etc.
 *
 * It primarily re-exports the schema definition for the icons database.
 * Migrations, if any, would also typically be managed or exported from here or a sub-directory.
 */

/** @module databases/icons/schema Exports the Kysely schema definition for the icons database. */
export * from './schema';
// If there were migrations for the icons DB, they might be exported like:
// export * from './migrations';
