// packages/core/src/registry/documents/rich-text.ts
/**
 * @file Defines the schema and type for rich text document content.
 * Rich text content is structured as a collection of Blocks, allowing for
 * complex document layouts with various content types (paragraphs, headings, lists, etc.).
 */
import { z } from 'zod/v4';

import { blockSchema, Block } from '@colanode/core/registry/block'; // Assuming Block type is also exported from block.ts

/**
 * Zod schema for validating the structure of rich text document content.
 * Rich text content consists of a type discriminator and a record of blocks.
 *
 * @property type - Discriminator literal, must be "rich_text".
 * @property blocks - A record (object) where keys are block IDs (strings) and
 *                    values are {@link Block} objects. This collection represents
 *                    all the blocks that make up the rich text document.
 *                    The hierarchy of blocks (parent-child relationships) is defined
 *                    within each Block's `parentId` property. The root block(s) would
 *                    typically have a `parentId` pointing to the node owning this document content.
 */
export const richTextContentSchema = z.object({
  /** Discriminator indicating the content type is rich text. */
  type: z.literal('rich_text'),
  /**
   * A record of all blocks constituting this rich text document.
   * Keys are block IDs, and values are the corresponding Block objects.
   */
  blocks: z.record(z.string(), blockSchema),
});

/**
 * TypeScript type inferred from `richTextContentSchema`.
 * Represents the structure of rich text content, primarily a collection of {@link Block} items.
 *
 * @example
 * const exampleContent: RichTextContent = {
 *   type: 'rich_text',
 *   blocks: {
 *     'blockId1': { id: 'blockId1', type: 'paragraph', parentId: 'nodeId', index: 'a0', content: [{ type: 'text', text: 'Hello ' }] },
 *     'blockId2': { id: 'blockId2', type: 'paragraph', parentId: 'nodeId', index: 'a1', content: [{ type: 'text', text: 'World!' }] },
 *   }
 * };
 */
export type RichTextContent = z.infer<typeof richTextContentSchema>;
