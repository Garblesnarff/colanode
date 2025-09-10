// packages/client/src/databases/app/migrations/index.ts
/**
 * @file Aggregates and exports all database migrations for the application-level local database.
 * This file serves as a central registry for Kysely migrations, mapping migration names/IDs
 * to their respective migration implementation objects.
 */
import { Migration } from 'kysely';

// Import individual migration files. Each file should export a Kysely `Migration` object.
import { createServersTable } from './00001-create-servers-table';
import { createAccountsTable } from './00002-create-accounts-table';
import { createDeletedTokensTable } from './00003-create-deleted-tokens-table';
import { createMetadataTable } from './00004-create-metadata-table';

/**
 * A record mapping migration identifiers (typically version numbers or descriptive names)
 * to their corresponding Kysely {@link Migration} objects.
 * The Kysely migrator uses this record to apply migrations in order.
 *
 * The keys (e.g., "00001-create-servers-table") are used by Kysely to track
 * which migrations have been applied. The values are objects with `up` (and optionally `down`)
 * methods that define the schema changes.
 *
 * @example
 * // Example of how Kysely's migrator might use this:
 * // const migrator = new Migrator({
 * //   db,
 * //   provider: new KyselyMigrationProvider(appDatabaseMigrations),
 * // });
 * // await migrator.migrateToLatest();
 */
export const appDatabaseMigrations: Record<string, Migration> = {
  /** Migration to create the `servers` table. */
  '00001-create-servers-table': createServersTable,
  /** Migration to create the `accounts` table. */
  '00002-create-accounts-table': createAccountsTable,
  /** Migration to create the `deleted_tokens` table. */
  '00003-create-deleted-tokens-table': createDeletedTokensTable,
  /** Migration to create the `metadata` table. */
  '00004-create-metadata-table': createMetadataTable,
  // Future migrations would be added here with new keys and imported implementations.
};
