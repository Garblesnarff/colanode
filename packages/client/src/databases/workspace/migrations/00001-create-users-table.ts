// packages/client/src/databases/workspace/migrations/00001-create-users-table.ts
/**
 * @file Kysely migration for creating the `users` table in a workspace-specific database.
 * This table stores information about users who are members of this particular workspace,
 * including their roles, status, and workspace-specific display preferences.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for creating the `users` table.
 *
 * @property up - Asynchronous function to apply the migration (create the table).
 *                Defines columns for user ID (primary key), revision, email, global name,
 *                global avatar, workspace-specific custom name and avatar, role within the workspace,
 *                status within the workspace, creation timestamp, and update timestamp.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createUsersTable: Migration = {
  /**
   * Applies the migration: creates the 'users' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('users')
      // User's unique identifier (e.g., global Account ID or a workspace-specific User ID)
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      // Revision for optimistic concurrency or sync state tracking for this user's workspace data
      .addColumn('revision', 'text', (col) => col.notNull()) // Changed from integer to text for typical revision schemes
      // User's email address (often used for identification)
      .addColumn('email', 'text', (col) => col.notNull().unique()) // Email should be unique within a workspace
      // User's global display name
      .addColumn('name', 'text', (col) => col.notNull())
      // URL for the user's global avatar (nullable)
      .addColumn('avatar', 'text')
      // Custom display name for the user within this specific workspace (nullable)
      .addColumn('custom_name', 'text')
      // Custom avatar URL for the user within this specific workspace (nullable)
      .addColumn('custom_avatar', 'text')
      // User's role in this workspace (e.g., 'owner', 'admin', 'collaborator', 'guest')
      .addColumn('role', 'text', (col) => col.notNull()) // Corresponds to WorkspaceRole
      // User's status in this workspace (e.g., 'Active', 'Removed')
      .addColumn('status', 'integer', (col) => col.notNull()) // Corresponds to UserStatus enum
      // ISO 8601 timestamp: When the user was added to this workspace
      .addColumn('created_at', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: Last update to this user's workspace-specific details (nullable)
      .addColumn('updated_at', 'text')
      .execute();

    // Consider adding an index on 'email' if it's frequently used for lookups.
    // await db.schema.createIndex('users_email_idx').on('users').column('email').execute();
  },
  /**
   * Reverts the migration: drops the 'users' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('users').ifExists().execute();
  },
};
