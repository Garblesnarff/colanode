// packages/core/src/lib/debugger.ts
/**
 * @file Provides a utility function for creating namespaced debug instances.
 * This utility leverages the `debug` library (https://www.npmjs.com/package/debug)
 * to allow for conditional logging based on environment variables.
 */
import debug, { Debugger } from 'debug';

/**
 * Creates a namespaced debugger instance.
 * All debug messages created with this utility will be prefixed with `colanode:`.
 * To enable debugging output, the `DEBUG` environment variable must be set.
 * For example, `DEBUG=colanode:server` will enable logs from the 'server' namespace.
 * `DEBUG=colanode:*` will enable all logs from the `colanode` prefix.
 *
 * @param namespace The specific namespace for this debugger instance (e.g., 'server', 'client:sync').
 *                  This will be appended to 'colanode:' to form the full debug namespace.
 * @returns A `debug` library debugger instance, which can be used for logging.
 *          The returned function can be called with a message and optional arguments,
 *          similar to `console.log`.
 *
 * @example
 * const log = createDebugger('feature:module');
 * log('This is a debug message for feature:module');
 * log('Another message with a value: %O', { key: 'value' });
 *
 * // To see these logs, run with DEBUG environment variable:
 * // DEBUG=colanode:feature:module node your-app.js
 * // DEBUG=colanode:feature:* node your-app.js
 * // DEBUG=colanode:* node your-app.js
 */
export const createDebugger = (namespace: string): Debugger => {
  return debug(`colanode:${namespace}`);
};
