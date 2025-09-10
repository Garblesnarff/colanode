// packages/client/src/lib/editor.ts
/**
 * @file Provides utility functions for working with the Tiptap editor,
 * particularly for mapping between Tiptap's JSON content format and the application's
 * internal Block/RichTextContent structure, managing selections, and finding nodes.
 */
import { Editor, JSONContent } from '@tiptap/core';
import { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model'; // ProseMirrorNode for clarity
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

import {
  Block,
  BlockLeaf,
  compareString,
  EditorNodeTypes, // Assuming this is an enum or const object of Tiptap node type strings
  generateId,
  generateNodeIndex,
  IdType,
  RichTextContent,
} from '@colanode/core';

/**
 * A set of Tiptap/Editor node types that are considered "leaf" blocks in the context
 * of the `mapContentsToBlocks` conversion. Leaf blocks are those whose `content` array
 * in Tiptap's JSON format directly maps to `BlockLeaf[]` in the application's `Block` structure.
 * Non-leaf blocks (like lists) will have their `content` (list items) mapped to nested `Block` structures.
 * @internal
 */
const leafBlockTypes = new Set<string>([ // Explicitly type the Set
  EditorNodeTypes.Paragraph,
  EditorNodeTypes.Heading1,
  EditorNodeTypes.Heading2,
  EditorNodeTypes.Heading3,
  EditorNodeTypes.HorizontalRule,
  EditorNodeTypes.CodeBlock,
  // Note: List items (ListItem, TaskItem) are typically children of list blocks (BulletList, OrderedList, TaskList)
  // and are handled by the recursive mapping. If they can also appear at the top level as leaf blocks,
  // they might need to be included here, but usually their content mapping is simpler.
]);

/**
 * Maps an array of Tiptap {@link JSONContent} objects (representing editor nodes)
 * to a record of application-specific {@link Block} objects.
 * This is the main entry point for converting Tiptap editor content into the
 * internal block structure used by the application.
 *
 * @param parentId The ID of the parent entity (e.g., document ID or parent block ID) for the top-level blocks.
 * @param contents An array of Tiptap `JSONContent` objects.
 * @param indexMap A map where keys are block IDs and values are their fractional index strings.
 *                 This is used to assign correct ordering to the created blocks.
 * @returns A record of {@link Block} objects, keyed by their IDs.
 */
export const mapContentsToBlocks = (
  parentId: string,
  contents: JSONContent[],
  indexMap: Map<string, string> // Map<blockId, fractionalIndex>
): Record<string, Block> => {
  const blocks: Block[] = []; // Accumulator for all created blocks
  // Recursively map Tiptap content to application blocks
  mapAndPushContentsToBlocksRecursive(contents, parentId, blocks, indexMap);
  // Ensure fractional indexes are valid and ordered correctly
  validateBlocksIndexes(blocks);

  // Convert array of blocks to a record keyed by block ID
  const blocksRecord: Record<string, Block> = blocks.reduce(
    (acc, block) => {
      acc[block.id] = block;
      return acc;
    },
    {} as Record<string, Block>
  );

  return blocksRecord;
};

/**
 * Recursively processes an array of Tiptap `JSONContent` objects, mapping each one
 * to an application `Block` and adding it to the `blocks` accumulator array.
 * This is a helper function for `mapContentsToBlocks`.
 *
 * @param contents Array of Tiptap `JSONContent` from the editor. Can be null or undefined.
 * @param parentId The ID to be assigned as `parentId` for the blocks created at this level.
 * @param blocks Accumulator array where created `Block` objects are pushed.
 * @param indexMap Map providing fractional indexes for block ordering.
 * @internal
 */
const mapAndPushContentsToBlocksRecursive = (
  contents: JSONContent[] | null | undefined,
  parentId: string,
  blocks: Block[], // Output array
  indexMap: Map<string, string>
): void => {
  if (!contents) {
    return;
  }
  contents.forEach((contentNode) => { // Renamed content to contentNode for clarity
    mapAndPushContentToBlockRecursive(contentNode, parentId, blocks, indexMap);
  });
};

/**
 * Maps a single Tiptap `JSONContent` object to an application `Block` object.
 * If the Tiptap node is a "leaf block" (e.g., paragraph, heading), its inline content
 * is mapped to `BlockLeaf` objects. If it's a structural block (e.g., list), its
 * children are recursively processed as nested blocks.
 *
 * @param contentNode The Tiptap `JSONContent` object to map.
 * @param parentId The `parentId` for the new application `Block`.
 * @param blocks Accumulator array for all created `Block` objects.
 * @param indexMap Map providing fractional indexes.
 * @throws If `contentNode.type` is missing.
 * @internal
 */
const mapAndPushContentToBlockRecursive = (
  contentNode: JSONContent,
  parentId: string,
  blocks: Block[], // Output array
  indexMap: Map<string, string>
): void => {
  if (!contentNode.type) {
    // This should not happen with valid Tiptap content
    throw new Error('Invalid Tiptap content: node type is missing.');
  }

  const id = getIdFromContent(contentNode); // Get existing ID or generate a new one
  const index = indexMap.get(id) ?? generateNodeIndex(null, null); // Get pre-calculated index or generate

  // Filter out 'id' from attrs if it exists, as it's handled separately.
  const attributes = contentNode.attrs ? { ...contentNode.attrs } : {};
  if ('id' in attributes) {
    delete attributes.id;
  }

  const isLeaf = leafBlockTypes.has(contentNode.type);
  const blockInlineContent = isLeaf
    ? mapJsonContentToBlockLeaves(contentNode.type, contentNode.content)
    : null; // Non-leaf blocks' children are handled by recursive call below

  blocks.push({
    id: id,
    index: index,
    attrs: Object.keys(attributes).length > 0 ? attributes : undefined,
    parentId: parentId,
    type: contentNode.type,
    // Filter out any nulls that might result from mapJsonContentToBlockLeaves if it returned (BlockLeaf | null)[]
    content: blockInlineContent?.filter((leaf): leaf is BlockLeaf => leaf !== null) ?? undefined,
  });

  // If it's not a leaf block and has children, recursively process them.
  // Their parentId will be the current block's ID (`id`).
  if (!isLeaf && contentNode.content) {
    mapAndPushContentsToBlocksRecursive(contentNode.content, id, blocks, indexMap);
  }
};

/**
 * Maps an array of Tiptap `JSONContent` (representing inline elements like text, mentions)
 * to an array of application `BlockLeaf` objects.
 * This is used for "leaf blocks" like paragraphs or headings.
 *
 * @param blockType The type of the parent block (e.g., "paragraph"). Used to determine if mapping is applicable.
 * @param contents Array of Tiptap `JSONContent` representing inline content.
 * @returns An array of {@link BlockLeaf} objects, or `null` if the block type is not a leaf
 *          or if there's no inline content.
 * @internal
 */
const mapJsonContentToBlockLeaves = ( // Renamed for clarity from mapContentsToBlockLeafs
  blockType: string,
  contents?: JSONContent[] // Tiptap's inline content array
): BlockLeaf[] | null => {
  // Only process for known leaf block types that are expected to have inline content.
  if (!leafBlockTypes.has(blockType) || !contents || contents.length === 0) {
    return null;
  }

  const blockLeaves: BlockLeaf[] = [];
  for (const inlineContentNode of contents) {
    if (!inlineContentNode.type) {
      // Inline content nodes (like text, mention) must have a type.
      console.warn('Skipping inline content node without a type:', inlineContentNode);
      continue;
    }

    blockLeaves.push({
      type: inlineContentNode.type,
      text: inlineContentNode.text, // Will be undefined if not a text node, which is fine.
      attrs: inlineContentNode.attrs, // Optional attributes for the leaf (e.g., mention ID)
      marks: inlineContentNode.marks?.map((mark) => ({ // Map Tiptap marks to application mark structure
        type: mark.type,
        attrs: mark.attrs,
      })),
    });
  }
  return blockLeaves.length > 0 ? blockLeaves : null;
};

/**
 * Converts application-specific {@link RichTextContent} (a collection of {@link Block} objects)
 * into Tiptap's {@link JSONContent} format, suitable for initializing or updating an editor instance.
 *
 * @param documentId The ID of the document node, used as the parentId for root-level blocks.
 * @param richText A {@link RichTextContent} object or null/undefined.
 * @returns A Tiptap `JSONContent` object representing the document.
 *          If `richText` is empty or null, returns a default document with a single empty paragraph.
 */
export const buildEditorContent = (
  documentId: string,
  richText: RichTextContent | null | undefined
): JSONContent => {
  const appBlocks = richText?.blocks ? Object.values(richText.blocks) : [];
  const tiptapContents = mapAppBlocksToTiptapJsonContents(documentId, appBlocks);

  // Ensure editor always has at least one paragraph if content is empty.
  if (tiptapContents.length === 0) {
    tiptapContents.push({
      type: EditorNodeTypes.Paragraph, // Use defined constant
      attrs: {
        id: generateId(IdType.Block), // Generate a new block ID
      },
      // Tiptap paragraphs can have an empty content array if they are empty.
      // content: [], // Not strictly necessary, Tiptap handles undefined content for empty paragraphs.
    });
  }

  return {
    type: 'doc', // Standard Tiptap document root type
    content: tiptapContents,
  };
};

/**
 * Recursively maps an array of application {@link Block} objects to an array of Tiptap {@link JSONContent} objects.
 * This function reconstructs the hierarchical structure for Tiptap.
 *
 * @param parentId The ID of the parent for which to find and map child blocks.
 * @param allAppBlocks An array of all {@link Block} objects in the document.
 * @returns An array of Tiptap `JSONContent` objects.
 * @internal
 */
export const mapAppBlocksToTiptapJsonContents = ( // Renamed for clarity
  parentId: string,
  allAppBlocks: Block[]
): JSONContent[] => {
  const tiptapJsonContents: JSONContent[] = [];
  const childAppBlocks = allAppBlocks
    .filter((block) => block.parentId === parentId)
    .sort((a, b) => compareString(a.index, b.index)); // Ensure correct order

  for (const appBlock of childAppBlocks) {
    tiptapJsonContents.push(mapAppBlockToTiptapJsonContent(appBlock, allAppBlocks));
  }

  return tiptapJsonContents;
};

/**
 * Maps a single application {@link Block} object to a Tiptap {@link JSONContent} object.
 * Handles mapping of type, attributes, and recursively maps inline content (BlockLeafs)
 * or child blocks.
 *
 * @param appBlock The application {@link Block} to map.
 * @param allAppBlocks Array of all application blocks, for recursive mapping of children.
 * @returns A Tiptap `JSONContent` object.
 * @internal
 */
const mapAppBlockToTiptapJsonContent = (appBlock: Block, allAppBlocks: Block[]): JSONContent => {
  const tiptapJsonContent: JSONContent = {
    type: appBlock.type,
    attrs: {
      id: appBlock.id, // Ensure block ID is part of Tiptap attrs
      ...(appBlock.attrs && appBlock.attrs), // Spread other block-specific attributes
    },
  };

  // If it's a leaf block type, map its BlockLeaf array to Tiptap inline content.
  // Otherwise, recursively map its child Blocks.
  const inlineOrNestedContent = leafBlockTypes.has(appBlock.type)
    ? mapAppBlockLeavesToTiptapJsonContents(appBlock.content)
    : mapAppBlocksToTiptapJsonContents(appBlock.id, allAppBlocks);

  if (inlineOrNestedContent && inlineOrNestedContent.length > 0) {
    tiptapJsonContent.content = inlineOrNestedContent;
  } else if (leafBlockTypes.has(appBlock.type)) {
    // Ensure leaf blocks like paragraphs always have a content array, even if empty,
    // unless Tiptap handles undefined content for them gracefully (it often does).
    // For safety or specific Tiptap extension needs, an empty array might be better.
    // tiptapJsonContent.content = [];
  }


  return tiptapJsonContent;
};

/**
 * Maps an array of application {@link BlockLeaf} objects (inline content) to an array
 * of Tiptap {@link JSONContent} objects.
 *
 * @param blockLeaves Array of {@link BlockLeaf} objects or null/undefined.
 * @returns An array of Tiptap `JSONContent` objects, or `undefined` if input is null/empty.
 * @internal
 */
const mapAppBlockLeavesToTiptapJsonContents = ( // Renamed for clarity
  blockLeaves: BlockLeaf[] | null | undefined
): JSONContent[] | undefined => {
  if (!blockLeaves || blockLeaves.length === 0) {
    return undefined; // Tiptap often handles undefined content for empty inline nodes.
  }
  const tiptapJsonContents: JSONContent[] = [];
  for (const leaf of blockLeaves) {
    const tiptapLeaf: JSONContent = { type: leaf.type };
    if (leaf.text !== undefined && leaf.text !== null) { // Check specifically for undefined/null
        tiptapLeaf.text = leaf.text;
    }
    if (leaf.attrs && Object.keys(leaf.attrs).length > 0) {
        tiptapLeaf.attrs = leaf.attrs;
    }
    if (leaf.marks && leaf.marks.length > 0) {
        tiptapLeaf.marks = leaf.marks.map(mark => ({
            type: mark.type,
            ...(mark.attrs && Object.keys(mark.attrs).length > 0 && { attrs: mark.attrs }),
        }));
    }
    tiptapJsonContents.push(tiptapLeaf);
  }
  return tiptapJsonContents;
};

/**
 * Validates and corrects the fractional indexes of blocks within the same parent.
 * Ensures that block indexes are unique and correctly ordered. If an out-of-order
 * or duplicate index is found, it attempts to regenerate it.
 *
 * @param blocks An array of {@link Block} objects to validate. This array is mutated in place.
 * @internal
 */
const validateBlocksIndexes = (blocks: Block[]): void => {
  // Group blocks by their parentId
  const blocksByParent: Record<string, Block[]> = {};
  for (const block of blocks) {
    if (!blocksByParent[block.parentId]) {
      blocksByParent[block.parentId] = [];
    }
    blocksByParent[block.parentId].push(block);
  }

  // For each group of siblings, sort them by index and validate/correct
  for (const parentId in blocksByParent) {
    const siblings = blocksByParent[parentId].sort((a, b) => compareString(a.index, b.index));

    for (let i = 1; i < siblings.length; i++) {
      const currentBlock = siblings[i];
      const prevBlock = siblings[i - 1];

      // If current index is not greater than previous (error or duplicate)
      if (currentBlock.index <= prevBlock.index) {
        const nextBlock = (i < siblings.length - 1) ? siblings[i + 1] : null;
        // Regenerate index for currentBlock
        currentBlock.index = generateNodeIndex(prevBlock.index, nextBlock ? nextBlock.index : null);
        // After regenerating an index, the list might need re-sorting or further validation passes,
        // but for a single pass correction, this is a common approach.
        // For robustness, one might re-sort `siblings` here and adjust `i` or use a while loop.
      }
    }
  }
};

/**
 * Retrieves an ID from Tiptap `JSONContent` attributes, or generates a new block ID if not present.
 * Tiptap nodes are expected to have an `id` in their `attrs`.
 *
 * @param contentNode The Tiptap `JSONContent` object.
 * @returns The existing ID from `contentNode.attrs.id` or a newly generated block ID.
 * @throws If `contentNode.type` is missing (should not happen for valid Tiptap content).
 * @internal
 */
const getIdFromContent = (contentNode: JSONContent): string => {
  if (!contentNode.type) {
    throw new Error('Invalid Tiptap content: node type is missing when trying to get ID.');
  }
  // Ensure attrs exist and id is a string, otherwise generate.
  if (contentNode.attrs && typeof contentNode.attrs.id === 'string' && contentNode.attrs.id) {
    return contentNode.attrs.id;
  }
  return generateId(IdType.Block);
};

/**
 * Checks if a Tiptap editor node (or its content) has meaningful content.
 * Useful for determining if an editor state is "empty" or contains actual data.
 * It recursively checks nested content.
 *
 * @param block An optional Tiptap {@link JSONContent} object representing a node or document.
 * @returns `true` if the node or its descendants have text, or if it's a special non-text
 *          node that's considered content (e.g., file, image, emoji). Returns `false` otherwise.
 */
export const editorHasContent = (block?: JSONContent): boolean => {
  if (!block) {
    return false;
  }

  // Check for actual text content
  if (block.text && block.text.trim().length > 0) { // Use trim() to ignore whitespace-only text
    return true;
  }

  // Check for specific node types that are considered content even without text
  // (e.g., embedded files, images, special elements).
  // These checks depend on the specific `attrs` used by those Tiptap extensions.
  if (block.type === EditorNodeTypes.File && block.attrs?.id) { // Assuming 'file' is a defined EditorNodeType
    return true;
  }
  if (block.type === 'tempFile' && block.attrs?.id) { // Assuming 'tempFile' is a specific type
    return true;
  }
  // Example for other potential types:
  if (block.type === 'image' && block.attrs?.src) { // Common attribute for images
      return true;
  }
  if (block.type === EditorNodeTypes.HorizontalRule) { // Horizontal rules are content
      return true;
  }
  // The original code had 'gif' and 'emoji' checks. If these are custom Tiptap node types:
  // if (block.type === 'gif' && block.attrs?.gifId) { return true; }
  // if (block.type === 'emoji' && block.attrs?.emoji) { return true; }


  // Recursively check child content if any
  if (block.content && Array.isArray(block.content) && block.content.length > 0) {
    for (const innerBlock of block.content) {
      if (editorHasContent(innerBlock)) {
        return true; // Found content in a descendant
      }
    }
  }

  return false; // No meaningful content found
};

/**
 * Finds the starting position of a ProseMirror node within the document by its ID.
 * The ID is expected to be stored in `node.attrs.id`.
 *
 * @param doc The ProseMirror document node (typically `editor.state.doc`).
 * @param id The ID of the node to find.
 * @returns The starting position (number) of the node if found, otherwise `null`.
 */
export const findNodePosById = (doc: ProseMirrorNode, id: string): number | null => {
  let foundPos: number | null = null;

  // Iterates over all descendant nodes of the document.
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.attrs?.id === id) {
      foundPos = pos;
      return false; // Stop searching once the node is found
    }
    return true; // Continue searching
  });

  return foundPos;
};

