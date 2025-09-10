import ky, { KyInstance } from 'ky';
import { Kysely, Migration, Migrator } from 'kysely';
import ms from 'ms';
import semver from 'semver';

import {
  AppDatabaseSchema,
  appDatabaseMigrations,
} from '@colanode/client/databases/app';
import { Mediator } from '@colanode/client/handlers';
import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { parseApiError } from '@colanode/client/lib/ky';
import { mapServer, mapAccount } from '@colanode/client/lib/mappers';
import { AccountService } from '@colanode/client/services/accounts/account-service';
import { AppMeta } from '@colanode/client/services/app-meta';
import { AssetService } from '@colanode/client/services/asset-service';
import { FileSystem } from '@colanode/client/services/file-system';
import { KyselyService } from '@colanode/client/services/kysely-service';
import { MetadataService } from '@colanode/client/services/metadata-service';
import { PathService } from '@colanode/client/services/path-service';
import { ServerService } from '@colanode/client/services/server-service';
import { Account } from '@colanode/client/types/accounts';
import { Server, ServerAttributes } from '@colanode/client/types/servers';
import { ApiErrorCode, ApiHeader, build, createDebugger } from '@colanode/core';

const debug = createDebugger('client:service:app'); // Changed namespace for broader client context

/**
 * `AppService` is a central orchestrator for client-side application logic and services.
 * It manages other services like `ServerService`, `AccountService`, `MetadataService`,
 * file system operations, database connections, and global utilities like the `Mediator`
 * and HTTP client (`ky`).
 *
 * Responsibilities include:
 * - Initializing and migrating the main application database.
 * - Managing known servers and user accounts associated with them.
 * - Providing access to various sub-services.
 * - Handling application-level cleanup tasks (e.g., old temp files, stale tokens).
 * - Exposing methods for core application operations like creating servers, initializing accounts.
 */
export class AppService {
  /** Map storing active {@link ServerService} instances, keyed by server domain. */
  private readonly servers: Map<string, ServerService> = new Map();
  /** Map storing active {@link AccountService} instances, keyed by a unique account identifier. */
  private readonly accounts: Map<string, AccountService> = new Map();
  /** EventLoop instance for periodic cleanup tasks. */
  private readonly cleanupEventLoop: EventLoop;
  /** ID for the subscription to the global event bus, used for unsubscription on teardown if needed. */
  private readonly eventSubscriptionId: string; // Keep track for potential future unsubscription

  /** Application metadata (type, platform, etc.). */
  public readonly meta: AppMeta;
  /** Service for file system interactions. */
  public readonly fs: FileSystem;
  /** Service for managing application file paths. */
  public readonly path: PathService;
  /** Kysely instance for the main application-level database. */
  public readonly database: Kysely<AppDatabaseSchema>;
  /** Service for managing application-level metadata (key-value store). */
  public readonly metadata: MetadataService;
  /** Service for building Kysely database instances. */
  public readonly kysely: KyselyService;
  /** Mediator instance for command and query dispatching. */
  public readonly mediator: Mediator;
  /** Service for managing application assets. */
  public readonly asset: AssetService;
  /** Customized Ky HTTP client instance for API requests. */
  public readonly client: KyInstance;

  /**
   * Constructs the `AppService`.
   * Initializes various services, sets up the main app database, configures the HTTP client,
   * and starts a cleanup event loop.
   *
   * @param meta - {@link AppMeta} instance containing application metadata.
   * @param fs - {@link FileSystem} instance for file operations.
   * @param kysely - {@link KyselyService} instance for database instance creation.
   * @param path - {@link PathService} instance for path management.
   */
  constructor(
    meta: AppMeta,
    fs: FileSystem,
    kysely: KyselyService,
    path: PathService
  ) {
    this.meta = meta;
    this.fs = fs;
    this.path = path;
    this.kysely = kysely;

    // Initialize the main application database connection.
    this.database = kysely.build<AppDatabaseSchema>({
      path: path.appDatabase, // Path to the SQLite file for the app DB
      readonly: false,
    });

    // Initialize core services that depend on AppService or other base services.
    this.mediator = new Mediator(this);
    this.asset = new AssetService(this);

    // Configure the global HTTP client (ky) with default headers and timeout.
    this.client = ky.create({
      headers: {
        [ApiHeader.ClientType]: this.meta.type,
        [ApiHeader.ClientPlatform]: this.meta.platform,
        [ApiHeader.ClientVersion]: build.version, // From core/types/build.ts
      },
      timeout: ms('30 seconds'), // Default timeout for requests
    });

    this.metadata = new MetadataService(this);

    // Setup a periodic cleanup task.
    this.cleanupEventLoop = new EventLoop(
      ms('10 minutes'), // Regular interval
      ms('1 minute'),   // Debounce interval if triggered manually
      this.cleanup.bind(this) // Method to execute
    );

    // Subscribe to relevant global events.
    this.eventSubscriptionId = eventBus.subscribe((event) => {
      if (event.type === 'account.deleted') {
        // If an account is deleted elsewhere, remove its service instance.
        this.accounts.delete(event.account.id);
        debug(`Removed account service instance for deleted account: ${event.account.id}`);
      }
      // Potentially handle other global events relevant to AppService state.
    });
  }

