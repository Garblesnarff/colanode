// packages/client/src/lib/servers.ts
/**
 * @file Client-side utility functions related to server information,
 * particularly for checking if a server version is outdated compared to
 * a minimum required version by the client.
 */
import semver from 'semver'; // Uses the 'semver' library for semantic version comparisons

/**
 * Checks if a given server version string is considered outdated.
 * A server is considered outdated if its version is less than a hardcoded
 * minimum required version (currently "0.2.0").
 *
 * Special handling for "local":
 * - If the input `version` is exactly "local", it's never considered outdated.
 *   This is likely a placeholder for development or local server instances.
 *
 * Version parsing:
 * - If the input `version` string cannot be parsed by `semver.parse()` (e.g., it's not
 *   a valid semantic version string), it is considered outdated by this function.
 *
 * @param version - The server version string to check (e.g., "0.1.5", "0.2.0", "local").
 * @returns `true` if the server version is outdated or invalid (and not "local"), `false` otherwise.
 *
 * @example
 * isServerOutdated("0.1.0"); // true
 * isServerOutdated("0.2.0"); // false
 * isServerOutdated("0.3.0"); // false
 * isServerOutdated("local"); // false
 * isServerOutdated("invalid-version"); // true (because semver.parse returns null)
 */
export const isServerOutdated = (version: string): boolean => {
  // Development/local server versions are never considered outdated.
  if (version === 'local') {
    return false;
  }

  // Attempt to parse the version string into a SemVer object.
  const parsedVersion = semver.parse(version);
  if (!parsedVersion) {
    // If the version string is invalid (e.g., "latest", "beta-text"), treat as outdated.
    // This ensures client compatibility with servers reporting standard semantic versions.
    // console.warn(`Invalid server version string encountered: "${version}". Treating as outdated.`);
    return true;
  }

  // Define the minimum client-compatible server version.
  // This should be updated if the client requires newer server features.
  const minimumRequiredVersion = '0.2.0';

  // Check if the parsed server version is less than the minimum required version.
  return semver.lt(parsedVersion, minimumRequiredVersion);
};
