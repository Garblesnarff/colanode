// packages/client/src/databases/workspace/migrations/00008-create-documents-table.ts
/**
 * @file Kysely migration for creating the `documents` table in a workspace-specific database.
 * This table stores the actual content of documents associated with nodes (e.g., the
 * rich text content of a PageNode, or the structured data of a RecordNode's description area).
 * It includes metadata like revisions, timestamps, and creator/updater information.
 * A generated column `type` is extracted from the `content` JSON for easier querying.
 */
import { Kysely, Migration, sql } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `documents` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `documents` table
 *                with columns for `id` (primary key, typically references a `nodes.id`),
 *                a generated `type` column (from content JSON), local and server revisions,
 *                the `content` itself (as JSON text), creation/update timestamps, and user IDs.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createDocumentsTable: Migration = {
  /**
   * Applies the migration: creates the 'documents' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('documents')
      // Primary Key: Unique identifier for the document. Often the same as the Node ID it belongs to.
      // This also acts as a Foreign Key to `nodes.id`.
      .addColumn('id', 'text', (col) =>
        col.primaryKey().notNull().references('nodes.id').onDelete('cascade')
      )
      // Document type (e.g., "rich_text"), extracted from 'content' JSON. Stored for indexing.
      .addColumn('type', 'text', (col) =>
        col
          .notNull()
          // SQLite specific: generated column extracting 'type' from the 'content' JSON.
          .generatedAlwaysAs(sql`json_extract(content, '$.type')`)
          .stored() // Ensures the generated value is stored and can be indexed.
      )
      // Revision of the local version of the document. Changed to text.
      .addColumn('local_revision', 'text', (col) => col.notNull())
      // Revision of the server version of the document. Changed to text.
      .addColumn('server_revision', 'text', (col) => col.notNull())
      // JSON string containing the actual document content (e.g., block structure for rich text).
      .addColumn('content', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the document was created.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // User ID of the creator.
      .addColumn('created_by', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When the document was last updated (nullable).
      .addColumn('updated_at', 'text')
      // User ID of the last updater (nullable).
      .addColumn('updated_by', 'text')
      .execute();

    // Consider an index on 'type' if querying by document type is common.
    // await db.schema.createIndex('documents_type_idx').on('documents').column('type').execute();
  },
  /**
   * Reverts the migration: drops the 'documents' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('documents').ifExists().execute();
  },
};
