// packages/core/src/types/mentions.ts
/**
 * @file Defines TypeScript types and constants related to mentions within content.
 * Mentions are typically used to refer to users, nodes (like pages or tasks), or special groups.
 */

/**
 * Represents the target type of a mention. This could be extended to be a more specific enum
 * if there's a fixed set of mentionable entity types (e.g., 'user', 'node', 'group').
 * For now, it's a string, allowing flexibility.
 */
export type MentionTarget = string; // Could be: 'user' | 'node' | 'channel' | 'everyone' etc.

/**
 * Represents a mention object, typically extracted from rich text content.
 *
 * @property id - The unique identifier of the entity being mentioned.
 *                For a user mention, this would be the user's ID.
 *                For a node mention, this would be the node's ID.
 *                For special mentions like "@everyone", this might be a predefined constant (see {@link MentionConstants}).
 * @property target - A string indicating the type of entity being mentioned (e.g., "user", "page", "everyone").
 *                    This helps in resolving and rendering the mention correctly. See {@link MentionTarget}.
 */
export type Mention = {
  /**
   * Unique ID of the mentioned entity (e.g., user ID, node ID).
   * For an "@everyone" mention, this might be a special keyword.
   */
  id: string;
  /**
   * Type of the mentioned entity (e.g., "user", "node", "everyone").
   * Helps in processing and displaying the mention.
   */
  target: MentionTarget;
};

/**
 * Defines constant values related to special mention types.
 *
 * @property Everyone - A special identifier or keyword used for "@everyone" mentions,
 *                      which typically notify all members of a channel or workspace.
 */
export const MentionConstants = {
  /**
   * Represents an "@everyone" mention.
   * The `id` for such a mention in a {@link Mention} object might be this constant value
   * or another agreed-upon identifier, with `target` possibly being "everyone" or "group".
   */
  Everyone: 'everyone',
};
