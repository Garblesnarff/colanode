// packages/core/src/registry/nodes/message.ts
/**
 * @file Defines the schema, attributes type, and model for Message Nodes.
 * Message Nodes represent individual messages within a chat or channel.
 * They can have subtypes (standard, question, answer) and contain block-based content.
 */
import { z } from 'zod/v4';

import { extractBlocksMentions } from '@colanode/core/lib/mentions';
import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { extractBlockTexts } from '@colanode/core/lib/texts';
import { blockSchema, Block } from '@colanode/core/registry/block'; // Assuming Block type is also exported
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { Mention, NodeAttributes } from '@colanode/core/types';

/**
 * Defines the possible subtypes for a Message Node.
 * - `standard`: A regular message.
 * - `question`: A message posed as a question, perhaps with special UI treatment.
 * - `answer`: A message that is an answer to a question, possibly linked to it.
 */
export type MessageSubtype = 'standard' | 'question' | 'answer';

/**
 * Zod schema for validating the attributes specific to a Message Node.
 *
 * @property type - Discriminator literal, must be "message".
 * @property subtype - The {@link MessageSubtype} of the message.
 * @property name - Optional name or title for the message (rarely used for standard messages, might be for specific subtypes).
 * @property parentId - The ID of the parent node (typically a ChatNode or ChannelNode).
 * @property referenceId - Optional ID of another message this message refers to (e.g., a reply or an answer to a question).
 * @property content - Optional record of {@link Block} objects representing the rich content of the message. Keys are block IDs.
 * @property selectedContextNodeIds - Optional array of Node IDs that are attached or relevant to this message as context.
 */
export const messageAttributesSchema = z.object({
  /** Must be the literal string "message". */
  type: z.literal('message'),
  /** The subtype of the message. */
  subtype: z.enum(['standard', 'question', 'answer']),
  /** Optional name/title for the message (e.g., for a question message). */
  name: z.string().optional(), // Usually messages don't have names, but schema allows it.
  /** Identifier of the parent ChatNode or ChannelNode. */
  parentId: z.string(),
  /** Optional ID of a message this one refers to (e.g., for replies or threaded discussions). */
  referenceId: z.string().nullable().optional(),
  /**
   * The rich content of the message, structured as a record of Blocks.
   * The root block ID for this content is typically the message's own Node ID.
   */
  content: z.record(z.string(), blockSchema).optional().nullable(),
  /** Optional array of Node IDs attached or linked as context to this message. */
  selectedContextNodeIds: z.array(z.string()).optional().nullable(),
});

/**
 * TypeScript type inferred from `messageAttributesSchema`.
 * Represents the specific attributes of a Message Node.
 */
export type MessageAttributes = z.infer<typeof messageAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Message Nodes.
 * This object defines how Message Nodes behave, their schema, permissions, and data extraction.
 */
export const messageModel: NodeModel = {
  type: 'message',
  attributesSchema: messageAttributesSchema,
  documentSchema: undefined, // Message content is handled via `attributes.content` (blocks), not a separate document.

  /**
   * Determines if a user can create a Message.
   * Requires 'collaborator' role or higher on the parent Chat/Channel.
   */
  canCreate: (context) => {
    if (context.tree.length === 0) return false; // Parent context (chat/channel) needed
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'collaborator') : false;
  },

  /**
   * Determines if a user can update the attributes of a Message.
   * Typically, only the creator of the message can edit its content (attributes.content).
   * Other attributes like `subtype` or `referenceId` might be immutable or have specific rules.
   * This check allows update if the user is the creator.
   */
  canUpdateAttributes: (context) => {
    // Basic check: only the creator can update.
    // More granular checks might be needed if some attributes are updatable by others (e.g., admins).
    if (context.tree.length === 0) return false; // Should have context
    // const role = extractNodeRole(context.tree, context.user.id); // Role on parent
    // For messages, primary check is usually if user is the creator.
    return context.node.createdBy === context.user.id;
  },

  /** Messages do not have a separate "document" to update. Always `false`. */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Determines if a user can delete a Message.
   * Allowed if the user is the creator of the message OR has 'admin' role on the parent Chat/Channel.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const roleOnParent = extractNodeRole(context.tree, context.user.id);
    const isAdminOnParent = roleOnParent ? hasNodeRole(roleOnParent, 'admin') : false;
    return context.node.createdBy === context.user.id || isAdminOnParent;
  },

  /**
   * Determines if a user can react to a Message (e.g., add an emoji).
   * Requires 'viewer' role or higher on the parent Chat/Channel.
   */
  canReact: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'viewer') : false;
  },

  /**
   * Extracts textual content from Message attributes for search indexing.
   * This includes the message's optional name and the text from its block content.
   *
   * @param id - The ID of the message node (used as the root block ID for content extraction).
   * @param attributes - The attributes of the message node.
   * @returns A {@link NodeText} object, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'message'.
   */
  extractText: (id: string, attributes: NodeAttributes): NodeText | null => {
    if (attributes.type !== 'message') {
      throw new Error('Invalid node type passed to messageModel.extractText');
    }
    // Ensure attributes conform to MessageAttributes before accessing specific properties
    const parsedAttributes = messageAttributesSchema.safeParse(attributes);
    if (!parsedAttributes.success) {
        console.error("Invalid message attributes for text extraction:", parsedAttributes.error);
        return null;
    }
    const msgAttrs = parsedAttributes.data;
    const contentText = extractBlockTexts(id, msgAttrs.content as Record<string, Block> | undefined | null);

    return {
      name: msgAttrs.name || null, // Optional name
      attributes: contentText,     // Text from block content
    };
  },

  /**
   * Extracts mentions from Message content.
   *
   * @param id - The ID of the message node (used as the root block ID for mention extraction).
   * @param attributes - The attributes of the message node.
   * @returns An array of {@link Mention} objects found in the message content.
   * @throws If `attributes.type` is not 'message'.
   */
  extractMentions: (id: string, attributes: NodeAttributes): Mention[] => {
    if (attributes.type !== 'message') {
      throw new Error('Invalid node type passed to messageModel.extractMentions');
    }
    const parsedAttributes = messageAttributesSchema.safeParse(attributes);
    if (!parsedAttributes.success) {
        console.error("Invalid message attributes for mention extraction:", parsedAttributes.error);
        return [];
    }
    const msgAttrs = parsedAttributes.data;
    return extractBlocksMentions(id, msgAttrs.content as Record<string, Block> | undefined | null);
  },
};
