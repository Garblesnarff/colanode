// packages/core/src/registry/documents/index.ts
/**
 * @file Defines and exports schemas and types related to document content structures.
 * This file serves as an aggregator for different types of document content that nodes
 * (like PageNode or RecordNode) might possess. It uses a discriminated union to handle
 * various document content types, though currently, it primarily features rich text.
 */
import { z } from 'zod/v4';

import {
  richTextContentSchema,
  RichTextContent,
} from '@colanode/core/registry/documents/rich-text';

/**
 * Zod discriminated union schema for all supported document content types.
 * The `type` property serves as the discriminator.
 * Currently, only `richTextContentSchema` is included, but this structure allows
 * for future expansion with other document content types (e.g., markdown, plain text, custom structured data).
 *
 * @example
 * // To parse document content:
 * // const parsed = documentContentSchema.safeParse(someDocumentData);
 * // if (parsed.success) {
 * //   if (parsed.data.type === 'rich_text') {
 * //     // Handle rich text content
 * //   }
 * // }
 */
export const documentContentSchema = z.discriminatedUnion('type', [
  richTextContentSchema,
  // Future document content types would be added here:
  // e.g., markdownContentSchema, plainTextContentSchema
]);

/**
 * TypeScript union type representing any possible document content structure.
 * Currently, this resolves to just {@link RichTextContent} because it's the only
 * member of the `documentContentSchema` union. If other types were added to the
 * schema, this type would expand accordingly.
 */
export type DocumentContent = z.infer<typeof documentContentSchema>; // Inferring from the union directly

/**
 * Extracts a union of all possible string literal types for document content
 * (e.g., "rich_text"). This is derived from the `type` property of the
 * {@link DocumentContent} union.
 */
export type DocumentType = DocumentContent['type'];
