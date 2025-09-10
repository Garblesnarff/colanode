// packages/core/src/registry/nodes/database-view.ts
/**
 * @file Defines schemas, types, and the model for Database View Nodes.
 * Database View Nodes represent customized views of a Database Node,
 * allowing for different layouts (table, board, calendar), filtering, sorting,
 * and field visibility settings.
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { Mention, NodeAttributes } from '@colanode/core/types';

/**
 * Zod schema for attributes of a single field's display settings within a database view.
 *
 * @property id - The ID of the original field in the database.
 * @property width - Optional width of the field column in the view (e.g., in pixels).
 * @property display - Optional boolean indicating if the field is visible in this view.
 * @property index - Optional fractional index string for ordering fields in this view.
 */
export const databaseViewFieldAttributesSchema = z.object({
  /** The ID of the database field this view setting corresponds to. */
  id: z.string(),
  /** Optional width for displaying this field in the view. */
  width: z.number().nullable().optional(),
  /** Whether this field is displayed in the view. True if visible, false if hidden. */
  display: z.boolean().nullable().optional(),
  /** Optional fractional index for ordering this field within the view's display. */
  index: z.string().nullable().optional(),
});

/** TypeScript type for attributes of a field within a database view. */
export type DatabaseViewFieldAttributes = z.infer<
  typeof databaseViewFieldAttributesSchema
>;

/**
 * Zod schema for a single field-based filter condition within a database view.
 *
 * @property id - Unique ID for this filter condition.
 * @property fieldId - The ID of the database field this filter applies to.
 * @property type - Discriminator, must be "field".
 * @property operator - The filter operator (e.g., "equals", "contains", "greaterThan"). String type allows flexibility.
 * @property value - The value to filter against. Can be string, number, boolean, or an array of strings (e.g., for multi-select). Optional.
 */
export const databaseViewFieldFilterAttributesSchema = z.object({
  /** Unique identifier for this filter condition. */
  id: z.string(),
  /** ID of the database field to which this filter applies. */
  fieldId: z.string(),
  /** Discriminator indicating this is a field-level filter. */
  type: z.literal('field'),
  /**
   * The filter operator (e.g., "is", "isNot", "contains", "startsWith", "gt", "lt").
   * Specific operators depend on the field type.
   */
  operator: z.string(),
  /** The value used for comparison by the filter. Type varies based on field and operator. */
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .nullable()
    .optional(),
});

/** TypeScript type for a field-based filter condition in a database view. */
export type DatabaseViewFieldFilterAttributes = z.infer<
  typeof databaseViewFieldFilterAttributesSchema
>;

/**
 * Zod schema for a group of filter conditions within a database view.
 * Allows for creating complex AND/OR logic between multiple field filters.
 *
 * @property id - Unique ID for this filter group.
 * @property type - Discriminator, must be "group".
 * @property operator - Logical operator for combining filters within this group ("and" or "or").
 * @property filters - An array of {@link databaseViewFieldFilterAttributesSchema} that belong to this group.
 */
export const databaseViewGroupFilterAttributesSchema = z.object({
  /** Unique identifier for this filter group. */
  id: z.string(),
  /** Discriminator indicating this is a group of filters. */
  type: z.literal('group'),
  /** Logical operator to combine filters in this group ('and' or 'or'). */
  operator: z.enum(['and', 'or']),
  /** Array of field-level filter conditions within this group. */
  filters: z.array(databaseViewFieldFilterAttributesSchema), // Note: This implies a group can only contain field filters, not nested groups directly.
                                                          // For nested groups, `databaseViewFilterAttributesSchema` would need to be self-referential.
});

/** TypeScript type for a group of filter conditions in a database view. */
export type DatabaseViewGroupFilterAttributes = z.infer<
  typeof databaseViewGroupFilterAttributesSchema
>;

/**
 * Zod schema for a sort condition within a database view.
 *
 * @property id - Unique ID for this sort condition.
 * @property fieldId - The ID of the database field to sort by.
 * @property direction - Sort direction: "asc" (ascending) or "desc" (descending).
 */
export const databaseViewSortAttributesSchema = z.object({
  /** Unique identifier for this sort condition. */
  id: z.string(),
  /** ID of the database field to sort by. */
  fieldId: z.string(),
  /** Sort direction: 'asc' for ascending, 'desc' for descending. */
  direction: z.enum(['asc', 'desc']),
});

/** TypeScript type for a sort condition in a database view. */
export type DatabaseViewSortAttributes = z.infer<
  typeof databaseViewSortAttributesSchema
>;

/**
 * Zod schema for a filter attribute in a database view.
 * This is a discriminated union allowing either a single field filter or a group of filters.
 * This currently does not support recursively nested filter groups directly in its definition.
 * For true nesting, `databaseViewGroupFilterAttributesSchema` would need to allow its `filters`
 * array to contain `databaseViewFilterAttributesSchema` itself.
 */
export const databaseViewFilterAttributesSchema = z.discriminatedUnion('type', [
  databaseViewFieldFilterAttributesSchema,
  databaseViewGroupFilterAttributesSchema,
]);