/**
 * Given a resolved position (`ResolvedPos`) in a ProseMirror document,
 * this function traverses up the node tree from that position to find the
 * closest ancestor node that has an `id` attribute.
 * It also calculates the offset of the original position within that found block.
 *
 * @param resolvedPos A ProseMirror `ResolvedPos` object representing a specific point in the document.
 * @returns An object `{ nodeId: string, offset: number }` if a block with an ID is found,
 *          where `nodeId` is the ID of the block and `offset` is the character offset
 *          of the original `resolvedPos` within that block's text content (more accurately, from the start of the block node).
 *          Returns `null` if no such block is found (e.g., if at document root without ID).
 */
export const findBlockFromPos = (resolvedPos: ResolvedPos): { nodeId: string; offset: number } | null => {
  // Iterate from the current depth up to the root of the document.
  for (let i = resolvedPos.depth; i >= 0; i--) {
    const node = resolvedPos.node(i); // Get the node at the current depth `i`.
    // Check if this node has an 'id' attribute.
    if (node?.attrs?.id && typeof node.attrs.id === 'string') {
      return {
        nodeId: node.attrs.id,
        // The offset of the original `pos` from the start of the identified block node.
        // `resolvedPos.pos` is the absolute position. `resolvedPos.start(i)` is the start of node at depth i.
        offset: resolvedPos.pos - resolvedPos.start(i),
      };
    }
  }
  return null; // No ancestor with an 'id' attribute found up to the root.
};

