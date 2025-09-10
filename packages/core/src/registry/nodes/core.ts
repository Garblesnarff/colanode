// packages/core/src/registry/nodes/core.ts
/**
 * @file Defines core types, enums, and interfaces related to Node entities.
 * This includes role definitions, context types for permission checks,
 * and the fundamental `NodeModel` interface that all specific node type
 * definitions must implement.
 */
import { z } from 'zod/v4';

import { Node, NodeAttributes } from '@colanode/core/registry/nodes'; // Assuming these are from the index.ts in the same directory
import { Mention } from '@colanode/core/types/mentions';
import { WorkspaceRole } from '@colanode/core/types/workspaces';

/**
 * Defines the possible roles a user can have with respect to a specific Node.
 * These roles typically determine the user's permissions for interacting with the node.
 * - `admin`: Full control over the node, including settings and permissions.
 * - `editor`: Can modify the node's content and attributes.
 * - `collaborator`: Can contribute in specific ways (e.g., comment, suggest, specific interactions), but not broad editing.
 * - `viewer`: Can only view the node and its content.
 */
export type NodeRole = 'admin' | 'editor' | 'collaborator' | 'viewer';

/**
 * Zod enum schema for {@link NodeRole}.
 * Used for validating node role strings.
 */
export const nodeRoleEnum = z.enum([
  'admin',
  'editor',
  'collaborator',
  'viewer',
]);

/**
 * Represents user information relevant for node mutation operations (create, update, delete).
 * This context is used in permission checks.
 *
 * @property id - The user's unique identifier (typically User ID, not Account ID directly for mutations if they differ).
 * @property role - The user's overall {@link WorkspaceRole} in the current workspace.
 * @property workspaceId - The ID of the workspace where the mutation is occurring.
 * @property accountId - The user's account identifier.
 */
export interface NodeMutationUser {
  /** User's unique identifier. */
  id: string;
  /** User's role within the workspace. */
  role: WorkspaceRole;
  /** ID of the current workspace. */
  workspaceId: string;
  /** User's account identifier. */
  accountId: string;
}

/**
 * Context object provided to `canCreate` permission check functions for nodes.
 *
 * @property user - Information about the user attempting the creation.
 * @property tree - An array of {@link Node} objects representing the parent hierarchy (path from root to the intended parent).
 * @property attributes - The {@link NodeAttributes} for the node to be created.
 */
export type CanCreateNodeContext = {
  /** User attempting to create the node. */
  user: NodeMutationUser;
  /** Parent hierarchy for the new node. */
  tree: Node[];
  /** Attributes of the node to be created. */
  attributes: NodeAttributes;
};

/**
 * Context object provided to `canUpdateAttributes` permission check functions for nodes.
 *
 * @property user - Information about the user attempting the update.
 * @property tree - An array of {@link Node} objects representing the node's hierarchy.
 * @property node - The {@link Node} object whose attributes are being updated.
 * @property attributes - The new {@link NodeAttributes} to be applied.
 */
export type CanUpdateAttributesContext = {
  /** User attempting to update attributes. */
  user: NodeMutationUser;
  /** Hierarchy of the node being updated. */
  tree: Node[];
  /** The node whose attributes are to be updated. */
  node: Node;
  /** The new attributes to be applied. */
  attributes: NodeAttributes;
};

/**
 * Context object provided to `canUpdateDocument` permission check functions for nodes
 * that have associated document content (e.g., Pages).
 *
 * @property user - Information about the user attempting the document update.
 * @property tree - An array of {@link Node} objects representing the node's hierarchy.
 * @property node - The {@link Node} object whose document content is being updated.
 */
export type CanUpdateDocumentContext = {
  /** User attempting to update document content. */
  user: NodeMutationUser;
  /** Hierarchy of the node whose document is being updated. */
  tree: Node[];
  /** The node whose document content is to be updated. */
  node: Node;
};

/**
 * Context object provided to `canDelete` permission check functions for nodes.
 *
 * @property user - Information about the user attempting the deletion.
 * @property tree - An array of {@link Node} objects representing the node's hierarchy.
 * @property node - The {@link Node} object to be deleted.
 */
