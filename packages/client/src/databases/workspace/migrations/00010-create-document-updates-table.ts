// packages/client/src/databases/workspace/migrations/00010-create-document-updates-table.ts
/**
 * @file Kysely migration for creating the `document_updates` table in a workspace-specific database.
 * This table stores individual CRDT updates (e.g., Yjs update blobs) for document content.
 * These updates are typically queued locally before being sent to the server or applied
 * to a local CRDT document state.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `document_updates` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `document_updates` table
 *                with columns for `id` (primary key for the update itself), `document_id` (foreign key
 *                to `documents.id`), `data` (blob for CRDT update), and `created_at` timestamp.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createDocumentUpdatesTable: Migration = {
  /**
   * Applies the migration: creates the 'document_updates' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('document_updates')
      // Primary Key: Unique identifier for this specific update entry.
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      // Foreign Key: References the 'id' of the document in the 'documents' table that this update pertains to.
      // onDelete('cascade') ensures that if the parent document is deleted, its pending updates are also removed.
      .addColumn('document_id', 'text', (col) =>
        col.notNull().references('documents.id').onDelete('cascade')
      )
      // The CRDT update data itself, stored as a BLOB (Binary Large Object).
      // This typically holds a Yjs update (Uint8Array) for document content.
      .addColumn('data', 'blob', (col) => col.notNull())
      // ISO 8601 timestamp: When this update was generated locally.
      .addColumn('created_at', 'text', (col) => col.notNull())
      .execute();

    // Consider an index on document_id if querying updates for a specific document is common.
    // await db.schema.createIndex('document_updates_document_id_idx').on('document_updates').column('document_id').execute();
  },
  /**
   * Reverts the migration: drops the 'document_updates' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('document_updates').ifExists().execute();
  },
};
