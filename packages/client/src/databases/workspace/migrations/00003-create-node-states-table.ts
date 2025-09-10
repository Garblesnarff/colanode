// packages/client/src/databases/workspace/migrations/00003-create-node-states-table.ts
/**
 * @file Kysely migration for creating the `node_states` table in a workspace-specific database.
 * This table stores the CRDT (Conflict-free Replicated Data Type) state, typically Yjs state vectors,
 * for nodes that have collaborative attributes (e.g., the structure or metadata of a page or database,
 * if managed collaboratively separate from its main document content).
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `node_states` table.
 *
 * @property up - Asynchronous function to apply the migration. It creates the `node_states` table
 *                with columns for `id` (primary key, foreign key to `nodes.id`), `state` (blob for CRDT data),
 *                and `revision`.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createNodeStatesTable: Migration = {
  /**
   * Applies the migration: creates the 'node_states' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('node_states')
      // Primary Key and Foreign Key: References the 'id' of the node in the 'nodes' table.
      // This indicates the CRDT state belongs to that specific node.
      // onDelete('cascade') ensures that if a node is deleted, its state is also removed.
      .addColumn('id', 'text', (col) =>
        col.primaryKey().notNull().references('nodes.id').onDelete('cascade')
      )
      // The CRDT state data, stored as a BLOB (Binary Large Object).
      // This typically holds a Yjs state vector (Uint8Array).
      .addColumn('state', 'blob', (col) => col.notNull())
      // Revision identifier for this state, useful for synchronization and conflict resolution.
      // Changed to 'text' for consistency with other revision fields.
      .addColumn('revision', 'text', (col) => col.notNull())
      .execute();
  },
  /**
   * Reverts the migration: drops the 'node_states' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('node_states').ifExists().execute();
  },
};
