// packages/client/src/databases/workspace/migrations/00015-create-tombstones-table.ts
/**
 * @file Kysely migration for creating the `tombstones` table in a workspace-specific database.
 * This table stores records of entities (like nodes or documents) that have been deleted.
 * Tombstones are crucial for correctly synchronizing deletions across different clients
 * and the server, ensuring that an entity deleted on one client is also removed elsewhere,
 * rather than being mistakenly re-added or re-synced.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `tombstones` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `tombstones` table
 *                with columns for `id` (primary key, the ID of the deleted entity), `data`
 *                (optional snapshot of the entity at deletion), and `deleted_at` timestamp.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createTombstonesTable: Migration = {
  /**
   * Applies the migration: creates the 'tombstones' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('tombstones')
      // Primary Key: The ID of the entity that was deleted.
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      // Optional: Serialized JSON string of the entity's data at the time of deletion.
      // This can be useful for audit trails, potential recovery, or understanding context,
      // but might also be omitted or store just the entity type if data size is a concern.
      // The current schema has it as `NOT NULL`, which implies some data (even if just `"{}"` or type) is always stored.
      .addColumn('data', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the entity was marked as deleted locally.
      .addColumn('deleted_at', 'text', (col) => col.notNull())
      .execute();
  },
  /**
   * Reverts the migration: drops the 'tombstones' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('tombstones').ifExists().execute();
  },
};
