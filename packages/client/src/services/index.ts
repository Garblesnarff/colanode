// packages/client/src/services/index.ts
/**
 * @file Main entry point for service modules within the `@colanode/client` package.
 *
 * This module re-exports various service classes or objects that encapsulate
 * specific business logic or functionalities of the client application. Services often
 * interact with databases, external APIs (via the client's request handlers), or manage
 * complex state.
 *
 * Examples of services might include:
 * - User authentication service.
 * - Data synchronization service.
 * - File management service.
 * - Notification service.
 *
 * Centralizing service exports here provides a clear API for accessing these
 * core client functionalities.
 */

/** @module services/app-service Exports the main `AppService` class, a central orchestrator for client-side application logic and services. */
export * from './app-service';
/** @module services/metadata-service Exports `MetadataService` for managing application metadata (global, account, or workspace specific). */
export * from './metadata-service';
/** @module services/server-service Exports `ServerService` for managing connections and interactions with Colanode servers. */
export * from './server-service';
/** @module services/file-system Exports `FileSystemService` for interacting with the local file system (especially relevant for desktop or OPFS in web). */
export * from './file-system';
/** @module services/kysely-service Exports `KyselyService` or related utilities for creating and managing Kysely database instances. */
export * from './kysely-service';
/** @module services/asset-service Exports `AssetService` for managing local or remote assets like images or icons. */
export * from './asset-service';
/** @module services/app-meta Exports `AppMetaService` or utilities for accessing application-level metadata (like build info, versions). */
export * from './app-meta';
/** @module services/path-service Exports `PathService` for constructing and managing file system paths for application data. */
export * from './path-service';
// Note: Sub-directory exports like 'accounts/' or 'workspaces/' are not directly re-exported here,
// their services are typically instantiated and used by AppService or other higher-level services.
