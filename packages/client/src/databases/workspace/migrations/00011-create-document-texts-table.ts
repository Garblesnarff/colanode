// packages/client/src/databases/workspace/migrations/00011-create-document-texts-table.ts
/**
 * @file Kysely migration for creating the `document_texts` virtual table using SQLite FTS5.
 * This table is designed for Full-Text Search capabilities on the content of documents
 * (e.g., rich text from PageNodes or RecordNode descriptions).
 */
import { Kysely, Migration, sql } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `document_texts` FTS5 virtual table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `document_texts`
 *                virtual table using FTS5 with columns `id` (unindexed, typically references `documents.id`)
 *                and `text` (the content to be indexed).
 *                The `content=''` and `contentless_delete=1` options are SQLite FTS5 specific configurations.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createDocumentTextsTable: Migration = {
  /**
   * Applies the migration: creates the 'document_texts' FTS5 virtual table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    // Creates an FTS5 virtual table for full-text searching on document content.
    // - `id UNINDEXED`: The 'id' column stores the document ID (likely from the 'documents' table)
    //   but is not part of the FTS index itself. It's used to link search results back.
    // - `text`: The actual textual content extracted from the document to be indexed.
    // - `content=''`: Specifies that the FTS5 table does not have its own separate content column,
    //   meaning it indexes the content of the specified `text` column.
    // - `contentless_delete=1`: An FTS5 option that can improve performance for tables where
    //   rows are frequently updated or deleted, as it changes how FTS5 handles deletions.
    await sql`
      CREATE VIRTUAL TABLE document_texts USING fts5(
        id UNINDEXED,
        text,
        content='',
        contentless_delete=1
      );
    `.execute(db);
  },
  /**
   * Reverts the migration: drops the 'document_texts' virtual table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    // Drops the FTS5 virtual table if it exists.
    await sql`
      DROP TABLE IF EXISTS document_texts;
    `.execute(db);
  },
};
