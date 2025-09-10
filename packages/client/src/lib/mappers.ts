import {
  SelectAccountMetadata,
  SelectWorkspace,
} from '@colanode/client/databases/account';
import {
  SelectAccount,
  SelectAppMetadata,
  SelectServer,
} from '@colanode/client/databases/app';
import { SelectEmoji } from '@colanode/client/databases/emojis';
import { SelectIcon } from '@colanode/client/databases/icons';
import {
  SelectFileState,
  SelectMutation,
  SelectNode,
  SelectUser,
  SelectNodeInteraction,
  SelectNodeReaction,
  SelectWorkspaceMetadata,
  SelectDocument,
  SelectDocumentState,
  SelectDocumentUpdate,
  SelectNodeReference,
} from '@colanode/client/databases/workspace';
import {
  Account,
  AccountMetadata,
  AccountMetadataKey,
} from '@colanode/client/types/accounts';
import { AppMetadata, AppMetadataKey } from '@colanode/client/types/apps';
import {
  Document,
  DocumentState,
  DocumentUpdate,
} from '@colanode/client/types/documents';
import { Emoji } from '@colanode/client/types/emojis';
import { FileState } from '@colanode/client/types/files';
import { Icon } from '@colanode/client/types/icons';
import {
  LocalNode,
  NodeInteraction,
  NodeReaction,
  NodeReference,
} from '@colanode/client/types/nodes';
import { Server } from '@colanode/client/types/servers';
import { User } from '@colanode/client/types/users';
import {
  Workspace,
  WorkspaceMetadata,
  WorkspaceMetadataKey,
} from '@colanode/client/types/workspaces';
import { Mutation } from '@colanode/core'; // Assuming Mutation is from core, not client/mutations

// packages/client/src/lib/mappers.ts
/**
 * @file Defines a collection of mapping functions.
 * These functions are responsible for transforming data structures retrieved from the
 * local Kysely database (typically `Select...` types) into the application's
 * domain-specific TypeScript types (e.g., `User`, `Node`, `Document`).
 * This helps decouple the database representation from the application logic.
 */

/**
 * Maps a database row from the `users` table ({@link SelectUser}) to an application {@link User} object.
 * @param row - The database row object for a user.
 * @returns The corresponding `User` object.
 */
