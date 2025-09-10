// packages/client/src/databases/workspace/migrations/00014-create-mutations-table.ts
/**
 * @file Kysely migration for creating the `mutations` table in a workspace-specific database.
 * This table serves as an offline queue for pending data mutations (changes) that need to be
 * synchronized with the server. Each row represents a single mutation operation.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `mutations` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `mutations` table
 *                with columns for `id` (primary key for the mutation), `type` (mutation type string),
 *                `data` (serialized mutation payload), `created_at` timestamp, and `retries` count.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createMutationsTable: Migration = {
  /**
   * Applies the migration: creates the 'mutations' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('mutations')
      // Primary Key: Unique identifier for this mutation instance.
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      // Type of the mutation (e.g., "node.create", "document.update").
      // Corresponds to `MutationType` from '@colanode/core'.
      .addColumn('type', 'text', (col) => col.notNull())
      // Serialized JSON string of the mutation's specific data payload.
      .addColumn('data', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the mutation was generated locally.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // Number of synchronization attempts made for this mutation.
      // Starts at 0 and increments on failed sync attempts.
      .addColumn('retries', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();

    // Consider an index on 'created_at' if mutations are often processed in chronological order.
    // await db.schema.createIndex('mutations_created_at_idx').on('mutations').column('created_at').execute();
  },
  /**
   * Reverts the migration: drops the 'mutations' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('mutations').ifExists().execute();
  },
};
