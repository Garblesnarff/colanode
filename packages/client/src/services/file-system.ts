// packages/client/src/services/file-system.ts
/**
 * @file Defines interfaces and types for abstracting file system operations.
 * This allows the application to interact with the file system in a consistent way,
 * regardless of whether it's running in a Node.js environment (e.g., Electron main process)
 * or a browser environment (e.g., using OPFS or other browser storage APIs).
 */

/**
 * Represents metadata for a file or directory.
 *
 * @property lastModified - Timestamp (number, typically milliseconds since epoch) of when the file was last modified.
 * @property size - Size of the file in bytes. For directories, this might be 0 or a platform-dependent value.
 */
export interface FileMetadata {
  /** Timestamp of the last modification, typically milliseconds since Unix epoch. */
  lastModified: number;
  /** Size of the file in bytes. */
  size: number;
}

/**
 * Represents a readable stream for file content.
 * This type is a union to accommodate different stream implementations across environments:
 * - `AsyncIterable<Uint8Array>`: Common for Node.js streams or modern web stream APIs.
 * - `File`: The `File` object from the Web API (which is a `Blob` and can be read).
 */
export type FileReadStream = AsyncIterable<Uint8Array> | File;

/**
 * Interface defining a contract for file system operations.
 * Implementations of this interface will provide environment-specific logic
 * (e.g., Node.js `fs` module, browser's Origin Private File System - OPFS).
 */
export interface FileSystem {
  /**
   * Creates a directory at the specified path.
   * If intermediate directories do not exist, they should ideally be created (like `mkdir -p`).
   * @param path - The absolute or relative path where the directory should be created.
   * @returns A promise that resolves when the directory is successfully created.
   */
  makeDirectory(path: string): Promise<void>;

  /**
   * Checks if a file or directory exists at the specified path.
   * @param path - The path to check.
   * @returns A promise that resolves to `true` if the path exists, `false` otherwise.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Deletes a file or directory at the specified path.
   * If the path is a directory, it should ideally delete its contents recursively.
   * @param path - The path to the file or directory to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete(path: string): Promise<void>;

  /**
   * Copies a file or directory from a source path to a destination path.
   * @param source - The path of the file or directory to copy.
   * @param destination - The path where the copy should be placed.
   * @returns A promise that resolves when the copy operation is complete.
   */
  copy(source: string, destination: string): Promise<void>;

  /**
   * Opens a file for reading and returns a readable stream.
   * @param path - The path to the file to read.
   * @returns A promise that resolves to a {@link FileReadStream}.
   */
  readStream(path: string): Promise<FileReadStream>;

  /**
   * Opens a file for writing and returns a writable stream.
   * If the file does not exist, it should be created. If it exists, it's often truncated or overwritten.
   * @param path - The path to the file to write to.
   * @returns A promise that resolves to a `WritableStream<Uint8Array>`.
   */
  writeStream(path: string): Promise<WritableStream<Uint8Array>>;

  /**
   * Lists all files and directories directly within the specified directory path.
   * Does not list recursively by default unless specified by implementation details.
   * @param path - The path to the directory to list.
   * @returns A promise that resolves to an array of strings, where each string is the name
   *          of a file or directory within the specified path.
   */
  listFiles(path: string): Promise<string[]>;

  /**
   * Reads the entire content of a file into a Uint8Array.
   * @param path - The path to the file to read.
   * @returns A promise that resolves to a `Uint8Array` containing the file's content.
   */
  readFile(path: string): Promise<Uint8Array>;

  /**
   * Writes data to a file, replacing the file if it already exists.
   * @param path - The path to the file to write to.
   * @param data - A `Uint8Array` containing the data to write.
   * @returns A promise that resolves when the write operation is complete.
   */
  writeFile(path: string, data: Uint8Array): Promise<void>;

  /**
   * Retrieves metadata (like size and last modification date) for a file or directory.
   * @param path - The path to the file or directory.
   * @returns A promise that resolves to a {@link FileMetadata} object.
   */
  metadata(path: string): Promise<FileMetadata>;

  /**
   * Generates a URL that can be used to access the file, especially in a browser context.
   * For local file systems (Node.js), this might return a `file://` URL.
   * For browser-based file systems (like OPFS), this might generate an object URL or a specific scheme.
   * @param path - The path to the file.
   * @returns A promise that resolves to a string URL for the file.
   */
  url(path: string): Promise<string>;
}
