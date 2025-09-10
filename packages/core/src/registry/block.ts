// packages/core/src/registry/block.ts
/**
 * @file Defines the schema and type for Block and BlockLeaf entities.
 * Blocks are fundamental units of content within documents (like pages).
 * A Block can contain multiple BlockLeaf elements, which represent inline content
 * such as text, mentions, or formatted text segments.
 */
import { z } from 'zod/v4';

import { ZodText } from '@colanode/core/registry/zod'; // Custom Zod type for text, potentially for CRDT integration

/**
 * Zod schema for a `BlockLeaf`.
 * A BlockLeaf represents an inline piece of content within a Block, such as a segment of text
 * or an inline element like a mention. It can have associated attributes and marks (formatting).
 *
 * @property type - The type of the leaf node (e.g., "text", "mention", "equation").
 * @property text - The textual content of the leaf. Uses `ZodText` which might imply CRDT-compatible text. Optional.
 * @property attrs - Optional additional attributes for the leaf, as a record of key-value pairs.
 * @property marks - Optional array of marks (inline formatting) applied to this leaf, like bold, italic, etc.
 *                   Each mark has a type and optional attributes.
 */
export const blockLeafSchema = z.object({
  /** The specific type of this leaf node (e.g., "text", "mention"). */
  type: z.string(),
  /** The actual text content of the leaf, if applicable. May be null or undefined. */
  text: new ZodText().nullable().optional(),
  /** Arbitrary attributes for this leaf, e.g., a mention's target ID. May be null or undefined. */
  attrs: z.record(z.string(), z.any()).nullable().optional(),
  /**
   * An array of marks (inline formatting) applied to this leaf.
   * Examples: bold, italic, link. May be null or undefined.
   */
  marks: z
    .array(
      z.object({
        /** The type of the mark (e.g., "bold", "link"). */
        type: z.string(),
        /** Optional attributes for the mark (e.g., URL for a link mark). */
        attrs: z.record(z.string(), z.any()).nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

/**
 * TypeScript type inferred from `blockLeafSchema`.
 * Represents an inline piece of content within a {@link Block}.
 */
export type BlockLeaf = z.infer<typeof blockLeafSchema>;

/**
 * Zod schema for a `Block`.
 * A Block is a structural unit within a document, like a paragraph, heading, list item, or a custom block type.
 * It has an ID, type, parent ID (for hierarchy), optional content (composed of {@link BlockLeaf} items),
 * optional attributes, and a fractional index for ordering.
 *
 * @property id - The unique identifier for this block.
 * @property type - The type of the block (e.g., "paragraph", "heading", "listItem", "codeBlock").
 * @property parentId - The ID of the parent block. For root blocks of a document, this might be the document's Node ID.
 * @property content - An optional array of {@link BlockLeaf} elements that make up the inline content of this block.
 * @property attrs - Optional additional attributes for the block itself, as a record of key-value pairs.
 * @property index - A fractional index string used for ordering this block among its siblings.
 */
export const blockSchema = z.object({
  /** Unique identifier for the block. */
  id: z.string(),
  /** The type of the block (e.g., "paragraph", "heading1", "codeBlock"). */
  type: z.string(),
  /** ID of the parent block. For a root block, this could be the ID of the containing Node (e.g., Page Node). */
  parentId: z.string(),
  /** Inline content of the block, composed of an array of BlockLeaf items. May be null or undefined. */
  content: z.array(blockLeafSchema).nullable().optional(),
  /** Arbitrary attributes for this block (e.g., alignment for a paragraph, language for a code block). May be null or undefined. */
  attrs: z.record(z.string(), z.any()).nullable().optional(),
  /** Fractional index string for ordering this block relative to its siblings under the same parent. */
  index: z.string(),
});

/**
 * TypeScript type inferred from `blockSchema`.
 * Represents a structural unit of content within a document.
 */
export type Block = z.infer<typeof blockSchema>;
