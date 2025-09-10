// packages/core/src/registry/nodes/record.ts
/**
 * @file Defines the schema, attributes type, and model for Record Nodes.
 * Record Nodes represent individual entries (rows) within a Database Node.
 * Each record contains values for the fields defined in its parent database.
 * Records can also have their own associated rich-text document content (e.g., for detailed descriptions).
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { extractDocumentText } from '@colanode/core/lib/texts';
import { extractBlocksMentions } from '@colanode/core/lib/mentions';
import { richTextContentSchema, RichTextContent } from '@colanode/core/registry/documents/rich-text';
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { fieldValueSchema, FieldValue } from '@colanode/core/registry/nodes/field-value';
import { Mention, NodeAttributes } from '@colanode/core/types';

/**
 * Zod schema for validating the attributes specific to a Record Node.
 *
 * @property type - Discriminator literal, must be "record".
 * @property parentId - The ID of the parent node, which is typically the Database Node this record belongs to.
 *                      However, the schema calls it `parentId`, so adhering to that. It should logically point to a Database.
 * @property databaseId - The ID of the Database Node this record belongs to. This is crucial for context.
 * @property name - The primary display name or title of the record (often derived from a primary field).
 * @property avatar - Optional URL or identifier for an icon or image representing the record.
 * @property fields - A record mapping field IDs (from the parent database's schema) to their {@link FieldValue} objects.
 */
export const recordAttributesSchema = z.object({
  /** Must be the literal string "record". */
  type: z.literal('record'),
  /**
   * Identifier of the parent DatabaseNode.
   * Note: While named `parentId`, it logically refers to the database containing this record.
   */
  parentId: z.string(), // This should be the ID of the DatabaseNode
  /** Identifier of the DatabaseNode this record is an entry of. */
  databaseId: z.string(),
  /** The primary name or title of the record. */
  name: z.string().min(1, { message: "Record name cannot be empty" }), // Or can be derived from a primary field.
  /** Optional URL or identifier for an icon or image associated with the record. */
  avatar: z.string().nullable().optional(),
  /**
   * A record storing the actual data for this record.
   * Keys are field IDs (defined in the parent DatabaseNode's `fields` attribute),
   * and values are `FieldValue` objects holding the typed data for each field.
   */
  fields: z.record(z.string(), fieldValueSchema),
});

/**
 * TypeScript type inferred from `recordAttributesSchema`.
 * Represents the specific attributes of a Record Node.
 */
export type RecordAttributes = z.infer<typeof recordAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Record Nodes.
 */
export const recordModel: NodeModel = {
  type: 'record',
  attributesSchema: recordAttributesSchema,
  /** Schema for the optional rich-text document content associated with a record (e.g., a detailed description area). */
  documentSchema: richTextContentSchema,

  /**
   * Determines if a user can create a Record within a Database.
   * Requires 'collaborator' role or higher on the parent Database Node.
   */
  canCreate: (context) => {
    // context.tree should include the parent DatabaseNode
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'collaborator') : false;
  },

  /**
   * Determines if a user can update the attributes (field values) of a Record.
   * Allowed if the user created the record OR has 'editor' role or higher on the parent Database.
   */
  canUpdateAttributes: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    if (!role && context.node.createdBy !== context.user.id) return false; // Must have a role or be creator

    if (context.node.createdBy === context.user.id) return true;
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the document content of a Record.
   * Allowed if the user created the record OR has 'editor' role or higher on the parent Database.
   */
  canUpdateDocument: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
     if (!role && context.node.createdBy !== context.user.id) return false;

    if (context.node.createdBy === context.user.id) return true;
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can delete a Record.
   * Allowed if the user created the record OR has 'admin' role or higher on the parent Database.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    if (!role && context.node.createdBy !== context.user.id) return false;

    if (context.node.createdBy === context.user.id) return true;
    return role ? hasNodeRole(role, 'admin') : false; // Deleting records often requires higher privilege
  },

  /**
   * Determines if a user can react to a Record.
   * Currently defaults to `false`. Could be enabled (e.g., 'viewer' role on parent DB).
   */
  canReact: () => {
    // Reactions on individual records could be a feature.
    // For now, defaulting to false. If enabled, might depend on parent DB permissions.
    return false;
  },

  /**
   * Extracts textual content from Record attributes and its document for search indexing.
   * Includes the record's name and text from its string-based fields and document content.
   *
   * @param id - The ID of the record node.
   * @param attributes - The attributes of the record node.
   * @param document - The optional {@link RichTextContent} of the record.
   * @returns A {@link NodeText} object, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'record'.
   */
  extractText: (id: string, attributes: NodeAttributes, document?: RichTextContent): NodeText | null => {
    if (attributes.type !== 'record') {
      throw new Error('Invalid node type passed to recordModel.extractText');
    }
    const parsedAttributes = recordAttributesSchema.safeParse(attributes);
     if (!parsedAttributes.success) {
        console.error("Invalid record attributes for text extraction:", parsedAttributes.error);
        return null;
    }
    const recordAttrs = parsedAttributes.data;

    const fieldTexts: string[] = [];
    for (const fieldValue of Object.values(recordAttrs.fields)) {
      // Extract text from simple string fields or collaborative text fields
      if (fieldValue.type === 'string' || fieldValue.type === 'text') {
        if (typeof fieldValue.value === 'string') {
           fieldTexts.push(fieldValue.value);
        }
      }
      // Could extend to extract text from other field types if applicable (e.g., options from select)
    }

    let documentContentText: string | null = null;
    if (document) {
      documentContentText = extractDocumentText(id, document);
    }

    const combinedAttributesText = [
        ...fieldTexts,
        documentContentText
    ].filter(text => text != null && text.trim() !== "").join('\n');

    return {
      name: recordAttrs.name,
      attributes: combinedAttributesText.trim() || null,
    };
  },

  /**
   * Extracts mentions from the Record's document content.
   * Field values themselves are less likely to contain structured mentions unless they are rich text.
   *
   * @param id - The ID of the record node.
   * @param _attributes - The attributes of the record node (unused directly for mention extraction from document).
   * @param document - The optional {@link RichTextContent} of the record.
   * @returns An array of {@link Mention} objects found.
   */
  extractMentions: (id: string, _attributes: NodeAttributes, document?: RichTextContent): Mention[] => {
    let mentions: Mention[] = [];
    if (document && document.blocks) {
      mentions = mentions.concat(extractBlocksMentions(id, document.blocks));
    }
    // TODO: Consider if field values (especially 'text' type) should also be scanned for mentions.
    // This would require knowing which fields are of type 'text' and parsing their content if it's block-based.
    return mentions;
  },
};
