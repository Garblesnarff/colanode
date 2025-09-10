// packages/core/src/index.ts
/**
 * @file Main entry point for the `@colanode/core` package.
 *
 * This package provides fundamental building blocks, type definitions, utility functions,
 * and shared constants used across the entire Colanode application (client, server, and other packages).
 *
 * It exports:
 * - Core data structures and their Zod schemas (e.g., Nodes, Blocks, Documents).
 * - Registries for extendable types like Nodes and Document types.
 * - Utility functions for common tasks (ID generation, file handling, text manipulation, permissions).
 * - Shared TypeScript types for various domains (accounts, files, servers, workspaces, CRDTs, etc.).
 * - Constants and configuration values.
 * - Base classes or interfaces for synchronizers.
 * - A custom debugger utility.
 */

// Lib - General utility functions and foundational elements
/** @module lib/constants Re-exports various constant values used throughout the application. */
export * from './lib/constants';
/** @module lib/files Utility functions for file handling, path manipulation, and MIME type detection. */
export * from './lib/files';
/** @module lib/id Functions for generating unique identifiers (IDs) for different entity types. */
export * from './lib/id';
/** @module lib/utils A collection of general-purpose utility functions. */
export * from './lib/utils';
/** @module lib/nodes Utility functions specifically for working with Node entities. */
export * from './lib/nodes';
/** @module lib/texts Utility functions for text processing and manipulation. */
export * from './lib/texts';
/** @module lib/permissions Utility functions and types related to permissions management. */
export * from './lib/permissions';
/** @module lib/debugger Provides a simple debugger utility for conditional logging. */
export * from './lib/debugger';
/** @module lib/mentions Utilities for handling mentions (e.g., @user, #node) within text content. */
export * from './lib/mentions';
/** @module lib/servers Utility functions related to server entities or server list management. */
export * from './lib/servers';

// Registry - Definitions and registration for core entities like Nodes and Blocks
/** @module registry/block Defines the core Block entity, its schema, and related types. Blocks are fundamental units of content. */
export * from './registry/block';
/** @module registry/nodes/index Aggregates and re-exports all specific Node type definitions. */
export * from './registry/nodes/index';
/** @module registry/nodes/core Defines the base Node entity, its schema, and common Node properties. */
export * from './registry/nodes/core';
/** @module registry/nodes/channel Defines the Channel Node type for chat channels. */
export * from './registry/nodes/channel';
/** @module registry/nodes/chat Defines the Chat Node type, representing a chat conversation. */
export * from './registry/nodes/chat';
/** @module registry/nodes/database Defines the Database Node type for customizable databases. */
export * from './registry/nodes/database';
/** @module registry/nodes/database-view Defines the DatabaseView Node type for different views of a Database. */
export * from './registry/nodes/database-view';
/** @module registry/nodes/field Defines the Field Node type used within Databases. */
export * from './registry/nodes/field';
/** @module registry/nodes/field-value Defines the FieldValue Node type for storing values in Database records. */
export * from './registry/nodes/field-value';
/** @module registry/nodes/folder Defines the Folder Node type for organizing other nodes. */
export * from './registry/nodes/folder';
/** @module registry/nodes/message Defines the Message Node type for chat messages. */
export * from './registry/nodes/message';
/** @module registry/nodes/page Defines the Page Node type for rich-text documents. */
export * from './registry/nodes/page';
/** @module registry/nodes/record Defines the Record Node type for entries in a Database. */
export * from './registry/nodes/record';
/** @module registry/nodes/space Defines the Space Node type, a container for organizing content within a Workspace. */
export * from './registry/nodes/space';
/** @module registry/nodes/file Defines the File Node type for representing stored files. */
export * from './registry/nodes/file';
/** @module registry/documents/index Aggregates and re-exports document type definitions (e.g., RichText). */
export * from './registry/documents/index';
/** @module registry/documents/rich-text Defines the structure and schema for rich-text documents. */
export * from './registry/documents/rich-text';
/** @module registry/zod Exports Zod-related utilities or pre-defined schemas used in the registry. */
export * from './registry/zod';

// Types - Shared TypeScript type definitions for various application domains
/** @module types/accounts Contains TypeScript types related to user accounts and authentication. */
export * from './types/accounts';
/** @module types/files TypeScript types for file metadata and related structures. */
export * from './types/files';
/** @module types/sockets TypeScript types used in WebSocket communication. */
export * from './types/sockets';
/** @module types/servers TypeScript types related to server entities and configurations. */
export * from './types/servers';
/** @module types/workspaces TypeScript types for workspaces and their properties. */
export * from './types/workspaces';
/** @module types/mutations TypeScript types defining the structure of mutations (inputs and outputs). */
export * from './types/mutations';
/** @module types/api TypeScript types for API request and response payloads. */
export * from './types/api';
/** @module types/crdt TypeScript types related to Conflict-free Replicated Data Types (CRDTs). */
export * from './types/crdt';
/** @module types/mentions TypeScript types for mention objects. */
export * from './types/mentions';
/** @module types/avatars TypeScript types for user and workspace avatars. */
export * from './types/avatars';
/** @module types/build TypeScript types related to build processes or configurations. */
export * from './types/build';

// Synchronizers - Base logic or types for data synchronization
/** @module synchronizers Exports base classes, interfaces, or utilities for data synchronizers. */
export * from './synchronizers';
