// packages/client/src/databases/workspace/migrations/00018-create-node-references-table.ts
/**
 * @file Kysely migration for creating the `node_references` table in a workspace-specific database.
 * This table tracks explicit references between nodes, such as links or mentions.
 * It helps in understanding relationships between different pieces of content,
 * for features like backlinks or graph views.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `node_references` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_references` table
 *                with a composite primary key on (`node_id`, `reference_id`, `inner_id`).
 *                Columns include `type` of reference, `created_at`, and `created_by`.
 *                An index is also created on `reference_id` for efficient lookup of backlinks.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeReferencesTable: Migration = {
  /**
   * Applies the migration: creates the 'node_references' table and an index.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('node_references')
      // Foreign Key: ID of the node that *contains* the reference (the source of the link/mention).
      .addColumn('node_id', 'text', (col) =>
        col.notNull().references('nodes.id').onDelete('cascade')
      )
      // ID of the node that is *being referenced* (the target of the link/mention).
      // This could also be a foreign key to `nodes.id` if references are always to other nodes.
      // If it can reference external URLs or other entities, 'text' is appropriate.
      // For now, assuming it's another node ID within the same workspace.
      .addColumn('reference_id', 'text', (col) =>
        col.notNull().references('nodes.id').onDelete('cascade') // Assuming internal node references
      )
      // An identifier for the specific instance of the reference within the source node's content
      // (e.g., a block ID where a link is located, or a unique ID for a mention instance).
      // This makes the primary key unique if a node can reference another node multiple times.
      .addColumn('inner_id', 'text', (col) => col.notNull())
      // Type of the reference (e.g., "link", "mention", "embed", "transclusion").
      .addColumn('type', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When this reference was created.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // User ID of the user who created this reference.
      .addColumn('created_by', 'text', (col) => col.notNull())
      // Composite Primary Key to uniquely identify a specific reference instance.
      .addPrimaryKeyConstraint('node_references_pkey', [
        'node_id',        // Source node
        'reference_id',   // Target node
        'inner_id',       // Specific instance of reference within source (e.g., block_id)
        // 'type' could also be part of PK if a source can reference a target multiple times with different types from the same inner_id.
        // However, (node_id, inner_id) should be unique if inner_id is a unique reference point in the source.
        // For simplicity, (node_id, reference_id, inner_id) is common.
      ])
      .execute();

    // Index to efficiently find all nodes that reference a specific `reference_id` (i.e., backlinks).
    await db.schema
      .createIndex('node_references_reference_id_idx')
      .on('node_references')
      .column('reference_id')
      .execute();
  },
  /**
   * Reverts the migration: drops the 'node_references' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    // It's good practice to drop indexes explicitly if the DB system doesn't do it automatically with table drop.
    // await db.schema.dropIndex('node_references_reference_id_idx').ifExists().execute(); // Kysely might need explicit drop.
    await db.schema.dropTable('node_references').ifExists().execute();
  },
};
