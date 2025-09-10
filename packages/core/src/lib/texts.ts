// packages/core/src/lib/texts.ts
/**
 * @file Utility functions for extracting textual content from document structures.
 * These functions are typically used for search indexing, content preview generation,
 * or other text processing tasks.
 */
import { Block } from '@colanode/core/registry/block';
import { DocumentContent } from '@colanode/core/registry/documents';

/**
 * Extracts all textual content from a {@link DocumentContent} object.
 * It starts the extraction from the root block of the document, which is
 * assumed to have the same ID as the document/node itself.
 *
 * @param id The ID of the document (and its root block).
 * @param content The {@link DocumentContent} object containing the blocks.
 * @returns A single string concatenating all text from the document's blocks,
 *          separated by newlines, or `null` if no text is found or blocks are missing.
 */
export const extractDocumentText = (id: string, content: DocumentContent): string | null => {
  if (!content || !content.blocks) {
    return null;
  }
  // The document's root block ID is assumed to be the same as the document ID.
  return extractBlockTexts(id, content.blocks);
};

/**
 * Extracts all textual content starting from a given block ID within a collection of blocks.
 * This function serves as an entry point to the recursive text collection process.
 *
 * @param nodeId The ID of the starting block (often the root block of a document or a section).
 * @param blocks A record of all available {@link Block} objects, keyed by their IDs.
 *               Can be undefined or null.
 * @returns A single string concatenating all text from the specified block and its descendants,
 *          separated by newlines. Returns `null` if no blocks are provided or no text is extracted.
 */
export const extractBlockTexts = (
  nodeId: string, // Typically the root block ID of the document structure to parse
  blocks: Record<string, Block> | undefined | null
): string | null => {
  if (!blocks) {
    return null;
  }

  // Start the recursive collection from the given nodeId
  const result = collectBlockTextRecursive(nodeId, blocks);
  return result.length > 0 ? result : null;
};

/**
 * Recursively collects text from a given block and all its descendant blocks.
 * Text from each block's content (leaf nodes) is extracted, and then text from
 * child blocks is collected and appended, separated by newlines.
 * Children are processed in an order determined by their `index` property.
 *
 * @param blockId The ID of the current block to process.
 * @param allBlocks A record of all available {@link Block} objects in the document, keyed by their IDs.
 * @returns A string containing the concatenated text of the current block and its children.
 *          Returns an empty string if the block is not found or has no text content and no children with text.
 * @internal
 */
const collectBlockTextRecursive = (
  blockId: string,
  allBlocks: Record<string, Block>
): string => {
  const texts: string[] = [];

  const currentBlock = allBlocks[blockId];
  if (currentBlock) {
    let blockText = '';
    // A block might have direct text content (e.g., paragraph)
    if (currentBlock.content) {
      for (const leaf of currentBlock.content) {
        if (leaf.text) {
          blockText += leaf.text;
        }
      }
    }
    if (blockText) { // Add current block's text only if it's not empty
        texts.push(blockText);
    }

    // Find child blocks and sort them by their fractional index to ensure correct order
    const children = Object.values(allBlocks)
      .filter((childBlock) => childBlock.parentId === blockId)
      .sort((a, b) => {
        // Ensure index is present and handle potential null/undefined if necessary, though schema should guarantee it.
        if (a.index && b.index) {
          return a.index.localeCompare(b.index);
        }
        return 0; // Should not happen if blocks are well-formed
      });

    // Recursively collect text from children and append
    for (const child of children) {
      const childTexts = collectBlockTextRecursive(child.id, allBlocks);
      if (childTexts) { // Add child's text only if it's not empty
        texts.push(childTexts);
      }
    }
  }

  // Join texts from current block and its children, separated by newlines.
  // Avoid leading/trailing newlines if a block or its children are empty.
  return texts.filter(text => text.length > 0).join('\n');
};
