// packages/ui/src/index.ts
/**
 * @file Main entry point for the `@colanode/ui` package.
 *
 * This package exports high-level UI components and utilities intended for consumption
 * by the web and desktop applications. It serves as the primary interface for accessing
 * the shared UI library.
 *
 * Currently, it exports:
 * - `RootProvider`: A React component likely responsible for setting up global UI contexts
 *   (e.g., theme, internationalization, application state).
 * - `window`: Potentially exports window-related utilities or type definitions specific to the UI context.
 *
 * Other components, hooks, contexts, and utilities are typically organized within subdirectories
 * (e.g., `components/`, `hooks/`, `contexts/`, `editor/`) and may be imported directly
 * by consuming applications as needed, or re-exported from here if they are considered
 * part of the public API of this package.
 */
export * from './components/root-provider';
export * from './window';
