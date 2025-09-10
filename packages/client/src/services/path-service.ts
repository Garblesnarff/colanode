// packages/client/src/services/path-service.ts
/**
 * @file Defines the `PathService` interface, which provides a contract for
 * resolving various application-specific file system paths. This abstraction
 * allows different environments (e.g., desktop, web with OPFS) to implement
 * path resolution according to their storage structure.
 */

/**
 * Interface for a service that provides standardized methods to obtain
 * paths for various application data, databases, temporary files, and assets.
 * Implementations will tailor these paths to the specific environment (desktop, web).
 */
export interface PathService {
  /** Base path for all application-specific data. */
  app: string;
  /** Path to the main application-level SQLite database file. */
  appDatabase: string;
  /** Path to the directory storing data for all user accounts. */
  accounts: string;
  /** Path to the general temporary files directory for the application. */
  temp: string;

  /**
   * Constructs the full path for a specific temporary file.
   * @param name - The name of the temporary file.
   * @returns The full path to the temporary file.
   */
  tempFile: (name: string) => string;

  /**
   * Constructs the path to the directory for a specific user account.
   * @param accountId - The unique identifier of the account.
   * @returns The path to the account's data directory.
   */
  account: (accountId: string) => string;

  /**
   * Constructs the path to a specific account's database file (if accounts have individual DBs).
   * @param accountId - The unique identifier of the account.
   * @returns The path to the account's database file.
   */
  accountDatabase: (accountId: string) => string;

  /**
   * Constructs the path to the directory for a specific workspace within an account.
   * @param accountId - The ID of the account owning the workspace.
   * @param workspaceId - The ID of the workspace.
   * @returns The path to the workspace's data directory.
   */
  workspace: (accountId: string, workspaceId: string) => string;

  /**
   * Constructs the path to a specific workspace's SQLite database file.
   * @param accountId - The ID of the account owning the workspace.
   * @param workspaceId - The ID of the workspace.
   * @returns The path to the workspace's database file.
   */
  workspaceDatabase: (accountId: string, workspaceId: string) => string;

  /**
   * Constructs the path to the directory storing files for a specific workspace.
   * @param accountId - The ID of the account owning the workspace.
   * @param workspaceId - The ID of the workspace.
   * @returns The path to the workspace's files directory.
   */
  workspaceFiles: (accountId: string, workspaceId: string) => string;

  /**
   * Constructs the full path for a specific file within a workspace.
   * @param accountId - The ID of the account owning the workspace.
   * @param workspaceId - The ID of the workspace containing the file.
   * @param fileId - The unique identifier of the file.
   * @param extension - The file extension (e.g., ".txt", ".jpg").
   * @returns The full path to the workspace file.
   */
  workspaceFile: (
    accountId: string,
    workspaceId: string,
    fileId: string,
    extension: string // Ensure consistent use (e.g., with or without leading dot)
  ) => string;

  /**
   * Constructs the path to the directory storing avatars for a specific account.
   * @param accountId - The ID of the account.
   * @returns The path to the account's avatars directory.
   */
  accountAvatars: (accountId: string) => string;

  /**
   * Constructs the path to a specific avatar file for an account.
   * @param accountId - The ID of the account.
   * @param avatarId - The unique identifier of the avatar (which might include its extension or be an opaque ID).
   * @returns The path to the avatar file.
   */
  accountAvatar: (accountId: string, avatarId: string) => string;

  /**
   * Returns the directory name of a path, similar to Node.js `path.dirname()`.
   * @param pathString - The path string.
   * @returns The directory part of the path.
   */
  dirname: (pathString: string) => string;

  /**
   * Returns the file name portion of a path, similar to Node.js `path.basename()`.
   * @param pathString - The path string.
   * @returns The file name part of the path.
   */
  filename: (pathString: string) => string;

  /**
   * Joins all given path segments together using the platform-specific separator as a delimiter,
   * then normalizes the resulting path. Similar to Node.js `path.join()`.
   * @param paths - An array of path segments.
   * @returns The normalized path string.
   */
  join: (...paths: string[]) => string;

  /**
   * Returns the extension of the path, from the last occurrence of the . (period)
   * to the end of string in the last portion of the path. If there is no . in the last portion of the path,
   * or if there are no . characters other than the first character of the basename of path, an empty string is returned.
   * Similar to Node.js `path.extname()`.
   * @param pathString - The path string.
   * @returns The file extension string (e.g., ".txt", ".jpg"), or an empty string.
   */
  extension: (pathString: string) => string;

  /** Path to the application's static assets directory (e.g., bundled images, non-data resources). */
  assets: string;
  /** Path to the directory containing bundled fonts. */
  fonts: string;
  /** Path to the emojis SQLite database file. */
  emojisDatabase: string;
  /** Path to the icons SQLite database file. */
  iconsDatabase: string;
}
