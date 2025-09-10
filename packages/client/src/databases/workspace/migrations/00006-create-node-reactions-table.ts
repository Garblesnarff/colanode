// packages/client/src/databases/workspace/migrations/00006-create-node-reactions-table.ts
/**
 * @file Kysely migration for creating the `node_reactions` table in a workspace-specific database.
 * This table stores user reactions (e.g., emojis) applied to nodes. Each row represents
 * a unique reaction by a specific user to a specific node.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `node_reactions` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_reactions` table
 *                with a composite primary key on (`node_id`, `collaborator_id`, `reaction`).
 *                Columns include `root_id` for context, `revision` for sync state, and `created_at`.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeReactionsTable: Migration = {
  /**
   * Applies the migration: creates the 'node_reactions' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('node_reactions')
      // Foreign Key: References the 'id' of the node in the 'nodes' table. Part of Composite PK.
      .addColumn('node_id', 'text', (col) =>
        col.notNull().references('nodes.id').onDelete('cascade')
      )
      // Foreign Key: References the 'id' of the user in the 'users' table who made the reaction. Part of Composite PK.
      .addColumn('collaborator_id', 'text', (col) =>
        col.notNull().references('users.id').onDelete('cascade')
      )
      // The reaction itself (e.g., emoji character, or a standardized reaction name like "thumbs_up"). Part of Composite PK.
      .addColumn('reaction', 'text', (col) => col.notNull())
      // ID of the root of this node's hierarchy (e.g., Space ID). Useful for contextual queries.
      .addColumn('root_id', 'text', (col) => col.notNull())
      // Revision of this reaction, for sync purposes. Changed to 'text'.
      .addColumn('revision', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the reaction was created.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // Defines a composite primary key. A user can only have one instance of a specific reaction on a node.
      .addPrimaryKeyConstraint('node_reactions_pkey', [
        'node_id',
        'collaborator_id',
        'reaction',
      ])
      .execute();

      // Index for querying all reactions for a node:
      // await db.schema.createIndex('node_reactions_node_id_idx').on('node_reactions').column('node_id').execute();
  },
  /**
   * Reverts the migration: drops the 'node_reactions' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('node_reactions').ifExists().execute();
  },
};
