import ky from 'ky';
import ms from 'ms';

import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { mapServer } from '@colanode/client/lib/mappers';
import { isServerOutdated } from '@colanode/client/lib/servers';
import { AppService } from '@colanode/client/services/app-service';
import {
  Server,
  ServerAttributes,
  ServerState,
} from '@colanode/client/types/servers';
// packages/client/src/services/server-service.ts
/**
 * @file Defines the `ServerService` class, responsible for managing the state
 * and interactions with a specific Colanode server. This includes periodically
 * checking server availability, fetching its configuration, and updating local
 * server information.
 */
import ky from 'ky'; // HTTP client
import ms from 'ms'; // Millisecond conversion utility
import semver from 'semver'; // Semantic versioning utility

import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { mapServer } from '@colanode/client/lib/mappers';
import { isServerOutdated } from '@colanode/client/lib/servers';
import { AppService } from '@colanode/client/services/app-service';
import {
  Server, // Client-side representation of a server
  ServerAttributes, // Client-side representation of server's configurable attributes
  ServerState, // Client-side representation of a server's dynamic state
} from '@colanode/client/types/servers';
import { ServerConfig, createDebugger } from '@colanode/core'; // ServerConfig is from core, expected from server's /config endpoint

const debug = createDebugger('client:service:server'); // Standardized debug namespace

/**
 * Manages the state and interactions for a single Colanode server.
 * Each instance of `ServerService` is associated with one server defined in the
 * client's local database. It periodically syncs with the server to fetch its
 * latest configuration and check its availability.
 */
export class ServerService {
  /** Reference to the main {@link AppService} for accessing shared resources. */
  private readonly app: AppService;
  /** {@link EventLoop} instance for periodically syncing server information. */
  private readonly eventLoop: EventLoop;

  /**
   * Current dynamic state of the server (availability, last check times).
   * Null if no sync has occurred yet.
   */
  public state: ServerState | null = null;
  /** Boolean indicating if the server's reported version is considered outdated by the client. */
  public isOutdated: boolean;

  /** The static/configured information about this server, loaded from the local database. */
  public readonly server: Server;
  /** The fully qualified URL to fetch this server's configuration (typically `http(s)://domain/pathPrefix/config`). */
  public readonly configUrl: string;
  /** The base URL for WebSocket connections to this server (e.g., `ws(s)://domain/pathPrefix/client`). */
  public readonly socketBaseUrl: string;
  /** The base URL for HTTP API requests to this server (e.g., `http(s)://domain/pathPrefix/client`). */
  public readonly httpBaseUrl: string;

  /**
   * Constructs a `ServerService` instance.
   * Initializes URLs, checks if the server version is outdated, and starts an event loop
   * for periodic synchronization of server status and configuration.
   *
   * @param app - The main {@link AppService} instance.
   * @param server - The {@link Server} data object representing this server's stored configuration.
   */
  constructor(app: AppService, server: Server) {
    this.app = app;
    this.server = server;

    // Build various base URLs for interacting with the server.
    this.configUrl = this.buildConfigUrl();
    this.socketBaseUrl = this.buildSocketBaseUrl();
    this.httpBaseUrl = this.buildHttpBaseUrl();

    this.isOutdated = isServerOutdated(server.version);

    // Setup an event loop to periodically call the `sync` method.
    this.eventLoop = new EventLoop(
      ms('1 minute'),       // Regular sync interval
      ms('1 second'),       // Debounce for immediate trigger (e.g., on network change)
      this.sync.bind(this)  // Method to call
    );
    this.eventLoop.start(); // Start the sync loop immediately
    debug(`ServerService initialized for ${this.server.domain}. Initial outdated status: ${this.isOutdated}. Sync loop started.`);
  }

  /**
   * Gets whether the server is currently considered available.
   * A server is available if it's not marked as outdated and its last known state
   * indicates availability.
   * @returns `true` if the server is available, `false` otherwise.
   */
  public get isAvailable(): boolean {
    return !this.isOutdated && (this.state?.isAvailable ?? false);
  }

  /** Gets the domain of this server. */
  public get domain(): string {
    return this.server.domain;
  }

  /** Gets the current known version of this server. */
  public get version(): string {
    return this.server.version;
  }