/** TypeScript type for a filter attribute (either field or group) in a database view. */
export type DatabaseViewFilterAttributes = z.infer<
  typeof databaseViewFilterAttributesSchema
>;

/**
 * Possible layout types for a database view.
 * - `table`: Standard tabular layout.
 * - `board`: Kanban-style board layout (requires a group-by field).
 * - `calendar`: Calendar layout (requires a date field).
 */
export type DatabaseViewLayout = 'table' | 'board' | 'calendar';

/**
 * Zod schema for validating the attributes specific to a Database View Node.
 *
 * @property type - Discriminator literal, must be "database_view".
 * @property parentId - The ID of the Database Node this view belongs to.
 * @property layout - The layout type of the view (e.g., "table", "board", "calendar").
 * @property name - The display name of the database view.
 * @property avatar - Optional URL or identifier for the view's icon.
 * @property index - Fractional index string for ordering this view among other views of the same database.
 * @property fields - Optional record of field display settings for this view. Keys are field IDs.
 * @property filters - Optional record of filter conditions applied to this view. Keys are filter IDs.
 * @property sorts - Optional record of sort conditions applied to this view. Keys are sort IDs.
 * @property groupBy - Optional ID of the field used for grouping in layouts like "board".
 * @property nameWidth - Optional width for the primary "name" or title column in table views.
 */
export const databaseViewAttributesSchema = z.object({
  /** Must be the literal string "database_view". */
  type: z.literal('database_view'),
  /** ID of the parent Database Node to which this view applies. */
  parentId: z.string(), // This should be the ID of a DatabaseNode
  /** The layout type for this view. */
  layout: z.enum(['table', 'board', 'calendar']),
  /** The name of this database view (e.g., "All Tasks Table", "Tasks by Status Board"). */
  name: z.string().min(1, { message: 'View name cannot be empty' }),
  /** Optional icon or avatar for this view. */
  avatar: z.string().nullable().optional(),
  /** Fractional index for ordering this view among sibling views of the same database. */
  index: z.string(),
  /**
   * Configuration for how database fields are displayed in this view.
   * Keys are field IDs from the parent database.
   */
  fields: z
    .record(z.string(), databaseViewFieldAttributesSchema)
    .optional()
    .nullable(),
  /**
   * Filters applied to the data in this view.
   * Keys are unique filter IDs (can be field filter or group filter IDs).
   */
  filters: z
    .record(z.string(), databaseViewFilterAttributesSchema) // Allows for complex filter structures
    .optional()
    .nullable(),
  /**
   * Sorting rules applied to the data in this view.
   * Keys are unique sort IDs.
   */
  sorts: z
    .record(z.string(), databaseViewSortAttributesSchema)
    .optional()
    .nullable(),
  /** ID of the field used for grouping records (e.g., in a Kanban board layout). */
  groupBy: z.string().nullable().optional(),
  /** Optional width for the primary "name" column in table views. */
  nameWidth: z.number().nullable().optional(),
});

/**
 * TypeScript type inferred from `databaseViewAttributesSchema`.
 * Represents the specific attributes of a Database View Node.
 */
export type DatabaseViewAttributes = z.infer<
  typeof databaseViewAttributesSchema
>;

/**
 * Implementation of the {@link NodeModel} interface for Database View Nodes.
 */
export const databaseViewModel: NodeModel = {
  type: 'database_view',
  attributesSchema: databaseViewAttributesSchema,
  documentSchema: undefined, // Database views themselves don't have document content.

  /**
   * Determines if a user can create a Database View.
   * Requires 'editor' role or higher on the parent Database Node.
   */
  canCreate: (context) => {
    // context.tree should include the parent DatabaseNode
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the attributes of a Database View.
   * Requires 'editor' role or higher on the parent Database Node or the view itself.
   */
  canUpdateAttributes: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /** Database Views do not have their own document content. Always `false`. */
  canUpdateDocument: () => {
    return false;
  },

  /**
   * Determines if a user can delete a Database View.
   * Requires 'editor' role or higher on the parent Database Node or the view itself.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /** Reactions are not typically applied to Database View nodes. Always `false`. */
  canReact: () => {
    return false;
  },

  /**
   * Extracts textual content from Database View attributes for search indexing.
   * Primarily uses the view's name.
   *
   * @param _id - The ID of the database view node (unused).
   * @param attributes - The attributes of the database view node.
   * @returns A {@link NodeText} object containing the name, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'database_view'.
   */
  extractText: (_id: string, attributes: NodeAttributes): NodeText | null => {
    if (attributes.type !== 'database_view') {
      throw new Error('Invalid node type passed to databaseViewModel.extractText');
    }
    const parsedAttributes = databaseViewAttributesSchema.safeParse(attributes);
    if (!parsedAttributes.success) {
        console.error("Invalid database view attributes for text extraction:", parsedAttributes.error);
        return null;
    }
    return {
      name: parsedAttributes.data.name,
      attributes: null, // Other view attributes (filters, sorts) are not typically indexed as plain text.
    };
  },

  /**
   * Extracts mentions from Database View attributes.
   * Database View configurations themselves do not typically contain mentions.
   *
   * @returns An empty array.
   */
  extractMentions: (): Mention[] => {
    return [];
  },
};
