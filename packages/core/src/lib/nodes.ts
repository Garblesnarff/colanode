// packages/core/src/lib/nodes.ts
/**
 * @file Utility functions for working with Node entities.
 * This includes extracting common properties like collaborators, name, avatar, roles,
 * and generating fractional indexes for ordering nodes.
 */
import { generateKeyBetween } from 'fractional-indexing-jittered';

import { Node, NodeAttributes, NodeRole } from '@colanode/core'; // Assuming Node, NodeAttributes, NodeRole are correctly exported from core's index

/**
 * Extracts and aggregates collaborator roles from one or more NodeAttributes objects.
 * If multiple attribute objects are provided (e.g., from a node and its ancestors),
 * collaborator roles are merged. In case of conflicting roles for the same collaborator,
 * the role from the last processed attribute object in the array takes precedence.
 *
 * @param attributes A single `NodeAttributes` object or an array of them.
 * @returns A record mapping collaborator IDs (string) to their {@link NodeRole}.
 *          Returns an empty object if no collaborators are found.
 *
 * @example
 * const attrs1 = { collaborators: { "user1": NodeRole.Editor } };
 * extractNodeCollaborators(attrs1); // { "user1": NodeRole.Editor }
 *
 * const attrs2 = { collaborators: { "user1": NodeRole.Viewer, "user2": NodeRole.Admin } };
 * extractNodeCollaborators([attrs1, attrs2]); // { "user1": NodeRole.Viewer, "user2": NodeRole.Admin }
 */
export const extractNodeCollaborators = (
  attributes: NodeAttributes | NodeAttributes[]
): Record<string, NodeRole> => {
  const items = Array.isArray(attributes) ? attributes : [attributes];
  const collaborators: Record<string, NodeRole> = {};

  for (const item of items) {
    // Check if 'collaborators' property exists and is not null/undefined
    if (item && 'collaborators' in item && item.collaborators) {
      for (const [collaboratorId, role] of Object.entries(item.collaborators)) {
        // Assuming role is already of type NodeRole or can be safely cast.
        // Add type assertion for safety if item.collaborators value type is broader.
        collaborators[collaboratorId] = role as NodeRole;
      }
    }
  }

  return collaborators;
};

/**
 * Extracts the name from NodeAttributes.
 *
 * @param attributes The `NodeAttributes` object.
 * @returns The node's name as a string if present and truthy, otherwise `null`.
 */
export const extractNodeName = (attributes: NodeAttributes): string | null => {
  if (attributes && 'name' in attributes && attributes.name) {
    return attributes.name as string; // Assuming name is string if it exists
  }
  return null;
};

/**
 * Extracts the avatar URL or identifier from NodeAttributes.
 *
 * @param attributes The `NodeAttributes` object.
 * @returns The node's avatar string (URL or ID) if present and truthy, otherwise `null`.
 */
export const extractNodeAvatar = (
  attributes: NodeAttributes
): string | null => {
  if (attributes && 'avatar' in attributes && attributes.avatar) {
    return attributes.avatar as string; // Assuming avatar is string if it exists
  }
  return null;
};

/**
 * Extracts the effective role of a specific collaborator from a node or an array of nodes (e.g., a node path/tree).
 * If an array of nodes is provided, it iterates through them. The role found in the "closest" node
 * (last one in the array that defines a role for the collaborator) is returned.
 * This can be used to determine permissions based on a hierarchy.
 *
 * @param tree A single {@link Node} object or an array of `Node` objects (e.g., representing a path from root to a node).
 * @param collaboratorId The ID of the collaborator whose role is to be extracted.
 * @returns The {@link NodeRole} of the collaborator if found, otherwise `null`.
 */
export const extractNodeRole = (
  tree: Node | Node[],
  collaboratorId: string
): NodeRole | null => {
  const nodes = Array.isArray(tree) ? tree : [tree];
  let role: NodeRole | null = null; // Initialize with null, indicating no role found yet.

  // Iterate through nodes. If it's a path, later nodes might override roles from earlier ones.
  // Or, if it's a flat list, it finds any defined role.
  // The current logic implies the role from the *last* node in the array with the collaborator takes precedence.
  for (const node of nodes) {
    if (node && node.attributes) { // Ensure node and its attributes are valid
      const nodeCollaborators = extractNodeCollaborators(node.attributes);
      const collaboratorRole = nodeCollaborators[collaboratorId];
      if (collaboratorRole) { // If a role is defined for this collaborator in this node
        role = collaboratorRole;
      }
    }
  }

  return role;
};

/**
 * Generates a fractional index string for ordering a node between two existing nodes.
 * Uses the `generateKeyBetween` function from 'fractional-indexing-jittered'.
 * Fractional indexing allows for inserting items between any two items without re-indexing others.
 *
 * @param previous The fractional index of the preceding node. Can be `null` or `undefined` if inserting at the beginning.
 * @param next The fractional index of the succeeding node. Can be `null` or `undefined` if inserting at the end.
 * @returns A new fractional index string that sorts between `previous` and `next`.
 *
 * @example
 * generateNodeIndex(null, "c"); // "b" (example, actual value depends on implementation)
 * generateNodeIndex("a", "c");  // "b"
 * generateNodeIndex("a", null);  // "b"
 * generateNodeIndex("a", "b");  // "am" (midpoint)
 */
export const generateNodeIndex = (
  previous?: string | null,
  next?: string | null
): string => {
  // `generateKeyBetween` handles null for boundaries correctly.
  // Ensure undefined is explicitly converted to null if the library expects null for open boundaries.
  const lower = previous === undefined ? null : previous;
  const upper = next === undefined ? null : next;

  return generateKeyBetween(lower, upper);
};
