// packages/client/src/databases/workspace/migrations/00005-create-node-interactions-table.ts
/**
 * @file Kysely migration for creating the `node_interactions` table in a workspace-specific database.
 * This table tracks user interactions with nodes, such as when a user first sees or opens a node,
 * and the last time these interactions occurred. This is useful for features like "unread" indicators
 * or activity feeds.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `node_interactions` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_interactions` table
 *                with a composite primary key on (`node_id`, `collaborator_id`). Columns include
 *                `root_id` for context, `revision` for the interaction state, and nullable timestamps for
 *                `first_seen_at`, `last_seen_at`, `first_opened_at`, and `last_opened_at`.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeInteractionsTable: Migration = {
  /**
   * Applies the migration: creates the 'node_interactions' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('node_interactions')
      // Foreign Key: References the 'id' of the node in the 'nodes' table. Part of Composite PK.
      .addColumn('node_id', 'text', (col) =>
        col.notNull().references('nodes.id').onDelete('cascade')
      )
      // Foreign Key: References the 'id' of the user in the 'users' table. Part of Composite PK.
      .addColumn('collaborator_id', 'text', (col) =>
        col.notNull().references('users.id').onDelete('cascade')
      )
      // ID of the root of this node's hierarchy (e.g., Space ID). Useful for contextual queries.
      .addColumn('root_id', 'text', (col) => col.notNull())
      // Revision of this interaction record, for sync purposes. Changed to 'text'.
      .addColumn('revision', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the collaborator first saw this node (or this revision of it). Nullable.
      .addColumn('first_seen_at', 'text')
      // ISO 8601 timestamp: Last time the collaborator saw this node. Nullable.
      .addColumn('last_seen_at', 'text')
      // ISO 8601 timestamp: When the collaborator first opened this node. Nullable.
      .addColumn('first_opened_at', 'text')
      // ISO 8601 timestamp: Last time the collaborator opened this node. Nullable.
      .addColumn('last_opened_at', 'text')
      // Defines a composite primary key on node_id and collaborator_id.
      .addPrimaryKeyConstraint('node_interactions_pkey', [
        'node_id',
        'collaborator_id',
      ])
      .execute();

    // Consider indexes on root_id or timestamps if frequently queried.
    // await db.schema.createIndex('node_interactions_root_id_idx').on('node_interactions').column('root_id').execute();
  },
  /**
   * Reverts the migration: drops the 'node_interactions' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('node_interactions').ifExists().execute();
  },
};
