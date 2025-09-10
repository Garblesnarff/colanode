// packages/client/src/services/kysely-service.ts
/**
 * @file Defines interfaces for a service that manages Kysely database instances.
 * This service abstracts the creation and deletion of Kysely database connections,
 * typically for SQLite databases used by the client application.
 */
import { Kysely } from 'kysely';

/**
 * Options for building/creating a Kysely database instance.
 *
 * @property path - The file system path to the SQLite database file.
 * @property readonly - Optional boolean indicating if the database connection should be read-only.
 *                      Defaults to `false` (read-write) if not specified.
 */
export interface KyselyBuildOptions {
  /** The file path to the SQLite database. */
  path: string;
  /**
   * If true, the database connection will be opened in read-only mode.
   * @default false
   */
  readonly?: boolean;
}

/**
 * Interface defining a service for managing Kysely database instances.
 * Implementations of this service will handle the specifics of creating
 * Kysely instances with appropriate drivers (e.g., an SQLite driver for OPFS or Node.js).
 */
export interface KyselyService {
  /**
   * Builds and returns a new Kysely database instance configured with the provided options.
   *
   * @template T - The database schema type, defining the tables and their structures for Kysely.
   * @param options - {@link KyselyBuildOptions} specifying the path and read-only status for the database.
   * @returns A Kysely instance typed with the schema `T`.
   *
   * @example
   * // Assuming `AppDatabaseSchema` is defined
   * const dbInstance = kyselyService.build<AppDatabaseSchema>({ path: '/path/to/app.db' });
   * const result = await dbInstance.selectFrom('users').selectAll().execute();
   */
  build<T extends Record<string, any>>(options: KyselyBuildOptions): Kysely<T>; // Added constraint to T

  /**
   * Deletes the database file at the specified path.
   * This is a destructive operation and should be used with caution.
   *
   * @param path - The file system path to the SQLite database file to be deleted.
   * @returns A promise that resolves when the database file has been successfully deleted.
   *          It might reject if the deletion fails (e.g., file not found, permissions issue).
   */
  delete(path: string): Promise<void>;
}