/**
 * Represents a selection within the editor in a "relative" format,
 * meaning positions are described by a node ID and an offset within that node,
 * rather than absolute document positions. This is useful for persisting or
 * transferring selection state, as absolute positions can change with document edits.
 *
 * Can be a `NodeSelection` (targeting a whole block) or a `TextSelection` (range within text).
 */
export type RelativeSelection =
  | {
      type: 'node';
      /** ID of the selected node. */
      nodeId: string;
    }
  | {
      type: 'text';
      /** Anchor point (start) of the text selection. */
      anchor: {
        /** ID of the node containing the anchor point. */
        nodeId: string;
        /** Character offset within the anchor node's content. */
        offset: number;
      };
      /** Head point (end or cursor position) of the text selection. */
      head: {
        /** ID of the node containing the head point. */
        nodeId: string;
        /** Character offset within the head node's content. */
        offset: number;
      };
    };

/**
 * Gets the current editor selection and converts it into a {@link RelativeSelection} format.
 * This allows the selection to be stored or transmitted independently of absolute document positions.
 *
 * @param editor The Tiptap `Editor` instance.
 * @returns A {@link RelativeSelection} object if a valid selection with identifiable nodes
 *          can be determined, otherwise `null`.
 */
export const getRelativeSelection = (
  editor: Editor
): RelativeSelection | null => {
  const selection = editor.state.selection;

  if (selection instanceof NodeSelection) {
    const node = selection.node;
    if (node.attrs?.id && typeof node.attrs.id === 'string') {
      return {
        type: 'node',
        nodeId: node.attrs.id,
      };
    }
    // If a NodeSelection doesn't have an ID on the node, it can't be represented relatively.
    return null;
  }

  if (selection instanceof TextSelection) {
    const { $from, $head } = selection; // Resolved positions for anchor and head

    // Find the block ID and relative offset for the anchor ($from) point.
    const anchorBlockInfo = findBlockFromPos($from);
    // Find the block ID and relative offset for the head point.
    const headBlockInfo = findBlockFromPos($head);

    if (anchorBlockInfo && headBlockInfo) {
      return {
        type: 'text',
        anchor: anchorBlockInfo,
        head: headBlockInfo,
      };
    }
    // If either point can't be resolved to a block with an ID, relative selection fails.
    return null;
  }

  // Unknown selection type or empty selection that doesn't fit Node/Text.
  return null;
};

