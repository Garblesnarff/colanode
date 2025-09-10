// packages/core/src/registry/nodes/database.ts
/**
 * @file Defines the schema, attributes type, and model for Database Nodes.
 * Database Nodes represent structured data collections, similar to tables or spreadsheets,
 * containing fields (columns) and records (rows).
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { fieldAttributesSchema, FieldAttributes } from '@colanode/core/registry/nodes/field'; // Assuming FieldAttributes is also exported
import { Mention, NodeAttributes } from '@colanode/core/types'; // Assuming NodeAttributes is a general type from core/types or registry/nodes/index

/**
 * Zod schema for validating the attributes specific to a Database Node.
 *
 * @property type - Discriminator literal, must be "database".
 * @property name - The display name of the database.
 * @property avatar - Optional URL or identifier for the database's avatar/icon.
 * @property parentId - The ID of the parent node (e.g., a Space).
 * @property fields - A record mapping field IDs to their {@link FieldAttributes}. Defines the schema of the database.
 */
export const databaseAttributesSchema = z.object({
  /** Must be the literal string "database". */
  type: z.literal('database'),
  /** The name of the database (e.g., "Tasks", "Project Roadmap"). */
  name: z.string().min(1, { message: 'Database name cannot be empty' }),
  /** Optional URL or identifier for an icon or avatar for the database. */
  avatar: z.string().nullable().optional(),
  /** Identifier of the parent node under which this database exists. */
  parentId: z.string(), // Should be a valid Node ID
  /**
   * A record defining the fields (columns) of this database.
   * Keys are unique field IDs, values are `fieldAttributesSchema` objects.
   */
  fields: z.record(z.string(), fieldAttributesSchema),
});

/**
 * TypeScript type inferred from `databaseAttributesSchema`.
 * Represents the specific attributes of a Database Node, including its field definitions.
 */
export type DatabaseAttributes = z.infer<typeof databaseAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Database Nodes.
 * This object defines how Database Nodes behave, their schema, permissions, and data extraction.
 */
export const databaseModel: NodeModel = {
  type: 'database',
  attributesSchema: databaseAttributesSchema,
  documentSchema: undefined, // Databases manage structured data (records), not a single document body.

  /**
   * Determines if a user can create a Database.
   * Requires 'editor' role or higher on the parent node.
   */
  canCreate: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the attributes of a Database (e.g., name, fields).
   * Requires 'editor' role or higher on the database itself or its hierarchy.
   */
  canUpdateAttributes: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Databases do not have a singular "document" to update in this context.
   * Changes to data within the database (records, field values) are handled differently.
   * Always returns `false`.
   */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Determines if a user can delete a Database.
   * Requires 'editor' role or higher (could be stricter, e.g., 'admin', depending on policy)
   * on the database or its hierarchy. For this model, 'editor' is used.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    // Consider if 'admin' role should be required for deleting a whole database.
    // Current logic uses 'editor', which might be too permissive for deletion.
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Reactions are typically not applied directly to a database node itself.
   * They might apply to records within the database. Defaults to `false`.
   */
  canReact: () => {
    return false;
  },

  /**
   * Extracts textual content from Database attributes for search indexing.
   * This includes the database's name and potentially names of its fields.
   *
   * @param _id - The ID of the database node (unused in this implementation).
   * @param attributes - The attributes of the database node.
   * @returns A {@link NodeText} object containing the name and concatenated field names.
   * @throws If `attributes.type` is not 'database'.
   */
  extractText: (_id: string, attributes: NodeAttributes): NodeText | null => {
    if (attributes.type !== 'database') {
      throw new Error('Invalid node type passed to databaseModel.extractText');
    }
    const parsedAttributes = databaseAttributesSchema.safeParse(attributes);
    if (!parsedAttributes.success) {
      console.error("Invalid database attributes for text extraction:", parsedAttributes.error);
      return null;
    }
    const dbAttrs = parsedAttributes.data;
    const fieldNames = Object.values(dbAttrs.fields)
      .map((field: FieldAttributes) => field.name)
      .join(' ');

    return {
      name: dbAttrs.name,
      attributes: fieldNames.trim() || null, // Return field names as part of attributes text
    };
  },

  /**
   * Extracts mentions from Database attributes.
   * Databases themselves (name, field names) typically do not contain mentions.
   * Mentions would be found within the data of individual records.
   *
   * @returns An empty array.
   */
  extractMentions: (): Mention[] => {
    return [];
  },
};
