// packages/core/src/lib/permissions.ts
/**
 * @file Utility functions and types related to user permissions and roles
 * within workspaces and nodes.
 */
import { NodeRole, WorkspaceRole } from '@colanode/core/types'; // Assuming these types are in @colanode/core/types

/**
 * Represents the input structure for defining a user's role within a workspace context,
 * often used when adding or updating user permissions.
 * @deprecated This type seems specific and might be better placed in a more context-specific module
 *             (e.g., related to user management or workspace settings) if not broadly used by core utilities.
 *             For now, documenting its existence.
 */
export type UserInput = {
  /** The unique identifier of the user. */
  userId: string;
  /** The role assigned to the user within the workspace. */
  role: WorkspaceRole;
};

/**
 * Checks if a user with a `currentRole` has at least the privileges of a `targetRole`
 * within a workspace. This assumes a hierarchical role structure where 'owner' is highest,
 * followed by 'admin', 'collaborator', and 'guest' is lowest.
 *
 * - An 'owner' has 'owner', 'admin', 'collaborator', and 'guest' privileges.
 * - An 'admin' has 'admin', 'collaborator', and 'guest' privileges.
 * - A 'collaborator' has 'collaborator' and 'guest' privileges.
 * - A 'guest' only has 'guest' privileges.
 *
 * @param currentRole The current {@link WorkspaceRole} of the user.
 * @param targetRole The {@link WorkspaceRole} being checked against (the minimum required role).
 * @returns `true` if `currentRole` meets or exceeds `targetRole`, `false` otherwise.
 *
 * @example
 * hasWorkspaceRole(WorkspaceRole.Admin, WorkspaceRole.Collaborator); // true
 * hasWorkspaceRole(WorkspaceRole.Collaborator, WorkspaceRole.Admin); // false
 * hasWorkspaceRole(WorkspaceRole.Owner, WorkspaceRole.Guest); // true
 */
export const hasWorkspaceRole = (
  currentRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean => {
  // Role hierarchy: Owner > Admin > Collaborator > Guest
  const roleHierarchy: WorkspaceRole[] = ['guest', 'collaborator', 'admin', 'owner'];

  const currentIndex = roleHierarchy.indexOf(currentRole);
  const targetIndex = roleHierarchy.indexOf(targetRole);

  // If either role is not found in the hierarchy (e.g., invalid role string), deny permission.
  if (currentIndex === -1 || targetIndex === -1) {
    return false;
  }

  return currentIndex >= targetIndex;
};

/**
 * Checks if a user with a `currentRole` has at least the privileges of a `targetRole`
 * for a specific node. This assumes a hierarchical role structure for nodes, typically:
 * 'admin' (highest), 'editor', 'collaborator', 'viewer' (lowest).
 *
 * - An 'admin' has 'admin', 'editor', 'collaborator', and 'viewer' privileges on the node.
 * - An 'editor' has 'editor', 'collaborator', and 'viewer' privileges.
 * - A 'collaborator' has 'collaborator' and 'viewer' privileges. (Note: definition of 'collaborator' might vary, here it implies can comment or specific interactions)
 * - A 'viewer' only has 'viewer' privileges.
 *
 * @param currentRole The current {@link NodeRole} of the user for the node.
 * @param targetRole The {@link NodeRole} being checked against (the minimum required role for an action).
 * @returns `true` if `currentRole` meets or exceeds `targetRole`, `false` otherwise.
 *
 * @example
 * hasNodeRole(NodeRole.Editor, NodeRole.Viewer); // true
 * hasNodeRole(NodeRole.Viewer, NodeRole.Editor); // false
 * hasNodeRole(NodeRole.Admin, NodeRole.Collaborator); // true
 */
export const hasNodeRole = (currentRole: NodeRole, targetRole: NodeRole): boolean => {
  // Role hierarchy: Admin > Editor > Collaborator > Viewer
  // Note: The exact meaning of 'collaborator' can vary. Here it's placed between editor and viewer.
  const roleHierarchy: NodeRole[] = ['viewer', 'collaborator', 'editor', 'admin'];

  const currentIndex = roleHierarchy.indexOf(currentRole);
  const targetIndex = roleHierarchy.indexOf(targetRole);

  // If either role is not found in the hierarchy (e.g., invalid role string), deny permission.
  if (currentIndex === -1 || targetIndex === -1) {
    return false;
  }

  return currentIndex >= targetIndex;
};
