// packages/client/src/databases/workspace/migrations/00019-create-node-counters-table.ts
/**
 * @file Kysely migration for creating the `node_counters` table in a workspace-specific database.
 * This table stores aggregated counts related to nodes, such as the number of children,
 * unread messages or notifications, total reactions, etc. Each counter is specific
 * to a node and a counter type.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `node_counters` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_counters` table
 *                with a composite primary key on (`node_id`, `type`). Columns include `count`
 *                (the actual counter value), `created_at`, and `updated_at` timestamps.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeCountersTable: Migration = {
  /**
   * Applies the migration: creates the 'node_counters' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('node_counters')
      // Foreign Key: ID of the node these counters pertain to. Part of Composite PK.
      .addColumn('node_id', 'text', (col) =>
        col.notNull().references('nodes.id').onDelete('cascade')
      )
      // Type of the counter (e.g., "children_count", "unread_mentions", "total_reactions").
      // Corresponds to `NodeCounterType` from '@colanode/client/types/nodes'. Part of Composite PK.
      .addColumn('type', 'text', (col) => col.notNull())
      // The current value of the counter.
      .addColumn('count', 'integer', (col) => col.notNull().defaultTo(0))
      // ISO 8601 timestamp: When this counter type was first recorded for this node.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: Last time this counter was updated (nullable).
      .addColumn('updated_at', 'text')
      // Composite Primary Key to ensure uniqueness for a node's specific counter type.
      .addPrimaryKeyConstraint('node_counters_pkey', ['node_id', 'type'])
      .execute();
  },
  /**
   * Reverts the migration: drops the 'node_counters' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('node_counters').ifExists().execute();
  },
};
