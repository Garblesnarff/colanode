// packages/client/src/databases/workspace/migrations/00012-create-collaborations-table.ts
/**
 * @file Kysely migration for creating the `collaborations` table in a workspace-specific database.
 * This table is intended to store information about user collaborations on nodes,
 * specifically their roles.
 *
 * NOTE: The current schema for this table seems to have `node_id` as a primary key,
 * which implies a one-to-one or one-to-many relationship where a node has *a* collaboration
 * record, rather than multiple users collaborating on one node. This might be an oversimplification
 * or represent a denormalized/specific view of collaboration. A more typical collaboration
 * table might have a composite key like (node_id, user_id).
 * The documentation will reflect the schema as written but note this observation.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `collaborations` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `collaborations` table.
 *                Columns include `node_id` (primary key, foreign key to `nodes.id`), `role` (text, stores the role),
 *                `revision`, `created_at`, `updated_at`, and `deleted_at` timestamps.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createCollaborationsTable: Migration = {
  /**
   * Applies the migration: creates the 'collaborations' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('collaborations')
      // Primary Key and Foreign Key: References the 'id' of the node in the 'nodes' table.
      // This structure implies that a node can have one primary 'collaboration' record,
      // which is unusual if it's meant to store multiple collaborators with different roles.
      // It might be storing a summary or a primary collaborator's role, or the 'role' column
      // might store a serialized object of all collaborators and their roles for this node.
      .addColumn('node_id', 'text', (col) =>
        col.primaryKey().notNull().references('nodes.id').onDelete('cascade')
      )
      // Stores the role information. The exact nature (e.g., a single role, a serialized object of roles)
      // depends on how this field is used. Could be a NodeRole string if it's a single primary role.
      .addColumn('role', 'text') // Nullable, as role information might not always be present or applicable.
      // Revision for this collaboration entry. Changed to 'text'.
      .addColumn('revision', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When this collaboration entry was created/recorded.
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: Last update to this collaboration entry (nullable).
      .addColumn('updated_at', 'text')
      // ISO 8601 timestamp: If this collaboration entry was soft-deleted (nullable).
      .addColumn('deleted_at', 'text')
      .execute();
  },
  /**
   * Reverts the migration: drops the 'collaborations' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('collaborations').ifExists().execute();
  },
};