  /**
   * Periodically fetches the server's configuration, updates its availability state,
   * and syncs any changes to its attributes (name, version, avatar, etc.) with the
   * local database. Publishes events if availability or server details change.
   * @async
   * @private
   */
  private async sync(): Promise<void> {
    debug(`Syncing server state for ${this.server.domain} via ${this.configUrl}`);
    const fetchedConfig = await ServerService.fetchServerConfig(this.configUrl);
    const oldState = this.state;

    const newServerState: ServerState = {
      isAvailable: fetchedConfig !== null,
      lastCheckedAt: new Date(), // Current time for last check attempt
      lastCheckedSuccessfullyAt: fetchedConfig !== null ? new Date() : (oldState?.lastCheckedSuccessfullyAt || null),
      count: (oldState?.count ?? 0) + 1, // Increment check count
    };
    this.state = newServerState;

    const previousAvailability = oldState?.isAvailable ?? false;
    if (previousAvailability !== newServerState.isAvailable) {
      debug(`Server ${this.server.domain} availability changed: ${previousAvailability} -> ${newServerState.isAvailable}`);
      eventBus.publish({
        type: 'server.availability.changed',
        server: this.server, // Publish with the current server object state
        isAvailable: newServerState.isAvailable,
      });
    }

    debug(
      `Server ${this.server.domain} is ${newServerState.isAvailable ? 'available' : 'unavailable'}. Check count: ${newServerState.count}`
    );

    if (fetchedConfig) {
      // If config was fetched, update local server record if anything changed.
      let changed = false;
      const newAttributes: ServerAttributes = { // Construct new attributes based on fetched config
        ...this.server.attributes, // Preserve existing attributes like 'insecure', 'pathPrefix'
        sha: fetchedConfig.sha,
        account: fetchedConfig.account?.google.enabled
          ? {
              google: {
                enabled: fetchedConfig.account.google.enabled,
                clientId: fetchedConfig.account.google.clientId,
              },
            }
          : undefined, // Or a default if google auth is not configured
      };

      if (
        this.server.name !== fetchedConfig.name ||
        this.server.avatar !== fetchedConfig.avatar ||
        this.server.version !== fetchedConfig.version ||
        !isEqual(this.server.attributes, newAttributes) // lodash.isEqual for deep comparison
      ) {
        changed = true;
      }

      this.isOutdated = isServerOutdated(fetchedConfig.version); // Update outdated status based on new version

      if (changed) {
        debug(`Server ${this.server.domain} configuration changed. Updating local DB.`);
        const updatedServerRow = await this.app.database
          .updateTable('servers')
          .set({
            synced_at: new Date().toISOString(),
            avatar: fetchedConfig.avatar,
            name: fetchedConfig.name,
            version: fetchedConfig.version,
            attributes: JSON.stringify(newAttributes),
          })
          .where('domain', '=', this.server.domain)
          .returningAll()
          .executeTakeFirstOrThrow();

        // Update the in-memory server object
        this.server.avatar = updatedServerRow.avatar;
        this.server.name = updatedServerRow.name;
        this.server.version = updatedServerRow.version;
        this.server.attributes = newAttributes; // Already an object
        this.server.syncedAt = new Date(updatedServerRow.synced_at!);


        eventBus.publish({
          type: 'server.updated',
          server: mapServer(updatedServerRow), // mapServer handles Date conversion for syncedAt
        });
        debug(`Server ${this.server.domain} updated locally.`);
      } else {
        // Even if no user-visible attributes changed, update synced_at timestamp
        await this.app.database
          .updateTable('servers')
          .set({ synced_at: new Date().toISOString() })
          .where('domain', '=', this.server.domain)
          .execute();
         if (this.server.syncedAt) this.server.syncedAt = new Date(); // Update in-memory as well
        debug(`Server ${this.server.domain} synced_at timestamp updated.`);
      }
    }
  }

  /**
   * Fetches server configuration from a given URL.
   * Uses the `ky` HTTP client for the request.
   *
   * @param configUrl - The URL (string or URL object) to fetch the server configuration from.
   * @returns A promise that resolves to a {@link ServerConfig} object if successful,
   *          or `null` if the request fails or the response is not as expected.
   * @static
   */
  public static async fetchServerConfig(configUrl: URL | string): Promise<ServerConfig | null> {
    try {
      debug(`Fetching server config from: ${configUrl.toString()}`);
      // Use a new ky instance or a globally configured one if preferred
      const response = await ky.get(configUrl.toString()).json<ServerConfig>();
      debug(`Successfully fetched server config for ${configUrl.toString()}`);
      return response;
    } catch (error) {
      debug(
        `Failed to fetch server config from ${configUrl.toString()}:`,
        error instanceof Error ? error.message : error
      );
    }
    return null;
  }

  /**
   * Builds the server configuration URL based on the server's domain and attributes.
   * @returns The config URL string.
   * @private
   */
  private buildConfigUrl(): string {
    const protocol = this.server.attributes.insecure ? 'http' : 'https';
    return this.buildBaseUrl(protocol) + '/config';
  }

  /**
   * Builds the HTTP base URL for client API requests to this server.
   * @returns The HTTP base URL string.
   * @private
   */
  private buildHttpBaseUrl(): string {
    const protocol = this.server.attributes.insecure ? 'http' : 'https';
    return this.buildBaseUrl(protocol) + '/client';
  }

  /**
   * Builds the WebSocket base URL for connections to this server.
   * @returns The WebSocket base URL string.
   * @private
   */
  private buildSocketBaseUrl(): string {
    const protocol = this.server.attributes.insecure ? 'ws' : 'wss';
    return this.buildBaseUrl(protocol) + '/client';
  }

  /**
   * Constructs a base URL using the given protocol, server domain, and path prefix.
   * @param protocol - The protocol string (e.g., "http", "https", "ws", "wss").
   * @returns The constructed base URL string.
   * @private
   */
  private buildBaseUrl(protocol: string): string {
    const prefix = this.server.attributes.pathPrefix
      ? `/${this.server.attributes.pathPrefix.replace(/^\/+/, '')}` // Ensure single leading slash
      : '';
    return `${protocol}://${this.server.domain}${prefix}`;
  }
}
