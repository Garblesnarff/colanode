// packages/core/src/lib/constants.ts
/**
 * @file Defines various constant values used throughout the Colanode application,
 * particularly related to editor node types and sorting directions.
 */

/**
 * Defines the string identifiers for various types of nodes that can exist within
 * the rich text editor. These constants help ensure consistency when referring to
 * or processing different editor node types.
 *
 * @example
 * if (node.type === EditorNodeTypes.Paragraph) {
 *   // Process a paragraph node
 * }
 */
export const EditorNodeTypes = {
  /** Represents a standard paragraph of text. */
  Paragraph: 'paragraph',
  /** Represents a top-level heading. */
  Heading1: 'heading1',
  /** Represents a second-level heading. */
  Heading2: 'heading2',
  /** Represents a third-level heading. */
  Heading3: 'heading3',
  /** Represents a blockquote section. */
  Blockquote: 'blockquote',
  /** Represents an unordered (bulleted) list. */
  BulletList: 'bulletList',
  /** Represents a block of preformatted code. */
  CodeBlock: 'codeBlock',
  /** Represents an item within a list (either bulleted or ordered). */
  ListItem: 'listItem',
  /** Represents an ordered (numbered) list. */
  OrderedList: 'orderedList',
  /** Represents a list of tasks (e.g., to-do items). */
  TaskList: 'taskList',
  /** Represents an individual task item within a TaskList. */
  TaskItem: 'taskItem',
  /** Represents a horizontal rule or separator. */
  HorizontalRule: 'horizontalRule',
  /** Represents an embedded page link or reference. */
  Page: 'page',
  /** Represents an embedded file or file link. */
  File: 'file',
  /** Represents an embedded folder or folder link. */
  Folder: 'folder',
  /** Represents a temporary file reference, often used during uploads. */
  TempFile: 'tempFile',
};

/**
 * Defines the possible directions for sorting data.
 * - `asc`: Ascending order (e.g., A-Z, 0-9).
 * - `desc`: Descending order (e.g., Z-A, 9-0).
 */
export type SortDirection = 'asc' | 'desc';
