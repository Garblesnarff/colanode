# AGENTS.md - Guide for AI Assistants

Welcome, AI! This document provides guidance for working with the Colanode codebase. Its goal is to help you navigate the project, understand its structure, and make effective contributions.

## 1. Core Objective of this Codebase State

This codebase has recently undergone a refactoring focused on **maximizing navigability and understandability for Large Language Models** like yourself. This involved:

*   Creating comprehensive architectural documentation (`ARCHITECTURE.md`, `COMPONENT_MAP.md`).
*   Adding extensive JSDoc comments to core packages and services.
*   Documenting observed patterns and providing templates for common extension tasks (`PATTERNS_AND_TEMPLATES.md`).
*   Improving the documentation of modularity aspects.

Your primary directive when working on this code should be to **leverage this documentation** and **maintain or enhance its clarity**.

## 2. Key Documentation Files

Before diving into specific code files, please familiarize yourself with:

*   **`README.md`**: Provides a general overview of the Colanode project, its features, and setup.
*   **`ARCHITECTURE.md`**: Essential reading. This file details the high-level system architecture, major components (applications and packages), data flow, synchronization mechanisms (including CRDTs/Yjs), key design decisions, package dependencies, and areas identified for potential future refactoring.
*   **`COMPONENT_MAP.md`**: Maps major product features (e.g., Chat, Pages, Databases) to their corresponding primary files and directories. Use this to quickly locate code relevant to a specific feature.
*   **`PATTERNS_AND_TEMPLATES.md`**: Describes common coding patterns found in the backend (API structure), client-side database operations (Kysely), and UI components (shadcn/ui style). It also provides templates for adding new routes, database tables, and UI components, which you should follow for consistency.

## 3. Code Structure Overview

*   **Monorepo**: The project is a monorepo, likely managed by TurboRepo.
*   **`apps/`**: Contains deployable applications:
    *   `desktop/`: Electron-based desktop application.
    *   `server/`: Fastify-based backend server.
    *   `web/`: React-based web application.
*   **`packages/`**: Contains shared libraries:
    *   `core/`: Fundamental types, Zod schemas, core utilities, node/document/block registries. **Critical to understand.**
    *   `crdt/`: Yjs/CRDT implementation details (`YDoc` class). **Critical for collaboration features.**
    *   `client/`: Shared client-side logic (services, database management via Kysely, handlers, mutations, queries). **Very important for any client-side work.**
    *   `ui/`: Shared React UI components (likely shadcn/ui based).
    *   `scripts/`: Utility scripts for development, build, etc.

## 4. Working with Code

*   **JSDoc First**: Many core files, services, and type definitions now have extensive JSDoc comments. Please read these carefully before modifying related code. They explain the purpose, parameters, returns, and important notes for functions, classes, and types.
*   **Follow Patterns**: Refer to `PATTERNS_AND_TEMPLATES.md` when adding new features to ensure consistency.
*   **Modularity**: Understand the separation of concerns outlined in `ARCHITECTURE.md`. Strive to keep logic within the appropriate packages and modules.
*   **Type Safety**: The codebase uses TypeScript and Zod extensively for type safety and data validation. Ensure your changes adhere to these types and schemas.
*   **CRDTs/Yjs**: If working on collaborative features, pay close attention to `packages/crdt/` and how `YDoc` is used. The `ARCHITECTURE.md` provides an overview of the CRDT integration.
*   **Local-First Sync**: Remember the local-first nature of the clients. Changes are often made to a local SQLite DB first, then synchronized. `packages/client/` handles much of this.
*   **Error Handling**: For client-server communication, refer to `packages/core/src/types/api.ts` for `ApiErrorCode` and `packages/client/src/lib/ky.ts` for how client-side API errors are parsed. Mutation handlers also have specific error types (`MutationError`, `MutationErrorCode`).

## 5. Constraints During This Refactor (and for you now)

The primary goal of the recent refactor was documentation and organization, **not functional changes**. Therefore, the following constraints were applied and should generally guide your work unless explicitly told otherwise:

*   **PRESERVE all existing functionality.**
*   DO NOT modify core CRDT/Yjs logic or real-time sync mechanisms unless essential for a bug fix or explicitly requested feature that requires it.
*   DO NOT change database schemas or API contracts without careful consideration and usually explicit instruction, as this can break existing clients or data.
*   MAINTAIN all existing tests and ensure they pass. Add new tests for new functionality.

## 6. Requesting Help or Clarification

If the existing documentation (`ARCHITECTURE.md`, `COMPONENT_MAP.md`, JSDoc, etc.) is insufficient, or if you encounter highly complex, undocumented legacy code, please ask for clarification from the user.

## 7. Specific Package Guidance

*   **`packages/crdt/`**: The `YDoc` class in `src/index.ts` is central. It wraps Yjs and integrates with Zod schemas. Understand how it applies updates to different Yjs types (Map, Array, Text) based on Zod types (`ZodObject`, `ZodArray`, `ZodText` from `packages/core`).
*   **`packages/core/`**: This is foundational. Familiarize yourself with the type definitions in `src/types/`, the node structures in `src/registry/nodes/`, and document structures in `src/registry/documents/`. The `NodeModel` interface in `src/registry/nodes/core.ts` is key to understanding how different node types define their behavior.
*   **`packages/client/`**:
    *   `src/services/app-service.ts` is a central orchestrator.
    *   `src/handlers/mediator.ts` dispatches queries and mutations.
    *   Databases are managed via Kysely; schemas and migrations are in `src/databases/`.
    *   Mapping functions in `src/lib/mappers.ts` convert DB rows to application types.

Good luck, and thank you for helping improve Colanode!
