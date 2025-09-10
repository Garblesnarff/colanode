// packages/client/src/databases/workspace/migrations/00007-create-node-texts-table.ts
/**
 * @file Kysely migration for creating the `node_texts` virtual table using SQLite FTS5.
 * This table is designed for Full-Text Search capabilities on node content, specifically
 * indexing the `name` and `attributes` (extracted textual content from node attributes)
 * for efficient searching.
 */
import { Kysely, Migration, sql } from 'kysely'; // Kysely type for DB instance

/**
 * Defines the Kysely migration object for creating the `node_texts` FTS5 virtual table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_texts`
 *                virtual table using FTS5 with columns `id` (unindexed, typically references `nodes.id`),
 *                `name`, and `attributes`. The `content=''` and `contentless_delete=1` options are
 *                SQLite FTS5 specific configurations.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeTextsTable: Migration = {
  /**
   * Applies the migration: creates the 'node_texts' FTS5 virtual table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    // Creates an FTS5 virtual table for full-text searching on node names and attributes.
    // - `id UNINDEXED`: The 'id' column stores the node ID but is not part of the FTS index itself.
    //   It's used to link search results back to the actual node in the 'nodes' table.
    // - `name`: Text content from the node's name to be indexed.
    // - `attributes`: Text content extracted from the node's attributes to be indexed.
    // - `content=''`: Specifies that the FTS5 table does not have its own separate content column,
    //   meaning it indexes the content of other specified columns (`name`, `attributes`).
    // - `contentless_delete=1`: An FTS5 option that can improve performance for tables where
    //   rows are frequently deleted. It changes how FTS5 handles deletions internally.
    await sql`
      CREATE VIRTUAL TABLE node_texts USING fts5(
        id UNINDEXED,
        name,
        attributes,
        content='',
        contentless_delete=1
      );
    `.execute(db);
  },
  /**
   * Reverts the migration: drops the 'node_texts' virtual table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    // Drops the FTS5 virtual table if it exists.
    await sql`
      DROP TABLE IF EXISTS node_texts;
    `.execute(db);
  },
};
