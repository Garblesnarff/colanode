import { Kysely, Migration, Migrator } from 'kysely';

import {
  WorkspaceDatabaseSchema,
  workspaceDatabaseMigrations,
} from '@colanode/client/databases/workspace';
import { eventBus } from '@colanode/client/lib/event-bus';
import { AccountService } from '@colanode/client/services/accounts/account-service';
import { CollaborationService } from '@colanode/client/services/workspaces/collaboration-service';
import { DocumentService } from '@colanode/client/services/workspaces/document-service';
import { FileService } from '@colanode/client/services/workspaces/file-service';
import { MutationService } from '@colanode/client/services/workspaces/mutation-service';
import { NodeCountersService } from '@colanode/client/services/workspaces/node-counters-service';
import { NodeInteractionService } from '@colanode/client/services/workspaces/node-interaction-service';
import { NodeReactionService } from '@colanode/client/services/workspaces/node-reaction-service';
import { NodeService } from '@colanode/client/services/workspaces/node-service';
import { RadarService } from '@colanode/client/services/workspaces/radar-service';
import { SyncService } from '@colanode/client/services/workspaces/sync-service';
import { UserService } from '@colanode/client/services/workspaces/user-service';
import { Workspace } from '@colanode/client/types/workspaces';
// packages/client/src/services/workspaces/workspace-service.ts
/**
 * @file Defines the `WorkspaceService` class, which is responsible for managing
 * all data and operations specific to a single workspace for a given account.
 * It orchestrates various sub-services (for nodes, documents, files, sync, etc.)
 * and manages the workspace-specific local database.
 */
import { Kysely, Migration, Migrator } from 'kysely';

import {
  WorkspaceDatabaseSchema,
  workspaceDatabaseMigrations,
} from '@colanode/client/databases/workspace';
import { eventBus } from '@colanode/client/lib/event-bus';
import { AccountService } from '@colanode/client/services/accounts/account-service';
import { CollaborationService } from '@colanode/client/services/workspaces/collaboration-service';
import { DocumentService } from '@colanode/client/services/workspaces/document-service';
import { FileService } from '@colanode/client/services/workspaces/file-service';
import { MutationService } from '@colanode/client/services/workspaces/mutation-service';
import { NodeCountersService } from '@colanode/client/services/workspaces/node-counters-service';
import { NodeInteractionService } from '@colanode/client/services/workspaces/node-interaction-service';
import { NodeReactionService } from '@colanode/client/services/workspaces/node-reaction-service';
import { NodeService } from '@colanode/client/services/workspaces/node-service';
import { RadarService } from '@colanode/client/services/workspaces/radar-service';
import { SyncService } from '@colanode/client/services/workspaces/sync-service';
import { UserService } from '@colanode/client/services/workspaces/user-service';
import { Workspace } from '@colanode/client/types/workspaces';
import { createDebugger, WorkspaceRole } from '@colanode/core';

const debug = createDebugger('client:service:workspace'); // Standardized debug namespace

/**
 * Manages data, services, and operations for a specific workspace associated with an account.
 * This service initializes and provides access to a dedicated local database for the workspace
 * and orchestrates various sub-services that operate on workspace data.
 */
export class WorkspaceService {
  /** The core {@link Workspace} data object this service manages. Mutable internally. */
  private workspace: Workspace; // Made mutable for internal updates via updateWorkspace

  /** Kysely instance for this workspace's dedicated local database. */
  public readonly database: Kysely<WorkspaceDatabaseSchema>;
  /** Reference to the parent {@link AccountService}. */
  public readonly account: AccountService;
  /** Service for managing nodes within this workspace. */
  public readonly nodes: NodeService;
  /** Service for managing documents (rich text content) within this workspace. */
  public readonly documents: DocumentService;
  /** Service for tracking user interactions with nodes in this workspace. */
  public readonly nodeInteractions: NodeInteractionService;
  /** Service for managing reactions on nodes in this workspace. */
  public readonly nodeReactions: NodeReactionService;
  /** Service for managing files within this workspace. */
  public readonly files: FileService;
  /** Service for managing and queueing mutations for this workspace. */
  public readonly mutations: MutationService;
  /** Service for managing users and their roles within this workspace. */
  public readonly users: UserService;
  /** Service for managing collaboration aspects (permissions, roles on nodes) within this workspace. */
  public readonly collaborations: CollaborationService;
  /** Service responsible for synchronizing this workspace's data with the server. */
  public readonly synchronizer: SyncService;
  /** Service for "radar" or activity tracking features within this workspace. */
  public readonly radar: RadarService;
  /** Service for managing aggregated counters on nodes within this workspace. */
  public readonly nodeCounters: NodeCountersService;

  /**
   * Constructs a `WorkspaceService`.
   * Initializes the workspace-specific database and all sub-services.
   *
   * @param workspace - The initial {@link Workspace} data object.
   * @param accountService - The parent {@link AccountService}.
   */
  constructor(workspace: Workspace, accountService: AccountService) {
    debug(`Initializing WorkspaceService for workspace ${workspace.id} (account: ${accountService.id})`);

    this.workspace = workspace;
    this.account = accountService;

    // Initialize this workspace's dedicated local database.
    this.database = this.account.app.kysely.build<WorkspaceDatabaseSchema>({
      path: this.account.app.path.workspaceDatabase(
        this.account.id,
        this.workspace.id
      ),
      readonly: false,
    });

    // Instantiate all sub-services, passing `this` (WorkspaceService) for context.
    this.nodes = new NodeService(this);
    this.nodeInteractions = new NodeInteractionService(this);
    this.nodeReactions = new NodeReactionService(this);
    this.documents = new DocumentService(this);
    this.files = new FileService(this);
    this.mutations = new MutationService(this);
    this.users = new UserService(this);
    this.collaborations = new CollaborationService(this);
    this.synchronizer = new SyncService(this);
    this.radar = new RadarService(this);
    this.nodeCounters = new NodeCountersService(this);
    debug(`All sub-services for workspace ${workspace.id} instantiated.`);
  }

