// packages/core/src/types/mutations.ts
/**
 * @file Defines Zod schemas and TypeScript types for various mutation operations
 * that can occur within the system. Mutations represent changes to data,
 * such as creating, updating, or deleting nodes, documents, or reactions.
 * Includes schemas for individual mutations and for batching mutations for synchronization.
 */
import { z } from 'zod/v4';

/**
 * Enumerates HTTP-like status codes used to indicate the outcome of a mutation operation,
 * particularly in the context of synchronization results.
 */
export enum MutationStatus {
  /** Mutation processed successfully. (HTTP 200 OK) */
  OK = 200,
  /** Resource created successfully as a result of the mutation. (HTTP 201 Created) */
  CREATED = 201,
  /** The request was malformed or invalid. (HTTP 400 Bad Request) */
  BAD_REQUEST = 400,
  /** Authentication is required and has failed or has not yet been provided. (HTTP 401 Unauthorized) */
  UNAUTHORIZED = 401,
  /** The server understood the request, but refuses to authorize it. (HTTP 403 Forbidden) */
  FORBIDDEN = 403,
  /** The requested resource could not be found. (HTTP 404 Not Found) */
  NOT_FOUND = 404,
  /** The request could not be completed due to a conflict with the current state of the resource. (HTTP 409 Conflict) */
  CONFLICT = 409,
  /** The method received in the request-line is known by the origin server but not supported by the target resource. (HTTP 405 Method Not Allowed) */
  METHOD_NOT_ALLOWED = 405, // Corrected from duplicate 409
  /** A generic error message, given when an unexpected condition was encountered. (HTTP 500 Internal Server Error) */
  INTERNAL_SERVER_ERROR = 500,
}

/** Zod schema for validating {@link MutationStatus} enum values. */
export const mutationStatusSchema = z.nativeEnum(MutationStatus); // Use nativeEnum for numeric enums

/**
 * Zod schema for the result of a single mutation when processed during a sync operation.
 *
 * @property id - The ID of the mutation this result corresponds to.
 * @property status - The {@link MutationStatus} indicating the outcome of processing this mutation.
 */
export const syncMutationResultSchema = z.object({
  id: z.string(),
  status: mutationStatusSchema,
});
/** TypeScript type for a single mutation's sync result. */
export type SyncMutationResult = z.infer<typeof syncMutationResultSchema>;

/**
 * Zod schema for the input when sending a batch of mutations to be synchronized.
 * Uses `z.lazy` to handle recursive definition with `mutationSchema`.
 *
 * @property mutations - An array of {@link Mutation} objects to be processed.
 */
export const syncMutationsInputSchema = z.object({
  mutations: z.array(z.lazy(() => mutationSchema)),
});
/** TypeScript type for batched mutations input. */
export type SyncMutationsInput = z.infer<typeof syncMutationsInputSchema>;

/**
 * Zod schema for the output after processing a batch of synchronized mutations.
 *
 * @property results - An array of {@link SyncMutationResult} objects, one for each input mutation.
 */
export const syncMutationsOutputSchema = z.object({
  results: z.array(syncMutationResultSchema),
});
/** TypeScript type for batched mutations output. */
export type SyncMutationsOutput = z.infer<typeof syncMutationsOutputSchema>;

/**
 * Zod schema for the base properties common to all mutation types.
 *
 * @property id - Unique identifier for this specific mutation instance.
 * @property createdAt - ISO 8601 timestamp indicating when the mutation was generated locally.
 */
export const mutationBaseSchema = z.object({
  id: z.string(), // Unique ID for this mutation instance
  createdAt: z.string().datetime({ message: "Invalid ISO 8601 datetime string" }),
});
/** TypeScript type for the base mutation structure. */
export type MutationBase = z.infer<typeof mutationBaseSchema>;

