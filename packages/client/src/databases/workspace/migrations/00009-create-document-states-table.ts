// packages/client/src/databases/workspace/migrations/00009-create-document-states-table.ts
/**
 * @file Kysely migration for creating the `document_states` table in a workspace-specific database.
 * This table stores the CRDT (Conflict-free Replicated Data Type) state, typically Yjs state vectors,
 * for collaborative document content (e.g., the content of a PageNode).
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `document_states` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `document_states` table
 *                with columns for `id` (primary key, foreign key to `documents.id`), `state` (blob for CRDT data),
 *                and `revision`.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createDocumentStatesTable: Migration = {
  /**
   * Applies the migration: creates the 'document_states' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('document_states')
      // Primary Key and Foreign Key: References the 'id' of the document in the 'documents' table.
      // This indicates the CRDT state belongs to that specific document.
      // onDelete('cascade') ensures that if a document is deleted, its state is also removed.
      .addColumn('id', 'text', (col) =>
        col
          .primaryKey()
          .notNull()
          .references('documents.id') // Assumes 'documents' table exists and has 'id' as PK.
          .onDelete('cascade')
      )
      // The CRDT state data, stored as a BLOB (Binary Large Object).
      // This typically holds a Yjs state vector (Uint8Array) representing the document's content.
      .addColumn('state', 'blob', (col) => col.notNull())
      // Revision identifier for this document state, useful for synchronization. Changed to 'text'.
      .addColumn('revision', 'text', (col) => col.notNull())
      .execute();
  },
  /**
   * Reverts the migration: drops the 'document_states' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('document_states').ifExists().execute();
  },
};