/**
 * Restores an editor selection from a {@link RelativeSelection} object.
 * It finds the nodes by their IDs and calculates the absolute positions
 * to recreate the `NodeSelection` or `TextSelection`.
 *
 * @param editor The Tiptap `Editor` instance.
 * @param selection The {@link RelativeSelection} object to restore.
 *                  If null or undefined, the function does nothing.
 */
export const restoreRelativeSelection = (
  editor: Editor,
  selection: RelativeSelection | null | undefined
): void => {
  if (!selection) {
    return;
  }

  const { state, view } = editor;
  const { doc } = state;
  let tr = state.tr; // Start a new transaction

  if (selection.type === 'node') {
    const nodePos = findNodePosById(doc, selection.nodeId);
    if (nodePos !== null) { // Check for null explicitly
      try {
        // Ensure the position is valid for NodeSelection (points at the start of a node)
        const selectedNode = doc.nodeAt(nodePos);
        if (selectedNode) {
          const nodeSelection = NodeSelection.create(doc, nodePos);
          tr = tr.setSelection(nodeSelection);
          view.dispatch(tr);
        } else {
            console.warn(`Cannot restore NodeSelection: No node found at resolved position ${nodePos} for ID ${selection.nodeId}`);
        }
      } catch (e) {
        console.error("Error creating NodeSelection for relative restore:", e, {nodeId: selection.nodeId, pos: nodePos});
      }
    } else {
        console.warn(`Cannot restore NodeSelection: Node ID ${selection.nodeId} not found in document.`);
    }
    return;
  }

  // Restore TextSelection
  if (selection.type === 'text') {
    const { anchor, head } = selection;

    const anchorNodeStartPos = findNodePosById(doc, anchor.nodeId);
    const headNodeStartPos = findNodePosById(doc, head.nodeId);

    if (anchorNodeStartPos === null || headNodeStartPos === null) {
      // If either node ID can't be found, cannot restore selection.
      console.warn("Cannot restore TextSelection: Anchor or head node ID not found.", {anchorNodeId: anchor.nodeId, headNodeId: head.nodeId});
      return;
    }

    // Calculate absolute positions. Offset is from the start of the node.
    // For ProseMirror, positions within a node's content usually start after the node's opening tag (+1).
    // The offset should be within the content size of the respective node.
    const anchorNode = doc.nodeAt(anchorNodeStartPos);
    const headNode = doc.nodeAt(headNodeStartPos);

    if (!anchorNode || !headNode) {
        console.warn("Cannot restore TextSelection: Anchor or head node not found at resolved positions.");
        return;
    }

    // Ensure offsets are within the bounds of the node's content.
    // `node.content.size` is the size of the node's content.
    const finalAnchorOffset = Math.min(Math.max(0, anchor.offset), anchorNode.content.size);
    const finalHeadOffset = Math.min(Math.max(0, head.offset), headNode.content.size);

    const absoluteAnchorPos = anchorNodeStartPos + 1 + finalAnchorOffset;
    const absoluteHeadPos = headNodeStartPos + 1 + finalHeadOffset;

    // Ensure final positions are within document bounds.
    const docSize = doc.content.size;
    const finalAnchorPosClamped = Math.min(absoluteAnchorPos, docSize);
    const finalHeadPosClamped = Math.min(absoluteHeadPos, docSize);

    try {
      const textSelection = TextSelection.create(doc, finalAnchorPosClamped, finalHeadPosClamped);
      tr = tr.setSelection(textSelection);
      view.dispatch(tr);
    } catch (e) {
      console.error("Error creating TextSelection for relative restore:", e, {anchor, head, finalAnchorPosClamped, finalHeadPosClamped});
    }
  }
};
