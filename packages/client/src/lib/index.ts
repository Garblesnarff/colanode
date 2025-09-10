// packages/client/src/lib/index.ts
/**
 * @file Main entry point for utility functions and libraries within the `@colanode/client` package.
 *
 * This module re-exports various helper functions, classes, and foundational utilities
 * that support the core operations of the client application. These utilities might
 * include functionalities for data manipulation, event handling, communication (e.g., WebSockets),
 * application updates, and other general-purpose tasks.
 *
 * Consolidating these exports here provides a clear and organized way to access
 * shared library code used across different parts of the client.
 */

/** @module lib/ky Exports a customized Ky instance for HTTP requests or related utilities. */
export * from './ky';
/** @module lib/backoff-calculator Exports utilities for calculating exponential backoff delays, often used in retry mechanisms. */
export * from './backoff-calculator';
/** @module lib/editor Exports editor-specific utilities or helper functions. */
export * from './editor';
/** @module lib/event-bus Exports the global client-side event bus instance and related types. */
export * from './event-bus';
/** @module lib/event-loop Exports utilities related to managing or interacting with the JavaScript event loop, if any. */
export * from './event-loop';
/** @module lib/mappers Exports data mapping functions, used for transforming data between different formats or structures. */
export * from './mappers';
/** @module lib/mentions Exports utilities for processing or handling mentions within text content, specific to client-side needs. */
export * from './mentions';
/** @module lib/servers Exports client-side utilities for managing server connections or server-related data. */
export * from './servers';
/** @module lib/types Exports common client-side TypeScript types and interfaces used across different modules within `lib` or the broader client package. */
export * from './types';
/** @module lib/utils Exports general-purpose client-side utility functions. */
export * from './utils';
