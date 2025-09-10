// packages/client/src/services/metadata-service.ts
/**
 * @file Defines the `MetadataService` class for managing application-level metadata.
 * This service provides methods to get, set, and delete key-value pairs in the
 * application's local metadata store (the `metadata` table in the app database).
 * It also publishes events when metadata is updated or deleted.
 */
import { eventBus } from '@colanode/client/lib/event-bus';
import { mapAppMetadata } from '@colanode/client/lib/mappers';
import { AppService } from '@colanode/client/services/app-service'; // Assuming AppService provides DB access
import {
  AppMetadata,
  AppMetadataKey,
  AppMetadataMap,
} from '@colanode/client/types/apps';
import { createDebugger } from '@colanode/core';

const debug = createDebugger('client:service:metadata'); // Standardized debug namespace

/**
 * Service responsible for managing application-level metadata.
 * Metadata is stored as key-value pairs in the local application database.
 * This service provides an abstraction for CRUD operations on this metadata
 * and emits events upon changes.
 */
export class MetadataService {
  /** Reference to the main {@link AppService} for accessing shared resources like the database. */
  private readonly app: AppService;

  /**
   * Constructs a `MetadataService`.
   * @param app - The {@link AppService} instance.
   */
  constructor(app: AppService) {
    this.app = app;
  }

  /**
   * Retrieves all metadata items stored in the application database.
   *
   * @async
   * @returns A promise that resolves to an array of {@link AppMetadata} objects.
   *          Each object represents a key-value pair from the metadata store.
   */
  public async getAll(): Promise<AppMetadata[]> {
    debug('Fetching all app metadata.');
    const metadataRows = await this.app.database
      .selectFrom('metadata')
      .selectAll()
      .execute();

    return metadataRows.map(mapAppMetadata);
  }

  /**
   * Retrieves the value for a specific metadata key.
   * The return type is dynamically determined by `AppMetadataMap` based on the key.
   *
   * @async
   * @template K - A key from {@link AppMetadataKey}, ensuring type safety.
   * @param key - The specific {@link AppMetadataKey} to retrieve.
   * @returns A promise that resolves to the parsed {@link AppMetadataMap}[K] object (which includes key, value, and timestamps)
   *          if the key exists, or `null` otherwise. The `value` property within the returned object will be
   *          of the type associated with the key in `AppMetadataMap`.
   *
   * @example
   * const themeMeta = await metadataService.get('theme'); // themeMeta might be { key: 'theme', value: 'dark', ... }
   * if (themeMeta) {
   *   console.log(themeMeta.value); // 'dark'
   * }
   */
  public async get<K extends AppMetadataKey>(
    key: K
  ): Promise<AppMetadataMap[K] | null> {
    debug(`Fetching app metadata for key: ${key}`);
    const metadataRow = await this.app.database
      .selectFrom('metadata')
      .selectAll()
      .where('key', '=', key)
      .executeTakeFirst();

    if (!metadataRow) {
      return null;
    }

    // mapAppMetadata parses the 'value' field from JSON.
    // The type assertion `as AppMetadataMap[K]` assumes mapAppMetadata correctly returns
    // an object whose 'value' field matches the expected type for the given key K.
    return mapAppMetadata(metadataRow) as AppMetadataMap[K];
  }

  /**
   * Sets or updates the value for a specific metadata key.
   * If the key already exists, its value and `updated_at` timestamp are updated.
   * If the key does not exist, a new metadata item is created.
   * The value is JSON stringified before being stored.
   * Publishes an 'app.metadata.updated' event upon successful creation or update.
   *
   * @async
   * @template K - A key from {@link AppMetadataKey}.
   * @param key - The {@link AppMetadataKey} to set or update.
   * @param value - The value to store. Its type must match `AppMetadataMap[K]['value']`.
   * @returns A promise that resolves when the operation is complete.
   */
  public async set<K extends AppMetadataKey>(
    key: K,
    value: AppMetadataMap[K]['value'] // Ensures type safety for the value based on the key
  ): Promise<void> { // Changed return to void as it doesn't return the created/updated metadata
    debug(`Setting metadata for key "${key}"`); // Logging value might be too verbose or sensitive

    const stringValue = JSON.stringify(value);
    const now = new Date().toISOString();

    // Upsert operation: insert or update if conflict on 'key'.
    const resultMetadata = await this.app.database
      .insertInto('metadata')
      .values({
        key,
        value: stringValue,
        created_at: now,
        updated_at: now, // Also set updated_at on insert for consistency
      })
      .onConflict((conflict) =>
        conflict.column('key').doUpdateSet({
          value: stringValue,
          updated_at: now,
        })
      )
      .returningAll() // Return the inserted or updated row
      .executeTakeFirstOrThrow(); // Throw if operation somehow fails unexpectedly

    // No need to check `if (!resultMetadata)` due to `executeTakeFirstOrThrow`.
    eventBus.publish({
      type: 'app.metadata.updated',
      metadata: mapAppMetadata(resultMetadata), // mapAppMetadata will parse the JSON value
    });
    debug(`Metadata for key "${key}" successfully set/updated.`);
  }

  /**
   * Deletes a metadata item by its key.
   * Publishes an 'app.metadata.deleted' event if an item was successfully deleted.
   *
   * @async
   * @param key - The string key of the metadata item to delete.
   * @returns A promise that resolves when the operation is complete.
   */
  public async delete(key: AppMetadataKey): Promise<void> { // Parameterized key with AppMetadataKey
    debug(`Deleting metadata for key: ${key}`);

    const deletedMetadataRow = await this.app.database
      .deleteFrom('metadata')
      .where('key', '=', key)
      .returningAll() // Return the deleted row
      .executeTakeFirst(); // Will be undefined if key didn't exist

    if (!deletedMetadataRow) {
      debug(`Metadata key "${key}" not found for deletion.`);
      return;
    }

    eventBus.publish({
      type: 'app.metadata.deleted',
      metadata: mapAppMetadata(deletedMetadataRow), // Provide the deleted metadata in the event
    });
    debug(`Metadata for key "${key}" deleted.`);
  }
}