export const mapUser = (row: SelectUser): User => {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    customName: row.custom_name,
    customAvatar: row.custom_avatar,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Maps a database row from the `nodes` table ({@link SelectNode}) to an application {@link LocalNode} object.
 * It parses the `attributes` field from a JSON string into an object.
 *
 * @param row - The database row object for a node.
 * @returns The corresponding `LocalNode` object.
 *          The `attributes` property will be a parsed object.
 *          Type assertion `as LocalNode` is used, assuming the structure matches after parsing.
 */
export const mapNode = (row: SelectNode): LocalNode => {
  return {
    id: row.id,
    type: row.type,
    parentId: row.parent_id,
    rootId: row.root_id,
    attributes: JSON.parse(row.attributes),
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    localRevision: row.local_revision,
    serverRevision: row.server_revision,
  } as LocalNode; // Attributes JSON is parsed; result cast to LocalNode.
};

/**
 * Maps a database row from the `documents` table ({@link SelectDocument}) to an application {@link Document} object.
 * It parses the `content` field (which stores document structure as a JSON string) into an object.
 *
 * @param row - The database row object for a document.
 * @returns The corresponding `Document` object with parsed content.
 */
export const mapDocument = (row: SelectDocument): Document => {
  // The `type` field is missing in SelectDocument but present in the Document type (via DocumentContent).
  // This implies that the `content` JSON string must contain the `type` discriminator.
  // The Document type likely expects `content` to be a RichTextContent object.
  const parsedContent = JSON.parse(row.content); // Assuming content is RichTextContent compatible
  return {
    id: row.id,
// type: parsedContent.type, // This would be needed if Document type included 'type' directly
    localRevision: row.local_revision,
    serverRevision: row.server_revision,
    content: JSON.parse(row.content),
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
};

/**
 * Maps a database row from the `document_states` table ({@link SelectDocumentState})
 * to an application {@link DocumentState} object.
 * This typically involves CRDT state vectors for document content.
 *
 * @param row - The database row object for a document's CRDT state.
 * @returns The corresponding `DocumentState` object.
 */
export const mapDocumentState = (row: SelectDocumentState): DocumentState => {
  return {
    id: row.id,
    revision: row.revision,
    state: row.state,
  };
};

/**
 * Maps a database row from the `document_updates` table ({@link SelectDocumentUpdate})
 * to an application {@link DocumentUpdate} object.
 * This represents a single CRDT update for a document.
 *
 * @param row - The database row object for a document update.
 * @returns The corresponding `DocumentUpdate` object.
 */
export const mapDocumentUpdate = (
  row: SelectDocumentUpdate
): DocumentUpdate => {
  // Assumes row.data is already in the correct format (e.g., Uint8Array if the type expects it)
  // or that direct assignment is intended. Kysely handles Blob to Uint8Array.
  return {
    id: row.id,
    documentId: row.document_id,
    data: row.data,
  };
};

/**
 * Maps a database row from the `accounts` table ({@link SelectAccount})
 * to an application {@link Account} object.
 *
 * @param row - The database row object for an account.
 * @returns The corresponding `Account` object.
 */
export const mapAccount = (row: SelectAccount): Account => {
  return {
    id: row.id,
    server: row.server,
    name: row.name,
    avatar: row.avatar,
    deviceId: row.device_id,
    email: row.email,
    token: row.token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
};

/**
 * Maps a database row from a workspace selection query ({@link SelectWorkspace},
 * which might be a join or a specific table for workspace list)
 * to an application {@link Workspace} object.
 *
 * @param row - The database row object representing a workspace.
 * @returns The corresponding `Workspace` object.
 */
export const mapWorkspace = (row: SelectWorkspace): Workspace => {
  // Note: SelectWorkspace type comes from '@colanode/client/databases/account',
  // which might imply it's related to the list of workspaces an account has access to,
  // rather than the workspace's own dedicated DB schema.
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    role: row.role,
    userId: row.user_id,
    avatar: row.avatar,
    description: row.description,
    maxFileSize: row.max_file_size,
    storageLimit: row.storage_limit,
  };
};

/**
 * Maps a database row from the `mutations` table ({@link SelectMutation})
 * to an application {@link Mutation} object (from `@colanode/core`).
 * It parses the `data` field from a JSON string into an object.
 *
 * @param row - The database row object for a queued mutation.
 * @returns The corresponding `Mutation` object with parsed data.
 */
export const mapMutation = (row: SelectMutation): Mutation => {
  return {
    id: row.id,
    type: row.type,
    data: JSON.parse(row.data),
    createdAt: row.created_at,
  };
};

/**
 * Maps a database row from the `servers` table ({@link SelectServer})
 * to an application {@link Server} object.
 * It parses the `attributes` field from a JSON string and converts
 * `created_at` and `synced_at` strings to Date objects.
 *
 * @param row - The database row object for a server.
 * @returns The corresponding `Server` object.
 */
export const mapServer = (row: SelectServer): Server => {
  return {
    domain: row.domain,
    name: row.name,
    avatar: row.avatar,
    attributes: JSON.parse(row.attributes),
    version: row.version,
    createdAt: new Date(row.created_at),
    syncedAt: row.synced_at ? new Date(row.synced_at) : null,
  };
};

/**
 * Maps a database row from the `node_reactions` table ({@link SelectNodeReaction})
 * to an application {@link NodeReaction} object.
 *
 * @param row - The database row object for a node reaction.
 * @returns The corresponding `NodeReaction` object.
 */
export const mapNodeReaction = (row: SelectNodeReaction): NodeReaction => {
  return {
    nodeId: row.node_id,
    collaboratorId: row.collaborator_id,
    reaction: row.reaction,
    rootId: row.root_id,
    createdAt: row.created_at,
  };
};

/**
 * Maps a database row from the `node_interactions` table ({@link SelectNodeInteraction})
 * to an application {@link NodeInteraction} object.
 *
 * @param row - The database row object for a node interaction.
 * @returns The corresponding `NodeInteraction` object.
 */
export const mapNodeInteraction = (
  row: SelectNodeInteraction
): NodeInteraction => {
  return {
    nodeId: row.node_id,
    collaboratorId: row.collaborator_id,
    rootId: row.root_id,
    revision: row.revision,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    firstOpenedAt: row.first_opened_at,
    lastOpenedAt: row.last_opened_at,
  };
};

/**
 * Maps a database row from the `file_states` table ({@link SelectFileState})
 * to an application {@link FileState} object.
 *
 * @param row - The database row object for a file's state.
 * @returns The corresponding `FileState` object.
 */
export const mapFileState = (row: SelectFileState): FileState => {
  return {
    id: row.id,
    version: row.version,
    downloadStatus: row.download_status,
    downloadProgress: row.download_progress,
    downloadRetries: row.download_retries,
    downloadStartedAt: row.download_started_at,
    downloadCompletedAt: row.download_completed_at,
    uploadStatus: row.upload_status,
    uploadProgress: row.upload_progress,
    uploadRetries: row.upload_retries,
    uploadStartedAt: row.upload_started_at,
    uploadCompletedAt: row.upload_completed_at,
  };
};

/**
 * Maps a database row from the `emojis` table ({@link SelectEmoji})
 * to an application {@link Emoji} object.
 * It parses `tags`, `emoticons`, and `skins` from JSON strings into arrays.
 *
 * @param row - The database row object for an emoji.
 * @returns The corresponding `Emoji` object.
 */
export const mapEmoji = (row: SelectEmoji): Emoji => {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    categoryId: row.category_id,
    tags: row.tags ? JSON.parse(row.tags) : [],
    emoticons: row.emoticons ? JSON.parse(row.emoticons) : [],
    skins: row.skins ? JSON.parse(row.skins) : [],
  };
};

/**
 * Maps a database row from the `icons` table ({@link SelectIcon})
 * to an application {@link Icon} object.
 * It parses `tags` from a JSON string into an array.
 *
 * @param row - The database row object for an icon.
 * @returns The corresponding `Icon` object.
 */
export const mapIcon = (row: SelectIcon): Icon => {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    code: row.code,
    tags: row.tags ? JSON.parse(row.tags) : [],
  };
};

