// packages/client/src/lib/utils.ts
/**
 * @file Provides client-side utility functions, primarily for interacting
 * with the workspace-specific local database using Kysely.
 * This includes common data retrieval operations like fetching node hierarchies,
 * individual nodes, user storage usage, and cleanup operations for node relations.
 */
import { Kysely, sql, Transaction } from 'kysely';

import { WorkspaceDatabaseSchema } from '@colanode/client/databases/workspace'; // Assuming correct path
import { mapNode } from '@colanode/client/lib/mappers';
import { LocalNode } from '@colanode/client/types/nodes';

export const fetchNodeTree = async (
  database:
    | Kysely<WorkspaceDatabaseSchema>
    | Transaction<WorkspaceDatabaseSchema>,
  nodeId: string
): Promise<LocalNode[]> => {
  const nodes = await database
    // Use a recursive Common Table Expression (CTE) to fetch a node and all its ancestors.
    .withRecursive('ancestor_nodes', (cte) =>
      cte
        // Base case: Select the starting node.
        .selectFrom('nodes')
        .selectAll('nodes')
        .where('id', '=', nodeId)
        .unionAll(
          // Recursive step: Select the parent of the node found in the previous step.
          cte
            .selectFrom('nodes as parent')
            .selectAll('parent')
            .innerJoin(
              'ancestor_nodes as child', // Join with the results from the CTE itself
              'parent.id',
              'child.parent_id' // Parent's ID matches child's parent_id
            )
        )
    )
    // Select all columns from the accumulated ancestor nodes.
    .selectFrom('ancestor_nodes')
    .selectAll()
    .execute();

  // The CTE fetches from child to parent, so reverse to get root-to-child order.
  // Then map database rows to LocalNode application objects.
  return nodes.reverse().map(mapNode);
};

/**
 * Fetches a single node by its ID from the workspace database.
 *
 * @async
 * @param database - A Kysely database instance or a transaction object for the workspace.
 * @param nodeId - The unique identifier of the node to fetch.
 * @returns A promise that resolves to a {@link LocalNode} object if found, otherwise `undefined`.
 */
export const fetchNode = async (
  database:
    | Kysely<WorkspaceDatabaseSchema>
    | Transaction<WorkspaceDatabaseSchema>,
  nodeId: string
): Promise<LocalNode | undefined> => {
  const node = await database
    .selectFrom('nodes')
    .selectAll()
    .where('id', '=', nodeId)
    .executeTakeFirst(); // Fetches at most one row.

  return node ? mapNode(node) : undefined;
};

/**
 * Calculates and fetches the total storage space used by files created by a specific user
 * within the workspace. It sums the 'size' attribute of all 'file' type nodes
 * created by the given user.
 *
 * Note: This assumes that the 'size' of a file is stored within its `attributes` JSON
 * as `json_extract(attributes, '$.size')`.
 *
 * @async
 * @param database - A Kysely database instance or a transaction object for the workspace.
 * @param userId - The ID of the user whose storage usage is to be calculated.
 * @returns A promise that resolves to a `bigint` representing the total storage used in bytes.
 *          Returns `0n` if the user has no files or an error occurs.
 */
export const fetchUserStorageUsed = async (
  database:
    | Kysely<WorkspaceDatabaseSchema>
    | Transaction<WorkspaceDatabaseSchema>,
  userId: string
): Promise<bigint> => {
  const storageUsedRow = await database
    .selectFrom('nodes')
    .select(({ fn }) => [
      // Use Kysely's function builder `fn.sum` with a raw SQL expression for JSON extraction.
      // This sums the 'size' property from the 'attributes' JSON for file nodes.
      fn.sum(sql<string>`json_extract(attributes, '$.size')`).as('storage_used'),
    ])
    .where('type', '=', 'file') // Only consider nodes of type 'file'.
    .where('created_by', '=', userId) // Only files created by the specified user.
    .executeTakeFirst(); // Expect a single row with the sum.

  // Convert the sum (which might be null or a string representation of a number) to BigInt.
  return BigInt(storageUsedRow?.storage_used ?? 0);
};

/**
 * Deletes all data related to a specific node ID from various tables within the workspace database.
 * This function is typically called when a node is permanently deleted to ensure
 * all associated data (states, updates, interactions, reactions, text indexes, documents,
 * tombstones for this ID, references, counters, and file states) is also cleaned up.
 *
 * Note: The `nodes` table itself is not directly modified here for the primary `nodeId`;
 * deleting the node from the `nodes` table should be handled separately or rely on
 * `ON DELETE CASCADE` if `node_id` in these tables were true foreign keys with that behavior.
 * However, some of these tables use `id` which is a PK that references `nodes.id` with cascade.
 *
 * @async
 * @param database - A Kysely database instance or a transaction object for the workspace.
 * @param nodeId - The unique identifier of the node whose related data is to be deleted.
 * @returns A promise that resolves when all deletion operations have been attempted.
 */
export const deleteNodeRelations = async (
  database:
    | Kysely<WorkspaceDatabaseSchema>
    | Transaction<WorkspaceDatabaseSchema>,
  nodeId: string
): Promise<void> => {
  // Delete from tables where 'id' column refers to the nodeId (often with cascade from nodes table)
  // These might be redundant if nodes table deletion cascades properly.
  await database.deleteFrom('node_states').where('id', '=', nodeId).execute();
  await database.deleteFrom('node_texts').where('id', '=', nodeId).execute();
  // `documents` table's `id` is a FK to `nodes.id` with ON DELETE CASCADE in its migration,
  // so this specific delete might be redundant if the node is deleted from `nodes` table first.
  // However, explicit deletion can be safer or part of a specific cleanup logic.
  await database.deleteFrom('documents').where('id', '=', nodeId).executeTakeFirst(); // executeTakeFirst is unusual for delete all by id.
                                                                                    // Consider .execute() if multiple documents could share an ID (which they shouldn't).
  await database.deleteFrom('document_states').where('id', '=', nodeId).execute();
  await database.deleteFrom('tombstones').where('id', '=', nodeId).execute(); // Clear any old tombstone for this ID if it's being "re-hard-deleted"
  await database.deleteFrom('file_states').where('id', '=', nodeId).execute();

  // Delete from tables where a 'node_id' or 'document_id' column refers to the nodeId
  await database.deleteFrom('node_updates').where('node_id', '=', nodeId).execute();
  await database.deleteFrom('node_interactions').where('node_id', '=', nodeId).execute();
  await database.deleteFrom('node_reactions').where('node_id', '=', nodeId).execute();
  await database.deleteFrom('node_references').where('node_id', '=', nodeId).execute(); // Deletes references *from* this node
  // Also consider deleting references *to* this node:
  // await database.deleteFrom('node_references').where('reference_id', '=', nodeId).execute();
  await database.deleteFrom('node_counters').where('node_id', '=', nodeId).execute();
  await database.deleteFrom('document_updates').where('document_id', '=', nodeId).execute();
  // Note: `collaborations` table is not included here. Its PK is node_id.
  // If it should be cleaned up, it would be:
  // await database.deleteFrom('collaborations').where('node_id', '=', nodeId).execute();
};
