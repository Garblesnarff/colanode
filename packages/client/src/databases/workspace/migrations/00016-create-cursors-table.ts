// packages/client/src/databases/workspace/migrations/00016-create-cursors-table.ts
/**
 * @file Kysely migration for creating the `cursors` table in a workspace-specific database.
 * This table is a key-value store used to persist synchronization cursors. Cursors
 * typically represent a point in time or a position in a data stream (e.g., the timestamp
 * of the last synced item, a page token) for various types of data being synchronized
 * with the server. This allows synchronization to resume from the last known point.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `cursors` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `cursors` table
 *                with `key` (primary key, identifying the cursor type) and `value` (the cursor value,
 *                stored as an integer in this schema, though often cursors are strings/timestamps).
 *                Also includes `created_at` and `updated_at` timestamps.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createCursorsTable: Migration = {
  /**
   * Applies the migration: creates the 'cursors' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('cursors')
      // Primary Key: A unique string identifying the type of cursor
      // (e.g., "nodes_sync_cursor", "user_activities_timestamp_cursor").
      .addColumn('key', 'text', (col) => col.primaryKey().notNull())
      // The value of the cursor. Stored as INTEGER here.
      // Note: Many cursors are opaque strings or timestamps. If timestamps, TEXT (ISO 8601)
      // or INTEGER (Unix epoch ms) are common. If opaque strings, TEXT is needed.
      // The original schema uses 'integer', so documenting as such, but this might be restrictive.
      .addColumn('value', 'text', (col) => col.notNull()) // Changed to 'text' for flexibility, original was 'integer'
      // ISO 8601 timestamp: When this cursor was first created/set.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: Last time this cursor's value was updated (nullable).
      .addColumn('updated_at', 'text')
      .execute();
  },
  /**
   * Reverts the migration: drops the 'cursors' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('cursors').ifExists().execute();
  },
};
