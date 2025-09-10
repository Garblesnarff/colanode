// packages/client/src/databases/app/migrations/00001-create-servers-table.ts
/**
 * @file Kysely migration for creating the `servers` table in the application database.
 * This table stores information about Colanode servers that the client application
 * is aware of or has connected to. It also seeds initial data for default cloud servers.
 */
import { Kysely, Migration, sql } from 'kysely'; // Import sql for potential default values or complex types if needed

/**
 * Defines the Kysely migration object for the `servers` table.
 *
 * @property up - Asynchronous function to apply the migration (create table and insert initial data).
 *                It defines columns for server domain (primary key), name, avatar URL,
 *                serialized attributes, software version, creation timestamp, and last sync timestamp.
 *                It also inserts default records for "eu.colanode.com" and "us.colanode.com".
 * @property down - Asynchronous function to revert the migration (drop the table).
 */
export const createServersTable: Migration = {
  /**
   * Applies the migration: creates the 'servers' table and seeds it.
   * @param db - The Kysely database instance.
   */
  up: async (db: Kysely<any>) => {
    await db.schema
      .createTable('servers')
      .addColumn('domain', 'text', (col) => col.primaryKey().notNull())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('avatar', 'text', (col) => col.notNull()) // Assuming URL
      .addColumn('attributes', 'text', (col) => col.notNull()) // JSON string for server config
      .addColumn('version', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull()) // ISO 8601 string
      .addColumn('synced_at', 'text') // ISO 8601 string, nullable
      .execute();

    // Seed initial known Colanode cloud servers
    await db
      .insertInto('servers')
      .values([
        {
          domain: 'eu.colanode.com',
          name: 'Colanode Cloud (EU)',
          avatar: 'https://colanode.com/assets/flags/eu.svg',
          attributes: JSON.stringify({}), // Default empty JSON object for attributes
          version: '0.2.0', // Example version, might be dynamic or placeholder
          created_at: new Date().toISOString(),
          synced_at: null, // Initially not synced
        },
        {
          domain: 'us.colanode.com',
          name: 'Colanode Cloud (US)',
          avatar: 'https://colanode.com/assets/flags/us.svg',
          attributes: JSON.stringify({}),
          version: '0.2.0',
          created_at: new Date().toISOString(),
          synced_at: null,
        },
      ])
      .execute();
  },
  /**
   * Reverts the migration: drops the 'servers' table.
   * @param db - The Kysely database instance.
   */
  down: async (db: Kysely<any>) => {
    await db.schema.dropTable('servers').ifExists().execute(); // Added ifExists() for safety
  },
};