// --- Create Node Mutation ---
/** Zod schema for the data payload of a 'node.create' mutation. */
export const createNodeMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node being created
  updateId: z.string(), // ID for the initial Yjs update/state for this node
  createdAt: z.string().datetime(), // Timestamp of creation (can differ from mutation's createdAt)
  data: z.string(), // Serialized initial attributes or Yjs state vector for the new node
});
/** TypeScript type for 'node.create' mutation data. */
export type CreateNodeMutationData = z.infer<typeof createNodeMutationDataSchema>;

/** Zod schema for a 'node.create' mutation. */
export const createNodeMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.create'),
  data: createNodeMutationDataSchema,
});
/** TypeScript type for a 'node.create' mutation. */
export type CreateNodeMutation = z.infer<typeof createNodeMutationSchema>;

// --- Update Node Mutation ---
/** Zod schema for the data payload of a 'node.update' mutation (for node attributes). */
export const updateNodeMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node being updated
  updateId: z.string(), // ID for this specific Yjs update
  data: z.string(), // Serialized Yjs update data for node attributes
  createdAt: z.string().datetime(), // Timestamp of this update
});
/** TypeScript type for 'node.update' mutation data. */
export type UpdateNodeMutationData = z.infer<typeof updateNodeMutationDataSchema>;

/** Zod schema for a 'node.update' mutation. */
export const updateNodeMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.update'),
  data: updateNodeMutationDataSchema,
});
/** TypeScript type for a 'node.update' mutation. */
export type UpdateNodeMutation = z.infer<typeof updateNodeMutationSchema>;

// --- Delete Node Mutation ---
/** Zod schema for the data payload of a 'node.delete' mutation. */
export const deleteNodeMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node being deleted
  rootId: z.string(), // Root ID of the hierarchy this node belongs to (for context/cleanup)
  deletedAt: z.string().datetime(), // Timestamp of deletion
});
/** TypeScript type for 'node.delete' mutation data. */
export type DeleteNodeMutationData = z.infer<typeof deleteNodeMutationDataSchema>;

/** Zod schema for a 'node.delete' mutation. */
export const deleteNodeMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.delete'),
  data: deleteNodeMutationDataSchema,
});
/** TypeScript type for a 'node.delete' mutation. */
export type DeleteNodeMutation = z.infer<typeof deleteNodeMutationSchema>;

// --- Create Node Reaction Mutation ---
/** Zod schema for the data payload of a 'node.reaction.create' mutation. */
export const createNodeReactionMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node being reacted to
  reaction: z.string(), // The reaction identifier (e.g., emoji unicode or name)
  rootId: z.string(), // Root ID of the node's hierarchy
  createdAt: z.string().datetime(), // Timestamp of reaction creation
});
/** TypeScript type for 'node.reaction.create' mutation data. */
export type CreateNodeReactionMutationData = z.infer<typeof createNodeReactionMutationDataSchema>;

/** Zod schema for a 'node.reaction.create' mutation. */
export const createNodeReactionMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.reaction.create'),
  data: createNodeReactionMutationDataSchema,
});
/** TypeScript type for a 'node.reaction.create' mutation. */
export type CreateNodeReactionMutation = z.infer<typeof createNodeReactionMutationSchema>;

// --- Delete Node Reaction Mutation ---
/** Zod schema for the data payload of a 'node.reaction.delete' mutation. */
export const deleteNodeReactionMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node from which reaction is removed
  reaction: z.string(), // The reaction identifier to remove
  rootId: z.string(), // Root ID of the node's hierarchy
  deletedAt: z.string().datetime(), // Timestamp of reaction deletion
});
/** TypeScript type for 'node.reaction.delete' mutation data. */
export type DeleteNodeReactionMutationData = z.infer<typeof deleteNodeReactionMutationDataSchema>;

