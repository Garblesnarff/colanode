// packages/client/src/lib/mentions.ts
/**
 * @file Provides client-side utility functions for processing and managing mentions.
 * This includes diffing sets of mentions to determine additions and removals,
 * and applying these changes to the `node_references` table in the database.
 */
import { Transaction } from 'kysely';

import {
  WorkspaceDatabaseSchema,
  SelectNodeReference,
  CreateNodeReference, // Assuming CreateNodeReference might be useful or for strictness
} from '@colanode/client/databases/workspace/schema';
import { Mention } from '@colanode/core/types'; // Corrected path, assuming Mention type is in core/types

/**
 * Represents the result of comparing two sets of mentions, detailing which mentions were added and removed.
 *
 * @property addedMentions - An array of {@link Mention} objects that are present in the "after" set but not in the "before" set.
 * @property removedMentions - An array of {@link Mention} objects that are present in the "before" set but not in the "after" set.
 */
export type MentionChangeResult = {
  /** Mentions that were added. */
  addedMentions: Mention[];
  /** Mentions that were removed. */
  removedMentions: Mention[];
};

/**
 * Checks if two {@link Mention} objects are equal based on their `id` and `target` properties.
 *
 * @param a - The first mention object.
 * @param b - The second mention object.
 * @returns `true` if both mentions have the same `id` and `target`, `false` otherwise.
 * @internal
 */
const mentionEquals = (a: Mention, b: Mention): boolean =>
  a.id === b.id && a.target === b.target;

/**
 * Compares two arrays of {@link Mention} objects (representing a "before" and "after" state)
 * and determines which mentions were added and which were removed.
 *
 * @param beforeMentions - An array of mentions representing the state before changes.
 * @param afterMentions - An array of mentions representing the state after changes.
 * @returns A {@link MentionChangeResult} object containing arrays of added and removed mentions.
 */
export const checkMentionChanges = (
  beforeMentions: Mention[],
  afterMentions: Mention[]
): MentionChangeResult => {
  const addedMentions = afterMentions.filter(
    (afterItem) => !beforeMentions.some((beforeItem) => mentionEquals(beforeItem, afterItem))
  );
  const removedMentions = beforeMentions.filter(
    (beforeItem) => !afterMentions.some((afterItem) => mentionEquals(beforeItem, afterItem))
  );

  return {
    addedMentions,
    removedMentions,
  };
};

/**
 * Applies changes to mention-related node references in the database within a transaction.
 * It inserts new node references for added mentions and deletes existing ones for removed mentions.
 *
 * @async
 * @param transaction - A Kysely {@link Transaction} object for the workspace database.
 * @param nodeId - The ID of the node whose mentions are being updated (the source node containing the mentions).
 * @param userId - The ID of the user performing the update.
 * @param date - An ISO 8601 string representing the current timestamp for `created_at` fields.
 * @param updateResult - A {@link MentionChangeResult} object containing the mentions to be added and removed.
 * @returns A promise that resolves to an object containing arrays of the database rows for
 *          `createdNodeReferences` and `deletedNodeReferences`.
 * @throws If creating or deleting a node reference fails unexpectedly (e.g., database error not handled by `onConflict`).
 */
export const applyMentionUpdates = async (
  transaction: Transaction<WorkspaceDatabaseSchema>,
  nodeId: string,
  userId: string,
  date: string, // Should be ISO string for consistency with DB
  updateResult: MentionChangeResult
): Promise<{ createdNodeReferences: SelectNodeReference[]; deletedNodeReferences: SelectNodeReference[] }> => {
  const createdNodeReferences: SelectNodeReference[] = [];
  const deletedNodeReferences: SelectNodeReference[] = [];

  for (const mention of updateResult.addedMentions) {
    const valuesToInsert: CreateNodeReference = { // Use CreateNodeReference for type safety if available/applicable
      node_id: nodeId,        // The node where the mention occurs
      reference_id: mention.target, // The ID of the entity being mentioned (e.g. another node's ID)
      inner_id: mention.id,   // The unique ID of the mention instance itself (e.g. a block ID or a unique mention attr ID)
      type: 'mention',        // The type of reference
      created_at: date,
      created_by: userId,
    };

    const createdNodeReference = await transaction
      .insertInto('node_references')
      .values(valuesToInsert)
      .onConflict((oc) => oc.doNothing()) // If the reference already exists, do nothing.
      .returningAll() // Return all columns of the inserted (or existing if doNothing) row.
                      // Note: `onConflict.doNothing()` might not return data with some drivers/DBs.
                      // If it doesn't return, a subsequent select might be needed or error handling adjusted.
      .executeTakeFirst(); // Expects at most one row due to potential conflict.

    if (!createdNodeReference) {
      // This might happen if onConflict.doNothing() prevents returning and no actual insert happened.
      // Or if there's a more fundamental issue. Consider if this should be an error or handled gracefully.
      // For now, if it's critical that a reference is either created or confirmed to exist:
      const existing = await transaction.selectFrom('node_references')
        .selectAll()
        .where('node_id', '=', nodeId)
        .where('reference_id', '=', mention.target)
        .where('inner_id', '=', mention.id)
        .where('type', '=', 'mention')
        .executeTakeFirst();
      if (!existing) {
        throw new Error(`Failed to create or find node reference for mention: ${mention.id} -> ${mention.target}`);
      }
      createdNodeReferences.push(existing);
    } else {
      createdNodeReferences.push(createdNodeReference);
    }
  }

  for (const mention of updateResult.removedMentions) {
    // When deleting, we expect a row to be deleted. If `executeTakeFirst()` returns undefined,
    // it means no row matched the deletion criteria.
    const deletedNodeReference = await transaction
      .deleteFrom('node_references')
      .where('node_id', '=', nodeId)
      .where('reference_id', '=', mention.target)
      .where('inner_id', '=', mention.id)
      .where('type', '=', 'mention') // Ensure only 'mention' type references are deleted by this logic
      .returningAll()
      .executeTakeFirst(); // Returns the deleted row, or undefined if no row matched.

    if (deletedNodeReference) { // Only push if a row was actually deleted and returned
      deletedNodeReferences.push(deletedNodeReference);
    }
    // If `deletedNodeReference` is undefined, it means the reference was already gone. This is usually not an error.
  }

  return { createdNodeReferences, deletedNodeReferences };
};
