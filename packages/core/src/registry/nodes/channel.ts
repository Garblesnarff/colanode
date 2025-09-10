// packages/core/src/registry/nodes/channel.ts
/**
 * @file Defines the schema, attributes type, and model for Channel Nodes.
 * Channel Nodes represent communication channels, similar to chat rooms or topics.
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { NodeAttributes } from '@colanode/core/registry/nodes'; // Assumed from parent index
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { Mention } from '@colanode/core/types';

/**
 * Zod schema for validating the attributes specific to a Channel Node.
 *
 * @property type - Discriminator literal, must be "channel".
 * @property name - The display name of the channel.
 * @property avatar - Optional URL or identifier for the channel's avatar image.
 * @property parentId - The ID of the parent node (e.g., a Space or another organizational node).
 */
export const channelAttributesSchema = z.object({
  /** Must be the literal string "channel". */
  type: z.literal('channel'),
  /** The name of the channel (e.g., "General Discussion"). */
  name: z.string().min(1, { message: 'Channel name cannot be empty' }), // Added min length for robustness
  /** Optional URL or identifier for an avatar image for the channel. */
  avatar: z.string().nullable().optional(),
  /** Identifier of the parent node under which this channel exists. */
  parentId: z.string(), // Should be a valid Node ID
});

/**
 * TypeScript type inferred from `channelAttributesSchema`.
 * Represents the specific attributes of a Channel Node.
 */
export type ChannelAttributes = z.infer<typeof channelAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Channel Nodes.
 * This object defines how Channel Nodes behave, their schema, and how permissions
 * and data extraction are handled for them.
 */
export const channelModel: NodeModel = {
  type: 'channel',
  attributesSchema: channelAttributesSchema,
  // Channels do not have their own separate "document" content like Pages.
  documentSchema: undefined, // Explicitly undefined

  /**
   * Determines if a user can create a Channel.
   * Requires 'editor' role or higher on the parent node (derived from the tree).
   */
  canCreate: (context) => {
    if (context.tree.length === 0) {
      // Cannot create a channel without a parent context
      return false;
    }
    // Role is determined based on the parent in the tree
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the attributes of a Channel (e.g., name, avatar).
   * Requires 'editor' role or higher on the channel itself or its parent hierarchy.
   */
  canUpdateAttributes: (context) => {
    // context.tree should ideally include the channel node itself if checking its own permissions,
    // or its parent if checking based on parent permissions.
    // Assuming context.tree is the hierarchy leading to and including the channel.
    if (context.tree.length === 0) {
      return false;
    }
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Channels do not have updatable document content in the same way Pages do.
   * Always returns `false`.
   */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Determines if a user can delete a Channel.
   * Requires 'admin' role or higher on the channel or its parent hierarchy.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) {
      return false;
    }
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'admin') : false;
  },

  /**
   * Determines if a user can react to a Channel (e.g., with emojis).
   * For channels, reactions might not be directly applicable to the channel node itself,
   * but rather to messages within it. This defaults to `false`.
   * Specific reaction logic for messages would be handled by the MessageNode model.
   */
  canReact: () => {
    // Reactions are typically on messages within a channel, not the channel itself.
    return false;
  },

  /**
   * Extracts textual content from Channel attributes for search indexing.
   * Primarily uses the channel's name.
   *
   * @param _id - The ID of the channel node (unused in this implementation).
   * @param attributes - The attributes of the channel node.
   * @returns A {@link NodeText} object containing the name, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'channel'.
   */
  extractText: (_id: string, attributes: NodeAttributes): NodeText | null => {
    if (attributes.type !== 'channel') {
      // This should ideally not happen if called from a type-safe context
      throw new Error('Invalid node type passed to channelModel.extractText');
    }
    // Ensure attributes conform to ChannelAttributes before accessing 'name'
    const parsedAttributes = channelAttributesSchema.safeParse(attributes);
    if (!parsedAttributes.success) {
        // Log error or handle appropriately if schema validation fails
        console.error("Invalid channel attributes for text extraction:", parsedAttributes.error);
        return null;
    }
    return {
      name: parsedAttributes.data.name,
      attributes: null, // No other significant text in channel attributes themselves
    };
  },

  /**
   * Extracts mentions from Channel attributes.
   * Channels themselves typically do not contain mentions in their direct attributes.
   * Mentions would be found in messages within the channel.
   *
   * @returns An empty array, as channels don't store mentions in their attributes.
   */
  extractMentions: (): Mention[] => {
    // Channels themselves don't have mentionable content in their attributes.
    // Mentions would be in messages within the channel.
    return [];
  },
};