  /**
   * Migrates the main application database to the latest schema version.
   * It uses Kysely's `Migrator` with migrations defined in `appDatabaseMigrations`.
   * Also includes logic to handle data wipe for very old versions (pre-0.2.0).
   * Updates version metadata after migration.
   *
   * @async
   */
  public async migrate(): Promise<void> {
    debug('Migrating app database...');

    const migrator = new Migrator({
      db: this.database,
      provider: {
        getMigrations(): Promise<Record<string, Migration>> {
          return Promise.resolve(appDatabaseMigrations);
        },
      },
    });

    await migrator.migrateToLatest();

    const versionMetadata = await this.metadata.get('version');
    const version = semver.parse(versionMetadata?.value);
    if (version && semver.lt(version, '0.2.0')) {
      await this.deleteAllData();
    }

    await this.metadata.set('version', build.version);
    await this.metadata.set('platform', this.meta.platform);
    debug('App database migration completed.');
  }

  /**
   * Retrieves an active {@link AccountService} instance by its ID.
   * @param id - The unique identifier of the account.
   * @returns The `AccountService` instance if found and active, otherwise `null`.
   */
  public getAccount(id: string): AccountService | null {
    return this.accounts.get(id) ?? null;
  }

  /**
   * Retrieves all active {@link AccountService} instances.
   * @returns An array of `AccountService` instances.
   */
  public getAccounts(): AccountService[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Retrieves all active {@link ServerService} instances.
   * @returns An array of `ServerService` instances.
   */
  public getServers(): ServerService[] {
    return Array.from(this.servers.values());
  }

  /**
   * Retrieves an active {@link ServerService} instance by its domain.
   * @param domain - The domain name of the server.
   * @returns The `ServerService` instance if found and active, otherwise `null`.
   */
  public getServer(domain: string): ServerService | null {
    return this.servers.get(domain) ?? null;
  }

  /**
   * Initializes the `AppService`. This involves:
   * - Loading and initializing known servers from the database.
   * - Loading and initializing accounts associated with those servers.
   * - Ensuring the temporary directory exists.
   * - Starting the periodic cleanup event loop.
   * @async
   */
  public async init(): Promise<void> {
    debug('Initializing AppService...');
    await this.initServers();
    await this.initAccounts();
    await this.fs.makeDirectory(this.path.temp); // Ensure temp directory exists

    this.cleanupEventLoop.start();
    debug('AppService initialized.');
  }

  /**
   * Loads server data from the app database and initializes `ServerService` instances for each.
   * @async
   * @private
   */
  private async initServers(): Promise<void> {
    debug('Initializing servers from database...');
    const serverRows = await this.database
      .selectFrom('servers')
      .selectAll()
      .execute();
    debug(`Found ${serverRows.length} servers in DB.`);

    for (const serverRow of serverRows) {
      await this.initServer(mapServer(serverRow));
    }
    debug('Server initialization complete.');
  }

  /**
   * Loads account data from the app database and initializes `AccountService` instances.
   * This should be called after `initServers` as accounts are linked to servers.
   * @async
   * @private
   */
  private async initAccounts(): Promise<void> {
    debug('Initializing accounts from database...');
    const accountRows = await this.database
      .selectFrom('accounts')
      .selectAll()
      .execute();
    debug(`Found ${accountRows.length} accounts in DB.`);

    for (const accountRow of accountRows) {
      // `initAccount` will link to an existing ServerService instance.
      await this.initAccount(mapAccount(accountRow));
    }
    debug('Account initialization complete.');
  }

  /**
   * Initializes or retrieves an existing {@link AccountService} for a given account.
   * If an instance for this account ID already exists, it's returned. Otherwise, a new
   * `AccountService` is created, initialized, and stored.
   *
   * @async
   * @param account - The {@link Account} data object.
   * @returns A promise that resolves to the initialized `AccountService`.
   * @throws If the server associated with the account is not found/initialized.
   */
  public async initAccount(account: Account): Promise<AccountService> {
    if (this.accounts.has(account.id)) {
      debug(`Returning existing AccountService for account: ${account.id}`);
      return this.accounts.get(account.id)!;
    }
    debug(`Initializing new AccountService for account: ${account.id} on server ${account.server}`);

    const serverService = this.servers.get(account.server);
    if (!serverService) {
      // This case should ideally be handled by ensuring servers are initialized first.
      throw new Error(
        `Server not found for account ${account.id}: ${account.server}. Ensure server is initialized first.`
      );
    }

    const accountService = new AccountService(account, serverService, this);
    await accountService.init(); // AccountService might have its own async init logic (e.g., opening workspace DBs)

    this.accounts.set(account.id, accountService);
    debug(`AccountService for ${account.id} initialized and stored.`);
    return accountService;
  }

  /**
   * Initializes or retrieves an existing {@link ServerService} for a given server.
   * If an instance for this server domain already exists, it's returned.
   * Otherwise, a new `ServerService` is created and stored.
   *
   * @async
   * @param server - The {@link Server} data object.
   * @returns A promise that resolves to the initialized `ServerService`.
   */
  public async initServer(server: Server): Promise<ServerService> {
    if (this.servers.has(server.domain)) {
      debug(`Returning existing ServerService for domain: ${server.domain}`);
      return this.servers.get(server.domain)!;
    }
    debug(`Initializing new ServerService for domain: ${server.domain}`);

    const serverService = new ServerService(this, server);
    // ServerService constructor might do initial setup, or an async init() could be called here if needed.
    this.servers.set(server.domain, serverService);
    debug(`ServerService for ${server.domain} initialized and stored.`);
    return serverService;
  }

  /**
   * Creates a new server entry in the local database after fetching its configuration,
   * then initializes and returns a {@link ServerService} for it.
   * If a server with the given domain already exists, it returns the existing service.
   *
   * @async
   * @param url - The URL of the Colanode server to add.
   * @returns A promise that resolves to the `ServerService` instance, or `null` if server config cannot be fetched.
   */
  public async createServer(url: URL): Promise<ServerService | null> {
    const domain = url.host;
    if (this.servers.has(domain)) {
      debug(`Server ${domain} already exists. Returning existing service.`);
      return this.servers.get(domain)!;
    }
    debug(`Creating new server entry for domain: ${domain}`);

    const config = await ServerService.fetchServerConfig(url);
    if (!config) {
      debug(`Failed to fetch server config for ${domain}.`);
      return null;
    }

    const attributes: ServerAttributes = {
      sha: config.sha,
      pathPrefix: config.pathPrefix,
      insecure: url.protocol === 'http:', // Mark if connection is insecure
      account: config.account?.google.enabled
        ? {
            google: {
              enabled: config.account.google.enabled,
              clientId: config.account.google.clientId,
            },
            // Add other auth methods from config if necessary
          }
        : undefined, // Or a default account config object if always present
    };

    const createdServerRow = await this.database
      .insertInto('servers')
      .values({
        domain,
        attributes: JSON.stringify(attributes), // Serialize attributes object
        avatar: config.avatar,
        name: config.name,
        version: config.version,
        created_at: new Date().toISOString(),
        synced_at: null, // New server, not synced yet
      })
      .returningAll() // Return the inserted row
      .executeTakeFirstOrThrow(); // Throw if insert fails for some reason

    // `createdServerRow` will not be null due to `executeTakeFirstOrThrow`
    const server = mapServer(createdServerRow);
    const serverService = await this.initServer(server); // Initialize and store the service

    eventBus.publish({
      type: 'server.created',
      server,
    });
    debug(`Server ${domain} created and service initialized.`);
    return serverService;
  }

  /**
   * Deletes a server and all associated accounts and their data from the local client.
   * It attempts to log out accounts from the server before removing local data.
   *
   * @async
   * @param domain - The domain of the server to delete.
   */
  public async deleteServer(domain: string): Promise<void> {
    debug(`Attempting to delete server: ${domain}`);
    const serverService = this.servers.get(domain);
    if (!serverService) {
      debug(`Server ${domain} not found for deletion.`);
      return;
    }

    // Log out and remove all accounts associated with this server
    const accountsToDelete = Array.from(this.accounts.values()).filter(
      (accSvc) => accSvc.server.domain === domain
    );
    debug(`Found ${accountsToDelete.length} accounts associated with server ${domain}. Logging out and removing...`);
    for (const accountService of accountsToDelete) {
      try {
        await accountService.logout(); // Attempts server-side logout first
      } catch (e) {
        debug(`Error during logout for account ${accountService.account.id} on server ${domain}:`, e);
        // Continue with local deletion even if server-side logout fails
      }
      // `account.deleted` event should be handled by the eventBus subscription
      // to remove the account from `this.accounts` map.
      // Alternatively, call `this.accounts.delete(accountService.account.id);` explicitly here.
    }

    // Delete the server entry from the app database
    const deletedServerRow = await this.database
      .deleteFrom('servers')
      .returningAll()
      .where('domain', '=', domain)
      .executeTakeFirst(); // Get the deleted row to publish event

    this.servers.delete(domain); // Remove from active services map
    debug(`Server ${domain} removed from local database and active services.`);

    if (deletedServerRow) {
      eventBus.publish({
        type: 'server.deleted',
        server: mapServer(deletedServerRow),
      });
    }
  }

  /**
   * Manually triggers the cleanup process (syncing deleted tokens, cleaning temp files).
   */
  public triggerCleanup(): void {
    debug('Manual cleanup triggered.');
    this.cleanupEventLoop.trigger();
  }

  /**
   * Performs cleanup tasks: syncing deleted tokens with servers and cleaning old temporary files.
   * This method is executed periodically by the `cleanupEventLoop`.
   * @async
   * @private
   */
  private async cleanup(): Promise<void> {
    debug('Performing scheduled cleanup...');
    await this.syncDeletedTokens();
    await this.cleanTempFiles();
    debug('Cleanup finished.');
  }

  /**
   * Synchronizes deleted (logged out) tokens with their respective servers.
   * It iterates through tokens marked for deletion in the local `deleted_tokens` table,
   * attempts to call the server's logout endpoint for each, and then removes the
   * token entry from the local table upon success or certain types of errors (like token already invalid).
   * @async
   * @private
   */
  private async syncDeletedTokens(): Promise<void> {
    debug('Syncing deleted tokens with servers...');

    const deletedTokenRows = await this.database
      .selectFrom('deleted_tokens')
      .innerJoin('servers', 'deleted_tokens.server', 'servers.domain') // Join to get server info if needed
      .select([
        'deleted_tokens.token',
        'deleted_tokens.account_id',
        'deleted_tokens.server', // Server domain from deleted_tokens table
        // 'servers.attributes', // If server attributes (like URL base) are needed from servers table
      ])
      .execute();

    if (deletedTokenRows.length === 0) {
      debug('No deleted tokens to sync.');
      return;
    }
    debug(`Found ${deletedTokenRows.length} deleted tokens to process.`);

    for (const deletedToken of deletedTokenRows) {
      const serverService = this.servers.get(deletedToken.server);
      if (!serverService) {
        debug(
          `Server ${deletedToken.server} not found for deleted token of account ${deletedToken.account_id}. Removing local token entry.`
        );
        await this.removeDeletedTokenEntry(deletedToken.token, deletedToken.account_id);
        continue;
      }

      if (!serverService.isAvailable) { // Assumes ServerService has an isAvailable status
        debug(
          `Server ${deletedToken.server} is not available. Skipping logout for token of account ${deletedToken.account_id}.`
        );
        continue;
      }

      try {
        // Use the global Ky instance or a server-specific one if available/necessary
        await this.client.delete(`${serverService.httpBaseUrl}/v1/accounts/logout`, {
          headers: {
            Authorization: `Bearer ${deletedToken.token}`,
          },
        });
        debug(
          `Successfully logged out token for account ${deletedToken.account_id} from server ${deletedToken.server}.`
        );
        await this.removeDeletedTokenEntry(deletedToken.token, deletedToken.account_id);
      } catch (error) {
        const parsedError = await parseApiError(error);
        // If token is already invalid/unauthorized, or account/device not found, it's effectively logged out.
        if (
          parsedError.code === ApiErrorCode.TokenInvalid ||
          parsedError.code === ApiErrorCode.Unauthorized || // Broader check for auth failure
          parsedError.code === ApiErrorCode.AccountNotFound ||
          parsedError.code === ApiErrorCode.DeviceNotFound
        ) {
          debug(
            `Token for account ${deletedToken.account_id} on server ${deletedToken.server} is already invalid or session not found. Removing local entry.`
          );
          await this.removeDeletedTokenEntry(deletedToken.token, deletedToken.account_id);
        } else {
          // For other errors (e.g., network issue, server error), keep the token for next retry.
          debug(
            `Failed to confirm logout for token of account ${deletedToken.account_id} from server ${deletedToken.server}. Error: ${parsedError.code} - ${parsedError.message}. Will retry later.`
          );
        }
      }
    }
  }

  /**
   * Helper to remove an entry from the `deleted_tokens` table.
   * @param token - The token string.
   * @param accountId - The account ID.
   * @private
   */
  private async removeDeletedTokenEntry(token: string, accountId: string): Promise<void> {
     await this.database
          .deleteFrom('deleted_tokens')
          .where('token', '=', token)
          .where('account_id', '=', accountId)
          .execute();
  }


  /**
   * Cleans up old temporary files stored by the application.
   * It lists files in the temporary directory and deletes any that were last modified
   * more than 24 hours ago.
   * @async
   * @private
   */
  private async cleanTempFiles(): Promise<void> {
    debug('Cleaning temporary files...');
    const tempPath = this.path.temp; // Get temp path from PathService

    const exists = await this.fs.exists(tempPath);
    if (!exists) {
      debug('Temporary directory does not exist. Nothing to clean.');
      return;
    }

    try {
      const filePaths = await this.fs.listFiles(tempPath);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      let deletedCount = 0;

      for (const filePath of filePaths) {
        try {
          const metadata = await this.fs.metadata(filePath); // Assuming metadata gives lastModified
          if (metadata.lastModified < oneDayAgo) {
            await this.fs.delete(filePath);
            debug(`Deleted old temp file: ${filePath}`);
            deletedCount++;
          }
        } catch (fileError) {
          // Log error for individual file but continue with others
          debug(`Failed to process or delete temp file: ${filePath}`, fileError);
        }
      }
      debug(`Temp file cleanup finished. Deleted ${deletedCount} old files.`);
    } catch (listError) {
        debug('Failed to list temporary files for cleanup:', listError);
    }
  }

  /**
   * Deletes all data associated with the application from the local client.
   * This includes all accounts, application metadata, deleted tokens, and
   * the main accounts directory from the file system.
   * This is a destructive operation intended for full data reset or uninstallation.
   * @async
   * @private
   */
  private async deleteAllData(): Promise<void> {
    debug('Deleting all local application data...');
    // Order of deletion might matter if there are foreign key constraints without ON DELETE CASCADE
    // For app DB, usually it's okay to delete in any order if they are mostly independent or cascade.
    await this.database.deleteFrom('accounts').execute();
    debug('Deleted data from accounts table.');
    await this.database.deleteFrom('metadata').execute();
    debug('Deleted data from metadata table.');
    await this.database.deleteFrom('deleted_tokens').execute();
    debug('Deleted data from deleted_tokens table.');
    // Servers table might also need clearing if a full reset implies forgetting all servers.
    // await this.database.deleteFrom('servers').execute();
    // debug('Deleted data from servers table.');

    // Delete account-specific directories from file system
    try {
        const accountPathExists = await this.fs.exists(this.path.accounts);
        if (accountPathExists) {
            await this.fs.delete(this.path.accounts); // Assuming this deletes a directory recursively
            debug(`Deleted accounts directory: ${this.path.accounts}`);
        } else {
            debug(`Accounts directory not found, skipping deletion: ${this.path.accounts}`);
        }
    } catch (fsError) {
        debug(`Error deleting accounts directory ${this.path.accounts}:`, fsError);
    }
    debug('All local application data deletion attempt finished.');
  }
}
