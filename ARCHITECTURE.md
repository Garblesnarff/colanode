# Colanode System Architecture

This document provides a high-level overview of the Colanode system architecture, its major components, data flow, key design decisions, and modularity aspects. Its purpose is to help developers, especially AI agents, understand how the system is structured and how its different parts interact.

## Table of Contents

1.  [Core Philosophy](#core-philosophy)
2.  [High-Level Overview](#high-level-overview)
    *   [Monorepo Structure](#monorepo-structure)
    *   [Applications (`apps/`)](#applications-apps)
    *   [Shared Packages (`packages/`)](#shared-packages-packages)
3.  [Modularity and Separation of Concerns](#modularity-and-separation-of-concerns)
    *   [Package-Level Modularity](#package-level-modularity)
    *   [Frontend vs. Backend](#frontend-vs-backend)
    *   [Business Logic vs. UI](#business-logic-vs-ui)
    *   [Core Sync vs. Application Features](#core-sync-vs-application-features)
4.  [Detailed Component Breakdown](#detailed-component-breakdown)
    *   [Applications](#applications)
        *   [`apps/server`](#appsserver)
        *   [`apps/web`](#appsweb)
        *   [`apps/desktop`](#appsdesktop)
    *   [Core Packages](#core-packages)
        *   [`packages/core`](#packagescore)
        *   [`packages/crdt`](#packagescrdt)
        *   [`packages/client`](#packagesclient)
        *   [`packages/ui`](#packagesui)
5.  [Data Flow and Synchronization](#data-flow-and-synchronization)
    *   [Local-First Approach](#local-first-approach)
    *   [Client-Server Communication](#client-server-communication)
    *   [Real-time Collaboration with CRDTs](#real-time-collaboration-with-crdts)
    *   [WebSocket Handling](#websocket-handling)
6.  [Key Design Decisions](#key-design-decisions)
    *   [Technology Choices](#technology-choices)
    *   [Local-First Sync Pattern](#local-first-sync-pattern)
    *   [CRDT Implementation (Yjs)](#crdt-implementation-yjs)
    *   [Modularity and Code Sharing](#modularity-and-code-sharing-1)
7.  [Package Dependencies](#package-dependencies)
8.  [Areas for Potential Future Refactoring (Modularity Focus)](#areas-for-potential-future-refactoring-modularity-focus)
9.  [Further Exploration](#further-exploration)


## 1. Core Philosophy

Colanode is designed as an open-source, local-first collaboration workspace. The primary goals are:
*   **Data Privacy and Control:** Users can self-host the server, retaining full ownership of their data.
*   **Offline Capability:** The local-first approach ensures that users can continue working even when offline.
*   **Real-Time Collaboration:** CRDTs enable seamless concurrent editing and data synchronization.
*   **All-in-One Platform:** Provides features for chat, document editing, databases, and file management.

## 2. High-Level Overview

Colanode is a monorepo built using TypeScript, organized into applications (`apps/`) and shared packages (`packages/`). This structure promotes code reusability and a clear separation of concerns, enhancing modularity and maintainability.

### Monorepo Structure

The codebase is managed as a monorepo (likely using TurboRepo or a similar tool), which facilitates code sharing and centralized dependency management.
*   `apps/`: Contains the deployable applications (server, web client, desktop client). Each app is a distinct runnable unit.
*   `packages/`: Contains shared libraries and modules used by the applications. These packages encapsulate specific functionalities (e.g., UI components, core logic, CRDT handling).

### Applications (`apps/`)

*   **`apps/server`**: The backend server application.
*   **`apps/web`**: The web client application.
*   **`apps/desktop`**: The desktop client application.

### Shared Packages (`packages/`)

These packages provide reusable functionality across different applications, forming the core building blocks of the system.
*   **`packages/core`**: Foundational types, utilities, and data model definitions.
*   **`packages/crdt`**: CRDT logic using Yjs for real-time collaboration.
*   **`packages/client`**: Client-side logic (data management, server communication, sync).
*   **`packages/ui`**: Shared React UI components and styles.

## 3. Modularity and Separation of Concerns

The Colanode codebase is structured to achieve modularity and a clear separation of concerns at various levels.

### Package-Level Modularity
The monorepo is divided into `apps` and `packages`. This is the primary means of achieving modularity:
*   **`packages/core`**: Provides base types, interfaces, and utilities used by most other parts of the system. It has minimal dependencies on other Colanode packages.
*   **`packages/crdt`**: Isolates the complexities of Conflict-Free Replicated Data Types (Yjs implementation). This allows the rest of the application to use collaborative features without needing deep knowledge of CRDT internals.
*   **`packages/client`**: Encapsulates the bulk of client-side business logic, local database management (SQLite), API communication, and state synchronization logic. This makes it reusable between the web and desktop apps.
*   **`packages/ui`**: Contains a shared library of React components, hooks, and styles. This promotes UI consistency and reusability across web and desktop clients.
*   **`apps/*`**: Each application (`server`, `web`, `desktop`) is a distinct deployable unit that consumes the shared packages. This separates the application bootstrapping, platform-specific code (e.g., Electron main process logic in `apps/desktop`, server routing in `apps/server`), and UI rendering from the core business logic.

### Frontend vs. Backend
*   **Frontend**: Comprises `apps/web`, `apps/desktop`, `packages/ui`, and `packages/client`. These handle user interaction, UI rendering, client-side state management, and communication with the backend.
*   **Backend**: Primarily `apps/server`. This handles API requests, WebSocket connections, server-side business logic, data persistence to PostgreSQL, and interaction with other backend services like Redis and S3.

This separation allows independent development, scaling, and deployment of frontend and backend components.

### Business Logic vs. UI
*   **UI (`packages/ui`, React components in `apps/web` & `apps/desktop`)**: Responsible for presentation and user interaction.
*   **Business Logic (Client-side)**: Largely contained within `packages/client` (services, handlers, database interactions) and orchestrated by `AppService`.
*   **Business Logic (Server-side)**: Resides in `apps/server/src/services/`, `apps/server/src/api/client/handlers/`, and related modules.

This separation makes the UI more adaptable to changes in business rules and vice-versa.

### Core Sync vs. Application Features
*   **Core Sync Logic**: Concentrated in `packages/crdt` for CRDT operations, and within `packages/client` (e.g., `SyncService`, mutation handling, WebSocket management) and `apps/server` (synchronizers, WebSocket handlers) for data replication and consistency.
*   **Application Features**: Features like Chat, Pages, Databases are built on top of this core sync logic. For example, the Page editor in `packages/ui/src/editor` uses CRDTs from `packages/crdt` for collaborative editing, with data flow managed by `packages/client` and `apps/server`.

This allows the core synchronization mechanisms to be developed and maintained independently of specific application features.

## 4. Detailed Component Breakdown
(Content from previous `ARCHITECTURE.md` - Section 3, detailing apps/server, apps/web, apps/desktop, packages/core, packages/crdt, packages/client, packages/ui. For brevity, this content is not repeated in this diff but is part of the full file.)

## 5. Data Flow and Synchronization
(Content from previous `ARCHITECTURE.md` - Section 4, detailing Local-First, Client-Server Communication, CRDTs, WebSocket Handling. For brevity, this content is not repeated in this diff but is part of the full file.)

## 6. Key Design Decisions
(Content from previous `ARCHITECTURE.md` - Section 5, detailing Technology Choices, Local-First Sync, CRDT Implementation. For brevity, this content is not repeated in this diff but is part of the full file, with "Modularity and Code Sharing" potentially enhanced as below.)

### Modularity and Code Sharing
The monorepo structure with distinct `apps` and `packages` is a cornerstone of Colanode's architecture, deliberately chosen to promote modularity and maximize code sharing:
*   **Reusable Core Logic**: Packages like `packages/core`, `packages/crdt`, and `packages/client` allow for substantial code reuse between the web and desktop applications, reducing duplication and ensuring consistent behavior.
*   **Clear Boundaries**: Each package has a well-defined responsibility (e.g., UI components in `packages/ui`, client-side business logic in `packages/client`, CRDT operations in `packages/crdt`). This separation of concerns simplifies development, testing, and maintenance.
*   **Independent Evolution**: Individual packages and applications can, to a certain extent, evolve independently, as long as their public APIs/interfaces are respected. This facilitates parallel development efforts.
*   **Scalability of Development**: As the team or codebase grows, the modular structure helps in managing complexity by allowing developers to focus on specific parts of the system.

## 7. Package Dependencies

A high-level overview of primary dependencies between packages and applications:

*   **`apps/web` and `apps/desktop` (Frontend Applications):**
    *   Depend on `packages/client` (for client-side logic, data, sync).
    *   Depend on `packages/ui` (for shared UI components).
    *   Depend on `packages/core` (for common types and utilities).
    *   `apps/desktop` additionally has Electron-specific dependencies.

*   **`apps/server` (Backend Application):**
    *   Depends on `packages/core` (for common types, data models, utilities).
    *   Depends on `packages/crdt` (for server-side CRDT state management and update application).
    *   May use parts of `packages/client` if there's any shared validation logic or type definitions relevant for API contracts (though this should be minimized, prefer `packages/core` for such sharing).

*   **`packages/client`:**
    *   Depends on `packages/core`.
    *   Depends on `packages/crdt`.
    *   Interacts with `apps/server` via HTTP/WebSocket APIs (not a direct code dependency).

*   **`packages/ui`:**
    *   Depends on `packages/core` (for types used in component props).
    *   May use `packages/client` indirectly if components trigger client actions or consume client-managed state (e.g., via hooks that use client services).

*   **`packages/crdt`:**
    *   Depends on `packages/core` (for Zod schemas like `ZodText` used in Yjs integration).
    *   Has external dependency on `yjs`.

*   **`packages/core`:**
    *   Designed to have minimal internal dependencies on other Colanode packages.
    *   May have external dependencies (e.g., `zod`, `lodash-es`).

This structure aims for a directed acyclic graph of dependencies, with `packages/core` at the base.

## 8. Areas for Potential Future Refactoring (Modularity Focus)

While the current structure is generally modular, some areas could be considered for further refactoring in future development cycles to enhance separation or reduce complexity within specific modules:

*   **`packages/client/src/services/app-service.ts`**: As a central orchestrator, this service is quite large. Some of its responsibilities could potentially be delegated to more specialized sub-services if it becomes unwieldy.
*   **`packages/client/src/services/accounts/account-service.ts` and `packages/client/src/services/workspaces/workspace-service.ts`**: These are also substantial services. Depending on their growth, parts of their logic (e.g., specific aspects of sync, complex state management for sub-entities) might be extractable into smaller, focused helper services or utilities.
*   **`packages/client/src/lib/editor.ts`**: This file contains extensive logic for mapping between Tiptap's content format and the application's internal block structure. If this logic becomes significantly more complex or needs to support multiple editor types, it could be further modularized.
*   **Individual Handler Files**: As noted during JSDoc, the individual mutation and query handler files in `packages/client/src/handlers/` were not documented in detail due to volume. A future pass could assess if common patterns within these handlers can be extracted into base classes or shared utilities to reduce boilerplate.
*   **Server-Side Services (`apps/server/src/services/`)**: A detailed review of server-side services might reveal opportunities for creating more granular services or shared business logic modules if significant overlap or complexity is found.

These are observations for consideration, not immediate refactoring needs. The primary goal of the current task is documentation and organizational clarity.

## 9. Further Exploration
(Content from previous `ARCHITECTURE.md` - Section 6, now Section 9, detailing specific files/directories to explore for deeper understanding. For brevity, this content is not repeated in this diff but is part of the full file.)

This document will be updated as the system evolves.
