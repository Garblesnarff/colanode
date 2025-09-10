// packages/core/src/registry/nodes/chat.ts
/**
 * @file Defines the schema, attributes type, and model for Chat Nodes.
 * Chat Nodes typically represent direct message conversations between two users.
 */
import { z } from 'zod/v4';

import { hasWorkspaceRole } from '@colanode/core/lib/permissions';
import { NodeModel, nodeRoleEnum } from '@colanode/core/registry/nodes/core';
import { Mention } from '@colanode/core/types'; // Assuming Mention is a general type

/**
 * Zod schema for validating the attributes specific to a Chat Node.
 *
 * @property type - Discriminator literal, must be "chat".
 * @property collaborators - A record mapping user IDs to their {@link NodeRole} within this chat.
 *                           For a 1-on-1 chat, this typically includes two users.
 *                           All collaborators in a chat usually have the same role (e.g., 'admin' or 'editor' equivalent).
 */
export const chatAttributesSchema = z.object({
  /** Must be the literal string "chat". */
  type: z.literal('chat'),
  /**
   * A record of collaborators involved in this chat.
   * Keys are user IDs, values are their roles within this specific chat context.
   * For a direct message, this typically contains two user IDs, both often with an 'admin'-like role for the chat.
   */
  collaborators: z.record(z.string(), nodeRoleEnum),
});

/**
 * TypeScript type inferred from `chatAttributesSchema`.
 * Represents the specific attributes of a Chat Node.
 */
export type ChatAttributes = z.infer<typeof chatAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Chat Nodes.
 * This object defines how Chat Nodes behave, their schema, and how permissions
 * and data extraction are handled.
 */
export const chatModel: NodeModel = {
  type: 'chat',
  attributesSchema: chatAttributesSchema,
  documentSchema: undefined, // Chats do not have separate document content like Pages.

  /**
   * Determines if a user can create a Chat.
   * Conditions:
   * - User must have at least 'guest' role in the workspace.
   * - The attributes must be for a 'chat' type.
   * - Exactly two collaborators must be specified.
   * - The creating user must be one of the specified collaborators.
   */
  canCreate: (context) => {
    // User must be at least a guest in the workspace to create a chat.
    if (!hasWorkspaceRole(context.user.role, 'guest')) {
      return false;
    }

    // Ensure the attributes are for a chat node.
    if (context.attributes.type !== 'chat') {
      return false;
    }

    // Type assertion after checking discriminator.
    const chatAttributes = context.attributes as ChatAttributes;
    const collaborators = chatAttributes.collaborators;

    // Direct chats are typically between two users.
    if (Object.keys(collaborators).length !== 2) {
      return false;
    }

    // The creating user must be one of the collaborators.
    if (!collaborators[context.user.id]) {
      return false;
    }

    return true;
  },

  /**
   * Chat attributes (like collaborators) are typically immutable after creation.
   * Always returns `false`.
   */
  canUpdateAttributes: () => {
    return false;
  },

  /**
   * Chats do not have updatable document content.
   * Always returns `false`.
   */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Deleting chats might have specific rules (e.g., only if no messages, or soft delete).
   * Currently, this is restrictive and returns `false`.
   * This could be expanded based on product requirements (e.g., allow if user is a collaborator).
   */
  canDelete: () => {
    // Deletion of chats is complex (e.g., for one user or both?).
    // Defaulting to false, can be implemented based on specific rules.
    return false;
  },

  /**
   * Reactions are typically on messages within a chat, not the chat node itself.
   * Always returns `false`.
   */
  canReact: () => {
    return false;
  },

  /**
   * Extracts textual content from Chat attributes.
   * Chat nodes themselves don't have a "name" or descriptive text in their attributes.
   * Text content would be within messages.
   * Returns `null` as there's no direct text to extract from chat attributes for indexing.
   */
  extractText: () => {
    // Chat nodes don't have inherent textual content like a name or description for indexing.
    // Their content is the sequence of messages.
    return null;
  },

  /**
   * Extracts mentions from Chat attributes.
   * Chat nodes themselves do not contain mentions in their attributes.
   * Returns an empty array.
   */
  extractMentions: (): Mention[] => {
    return [];
  },
};
