# Colanode Component Map

This document maps major features of Colanode to the primary files and directories where their implementation is located. It's intended to help developers (including AI agents) quickly find the relevant code for a specific feature.

## Table of Contents

1.  [User Interface (Shared Components)](#1-user-interface-shared-components)
2.  [Real-Time Chat](#2-real-time-chat)
3.  [Rich Text Pages (Documents/Wikis)](#3-rich-text-pages-documentswikis)
4.  [Customizable Databases](#4-customizable-databases)
5.  [File Management](#5-file-management)
6.  [User Authentication & Account Management](#6-user-authentication--account-management)
7.  [Workspace Management](#7-workspace-management)
8.  [Local Data Storage (Client-Side)](#8-local-data-storage-client-side)
9.  [Client-Server Synchronization & Real-Time](#9-client-server-synchronization--real-time)
10. [CRDT Logic (Yjs Integration)](#10-crdt-logic-yjs-integration)
11. [Server API Endpoints](#11-server-api-endpoints)
12. [Desktop Application Shell](#12-desktop-application-shell)
13. [Web Application Entry & Worker](#13-web-application-entry--worker)

---

### 1. User Interface (Shared Components)
*   **Description**: Core UI elements, layout, styling, theming, and specific complex UI widgets (like the editor).
*   **Primary Location(s)**:
    *   `packages/ui/src/components/`: Reusable React components.
    *   `packages/ui/src/contexts/`: React contexts for UI state.
    *   `packages/ui/src/hooks/`: Custom React hooks for UI logic.
    *   `packages/ui/src/editor/`: Components and logic related to the rich text editor.
    *   `packages/ui/src/styles/`: Global styles and theming.
    *   `apps/web/src/components/`: Web-specific UI components or compositions.
    *   `apps/desktop/src/root.tsx` & `apps/web/src/root.tsx`: Root React components for desktop and web apps.

### 2. Real-Time Chat
*   **Description**: Functionality for sending and receiving messages in channels or direct messages.
*   **Primary Location(s)**:
    *   **Core Types**: `packages/core/src/registry/nodes/chat.ts`, `packages/core/src/registry/nodes/message.ts`, `packages/core/src/registry/nodes/channel.ts`.
    *   **Client-Side Logic**:
        *   `packages/client/src/handlers/`: Likely handlers for chat messages (e.g., `message-created-handler.ts`).
        *   `packages/client/src/mutations/`: Mutations for sending messages (e.g., `send-message-mutation.ts`).
        *   `packages/client/src/queries/`: Queries for fetching messages and channels.
    *   **Server-Side Logic**:
        *   `apps/server/src/api/client/handlers/`: Server-side handlers for chat operations.
        *   `apps/server/src/services/`: Services related to chat and message processing.
        *   WebSocket handling in `apps/server/src/app.ts` or related modules for real-time message delivery.
    *   **UI**: Components in `packages/ui/src/components/` related to displaying chat interfaces, message lists, input fields.

### 3. Rich Text Pages (Documents/Wikis)
*   **Description**: Creating, editing, and viewing rich text documents with collaborative capabilities.
*   **Primary Location(s)**:
    *   **Core Types**: `packages/core/src/registry/nodes/page.ts`, `packages/core/src/registry/documents/rich-text.ts`.
    *   **CRDT Logic**: `packages/crdt/src/index.ts` (YDoc class for managing page content).
    *   **Client-Side Logic**:
        *   `packages/client/src/handlers/`: Handlers for page updates.
        *   `packages/client/src/mutations/`: Mutations for creating/updating pages.
        *   `packages/client/src/queries/`: Queries for fetching page content.
    *   **Server-Side Logic**:
        *   `apps/server/src/api/client/handlers/`: Server-side handlers for page operations and CRDT update processing.
    *   **UI (Editor)**:
        *   `packages/ui/src/editor/`: Core rich text editor implementation, likely using Tiptap/ProseMirror and integrating Yjs.
        *   Components in `packages/ui/src/components/` for displaying pages.

### 4. Customizable Databases
*   **Description**: Creating and managing structured data with custom fields and views (table, kanban, calendar).
*   **Primary Location(s)**:
    *   **Core Types**: `packages/core/src/registry/nodes/database.ts`, `packages/core/src/registry/nodes/database-view.ts`, `packages/core/src/registry/nodes/record.ts`, `packages/core/src/registry/nodes/field.ts`, `packages/core/src/registry/nodes/field-value.ts`.
    *   **CRDT Logic**: `packages/crdt/src/index.ts` (YDoc might be used for individual records or database structure if collaborative).
    *   **Client-Side Logic**:
        *   `packages/client/src/handlers/`: Handlers for database/record/field updates.
        *   `packages/client/src/mutations/`: Mutations for CRUD operations on databases, records, fields.
        *   `packages/client/src/queries/`: Queries for fetching database structures, records, views.
    *   **Server-Side Logic**:
        *   `apps/server/src/api/client/handlers/`: Server-side handlers for database operations.
        *   `apps/server/src/data/`: Potentially database schema and query builders for server-side persistence.
    *   **UI**: Components in `packages/ui/src/components/` for displaying database views (tables, kanban boards, calendars), forms for record editing.

### 5. File Management
*   **Description**: Storing, sharing, and managing files within workspaces.
*   **Primary Location(s)**:
    *   **Core Types**: `packages/core/src/types/files.ts`, `packages/core/src/registry/nodes/file.ts`.
    *   **Client-Side Logic**:
        *   `packages/client/src/services/file-service.ts` (or similar): Logic for file uploads, downloads.
        *   `packages/client/src/mutations/`: Mutations for file operations (upload, delete, rename).
        *   `packages/client/src/queries/`: Queries for listing files.
        *   `apps/desktop/src/main.ts`: `save-temp-file` IPC handler.
        *   `apps/web/src/main.tsx`: `saveTempFile` on `window.colanode` calling worker.
    *   **Server-Side Logic**:
        *   `apps/server/src/api/client/handlers/`: API endpoints for file operations.
        *   `apps/server/src/services/storage-service.ts` (or similar): Interaction with S3-compatible storage.
    *   **UI**: Components in `packages/ui/src/components/` for file browsers, upload indicators, file previews.

### 6. User Authentication & Account Management
*   **Description**: User sign-up, login, logout, profile management.
*   **Primary Location(s)**:
    *   **Core Types**: `packages/core/src/types/accounts.ts`.
    *   **Client-Side Logic**:
        *   `packages/client/src/services/auth-service.ts` (or similar).
        *   `packages/client/src/mutations/`: Mutations for login, logout, signup.
        *   `packages/client/src/queries/`: Queries for fetching user profiles.
    *   **Server-Side Logic**:
        *   `apps/server/src/api/auth/` or `apps/server/src/api/client/handlers/auth/`: API endpoints for authentication.
        *   `apps/server/src/services/auth-service.ts` or `apps/server/src/lib/auth.ts`: Authentication logic, password hashing, session management.
    *   **UI**: Components in `packages/ui/src/components/` for login forms, registration forms, profile settings.

### 7. Workspace Management
*   **Description**: Creating, joining, and managing workspaces.
*   **Primary Location(s)**:
    *   **Core Types**: `packages/core/src/types/workspaces.ts`, `packages/core/src/registry/nodes/space.ts`.
    *   **Client-Side Logic**:
        *   `packages/client/src/mutations/`: Mutations for creating/joining/leaving workspaces.
        *   `packages/client/src/queries/`: Queries for listing workspaces, fetching workspace details.
    *   **Server-Side Logic**:
        *   `apps/server/src/api/client/handlers/`: API endpoints for workspace operations.
        *   `apps/server/src/services/`: Services related to workspace management.
    *   **UI**: Components in `packages/ui/src/components/` for workspace lists, settings, member management.

### 8. Local Data Storage (Client-Side)
*   **Description**: Management of the local SQLite database for offline access and caching.
*   **Primary Location(s)**:
    *   `packages/client/src/databases/`: Schema definitions, migrations, query builders (e.g., using Kysely).
        *   `packages/client/src/databases/main/db.ts`
        *   `packages/client/src/databases/main/schema.ts`
        *   `packages/client/src/databases/sync/db.ts`
        *   `packages/client/src/databases/sync/schema.ts`
    *   `packages/client/src/services/db-service.ts` (or similar): Service for interacting with the local DB.
    *   `apps/web/src/workers/dedicated.ts`: The web worker likely handles database operations to avoid blocking the main thread.
    *   `apps/desktop/src/main/app-service.ts` (within `app.init()` and `app.migrate()`): Desktop app's local DB initialization.

### 9. Client-Server Synchronization & Real-Time
*   **Description**: Logic for synchronizing local data with the server and handling real-time updates.
*   **Primary Location(s)**:
    *   **Client-Side**:
        *   `packages/client/src/handlers/`: Contains various handlers for processing incoming messages/events from the server.
        *   `packages/client/src/services/sync-service.ts` (or `synchronizer.ts`): Core synchronization logic.
        *   `packages/client/src/lib/event-bus.ts`: For internal client-side event communication.
        *   `packages/client/src/lib/ws/`: WebSocket connection management.
        *   `packages/core/src/synchronizers/`: Base synchronizer logic or types.
        *   `apps/server/src/synchronizers/`: Server-side counterparts for synchronization.
    *   **Server-Side**:
        *   `apps/server/src/app.ts`: WebSocket setup (`@fastify/websocket`).
        *   `apps/server/src/api/client/ws/`: WebSocket message handlers.
        *   `apps/server/src/synchronizers/`: Logic for processing client sync messages and preparing broadcasts.

### 10. CRDT Logic (Yjs Integration)
*   **Description**: Core implementation of Conflict-free Replicated Data Types.
*   **Primary Location(s)**:
    *   `packages/crdt/src/index.ts`: Contains the `YDoc` class, which wraps Yjs functionalities, handles schema-based updates, encoding/decoding, undo/redo.
    *   `packages/core/src/types/crdt.ts`: Core types related to CRDTs.
    *   `packages/core/src/registry/documents/rich-text.ts`: Defines the structure of rich text that Yjs will manage.
    *   Usage of `YDoc` will be spread across client and server components that deal with collaborative data (e.g., page editing, database record editing).

### 11. Server API Endpoints
*   **Description**: Backend HTTP API definitions.
*   **Primary Location(s)**:
    *   `apps/server/src/app.ts`: Fastify server setup and registration of API routes.
    *   `apps/server/src/api/`: Root directory for API route definitions.
        *   `apps/server/src/api/index.ts`: Main API router.
        *   `apps/server/src/api/client/`: Client-facing API routes.
        *   `apps/server/src/api/client/plugins/`: Fastify plugins for API functionality (CORS, error handling).
        *   Specific route handlers are further nested, e.g., `apps/server/src/api/client/v1/users/handlers.ts`.

### 12. Desktop Application Shell
*   **Description**: Electron main process logic, window management, IPC.
*   **Primary Location(s)**:
    *   `apps/desktop/forge.config.ts`: Electron Forge configuration.
    *   `apps/desktop/src/main.ts`: Electron main process entry point, window creation, IPC handlers.
    *   `apps/desktop/src/preload.ts`: Electron preload script for exposing Node.js/Electron APIs to the renderer process securely.
    *   `apps/desktop/src/main/`: Helper modules for the main process (e.g., `app-service.ts`, `protocols.ts`).

### 13. Web Application Entry & Worker
*   **Description**: Initialization of the web application and the background worker.
*   **Primary Location(s)**:
    *   `apps/web/index.html`: Main HTML file.
    *   `apps/web/src/main.tsx`: React application entry point, initializes the worker.
    *   `apps/web/src/root.tsx`: Root React component for the web app.
    *   `apps/web/src/workers/dedicated.ts`: The dedicated web worker handling client-side logic (DB, sync).
    *   `apps/web/src/lib/types.ts`: Defines `ColanodeWorkerApi` for Comlink communication.
    *   `apps/web/vite.config.js`: Vite configuration for the web app.

---
This map provides a starting point. Specific implementations may involve interactions between multiple listed locations.
For detailed data flow and interactions, refer to `ARCHITECTURE.md`.