export type CanDeleteNodeContext = {
  /** User attempting to delete the node. */
  user: NodeMutationUser;
  /** Hierarchy of the node to be deleted. */
  tree: Node[];
  /** The node to be deleted. */
  node: Node;
};

/**
 * Context object provided to `canReact` permission check functions for nodes
 * (e.g., adding an emoji reaction).
 *
 * @property user - Information about the user attempting to react.
 * @property tree - An array of {@link Node} objects representing the node's hierarchy.
 * @property node - The {@link Node} object to which the reaction is being applied.
 */
export interface CanReactNodeContext {
  /** User attempting to react to the node. */
  user: NodeMutationUser;
  /** Hierarchy of the node being reacted to. */
  tree: Node[];
  /** The node to which the reaction is targeted. */
  node: Node;
}

/**
 * Represents extracted textual content from a node, typically for search indexing or display.
 *
 * @property name - The primary name or title of the node. Can be null or undefined.
 * @property attributes - Other textual content extracted from the node's attributes or document. Can be null or undefined.
 */
export type NodeText = {
  /** Primary name/title of the node. */
  name: string | null | undefined;
  /** Other textual content from the node's attributes or document. */
  attributes: string | null | undefined;
};

/**
 * Defines the interface for a Node Model. Each specific node type (e.g., Page, Folder)
 * must provide an implementation of this interface. This model encapsulates:
 * - The node's type string.
 * - Zod schemas for its attributes and optional document content.
 * - Permission check functions for various operations (create, update, delete, react).
 * - Functions to extract text and mentions for search indexing or other processing.
 */
export interface NodeModel {
  /** The unique string identifier for this node type (e.g., "page", "folder"). */
  type: string;
  /** Zod schema for validating the node's specific attributes ({@link NodeAttributes}). */
  attributesSchema: z.ZodType;
  /** Optional Zod schema for validating the node's document content (e.g., for a PageNode). */
  documentSchema?: z.ZodType;

  /**
   * Determines if a user can create a node of this type with the given context.
   * @param context - The {@link CanCreateNodeContext}.
   * @returns `true` if creation is allowed, `false` otherwise.
   */
  canCreate: (context: CanCreateNodeContext) => boolean;

  /**
   * Determines if a user can update the attributes of a node of this type.
   * @param context - The {@link CanUpdateAttributesContext}.
   * @returns `true` if attribute update is allowed, `false` otherwise.
   */
  canUpdateAttributes: (context: CanUpdateAttributesContext) => boolean;

  /**
   * Determines if a user can update the document content of a node of this type.
   * Applicable only to nodes that have document content (e.g., PageNode).
   * @param context - The {@link CanUpdateDocumentContext}.
   * @returns `true` if document update is allowed, `false` otherwise.
   */
  canUpdateDocument: (context: CanUpdateDocumentContext) => boolean;

  /**
   * Determines if a user can delete a node of this type.
   * @param context - The {@link CanDeleteNodeContext}.
   * @returns `true` if deletion is allowed, `false` otherwise.
   */
  canDelete: (context: CanDeleteNodeContext) => boolean;

  /**
   * Determines if a user can react to a node of this type (e.g., add an emoji).
   * @param context - The {@link CanReactNodeContext}.
   * @returns `true` if reacting is allowed, `false` otherwise.
   */
  canReact: (context: CanReactNodeContext) => boolean;

  /**
   * Extracts relevant textual content from a node's attributes (and potentially document)
   * for purposes like search indexing.
   * @param id - The ID of the node.
   * @param attributes - The {@link NodeAttributes} of the node.
   * @returns A {@link NodeText} object containing extracted text, or `null` if no text is extracted.
   */
  extractText: (id: string, attributes: NodeAttributes) => NodeText | null;

  /**
   * Extracts all {@link Mention} objects from a node's attributes (and potentially document).
   * @param id - The ID of the node.
   * @param attributes - The {@link NodeAttributes} of the node.
   * @returns An array of {@link Mention} objects.
   */
  extractMentions: (id: string, attributes: NodeAttributes) => Mention[];
}
