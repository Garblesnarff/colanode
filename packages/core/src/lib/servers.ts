// packages/core/src/lib/servers.ts
/**
 * @file Utility functions related to Colanode server identification.
 */

/**
 * Checks if a given domain string belongs to an official Colanode cloud server.
 * Official Colanode servers are expected to end with '.colanode.com'.
 *
 * @param domain The domain string to check (e.g., "us.colanode.com", "example.com").
 * @returns `true` if the domain ends with '.colanode.com', `false` otherwise.
 *          Returns `false` if the domain is null, undefined, or an empty string.
 *
 * @example
 * isColanodeServer("eu.colanode.com"); // true
 * isColanodeServer("my.custom.server.com"); // false
 * isColanodeServer("colanode.com"); // false (must be a subdomain like *.colanode.com)
 * isColanodeServer("beta.us.colanode.com"); // true
 */
export const isColanodeServer = (domain: string): boolean => {
  if (!domain) {
    return false;
  }
  return domain.endsWith('.colanode.com');
};
