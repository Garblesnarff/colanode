// packages/client/src/databases/app/schema.ts
/**
 * @file Defines the Kysely database schema for the main application-level local database.
 * This database stores information global to the application instance, such as:
 * - Known servers the user has connected to.
 * - Accounts associated with those servers.
 * - Deleted authentication tokens (for security or sync purposes).
 * - General application metadata or settings.
 */
import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Interface defining the structure of the `servers` table.
 * Stores information about Colanode servers the client has interacted with.
 *
 * @property domain - Primary key. The unique domain name of the server (e.g., "eu.colanode.com"). Insert-only.
 * @property name - Display name of the server, fetched from server configuration.
 * @property avatar - URL or identifier for the server's avatar/logo.
 * @property attributes - Serialized JSON string of server configuration attributes (e.g., features, auth methods).
 * @property version - Version of the server software.
 * @property created_at - ISO 8601 timestamp when this server entry was first created locally.
 * @property synced_at - ISO 8601 timestamp of the last successful synchronization of server info. Nullable.
 */
interface ServerTable {
  /** Primary key: Unique domain of the server (e.g., "eu.colanode.com"). Cannot be updated. */
  domain: ColumnType<string, string, never>; // domain is the PK, not updatable
  /** Display name of the server. */
  name: ColumnType<string, string, string>;
  /** URL of the server's avatar. */
  avatar: ColumnType<string, string, string>;
  /** Serialized JSON string of server configuration attributes. */
  attributes: ColumnType<string, string, string>; // JSON stringified server config
  /** Server software version. */
  version: ColumnType<string, string, string>;
  /** ISO 8601 timestamp: When this server was first added locally. */
  created_at: ColumnType<string, string, string>; // Or Date type if Kysely dialect supports it well
  /** ISO 8601 timestamp: Last time server info was synced. Nullable. */
  synced_at: ColumnType<string | null, string | null, string | null>;
}

/** Kysely type for selecting a row from the `servers` table. */
export type SelectServer = Selectable<ServerTable>;
/** Kysely type for inserting a new row into the `servers` table. */
export type CreateServer = Insertable<ServerTable>;
/** Kysely type for updating a row in the `servers` table. */
export type UpdateServer = Updateable<ServerTable>;

/**
 * Interface defining the structure of the `accounts` table.
 * Stores details of user accounts linked to specific servers.
 * A composite primary key would likely be (id, server) or ensure `id` is globally unique if it implies an account ID.
 * Assuming `id` is the account ID and `server` is the server domain it's tied to.
 *
 * @property id - Account ID. Part of a composite PK with `server` or globally unique. Insert-only.
 * @property server - Domain of the server this account belongs to. Part of a composite PK with `id`. Insert-only.
 * @property name - Display name of the user for this account.
 * @property email - Email address associated with this account on the server. Insert-only.
 * @property avatar - Optional URL or identifier for the user's avatar on this server. Nullable.
 * @property token - Authentication token (e.g., JWT) for this account on this server.
 * @property device_id - Identifier for the device associated with this token/session. Insert-only.
 * @property created_at - ISO 8601 timestamp when this account entry was created locally.
 * @property updated_at - ISO 8601 timestamp of the last update to this account's local cache. Nullable.
 * @property synced_at - ISO 8601 timestamp of the last successful sync of this account's details. Nullable.
 */
interface AccountTable {
  /** Account ID from the server. Not updatable after creation. */
  id: ColumnType<string, string, never>;
  /** Server domain this account is associated with. Not updatable. */
  server: ColumnType<string, string, never>; // Foreign key to ServerTable.domain
  /** User's display name on this server account. */
  name: ColumnType<string, string, string>;
  /** User's email for this server account. Not updatable. */
  email: ColumnType<string, string, never>;
  /** Optional avatar URL for this server account. */
  avatar: ColumnType<string | null, string | null, string | null>;
  /** Current authentication token for this account on this server. */
  token: ColumnType<string, string, string>;
  /** Device ID associated with this session/token. Not updatable. */
  device_id: ColumnType<string, string, never>;
  /** ISO 8601 timestamp: When this account entry was created locally. */
  created_at: ColumnType<string, string, string>;
  /** ISO 8601 timestamp: Last local update to this account's cached info. */
  updated_at: ColumnType<string | null, string | null, string | null>;
  /** ISO 8601 timestamp: Last successful sync of this account's details. */
  synced_at: ColumnType<string | null, string | null, string | null>;
  // Composite Primary Key typically (id, server)
}

/** Kysely type for selecting a row from the `accounts` table. */
export type SelectAccount = Selectable<AccountTable>;
/** Kysely type for inserting a new row into the `accounts` table. */
export type CreateAccount = Insertable<AccountTable>;
/** Kysely type for updating a row in the `accounts` table. */
export type UpdateAccount = Updateable<AccountTable>;

/**
 * Interface defining the structure of the `deleted_tokens` table.
 * Stores tokens that have been explicitly deleted or invalidated (e.g., after logout on a specific device),
 * potentially to prevent reuse or for audit trails.
 *
 * @property token - The authentication token that was deleted. Primary Key. Insert-only.
 * @property account_id - The account ID to which this token belonged. Insert-only.
 * @property server - The server domain associated with the account and token. Insert-only.
 * @property created_at - ISO 8601 timestamp when this token deletion was recorded.
 */
interface DeletedTokenTable {
  /** The invalidated token string. Primary Key. */
  token: ColumnType<string, string, never>;
  /** Account ID associated with the deleted token. */
  account_id: ColumnType<string, string, never>;
  /** Server domain associated with the deleted token. */
  server: ColumnType<string, string, never>;
  /** ISO 8601 timestamp: When this token deletion was recorded. */
  created_at: ColumnType<string, string, string>;
}

/**
 * Interface defining the structure of the `metadata` table.
 * A key-value store for general application settings or metadata.
 *
 * @property key - Primary key. The unique key for the metadata item (e.g., "lastActiveUser", "theme"). Insert-only.
 * @property value - The string value associated with the key.
 * @property created_at - ISO 8601 timestamp when this metadata item was first created. Insert-only for the key.
 * @property updated_at - ISO 8601 timestamp of the last update to this metadata item's value. Nullable.
 */
interface AppMetadataTable {
  /** Primary Key: The unique key for the metadata item. */
  key: ColumnType<string, string, never>;
  /** The value of the metadata item, stored as a string. */
  value: ColumnType<string, string, string>;
  /** ISO 8601 timestamp: When this metadata key was first created. */
  created_at: ColumnType<string, string, never>;
  /** ISO 8601 timestamp: Last time this metadata value was updated. */
  updated_at: ColumnType<string | null, string | null, string | null>;
}

/** Kysely type for selecting a row from the `metadata` table. */
export type SelectAppMetadata = Selectable<AppMetadataTable>;
/** Kysely type for inserting a new row into the `metadata` table. */
export type CreateAppMetadata = Insertable<AppMetadataTable>;
/** Kysely type for updating a row in the `metadata` table. */
export type UpdateAppMetadata = Updateable<AppMetadataTable>;

/**
 * Defines the complete schema for the application-level local database.
 * Maps table names to their respective Kysely table interface definitions.
 *
 * @property servers - Schema for the `servers` table.
 * @property accounts - Schema for the `accounts` table.
 * @property deleted_tokens - Schema for the `deleted_tokens` table.
 * @property metadata - Schema for the `metadata` (key-value store) table.
 */
export interface AppDatabaseSchema {
  servers: ServerTable;
  accounts: AccountTable;
  deleted_tokens: DeletedTokenTable;
  metadata: AppMetadataTable;
}
