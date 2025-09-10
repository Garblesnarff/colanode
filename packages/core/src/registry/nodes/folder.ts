// packages/core/src/registry/nodes/folder.ts
/**
 * @file Defines the schema, attributes type, and model for Folder Nodes.
 * Folder Nodes are used for organizing other nodes (like pages, databases, or other folders)
 * in a hierarchical structure.
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { Mention, NodeAttributes } from '@colanode/core/types';

/**
 * Zod schema for validating the attributes specific to a Folder Node.
 *
 * @property type - Discriminator literal, must be "folder".
 * @property name - The display name of the folder.
 * @property avatar - Optional URL or identifier for the folder's icon.
 * @property parentId - The ID of the parent node (e.g., a Space or another Folder).
 */
export const folderAttributesSchema = z.object({
  /** Must be the literal string "folder". */
  type: z.literal('folder'),
  /** The name of the folder. */
  name: z.string().min(1, { message: 'Folder name cannot be empty' }),
  /** Optional URL or identifier for an icon for the folder. */
  avatar: z.string().nullable().optional(),
  /** Identifier of the parent node under which this folder exists. */
  parentId: z.string(), // Should be a valid Node ID
});

/**
 * TypeScript type inferred from `folderAttributesSchema`.
 * Represents the specific attributes of a Folder Node.
 */
export type FolderAttributes = z.infer<typeof folderAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Folder Nodes.
 * This object defines how Folder Nodes behave, their schema, permissions, and data extraction.
 */
export const folderModel: NodeModel = {
  type: 'folder',
  attributesSchema: folderAttributesSchema,
  documentSchema: undefined, // Folders do not have their own document content.

  /**
   * Determines if a user can create a Folder.
   * Requires 'editor' role or higher on the parent node.
   */
  canCreate: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the attributes of a Folder (e.g., name, icon).
   * Requires 'editor' role or higher on the folder itself or its hierarchy.
   */
  canUpdateAttributes: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /** Folders do not have updatable document content. Always `false`. */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Determines if a user can delete a Folder.
   * Requires 'admin' role or higher on the folder or its hierarchy.
   * Deleting a folder typically implies deleting its contents, hence stricter permission.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'admin') : false;
  },

  /** Reactions are not typically applied to Folder nodes. Always `false`. */
  canReact: () => {
    return false;
  },

  /**
   * Extracts textual content from Folder attributes for search indexing.
   * Primarily uses the folder's name.
   *
   * @param _id - The ID of the folder node (unused).
   * @param attributes - The attributes of the folder node.
   * @returns A {@link NodeText} object containing the name, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'folder'.
   */
  extractText: (_id: string, attributes: NodeAttributes): NodeText | null => {
    if (attributes.type !== 'folder') {
      throw new Error('Invalid node type passed to folderModel.extractText');
    }
    const parsedAttributes = folderAttributesSchema.safeParse(attributes);
    if(!parsedAttributes.success) {
        console.error("Invalid folder attributes for text extraction:", parsedAttributes.error);
        return null;
    }
    return {
      name: parsedAttributes.data.name,
      attributes: null, // Folders don't have other significant text attributes for general indexing.
    };
  },

  /**
   * Extracts mentions from Folder attributes.
   * Folders themselves (i.e., their names or icons) do not typically contain mentions.
   *
   * @returns An empty array.
   */
  extractMentions: (): Mention[] => {
    return [];
  },
};
