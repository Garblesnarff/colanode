// packages/client/src/databases/app/migrations/00003-create-deleted-tokens-table.ts
/**
 * @file Kysely migration for creating the `deleted_tokens` table in the application database.
 * This table is used to store authentication tokens that have been explicitly invalidated
 * or deleted, for example, upon user logout from a specific device or session.
 * Storing these can help prevent token reuse if a token is compromised after logout,
 * although token validation should primarily rely on server-side checks and expiration.
 */
import { Kysely, Migration } from 'kysely';

/**
 * Defines the Kysely migration object for the `deleted_tokens` table.
 *
 * @property up - Asynchronous function to apply the migration (create the table).
 *                It defines columns for the deleted token itself (primary key),
 *                the associated account ID, the server domain, and a timestamp
 *                indicating when the token deletion was recorded.
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createDeletedTokensTable: Migration = {
  /**
   * Applies the migration: creates the 'deleted_tokens' table.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('deleted_tokens')
      // The token string that has been invalidated. This is the primary key.
      .addColumn('token', 'text', (col) => col.primaryKey().notNull())
      // ID of the account to which this token belonged.
      .addColumn('account_id', 'text', (col) => col.notNull())
      // Server domain associated with the account and token.
      // Could be a foreign key to `servers.domain` if strict integrity is needed.
      .addColumn('server', 'text', (col) => col.notNull())
      // ISO 8601 timestamp: When this token deletion was recorded locally.
      .addColumn('created_at', 'text', (col) => col.notNull())
      .execute();

    // Optional: Add an index on account_id and server if lookups by these are common.
    // await db.schema.createIndex('deleted_tokens_account_server_idx')
    //   .on('deleted_tokens')
    //   .columns(['account_id', 'server'])
    //   .execute();
  },
  /**
   * Reverts the migration: drops the 'deleted_tokens' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('deleted_tokens').ifExists().execute();
  },
};