/** Zod schema for a 'node.reaction.delete' mutation. */
export const deleteNodeReactionMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.reaction.delete'),
  data: deleteNodeReactionMutationDataSchema,
});
/** TypeScript type for a 'node.reaction.delete' mutation. */
export type DeleteNodeReactionMutation = z.infer<typeof deleteNodeReactionMutationSchema>;

// --- Node Interaction Seen Mutation ---
/** Zod schema for the data payload of a 'node.interaction.seen' mutation. */
export const nodeInteractionSeenMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node that was seen
  collaboratorId: z.string(), // ID of the collaborator who saw the node
  seenAt: z.string().datetime(), // Timestamp when the node was seen
});
/** TypeScript type for 'node.interaction.seen' mutation data. */
export type NodeInteractionSeenMutationData = z.infer<typeof nodeInteractionSeenMutationDataSchema>;

/** Zod schema for a 'node.interaction.seen' mutation. */
export const nodeInteractionSeenMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.interaction.seen'),
  data: nodeInteractionSeenMutationDataSchema,
});
/** TypeScript type for a 'node.interaction.seen' mutation. */
export type NodeInteractionSeenMutation = z.infer<typeof nodeInteractionSeenMutationSchema>;

// --- Node Interaction Opened Mutation ---
/** Zod schema for the data payload of a 'node.interaction.opened' mutation. */
export const nodeInteractionOpenedMutationDataSchema = z.object({
  nodeId: z.string(), // ID of the node that was opened
  collaboratorId: z.string(), // ID of the collaborator who opened the node
  openedAt: z.string().datetime(), // Timestamp when the node was opened
});
/** TypeScript type for 'node.interaction.opened' mutation data. */
export type NodeInteractionOpenedMutationData = z.infer<typeof nodeInteractionOpenedMutationDataSchema>;

/** Zod schema for a 'node.interaction.opened' mutation. */
export const nodeInteractionOpenedMutationSchema = mutationBaseSchema.extend({
  type: z.literal('node.interaction.opened'),
  data: nodeInteractionOpenedMutationDataSchema,
});
/** TypeScript type for a 'node.interaction.opened' mutation. */
export type NodeInteractionOpenedMutation = z.infer<typeof nodeInteractionOpenedMutationSchema>;

// --- Update Document Mutation ---
/** Zod schema for the data payload of a 'document.update' mutation (for document content). */
export const updateDocumentMutationDataSchema = z.object({
  documentId: z.string(), // ID of the document (usually same as its parent Node ID, e.g., PageNode ID)
  updateId: z.string(), // ID for this specific Yjs update
  data: z.string(), // Serialized Yjs update data for document content
  createdAt: z.string().datetime(), // Timestamp of this update
});
/** TypeScript type for 'document.update' mutation data. */
export type UpdateDocumentMutationData = z.infer<typeof updateDocumentMutationDataSchema>;

/** Zod schema for a 'document.update' mutation. */
export const updateDocumentMutationSchema = mutationBaseSchema.extend({
  type: z.literal('document.update'),
  data: updateDocumentMutationDataSchema,
});
/** TypeScript type for a 'document.update' mutation. */
export type UpdateDocumentMutation = z.infer<typeof updateDocumentMutationSchema>;

/**
 * Zod discriminated union schema for all defined mutation types.
 * The `type` property serves as the discriminator.
 */
export const mutationSchema = z.discriminatedUnion('type', [
  createNodeMutationSchema,
  updateNodeMutationSchema,
  deleteNodeMutationSchema,
  createNodeReactionMutationSchema,
  deleteNodeReactionMutationSchema,
  nodeInteractionSeenMutationSchema,
  nodeInteractionOpenedMutationSchema,
  updateDocumentMutationSchema,
  // Add other specific mutation schemas here as they are defined
]);

/** TypeScript union type representing any possible mutation. */
export type Mutation = z.infer<typeof mutationSchema>;
/** Extracts a union of all possible string literal mutation types (e.g., "node.create", "document.update"). */
export type MutationType = Mutation['type'];
