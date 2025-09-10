// packages/client/src/databases/workspace/migrations/00002-create-nodes-table.ts
/**
 * @file Kysely migration for creating the `nodes` table in a workspace-specific database.
 * This table is central to storing all entities (pages, folders, databases, etc.)
 * within a workspace. It includes common metadata and a JSON blob for type-specific attributes.
 * Generated columns `type` and `parent_id` are extracted from the `attributes` JSON
 * for easier querying and indexing.
 */
import { Kysely, Migration, sql } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `nodes` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `nodes` table
 *                with columns for ID (primary key), generated type, generated parent ID, root ID,
 *                local and server revisions, attributes (JSON text), creation/update timestamps,
 *                and creator/updater user IDs. It also creates an index on `parent_id` and `type`.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodesTable: Migration = {
  /**
   * Applies the migration: creates the 'nodes' table and an index.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('nodes')
      // Unique identifier for the node.
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      // Node type (e.g., "page", "folder"), extracted from 'attributes' JSON. Stored for indexing.
      .addColumn('type', 'text', (col) =>
        col
          .notNull()
          // SQLite specific: generated column extracting 'type' from the 'attributes' JSON.
          // This assumes 'attributes' is a JSON string where 'type' is a top-level key.
          .generatedAlwaysAs(sql`json_extract(attributes, '$.type')`)
          .stored() // Ensures the generated value is stored and can be indexed.
      )
      // ID of the parent node, extracted from 'attributes' JSON. Stored for indexing and hierarchy queries. Nullable.
      .addColumn('parent_id', 'text', (col) =>
        col
          // SQLite specific: generated column extracting 'parentId' from 'attributes'.
          .generatedAlwaysAs(sql`json_extract(attributes, '$.parentId')`)
          .stored()
      )
      // ID of the root of this node's hierarchy (e.g., Space ID or Workspace ID).
      .addColumn('root_id', 'text', (col) => col.notNull())
      // Revision of the local version of the node. Changed to text for flexibility.
      .addColumn('local_revision', 'text', (col) => col.notNull())
      // Revision of the server version of the node. Changed to text.
      .addColumn('server_revision', 'text', (col) => col.notNull())
      // JSON string containing all type-specific attributes of the node.
      .addColumn('attributes', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the node was created.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the node was last updated (nullable).
      .addColumn('updated_at', 'text')
      // User ID of the creator.
      .addColumn('created_by', 'text', (col) => col.notNull())
      // User ID of the last updater (nullable).
      .addColumn('updated_by', 'text')
      .execute();

    // Create an index on parent_id and type for efficient querying of children of a certain type.
    await db.schema
      .createIndex('nodes_parent_id_type_index')
      .on('nodes')
      .columns(['parent_id', 'type']) // Index on the generated columns
      .execute();
  },
  /**
   * Reverts the migration: drops the 'nodes' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    // It's good practice to drop indexes before dropping the table, though not strictly necessary
    // as `dropTable` usually handles associated objects. However, Kysely might require explicit index drop.
    // await db.schema.dropIndex('nodes_parent_id_type_index').ifExists().execute(); // If Kysely supports this
    await db.schema.dropTable('nodes').ifExists().execute();
  },
};
