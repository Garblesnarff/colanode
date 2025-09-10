// packages/core/src/types/build.ts
/**
 * @file Defines build-related information, such as version and commit SHA.
 * These values are typically injected or replaced during the build process.
 * The default 'local' values are placeholders for development environments.
 */

/**
 * Placeholder for the application version.
 * During a CI/CD build process, this 'local' string is typically replaced
 * with the actual version number (e.g., "1.2.3", "v2.0.0-beta1").
 * @internal
 */
const VERSION = 'local';

/**
 * Placeholder for the Git commit SHA (short hash).
 * During a CI/CD build process, this 'local' string is typically replaced
 * with the short commit hash of the build (e.g., "abcdef0").
 * @internal
 */
const SHA = 'local';

/**
 * An object containing build information for the application.
 *
 * @property version - The current version of the application. Defaults to 'local' for development.
 *                     This is usually populated by the build system with a semantic version number.
 * @property sha - The Git commit SHA (short hash) from which the application was built.
 *                 Defaults to 'local' for development. This helps in tracing the exact codebase
 *                 for a given build.
 */
export const build = {
  /**
   * The application version string (e.g., "1.0.0", "local").
   * Populated by the build process.
   */
  version: VERSION,
  /**
   * The short Git commit SHA (e.g., "abcdef0", "local").
   * Populated by the build process.
   */
  sha: SHA,
};
