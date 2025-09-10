// packages/core/src/registry/nodes/space.ts
/**
 * @file Defines the schema, attributes type, and model for Space Nodes.
 * Space Nodes are top-level organizational units within a Workspace. They act as containers
 * for other nodes like Pages, Folders, Databases, etc., and manage their own set of
 * collaborators and visibility settings.
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole, hasWorkspaceRole } from '@colanode/core/lib/permissions';
import { NodeModel, nodeRoleEnum, NodeText } from '@colanode/core/registry/nodes/core';
import { Mention, NodeAttributes } from '@colanode/core/types';

/**
 * Defines the visibility options for a Space.
 * - `public`: The space might be accessible to a wider audience (e.g., all workspace members, or even publicly).
 * - `private`: The space is typically restricted to explicitly invited collaborators.
 */
export type SpaceVisibility = 'public' | 'private';

/**
 * Zod schema for validating the attributes specific to a Space Node.
 *
 * @property type - Discriminator literal, must be "space".
 * @property name - The display name of the space.
 * @property description - Optional longer description for the space.
 * @property avatar - Optional URL or identifier for the space's icon or cover image.
 * @property collaborators - A record mapping user IDs to their {@link NodeRole} within this specific space.
 * @property visibility - The {@link SpaceVisibility} of the space, defaulting to "private".
 */
export const spaceAttributesSchema = z.object({
  /** Must be the literal string "space". */
  type: z.literal('space'),
  /** The name of the space. */
  name: z.string().min(1, { message: 'Space name cannot be empty' }),
  /** Optional description for the space. */
  description: z.string().nullable().optional(),
  /** Optional URL or identifier for an icon or cover image for the space. */
  avatar: z.string().nullable().optional(),
  /**
   * A record of collaborators for this space.
   * Keys are user IDs, values are their {@link NodeRole} (e.g., 'admin', 'editor') within this space.
   */
  collaborators: z.record(z.string(), nodeRoleEnum),
  /** Visibility of the space, defaulting to 'private'. */
  visibility: z.enum(['public', 'private']).default('private'),
});

/**
 * TypeScript type inferred from `spaceAttributesSchema`.
 * Represents the specific attributes of a Space Node.
 */
export type SpaceAttributes = z.infer<typeof spaceAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Space Nodes.
 */
export const spaceModel: NodeModel = {
  type: 'space',
  attributesSchema: spaceAttributesSchema,
  documentSchema: undefined, // Spaces are containers and do not have their own document content.

  /**
   * Determines if a user can create a Space.
   * Conditions:
   * - Spaces are typically root-level within a workspace, so `context.tree` should be empty.
   * - User must have at least 'collaborator' role in the workspace.
   * - The attributes must be for a 'space' type.
   * - The creating user must be listed as an 'admin' in the space's initial collaborators.
   */
  canCreate: (context) => {
    // Spaces are root nodes within a workspace, so their creation context tree is empty.
    if (context.tree.length > 0) {
      return false; // Cannot create a space nested under another node via this logic.
    }

    // User needs to be at least a collaborator in the workspace to create a space.
    if (!hasWorkspaceRole(context.user.role, 'collaborator')) {
      return false;
    }

    if (context.attributes.type !== 'space') {
      return false; // Should be ensured by dispatcher, but good for safety.
    }
    // Type assertion after checking discriminator
    const spaceAttrs = context.attributes as SpaceAttributes;

    // The creator must be an admin of the new space.
    // And there must be at least one collaborator (the creator).
    if (Object.keys(spaceAttrs.collaborators).length === 0) {
      return false;
    }
    if (spaceAttrs.collaborators[context.user.id] !== 'admin') {
      return false;
    }

    return true;
  },

  /**
   * Determines if a user can update the attributes of a Space (e.g., name, description, visibility).
   * Requires 'admin' role on the space itself. `context.tree` should represent the space itself.
   */
  canUpdateAttributes: (context) => {
    // context.tree should contain the space node itself, or be empty if checking a root space directly
    // For simplicity, if tree is empty, it might imply we don't have hierarchy info to check role.
    // However, a space is a Node, so its role is within its own collaborators list.
    // `extractNodeRole(context.tree, ...)` where tree is `[spaceNode]` should work.
    if (context.tree.length === 0) return false; // Need the space node in the tree to check its roles
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'admin') : false;
  },

  /** Spaces do not have updatable document content. Always `false`. */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Determines if a user can delete a Space.
   * Requires 'admin' role on the space itself.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'admin') : false;
  },

  /** Reactions are not typically applied to Space nodes. Always `false`. */
  canReact: () => {
    return false;
  },

  /**
   * Extracts textual content from Space attributes for search indexing.
   * Includes the space's name and description.
   *
   * @param _id - The ID of the space node (unused).
   * @param attributes - The attributes of the space node.
   * @returns A {@link NodeText} object, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'space'.
   */
  extractText: (_id: string, attributes: NodeAttributes): NodeText | null => {
    if (attributes.type !== 'space') {
      throw new Error('Invalid node type passed to spaceModel.extractText');
    }
    const parsedAttributes = spaceAttributesSchema.safeParse(attributes);
    if (!parsedAttributes.success) {
        console.error("Invalid space attributes for text extraction:", parsedAttributes.error);
        return null;
    }
    const spaceAttrs = parsedAttributes.data;
    return {
      name: spaceAttrs.name,
      attributes: spaceAttrs.description || null, // Use description as the attribute text
    };
  },

  /**
   * Extracts mentions from Space attributes.
   * The name or description of a space could potentially contain mentions.
   * This is a simplified version; true mention extraction from rich text would be more complex.
   *
   * @param _id - The ID of the space node.
   * @param attributes - The attributes of the space node.
   * @returns An array of {@link Mention} objects (currently empty, placeholder).
   * @todo Implement actual mention extraction if space names/descriptions can contain them.
   */
  extractMentions: (_id: string, attributes: NodeAttributes): Mention[] => {
    // For now, assume name and description are plain text and don't contain structured mentions.
    // If they could (e.g., if description were rich text), this would need parsing.
    if (attributes.type !== 'space') {
      // Should not happen if called correctly
      return [];
    }
    // const spaceAttrs = attributes as SpaceAttributes; // Safe if type is checked
    // Example: Simple regex for @mentions in description (very basic)
    // const mentions: Mention[] = [];
    // if (spaceAttrs.description) {
    //   const matches = spaceAttrs.description.match(/@\w+/g);
    //   if (matches) {
    //     matches.forEach(match => mentions.push({ id: match.substring(1), target: 'user' })); // Example structure
    //   }
    // }
    return []; // Placeholder
  },
};
