// packages/client/src/handlers/index.ts
/**
 * @file Main entry point for handlers within the `@colanode/client` package.
 *
 * This module re-exports core components related to handling client-side operations,
 * particularly focusing on mediating actions such as mutations and queries.
 *
 * It typically exports:
 * - `Mediator`: A central dispatcher or coordinator for executing commands (mutations) and queries.
 * - Mutation Handlers: Logic for processing specific mutation requests.
 * - Query Handlers: Logic for processing specific query requests.
 *
 * This structure helps in organizing how client requests are processed and managed.
 */

/** @module handlers/mutations Exports mutation handler logic or a registry of mutation handlers. */
export * from './mutations';
/** @module handlers/queries Exports query handler logic or a registry of query handlers. */
export * from './queries';
/** @module handlers/mediator Exports the Mediator class/object responsible for dispatching commands and queries. */
export * from './mediator';