  /** Gets the unique ID of this workspace. */
  public get id(): string {
    return this.workspace.id;
  }

  /** Gets the ID of the account that owns or is associated with this workspace context. */
  public get accountId(): string {
    return this.workspace.accountId;
  }

  /** Gets the current user's ID within this workspace context. */
  public get userId(): string {
    return this.workspace.userId;
  }

  /** Gets the current user's {@link WorkspaceRole} in this workspace. */
  public get role(): WorkspaceRole {
    return this.workspace.role;
  }

  /** Gets the maximum file size allowed for uploads in this workspace for the current user. */
  public get maxFileSize(): string {
    return this.workspace.maxFileSize;
  }

  /** Gets the storage limit for the current user in this workspace. */
  public get storageLimit(): string {
    return this.workspace.storageLimit;
  }

  /**
   * Updates the internal state of this service with new workspace data.
   * This is typically called after a sync operation or when workspace details change.
   *
   * @param workspace - The new {@link Workspace} data object containing updated information.
   *                    Currently updates name, description, avatar, and user's role.
   */
  public updateWorkspace(workspace: Workspace): void {
    debug(`Updating workspace data for ${this.workspace.id}. Name: ${workspace.name}, Role: ${workspace.role}`);
    this.workspace.name = workspace.name;
    this.workspace.description = workspace.description;
    this.workspace.avatar = workspace.avatar;
    this.workspace.role = workspace.role;
    // Note: maxFileSize and storageLimit might also need updating if they can change per user/role dynamically.
  }

  /**
   * Initializes the workspace service. This involves:
   * - Migrating the workspace-specific database to the latest schema.
   * - Initializing sub-services like collaborations, synchronizer, and radar.
   * @async
   */
  public async init(): Promise<void> {
    debug(`Initiating full setup for workspace ${this.workspace.id}`);
    await this.migrate();
    await this.collaborations.init(); // Collaboration service might need to fetch initial roles/permissions
    await this.synchronizer.init();   // Sync service might start its own loops or initial sync
    await this.radar.init();         // Radar service initialization
    debug(`Full setup for workspace ${this.workspace.id} completed.`);
  }

  /**
   * Migrates the workspace-specific database to the latest schema version.
   * @async
   * @private
   */
  private async migrate(): Promise<void> {
    debug(`Migrating database for workspace ${this.workspace.id}`);
    const migrator = new Migrator({
      db: this.database,
      provider: {
        getMigrations(): Promise<Record<string, Migration>> {
          return Promise.resolve(workspaceDatabaseMigrations);
        },
      },
    });

    const { error, results } = await migrator.migrateToLatest();
    results?.forEach((it) => {
        if (it.status === 'Success') {
            debug(`Migration "${it.migrationName}" was executed successfully for workspace ${this.workspace.id}`);
        } else if (it.status === 'Error') {
            console.error(`Failed to execute migration "${it.migrationName}" for workspace ${this.workspace.id}`);
        }
    });
    if (error) {
        console.error(`Failed to migrate workspace database for ${this.workspace.id}`, error);
        throw error;
    }
    debug(`Workspace database migration completed for ${this.workspace.id}`);
  }

  /**
   * Deletes this workspace and all its associated local data.
   * This includes destroying its database connection, stopping sub-service operations,
   * deleting the physical database file and workspace data directory, and removing
   * its record from the parent account's database.
   * Publishes a 'workspace.deleted' event.
   * @async
   */
  public async delete(): Promise<void> {
    debug(`Deleting workspace ${this.workspace.id} for account ${this.account.id}.`);
    try {
      // Stop and destroy services that might hold resources or run loops
      if (this.database) await this.database.destroy(); // Close DB connection
      this.mutations.destroy();      // Assumes MutationService has a destroy method
      this.synchronizer.destroy();   // Assumes SyncService has a destroy method
      this.files.destroy();          // Assumes FileService has a destroy method
      // this.mutations.destroy(); // Called twice in original, ensure it's idempotent or remove duplicate
      this.radar.destroy();          // Assumes RadarService has a destroy method
      debug(`Sub-services for workspace ${this.workspace.id} destroyed/stopped.`);

      // Delete physical database file
      const databasePath = this.account.app.path.workspaceDatabase(
        this.account.id,
        this.workspace.id
      );
      await this.account.app.kysely.delete(databasePath);
      debug(`Deleted workspace database file: ${databasePath}`);

      // Delete entire workspace data directory
      const workspacePath = this.account.app.path.workspace(
        this.account.id,
        this.workspace.id
      );
      await this.account.app.fs.delete(workspacePath);
      debug(`Deleted workspace data directory: ${workspacePath}`);

      // Remove workspace record from the parent account's database
      await this.account.database // This is the AccountService's DB instance
        .deleteFrom('workspaces')
        .where('id', '=', this.workspace.id)
        .where('account_id', '=', this.account.id) // Ensure correct account context
        .execute();
      debug(`Removed workspace ${this.workspace.id} record from account ${this.account.id}'s database.`);

      eventBus.publish({
        type: 'workspace.deleted',
        workspace: this.workspace, // Publish original workspace data for context
      });
      debug(`Workspace ${this.workspace.id} deletion complete. 'workspace.deleted' event published.`);
    } catch (error) {
      debug(`Error deleting workspace ${this.workspace.id}:`, error);
      // Attempt to gracefully handle or log, but the workspace might be in an inconsistent state.
    }
  }
}
