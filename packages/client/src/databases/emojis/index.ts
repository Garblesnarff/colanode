// packages/client/src/databases/emojis/index.ts
/**
 * @file Entry point for the emojis local database module.
 * This module is responsible for managing a local cache or store of emoji data,
 * which can be used by the rich text editor or other UI components.
 *
 * It primarily re-exports the schema definition for the emojis database.
 * Migrations, if any, would typically also be managed or exported from here or a sub-directory.
 */

/** @module databases/emojis/schema Exports the Kysely schema definition for the emojis database. */
export * from './schema';
// If there were migrations for the emojis DB, they might be exported like:
// export * from './migrations';
