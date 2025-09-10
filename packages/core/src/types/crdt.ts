// packages/core/src/types/crdt.ts
/**
 * @file Defines TypeScript types related to Conflict-free Replicated Data Types (CRDTs),
 * particularly metadata associated with CRDT updates.
 */

/**
 * Represents metadata associated with a CRDT update, often used when merging
 * updates or tracking their origin and timing.
 *
 * @property id - A unique identifier for the update itself or the change operation it represents.
 * @property createdAt - An ISO 8601 timestamp indicating when the update was originally created.
 * @property createdBy - The identifier of the user or client that generated this update.
 */
export type UpdateMergeMetadata = {
  /** Unique identifier for the update or the change it represents. */
  id: string;
  /** ISO 8601 string: Timestamp when the update was created. */
  createdAt: string;
  /** Identifier of the user/client that created the update. */
  createdBy: string;
};