/**
 * Maps a database row from the application `metadata` table ({@link SelectAppMetadata})
 * to an application {@link AppMetadata} object.
 * It parses the `value` field from a JSON string.
 *
 * @param row - The database row object for an app metadata item.
 * @returns The corresponding `AppMetadata` object with parsed value.
 */
export const mapAppMetadata = (row: SelectAppMetadata): AppMetadata => {
  return {
    key: row.key as AppMetadataKey, // Assumes row.key is a valid AppMetadataKey
    value: JSON.parse(row.value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapAccountMetadata = (
  row: SelectAccountMetadata
): AccountMetadata => {
  return {
    key: row.key as AccountMetadataKey, // Assumes row.key is a valid AccountMetadataKey
    value: JSON.parse(row.value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapWorkspaceMetadata = (
  row: SelectWorkspaceMetadata
): WorkspaceMetadata => {
  return {
    key: row.key as WorkspaceMetadataKey, // Assumes row.key is a valid WorkspaceMetadataKey
    value: JSON.parse(row.value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Maps a database row from the `node_references` table ({@link SelectNodeReference})
 * to an application {@link NodeReference} object.
 *
 * @param row - The database row object for a node reference.
 * @returns The corresponding `NodeReference` object.
 */
export const mapNodeReference = (row: SelectNodeReference): NodeReference => {
  return {
    nodeId: row.node_id,
    referenceId: row.reference_id,
    innerId: row.inner_id,
    type: row.type,
    // Note: created_at and created_by are in SelectNodeReference but not in NodeReference type in this file.
    // If they should be part of NodeReference, the type definition needs an update.
    // For now, mapping only the fields present in the current NodeReference type.
  };
};
