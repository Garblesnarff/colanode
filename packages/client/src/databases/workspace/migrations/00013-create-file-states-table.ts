// packages/client/src/databases/workspace/migrations/00013-create-file-states-table.ts
/**
 * @file Kysely migration for creating the `file_states` table in a workspace-specific database.
 * This table tracks the local state of files, particularly their download and upload
 * status, progress, retries, and relevant timestamps. This is crucial for managing
 * asynchronous file operations and providing feedback to the user.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `file_states` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `file_states` table
 *                with `id` as the primary key (likely referencing a file node or a specific file version ID).
 *                It includes columns for versioning, and detailed tracking of download and upload processes.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createFileStatesTable: Migration = {
  /**
   * Applies the migration: creates the 'file_states' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('file_states')
      // Primary Key: Unique identifier for the file state entry.
      // This ID likely corresponds to a file's Node ID or a specific version ID of a file.
      // It should reference `nodes.id` if it's for a file node, with onDelete('cascade').
      .addColumn('id', 'text', (col) =>
        col.primaryKey().notNull().references('nodes.id').onDelete('cascade')
      )
      // Version of the file this state pertains to (e.g., server revision or specific file version hash).
      .addColumn('version', 'text', (col) => col.notNull())
      // Download status (e.g., using DownloadStatus enum from @colanode/client/types/files). Nullable.
      .addColumn('download_status', 'integer') // Stores enum value
      // Download progress percentage (0-100). Nullable.
      .addColumn('download_progress', 'integer')
      // Number of download retries attempted. Nullable.
      .addColumn('download_retries', 'integer')
      // ISO 8601 timestamp: When the download was initiated. Nullable.
      .addColumn('download_started_at', 'text')
      // ISO 8601 timestamp: When the download was completed. Nullable.
      .addColumn('download_completed_at', 'text')
      // Upload status (e.g., using UploadStatus enum). Nullable.
      .addColumn('upload_status', 'integer') // Stores enum value
      // Upload progress percentage (0-100). Nullable.
      .addColumn('upload_progress', 'integer')
      // Number of upload retries attempted. Nullable.
      .addColumn('upload_retries', 'integer')
      // ISO 8601 timestamp: When the upload was initiated. Nullable.
      .addColumn('upload_started_at', 'text')
      // ISO 8601 timestamp: When the upload was completed. Nullable.
      .addColumn('upload_completed_at', 'text')
      .execute();
  },
  /**
   * Reverts the migration: drops the 'file_states' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('file_states').ifExists().execute();
  },
};
