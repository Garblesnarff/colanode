import { KyInstance } from 'ky';
import { Kysely, Migration, Migrator } from 'kysely';
import ms from 'ms';

import {
  AccountDatabaseSchema,
  accountDatabaseMigrations,
} from '@colanode/client/databases/account';
import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { parseApiError } from '@colanode/client/lib/ky';
import { mapAccount, mapWorkspace } from '@colanode/client/lib/mappers';
import { AccountSocket } from '@colanode/client/services/accounts/account-socket';
import { AppService } from '@colanode/client/services/app-service';
import { ServerService } from '@colanode/client/services/server-service';
import { WorkspaceService } from '@colanode/client/services/workspaces/workspace-service';
import { Account } from '@colanode/client/types/accounts';
import { Workspace } from '@colanode/client/types/workspaces';
import {
  AccountSyncOutput,
  ApiErrorCode,
  ApiErrorOutput,
  createDebugger,
  getIdType,
  IdType,
  Message,
// packages/client/src/services/accounts/account-service.ts
/**
 * @file Defines the `AccountService` class, responsible for managing operations
 * and data related to a single user account on a specific server. This includes
 * managing workspaces for the account, handling account-specific database,
 * WebSocket connections, API requests, and synchronization logic.
 */
import { KyInstance } from 'ky';
import { Kysely, Migration, Migrator } from 'kysely';
import ms from 'ms'; // For time string parsing like '1 minute'
// import semver from 'semver'; // Not directly used here, but AppService uses it.

import {
  AccountDatabaseSchema,
  accountDatabaseMigrations,
} from '@colanode/client/databases/account'; // Specific account DB schema and migrations
import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { parseApiError } from '@colanode/client/lib/ky';
import { mapAccount, mapWorkspace } from '@colanode/client/lib/mappers';
import { AccountSocket } from '@colanode/client/services/accounts/account-socket';
import { AppService } from '@colanode/client/services/app-service';
import { ServerService } from '@colanode/client/services/server-service';
import { WorkspaceService } from '@colanode/client/services/workspaces/workspace-service';
import { Account } from '@colanode/client/types/accounts';
import { Workspace } from '@colanode/client/types/workspaces';
import {
  AccountSyncOutput,
  ApiErrorCode,
  ApiErrorOutput,
  createDebugger,
  getIdType, // Utility from core
  IdType,     // Enum from core
  Message,    // Union of WebSocket message types from core
} from '@colanode/core';

const debug = createDebugger('client:service:account'); // Standardized debug namespace

/**
 * Manages all aspects of a user's account for a specific server.
 * This includes:
 * - Account-specific database and its migrations.
 * - WebSocket connection for real-time updates related to this account.
 * - API client pre-configured with the account's authentication token.
 * - Management of workspaces associated with this account.
 * - Periodic synchronization of account and workspace data.
 * - Handling logout and data cleanup for the account.
 */
export class AccountService {
  /** Map storing active {@link WorkspaceService} instances for this account, keyed by workspace ID. */
  private readonly workspaces: Map<string, WorkspaceService> = new Map();
  /** EventLoop for periodic synchronization of this account's data. */
  private readonly eventLoop: EventLoop;
  /** The core {@link Account} data object this service manages. Mutable within the service. */
  private account: Account; // Made mutable for internal updates

  /** Reference to the global {@link AppService}. */
  public readonly app: AppService;
  /** Reference to the {@link ServerService} this account is associated with. */
  public readonly server: ServerService;
  /** Kysely instance for this account's dedicated local database. */
  public readonly database: Kysely<AccountDatabaseSchema>;

  /** WebSocket handler for this account. */
  public readonly socket: AccountSocket;
  /** Ky HTTP client instance configured with this account's authentication token. */
  public readonly client: KyInstance;
  /** ID of the subscription to the global event bus. */
  private readonly eventSubscriptionId: string;

  /**
   * Constructs an `AccountService`.
   * Initializes the account-specific database, WebSocket connection, HTTP client,
   * and event loop for synchronization.
   *
   * @param account - The initial {@link Account} data.
   * @param server - The {@link ServerService} this account belongs to.
   * @param app - The main {@link AppService} instance.
   */
  constructor(account: Account, server: ServerService, app: AppService) {
    debug(`Initializing AccountService for account ${account.id} on server ${server.domain}`);

    this.account = account;
    this.server = server;
    this.app = app;

    // Initialize this account's dedicated database.
    this.database = app.kysely.build<AccountDatabaseSchema>({
      path: app.path.accountDatabase(this.account.id),
      readonly: false,
    });

    this.socket = new AccountSocket(this); // Manages WebSocket for this account

    // Create an HTTP client instance specifically for this account, pre-configured with its auth token.
    this.client = this.app.client.extend({
      prefixUrl: this.server.httpBaseUrl, // API calls are relative to server's base client URL
      headers: {
        Authorization: `Bearer ${this.account.token}`,
      },
    });

    // Setup periodic sync for this account.
    this.eventLoop = new EventLoop(
      ms('1 minute'),       // Regular sync interval
      ms('1 second'),       // Debounce for immediate trigger
      this.sync.bind(this)  // Sync method to call
    );

    // Subscribe to global events that might affect this account.
    this.eventSubscriptionId = eventBus.subscribe((event) => {
      // If the server this account is on becomes available, trigger a sync.
      if (
        event.type === 'server.availability.changed' &&
        event.server.domain === this.server.domain &&
        event.isAvailable
      ) {
        debug(`Server ${this.server.domain} availability changed to available, triggering sync for account ${this.account.id}`);
        this.eventLoop.trigger();
      } else if (
        // If a WebSocket message is received for this account, handle it.
        event.type === 'account.connection.message.received' &&
        event.accountId === this.account.id
      ) {
        this.handleMessage(event.message);
      }
    });
    debug(`AccountService for ${account.id} constructed. Event bus subscription ID: ${this.eventSubscriptionId}`);
  }

  /** Gets the unique ID of this account. */
  public get id(): string {
    return this.account.id;
  }

  /** Gets the current authentication token for this account. */
  public get token(): string {
    return this.account.token;
  }

  /** Gets the device ID associated with this account's current session. */
  public get deviceId(): string {
    return this.account.deviceId;
  }

  /**
   * Initializes the account service. This includes:
   * - Migrating the account-specific database to the latest schema.
   * - Ensuring necessary account-specific directories exist on the file system.
   * - Downloading the account's avatar if not already present locally.
   * - Initializing the WebSocket connection.
   * - Starting the periodic sync event loop.
   * - Initializing workspaces associated with this account.
   * @async
   */
  public async init(): Promise<void> {
    debug(`Initiating full setup for account ${this.account.id}`);
    await this.migrate();
    await this.app.fs.makeDirectory(this.app.path.account(this.account.id));
    await this.app.fs.makeDirectory(
      this.app.path.accountAvatars(this.account.id)
    );

    if (this.account.avatar) {
      debug(`Account ${this.account.id} has avatar ${this.account.avatar}, attempting download.`);
      await this.downloadAvatar(this.account.avatar);
    }

    this.socket.init(); // Initialize WebSocket connection
    this.eventLoop.start(); // Start periodic sync
    debug(`Sync event loop started for account ${this.account.id}.`);

    await this.initWorkspaces(); // Load and initialize workspaces for this account
    debug(`Full setup for account ${this.account.id} completed.`);
  }

  /**
   * Updates the internal state of this service with new account data.
   * This is typically called after a sync operation or when account details change.
   *
   * @param account - The new {@link Account} data object.
   *                  Currently updates email, token, and deviceId. Name and avatar are updated via sync.
   */
  public updateAccount(account: Account): void {
    debug(`Updating internal account data for ${this.account.id}. Old token: ${this.account.token.substring(0,5)}, New token: ${account.token.substring(0,5)}`);
    // Only update fields that are mutable or session-specific from this method's perspective.
    // Name and avatar are typically updated via the sync method from server data.
    this.account.email = account.email; // Email might change if user updates it on server
    this.account.token = account.token; // Token will change on re-login or refresh
    this.account.deviceId = account.deviceId; // Device ID might change

    // Re-configure the Ky client instance with the new token.
    this.client.extendOptions({
        headers: { Authorization: `Bearer ${this.account.token}`},
    });
    debug(`Reconfigured HTTP client with new token for account ${this.account.id}`);
  }

  /**
   * Retrieves an active {@link WorkspaceService} instance managed by this account.
   * @param id - The unique identifier of the workspace.
   * @returns The `WorkspaceService` instance if found, otherwise `null`.
   */
  public getWorkspace(id: string): WorkspaceService | null {
    return this.workspaces.get(id) ?? null;
  }

  /**
   * Retrieves all active {@link WorkspaceService} instances for this account.
   * @returns An array of `WorkspaceService` instances.
   */
  public getWorkspaces(): WorkspaceService[] {
    return Array.from(this.workspaces.values());
  }

  /**
   * Logs out the current account. This involves:
   * - Deleting the account record from the main app database.
   * - Storing the account's token in the `deleted_tokens` table for server-side invalidation attempt.
   * - Deleting all associated workspaces and their data.
   * - Destroying the account-specific database connection.
   * - Closing the WebSocket connection.
   * - Stopping the sync event loop.
   * - Unsubscribing from the global event bus.
   * - Deleting the account's local database file and data directory.
   * - Publishing an 'account.deleted' event.
   * @async
   */
  public async logout(): Promise<void> {
    debug(`Logging out account ${this.account.id} from server ${this.server.domain}.`);
    try {
      // Record token for server-side invalidation attempt (done by AppService cleanup)
      // and remove account from the main app DB.
      await this.app.database.transaction().execute(async (tx) => {
        debug(`Removing account ${this.account.id} from app database.`);
        const deleteResult = await tx
          .deleteFrom('accounts')
          .where('id', '=', this.account.id)
          .where('server', '=', this.server.domain) // Ensure correct server context
          .where('device_id', '=', this.account.deviceId) // Ensure correct device session
          .executeTakeFirst();

        // It's possible the account was already removed, so check rowCount.
        if (Number(deleteResult.numDeletedRows) === 0) {
          // This might happen if logout is called multiple times or data is already cleared.
          debug(`Account ${this.account.id} not found in app database for deletion, or already deleted.`);
        }

        debug(`Adding token for account ${this.account.id} to deleted_tokens table.`);
        await tx
          .insertInto('deleted_tokens')
          .values({
            account_id: this.account.id,
            token: this.account.token, // The token being invalidated
            server: this.server.domain,
            created_at: new Date().toISOString(),
          })
          // In case of conflict (e.g., token already marked for deletion), do nothing.
          .onConflict((oc) => oc.column('token').doNothing())
          .execute();
      });
      this.app.triggerCleanup(); // Trigger cleanup to attempt server-side token invalidation.

      // Delete all workspaces associated with this account.
      debug(`Deleting ${this.workspaces.size} workspaces for account ${this.account.id}.`);
      const workspaceDeletionPromises: Promise<void>[] = [];
      for (const workspace of this.workspaces.values()) {
        workspaceDeletionPromises.push(workspace.delete());
      }
      await Promise.all(workspaceDeletionPromises);
      this.workspaces.clear();
      debug('All workspaces for account deleted.');

      // Clean up account-specific resources.
      if (this.database) { // Check if database was initialized
        await this.database.destroy(); // Close connection for this account's DB
        debug(`Destroyed database connection for account ${this.account.id}.`);
      }
      this.socket.close(); // Close WebSocket
      this.eventLoop.stop(); // Stop sync loop
      eventBus.unsubscribe(this.eventSubscriptionId); // Unsubscribe from global events
      debug('Socket closed, event loop stopped, unsubscribed from event bus.');

      // Delete physical database file and account directory.
      const databasePath = this.app.path.accountDatabase(this.account.id);
      await this.app.kysely.delete(databasePath); // Uses KyselyService to delete DB file
      debug(`Deleted account database file: ${databasePath}`);

      const accountPath = this.app.path.account(this.account.id);
      await this.app.fs.delete(accountPath); // Delete entire account data directory
      debug(`Deleted account data directory: ${accountPath}`);

      // Publish event indicating account deletion.
      eventBus.publish({
        type: 'account.deleted',
        account: this.account, // Publish original account data for context
      });
      debug(`Logout complete for account ${this.account.id}. 'account.deleted' event published.`);
    } catch (error) {
      debug(`Error logging out of account ${this.account.id}:`, error);
      // Even if errors occur, ensure critical cleanup like stopping loops and sockets happens if possible.
      // Depending on where the error occurred, some cleanup might have already run.
      this.socket.close();
      this.eventLoop.stop();
      eventBus.unsubscribe(this.eventSubscriptionId);
    }
  }

  /**
   * Migrates the account-specific database to the latest schema version.
   * @async
   * @private
   */
  private async migrate(): Promise<void> {
    debug(`Migrating account database for account ${this.account.id}`);
    const migrator = new Migrator({
      db: this.database,
      provider: {
        getMigrations(): Promise<Record<string, Migration>> {
          // Provides the Kysely migrator with the set of migrations for the account DB.
          return Promise.resolve(accountDatabaseMigrations);
        },
      },
    });

    const { error, results } = await migrator.migrateToLatest();
    results?.forEach((it) => {
        if (it.status === 'Success') {
            debug(`Migration "${it.migrationName}" was executed successfully for account ${this.account.id}`);
        } else if (it.status === 'Error') {
            console.error(`Failed to execute migration "${it.migrationName}" for account ${this.account.id}`);
            // Potentially throw error or handle specific migration errors
        }
    });
    if (error) {
        console.error(`Failed to migrate account database for ${this.account.id}`, error);
        throw error; // Propagate error to stop further initialization if migration fails
    }
    debug(`Account database migration completed for ${this.account.id}`);
  }

  /**
   * Downloads the avatar for the current account if it's specified and not already cached.
   * Stores the downloaded avatar in the account's local avatar directory.
   * Publishes an 'avatar.downloaded' event on success.
   *
   * @async
   * @param avatarId - The ID or name of the avatar file to download (typically from `this.account.avatar`).
   * @returns A promise that resolves to `true` if the avatar was successfully downloaded or already exists, `false` otherwise.
   */
  public async downloadAvatar(avatarId: string): Promise<boolean> {
    // Avatars are identified by an ID which should be of type Avatar.
    const type = getIdType(avatarId); // Utility from @colanode/core
    if (type !== IdType.Avatar) {
      debug(`Invalid avatar ID format for account ${this.account.id}: ${avatarId}. Expected 'av' prefix.`);
      return false;
    }

    try {
      const avatarPath = this.app.path.accountAvatar(this.account.id, avatarId);
      debug(`Checking for avatar ${avatarId} at path: ${avatarPath}`);

      const exists = await this.app.fs.exists(avatarPath);
      if (exists) {
        debug(`Avatar ${avatarId} already exists locally for account ${this.account.id}.`);
        return true;
      }

      debug(`Avatar ${avatarId} not found locally, downloading from server for account ${this.account.id}.`);
      // API endpoint is /v1/avatars/{avatarId}
      const response = await this.client.get(`v1/avatars/${avatarId}`);
      // The response type from ky for ArrayBuffer needs to be handled correctly.
      // Assuming client is pre-configured or responseType is set appropriately if ky needs it.
      const avatarBytes = new Uint8Array(await response.arrayBuffer());
      await this.app.fs.writeFile(avatarPath, avatarBytes);
      debug(`Avatar ${avatarId} downloaded and saved to ${avatarPath} for account ${this.account.id}.`);

      eventBus.publish({
        type: 'avatar.downloaded',
        accountId: this.account.id,
        avatarId: avatarId,
      });

      return true;
    } catch (err) {
      // Log specific error from ky or fs operation.
      console.error(`Error downloading avatar ${avatarId} for account ${this.account.id}:`, err);
      debug(`Error downloading avatar for account ${this.account.id}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return false;
  }

  /**
   * Loads workspace data from this account's local database and initializes
   * `WorkspaceService` instances for each.
   * @async
   * @private
   */
  private async initWorkspaces(): Promise<void> {
    debug(`Initializing workspaces for account ${this.account.id} from its database.`);
    const workspaceRows = await this.database
      .selectFrom('workspaces')
      .selectAll()
      // Ensure we only load workspaces belonging to this account, though this table is account-specific.
      // This where clause might be redundant if the DB is already specific to the account.
      .where('account_id', '=', this.account.id)
      .execute();
    debug(`Found ${workspaceRows.length} workspaces in DB for account ${this.account.id}.`);

    for (const workspaceRow of workspaceRows) {
      const mappedWorkspace = mapWorkspace(workspaceRow);
      await this.initWorkspace(mappedWorkspace);
    }
    debug(`Workspace initialization for account ${this.account.id} complete.`);
  }

  /**
   * Initializes or retrieves an existing {@link WorkspaceService} for a given workspace
   * associated with this account. If an instance for this workspace ID already exists,
   * it's returned. Otherwise, a new `WorkspaceService` is created, initialized, and stored.
   *
   * @async
   * @param workspace - The {@link Workspace} data object.
   * @returns A promise that resolves when the workspace service is initialized. Does not return the service.
   */
  public async initWorkspace(workspace: Workspace): Promise<void> {
    if (this.workspaces.has(workspace.id)) {
      debug(`WorkspaceService for ${workspace.id} (account: ${this.account.id}) already initialized.`);
      return;
    }
    debug(`Initializing new WorkspaceService for workspace ${workspace.id} (account: ${this.account.id}).`);

    const workspaceService = new WorkspaceService(workspace, this);
    await workspaceService.init(); // WorkspaceService has its own async init (DB migration, etc.)

    this.workspaces.set(workspace.id, workspaceService);
    debug(`WorkspaceService for ${workspace.id} (account: ${this.account.id}) initialized and stored.`);
  }

  /**
   * Deletes a workspace associated with this account, both locally and triggers its service's delete logic.
   * @async
   * @param id - The ID of the workspace to delete.
   */
  public async deleteWorkspace(id: string): Promise<void> {
    debug(`Attempting to delete workspace ${id} for account ${this.account.id}.`);
    const workspaceService = this.workspaces.get(id);
    if (workspaceService) {
      await workspaceService.delete(); // Calls WorkspaceService.delete() for its specific cleanup
      this.workspaces.delete(id); // Remove from this account's map
      debug(`Workspace ${id} deleted and removed from account ${this.account.id}.`);
    } else {
      debug(`Workspace ${id} not found for deletion for account ${this.account.id}.`);
    }
  }

  /**
   * Handles incoming WebSocket messages relevant to this account.
   * If the message indicates an update to account, workspace, or user data,
   * it triggers the account's sync event loop to refresh data.
   *
   * @param message - The {@link Message} object received via WebSocket.
   * @private
   */
  private handleMessage(message: Message): void {
    debug(`Account ${this.account.id} received WebSocket message of type: ${message.type}`);
    // Check if the message type is one that should trigger a broader account/workspace sync.
    if (
      message.type === 'account.updated' || // Potentially this account itself if message.accountId matches
      message.type === 'workspace.deleted' ||
      message.type === 'workspace.updated' ||
      message.type === 'user.created' || // A user was added/changed in one of this account's workspaces
      message.type === 'user.updated'
      // Add other relevant message types here
    ) {
      // For now, any of these messages trigger a full sync for the account.
      // More granular updates could be implemented later based on message content.
      debug(`Relevant WebSocket message received, triggering sync for account ${this.account.id}.`);
      this.eventLoop.trigger();
    }
    // Specific message types (like CRDT updates for a document) might be handled by WorkspaceService
    // or DocumentService directly if they subscribe to finer-grained events or if AccountSocket routes them.
  }

  /**
   * Synchronizes the account's data (profile, workspaces list) with the server.
   * Fetches the latest account and workspace information. Updates local database records
   * for the account and its workspaces, creates new workspace entries if any, and
   * removes local workspace entries that are no longer associated with the account on the server.
   * Publishes events for account and workspace updates/creations.
   * Handles errors, including logging out the account if the session becomes invalid.
   * @async
   * @private
   */
  private async sync(): Promise<void> {
    debug(`Starting sync for account ${this.account.id} on server ${this.server.domain}.`);

    if (!this.server.isAvailable) {
      debug(
        `Server ${this.server.domain} is not available for syncing account ${this.account.email}. Sync aborted.`
      );
      return;
    }

    try {
      // Fetch latest account and workspace list from server.
      const syncData = await this.client
        .post('v1/accounts/sync') // Assuming POST is for sync request, could be GET
        .json<AccountSyncOutput>();
      debug(`Sync data received for account ${this.account.id}: ${syncData.workspaces.length} workspaces.`);

      // --- Phase 1: Update Local Account Information from Sync Data ---
      const serverAccountInfo = syncData.account;
      const localAccountData = this.account; // Current in-memory account data

      // Check if core account details (name, avatar) have changed.
      const accountDetailsChanged =
        serverAccountInfo.name !== localAccountData.name ||
        serverAccountInfo.avatar !== localAccountData.avatar;

      // Update the account record in the main app database.
      const updatedAccountRow = await this.app.database
        .updateTable('accounts')
        .set({
          name: serverAccountInfo.name,
          avatar: serverAccountInfo.avatar,
          // Only set updated_at if there were actual changes to name/avatar.
          // synced_at should always be updated to reflect the successful sync.
          updated_at: accountDetailsChanged ? new Date().toISOString() : this.account.updatedAt, // Keep old if no change
          synced_at: new Date().toISOString(),
          // If token is part of syncData and can change, update it here too.
          ...(syncData.token && { token: syncData.token }),
        })
        .where('id', '=', this.account.id)
        .where('server', '=', this.server.domain) // Ensure context
        .returningAll()
        .executeTakeFirst(); // Should always find one if account is valid

      if (!updatedAccountRow) {
        debug(`Failed to update account ${this.account.email} in app DB after sync. This may indicate an issue or prior deletion.`);
        // If account is gone from app DB, it might have been logged out by another process.
        // Consider triggering a local logout/cleanup here too.
        await this.logout(); // Defensive logout if local app DB state is inconsistent
        return;
      }

      // Download new avatar if it changed and exists.
      if (updatedAccountRow.avatar && (updatedAccountRow.avatar !== localAccountData.avatar)) {
        await this.downloadAvatar(updatedAccountRow.avatar);
      }

      debug(`Account details for ${this.account.email} updated in app DB.`);
      const newAccountState = mapAccount(updatedAccountRow);
      this.updateAccount(newAccountState); // Update in-memory AccountService state (e.g., new token)

      // Publish event that this account's details were updated.
      eventBus.publish({
        type: 'account.updated',
        account: newAccountState,
      });

      // --- Phase 2: Synchronize Workspaces (Create New, Update Existing) ---
      const serverWorkspaceIds = new Set(syncData.workspaces.map(w => w.id));

      // Process workspaces from the server: update existing or create new ones.
      for (const serverWorkspaceData of syncData.workspaces) {
        const existingWorkspaceService = this.getWorkspace(serverWorkspaceData.id);
        const workspaceDataForDb = { // Prepare data for DB insert/update
            id: serverWorkspaceData.id,
            account_id: this.account.id,
            user_id: serverWorkspaceData.user.id, // User's ID within that workspace
            name: serverWorkspaceData.name,
            description: serverWorkspaceData.description,
            avatar: serverWorkspaceData.avatar,
            role: serverWorkspaceData.user.role,
            storage_limit: serverWorkspaceData.user.storageLimit,
            max_file_size: serverWorkspaceData.user.maxFileSize,
            created_at: new Date().toISOString(), // Default for new, not updated for existing here
             // updated_at will be set by DB or on actual change
        };

        if (!existingWorkspaceService) {
          // Workspace is new to this client for this account.
          debug(`New workspace ${serverWorkspaceData.id} found for account ${this.account.id}. Creating locally.`);
          const createdDbWorkspace = await this.database
            .insertInto('workspaces')
            .values(workspaceDataForDb) // created_at is set here
            .returningAll()
            .executeTakeFirstOrThrow();

          if (createdDbWorkspace.avatar) {
            // For workspace avatar, it might be a generic icon name or a URL.
            // Assuming downloadAvatar can handle or AppService.asset can resolve it.
            // This might need a different avatar download logic if workspace avatars are different from user avatars.
            // await this.app.asset.downloadWorkspaceAvatar(createdDbWorkspace.avatar); // Example
          }

          const newAppWorkspace = mapWorkspace(createdDbWorkspace);
          await this.initWorkspace(newAppWorkspace); // Creates WorkspaceService, inits its DB, etc.

          eventBus.publish({
            type: 'workspace.created',
            workspace: newAppWorkspace,
          });
        } else {
          // Workspace already exists locally, check if it needs update.
          const currentWsData = existingWorkspaceService.workspace;
          if (
            currentWsData.name !== serverWorkspaceData.name ||
            currentWsData.description !== serverWorkspaceData.description ||
            currentWsData.avatar !== serverWorkspaceData.avatar ||
            currentWsData.role !== serverWorkspaceData.user.role // And other user-specific fields
          ) {
            debug(`Workspace ${serverWorkspaceData.id} has updates for account ${this.account.id}.`);
            const updatedDbWorkspace = await this.database
              .updateTable('workspaces')
              .set({
                name: serverWorkspaceData.name,
                description: serverWorkspaceData.description,
                avatar: serverWorkspaceData.avatar,
                role: serverWorkspaceData.user.role,
                storage_limit: serverWorkspaceData.user.storageLimit,
                max_file_size: serverWorkspaceData.user.maxFileSize,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', serverWorkspaceData.id)
              .returningAll()
              .executeTakeFirstOrThrow();

            const updatedAppWorkspace = mapWorkspace(updatedDbWorkspace);
            existingWorkspaceService.updateWorkspace(updatedAppWorkspace); // Update WorkspaceService's internal state

            if (updatedDbWorkspace.avatar && (updatedDbWorkspace.avatar !== currentWsData.avatar)) {
              // Similar to create, handle avatar download/update if necessary
              // await this.app.asset.downloadWorkspaceAvatar(updatedDbWorkspace.avatar);
            }

            eventBus.publish({
              type: 'workspace.updated',
              workspace: updatedAppWorkspace,
            });
          }
        }
      }

      // --- Phase 3: Remove Local Workspaces Not Present on Server ---
      for (const localWorkspaceId of this.workspaces.keys()) {
        if (!serverWorkspaceIds.has(localWorkspaceId)) {
          debug(`Workspace ${localWorkspaceId} no longer associated with account ${this.account.id}. Deleting locally.`);
          await this.deleteWorkspace(localWorkspaceId); // This will publish 'workspace.deleted'
        }
      }
      debug(`Account sync for ${this.account.id} completed successfully.`);

    } catch (error) {
      // --- Error Handling for Sync ---
      const parsedError = await parseApiError(error);
      if (this.isSyncInvalid(parsedError)) {
        debug(`Account sync for ${this.account.email} failed due to invalid session/account (${parsedError.code}). Logging out...`);
        await this.logout(); // Triggers full cleanup and event
        return; // Stop further processing after logout
      }
      // For other errors (network, server-side temporary issues), just log and let next sync attempt handle it.
      debug(`Failed to sync account ${this.account.email}:`, error);
    }
  }

  /**
   * Checks if an API error indicates that the current session or account state is invalid,
   * warranting a local logout.
   *
   * @param error - The {@link ApiErrorOutput} to check.
   * @returns `true` if the error signifies an invalid session/account, `false` otherwise.
   * @private
   */
  private isSyncInvalid(error: ApiErrorOutput): boolean {
    return (
      error.code === ApiErrorCode.TokenInvalid ||
      error.code === ApiErrorCode.TokenMissing || // Should not happen if client sends token
      error.code === ApiErrorCode.AccountNotFound || // Account deleted on server
      error.code === ApiErrorCode.DeviceNotFound // This specific device session invalidated
    );
  }
}
