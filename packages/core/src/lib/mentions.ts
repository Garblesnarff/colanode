// packages/core/src/lib/mentions.ts
/**
 * @file Utility functions for extracting mention data from document block structures.
 * Mentions typically refer to other entities within the system, such as users or other nodes.
 */
import { Block, BlockLeaf } from '@colanode/core/registry/block'; // Assuming BlockLeaf might be part of Block definition or separate
import { Mention, MentionTarget } from '@colanode/core/types/mentions';

/**
 * Extracts all mentions from a collection of blocks, starting from a given node ID (root block).
 * It traverses the block structure recursively to find all mention-type leaf nodes.
 *
 * @param nodeId The ID of the starting block (often the root block of a document or a section).
 * @param blocks A record of all available {@link Block} objects, keyed by their IDs.
 *               Can be undefined or null. If so, an empty array is returned.
 * @returns An array of {@link Mention} objects found within the specified block structure.
 *          Returns an empty array if no blocks are provided or no mentions are found.
 */
export const extractBlocksMentions = (
  nodeId: string,
  blocks: Record<string, Block> | undefined | null
): Mention[] => {
  if (!blocks) {
    return [];
  }
  // Start the recursive collection from the given nodeId.
  return collectBlockMentionsRecursive(nodeId, blocks);
};

/**
 * Recursively collects mentions from a given block and all its descendant blocks.
 * It inspects the `content` of each block for leaf nodes of type 'mention'
 * and extracts their `id` and `target` attributes.
 * Children are processed in an order determined by their `index` property.
 *
 * @param blockId The ID of the current block to process.
 * @param allBlocks A record of all available {@link Block} objects in the document, keyed by their IDs.
 * @returns An array of {@link Mention} objects found in the current block and its children.
 * @internal
 */
const collectBlockMentionsRecursive = (
  blockId: string,
  allBlocks: Record<string, Block>
): Mention[] => {
  const mentions: Mention[] = [];

  const currentBlock = allBlocks[blockId];
  if (currentBlock) {
    // Check for mentions in the current block's content leaves
    if (currentBlock.content) {
      for (const leaf of currentBlock.content) {
        // Check if the leaf is a mention and has the required attributes
        if (
          leaf.type === 'mention' &&
          leaf.attrs && // Ensure attrs exists
          typeof leaf.attrs.id === 'string' && // Ensure id is a string
          typeof leaf.attrs.target === 'string' // Ensure target is a string (adjust if target can be other types)
        ) {
          // Assuming leaf.attrs.target can be cast to MentionTarget if it's a more specific enum/type
          mentions.push({
            id: leaf.attrs.id,
            target: leaf.attrs.target as MentionTarget, // Cast if MentionTarget is more specific than string
          });
        }
      }
    }

    // Find child blocks and sort them by their fractional index to ensure correct order
    const children = Object.values(allBlocks)
      .filter((childBlock) => childBlock.parentId === blockId)
      .sort((a, b) => {
        if (a.index && b.index) {
          return a.index.localeCompare(b.index);
        }
        return 0; // Should ideally not happen if blocks are well-formed
      });

    // Recursively collect mentions from children and add them to the list
    for (const child of children) {
      mentions.push(...collectBlockMentionsRecursive(child.id, allBlocks));
    }
  }

  return mentions;
};
