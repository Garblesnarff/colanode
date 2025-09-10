// packages/client/src/databases/workspace/migrations/00017-create-metadata-table.ts
/**
 * @file Kysely migration for creating the `metadata` table in a workspace-specific database.
 * This table serves as a key-value store for general settings, preferences, or other
 * miscellaneous metadata that is specific to this particular workspace.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `metadata` table
 * within a workspace-specific database.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `metadata` table
 *                with `key` (primary key, identifying the metadata item) and `value` (the metadata value,
 *                stored as text). Also includes `created_at` and `updated_at` timestamps.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createMetadataTable: Migration = {
  /**
   * Applies the migration: creates the 'metadata' table for the workspace.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('metadata')
      // Primary Key: A unique string identifying the metadata item within this workspace
      // (e.g., "last_opened_node", "workspace_theme", "feature_flags").
      .addColumn('key', 'text', (col) => col.primaryKey().notNull())
      // The value associated with the key, stored as a text string.
      // Consumers will need to parse/stringify complex values (e.g., JSON) if necessary.
      .addColumn('value', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When this metadata key-value pair was first created for this workspace.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: Last time this metadata value was updated for this workspace (nullable).
      .addColumn('updated_at', 'text')
      .execute();
  },
  /**
   * Reverts the migration: drops the 'metadata' table for the workspace.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('metadata').ifExists().execute();
  },
};
