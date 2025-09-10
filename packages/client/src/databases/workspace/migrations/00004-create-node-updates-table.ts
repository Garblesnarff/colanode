// packages/client/src/databases/workspace/migrations/00004-create-node-updates-table.ts
/**
 * @file Kysely migration for creating the `node_updates` table in a workspace-specific database.
 * This table stores individual CRDT updates (e.g., Yjs update blobs) for node attributes.
 * These updates are typically queued locally before being sent to the server or applied
 * to a local CRDT state.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `node_updates` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_updates` table
 *                with columns for `id` (primary key for the update itself), `node_id` (foreign key
 *                to `nodes.id`), `data` (blob for CRDT update), and `created_at` timestamp.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeUpdatesTable: Migration = {
  /**
   * Applies the migration: creates the 'node_updates' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('node_updates')
      // Primary Key: Unique identifier for this specific update entry.
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      // Foreign Key: References the 'id' of the node in the 'nodes' table that this update pertains to.
      // onDelete('cascade') ensures that if the parent node is deleted, its pending updates are also removed.
      .addColumn('node_id', 'text', (col) =>
        col.notNull().references('nodes.id').onDelete('cascade')
      )
      // The CRDT update data itself, stored as a BLOB (Binary Large Object).
      // This typically holds a Yjs update (Uint8Array).
      .addColumn('data', 'blob', (col) => col.notNull())
      // ISO 8601 timestamp: When this update was generated locally.
      .addColumn('created_at', 'text', (col) => col.notNull())
      .execute();

    // Consider an index on node_id if querying updates for a specific node is common.
    // await db.schema.createIndex('node_updates_node_id_idx').on('node_updates').column('node_id').execute();
  },
  /**
   * Reverts the migration: drops the 'node_updates' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('node_updates').ifExists().execute();
  },
};
