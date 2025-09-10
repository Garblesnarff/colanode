// packages/core/src/registry/nodes/page.ts
/**
 * @file Defines the schema, attributes type, and model for Page Nodes.
 * Page Nodes represent rich-text documents or wiki-style pages within the application.
 * Their content is typically structured using a block-based editor.
 */
import { z } from 'zod/v4';

import { extractNodeRole } from '@colanode/core/lib/nodes';
import { hasNodeRole } from '@colanode/core/lib/permissions';
import { extractDocumentText } from '@colanode/core/lib/texts';
import { extractBlocksMentions } from '@colanode/core/lib/mentions';
import { richTextContentSchema, RichTextContent } from '@colanode/core/registry/documents/rich-text';
import { NodeModel, NodeText } from '@colanode/core/registry/nodes/core';
import { Mention, NodeAttributes } from '@colanode/core/types';


/**
 * Zod schema for validating the attributes specific to a Page Node.
 *
 * @property type - Discriminator literal, must be "page".
 * @property name - The title or name of the page.
 * @property avatar - Optional URL or identifier for an icon or cover image for the page.
 * @property parentId - The ID of the parent node (e.g., a Folder, Space).
 */
export const pageAttributesSchema = z.object({
  /** Must be the literal string "page". */
  type: z.literal('page'),
  /** The title or name of the page. */
  name: z.string().min(1, { message: 'Page name cannot be empty' }),
  /** Optional URL or identifier for an icon or cover image. */
  avatar: z.string().nullable().optional(),
  /** Identifier of the parent node under which this page exists. */
  parentId: z.string(),
});

/**
 * TypeScript type inferred from `pageAttributesSchema`.
 * Represents the specific attributes of a Page Node.
 */
export type PageAttributes = z.infer<typeof pageAttributesSchema>;

/**
 * Implementation of the {@link NodeModel} interface for Page Nodes.
 * This object defines how Page Nodes behave, their schema for attributes and document content,
 * permissions, and data extraction logic.
 */
export const pageModel: NodeModel = {
  type: 'page',
  attributesSchema: pageAttributesSchema,
  /**
   * The schema for the rich text document content of the page.
   * Uses `richTextContentSchema` which defines a structure of blocks.
   */
  documentSchema: richTextContentSchema,

  /**
   * Determines if a user can create a Page.
   * Requires 'editor' role or higher on the parent node.
   */
  canCreate: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the attributes of a Page (e.g., title, avatar).
   * Requires 'editor' role or higher on the page itself or its hierarchy.
   */
  canUpdateAttributes: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can update the document content of a Page.
   * Requires 'editor' role or higher on the page itself or its hierarchy.
   */
  canUpdateDocument: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'editor') : false;
  },

  /**
   * Determines if a user can delete a Page.
   * Requires 'admin' role or higher on the page or its hierarchy.
   */
  canDelete: (context) => {
    if (context.tree.length === 0) return false;
    const role = extractNodeRole(context.tree, context.user.id);
    return role ? hasNodeRole(role, 'admin') : false;
  },

  /**
   * Determines if a user can react to a Page (e.g., with emojis).
   * Currently defaults to `false`. This could be enabled if page-level reactions are desired.
   */
  canReact: () => {
    // Page-level reactions might be less common than reactions on specific content blocks or comments.
    // Defaulting to false, can be changed if direct page reactions are a feature.
    return false;
  },

  /**
   * Extracts textual content from Page attributes and its document content for search indexing.
   * The name of the page is extracted directly. Text from the document content (blocks)
   * needs to be handled by a function that processes `RichTextContent`.
   *
   * @param id - The ID of the page node.
   * @param attributes - The attributes of the page node.
   * @param document - The optional {@link RichTextContent} of the page.
   * @returns A {@link NodeText} object, or `null` if attributes are invalid.
   * @throws If `attributes.type` is not 'page'.
   */
  extractText: (id: string, attributes: NodeAttributes, document?: RichTextContent): NodeText | null => {
    if (attributes.type !== 'page') {
      throw new Error('Invalid node type passed to pageModel.extractText');
    }
    const parsedAttributes = pageAttributesSchema.safeParse(attributes);
     if (!parsedAttributes.success) {
        console.error("Invalid page attributes for text extraction:", parsedAttributes.error);
        return null;
    }

    let contentText: string | null = null;
    if (document) {
      // Document content itself is the RichTextContent
      contentText = extractDocumentText(id, document);
    }

    return {
      name: parsedAttributes.data.name,
      attributes: contentText, // Text from the document's blocks
    };
  },

  /**
   * Extracts mentions from the Page's document content.
   * Page attributes (name, avatar) are unlikely to contain mentions.
   *
   * @param id - The ID of the page node.
   * @param _attributes - The attributes of the page node (unused in this specific implementation).
   * @param document - The optional {@link RichTextContent} of the page.
   * @returns An array of {@link Mention} objects found in the page's document content.
   */
  extractMentions: (id: string, _attributes: NodeAttributes, document?: RichTextContent): Mention[] => {
    if (document && document.blocks) {
      return extractBlocksMentions(id, document.blocks);
    }
    return [];
  },
};
