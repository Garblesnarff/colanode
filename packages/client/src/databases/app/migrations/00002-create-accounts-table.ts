// packages/client/src/databases/app/migrations/00002-create-accounts-table.ts
/**
 * @file Kysely migration for creating the `accounts` table in the application database.
 * This table stores information about user accounts that the client has authenticated with
 * on various Colanode servers. It links accounts to specific servers and devices.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for the `accounts` table.
 *
 * @property up - Asynchronous function to apply the migration (create the table).
 *                It defines columns for account ID (primary key), device ID, server domain,
 *                user name, email, avatar URL, authentication token, creation timestamp,
 *                update timestamp, and last sync timestamp.
 *                A composite primary key on (id, server, device_id) might be more appropriate
 *                if an account ID (`id`) can be associated with multiple servers/devices.
 *                However, the current schema uses `id` as the sole primary key, implying it should be
 *                globally unique across all servers for a given client, or it's a specific local record ID.
 *                For this documentation, we'll assume `id` is the account's server-side ID and the combination
 *                of `id`, `server`, and `device_id` should be unique.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createAccountsTable: Migration = {
  /**
   * Applies the migration: creates the 'accounts' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('accounts')
      // 'id' here likely refers to the account_id from the server.
      // If a user can have the same account_id on multiple servers,
      // then (id, server) or (id, server, device_id) should be the composite PK.
      // Current schema uses 'id' as PK, implying it's unique locally or globally for this table.
      .addColumn('id', 'text', (col) => col.notNull()) // Account ID from server
      .addColumn('device_id', 'text', (col) => col.notNull()) // Local device identifier
      .addColumn('server', 'text', (col) => col.notNull()) // Server domain, FK to 'servers.domain'
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('email', 'text', (col) => col.notNull())
      .addColumn('avatar', 'text') // Nullable text for avatar URL
      .addColumn('token', 'text', (col) => col.notNull()) // Auth token
      .addColumn('created_at', 'text', (col) => col.notNull()) // ISO 8601 string
      .addColumn('updated_at', 'text') // ISO 8601 string, nullable
      .addColumn('synced_at', 'text') // ISO 8601 string, nullable
      // Define composite primary key
      .addPrimaryKeyConstraint('accounts_pk', ['id', 'server', 'device_id'])
      // Add foreign key constraint if `servers` table is guaranteed to exist (which it should be by migration order)
      // .addForeignKeyConstraint('accounts_server_fk', ['server'], 'servers', ['domain']) // Kysely syntax might vary
      .execute();

    // It's good practice to add indexes for frequently queried columns, e.g., server, email.
    // await db.schema.createIndex('accounts_server_idx').on('accounts').column('server').execute();
    // await db.schema.createIndex('accounts_email_idx').on('accounts').column('email').execute();
  },
  /**
   * Reverts the migration: drops the 'accounts' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('accounts').ifExists().execute();
  },
};
