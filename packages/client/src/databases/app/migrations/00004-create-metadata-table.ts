// packages/client/src/databases/app/migrations/00004-create-metadata-table.ts
/**
 * @file Kysely migration for creating the `metadata` table in the application database.
 * This table serves as a key-value store for general application settings,
 * preferences, or other miscellaneous metadata that needs to be persisted locally.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for the `metadata` table.
 *
 * @property up - Asynchronous function to apply the migration (create the table).
 *                It defines columns for a unique `key` (primary key), a `value` (stored as text),
 *                a `created_at` timestamp, and an `updated_at` timestamp.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createMetadataTable: Migration = {
  /**
   * Applies the migration: creates the 'metadata' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('metadata')
      // The unique key for the metadata item (e.g., "theme", "lastActiveWorkspaceId").
      .addColumn('key', 'text', (col) => col.primaryKey().notNull())
      // The value associated with the key, stored as a text string.
      // Consumers of this table will need to parse/stringify complex values (e.g., JSON).
      .addColumn('value', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When this metadata key was first created.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: Last time this metadata value was updated. Nullable.
      .addColumn('updated_at', 'text')
      .execute();
  },
  /**
   * Reverts the migration: drops the 'metadata' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('metadata').ifExists().execute();
  },
};
