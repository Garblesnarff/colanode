// packages/client/src/databases/workspace/index.ts
/**
 * @file Entry point for the workspace-specific local database module.
 * Each workspace the user is part of will have its own instance of this database schema.
 * This database stores all data relevant to a particular workspace, such as its nodes
 * (pages, folders, databases, etc.), collaborative document content, user permissions
 * within that workspace, and synchronization metadata.
 *
 * It re-exports schema definitions and migration logic for this database type.
 */

/** @module databases/workspace/schema Exports the Kysely schema definition for workspace-specific databases. */
export * from './schema';
/** @module databases/workspace/migrations Exports migration functions or definitions for workspace-specific databases. */
export * from './migrations';
