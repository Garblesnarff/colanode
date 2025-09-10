// packages/client/src/databases/workspace/schema.ts
/**
 * @file Defines the Kysely database schema for workspace-specific local databases.
 * Each workspace database stores all data relevant to that workspace, including
 * users, nodes (pages, folders, etc.), node content (states, updates), interactions,
 * documents, collaboration data, file states, pending mutations, tombstones for deletions,
 * synchronization cursors, and workspace-specific metadata.
 *
 * Kysely's `ColumnType<Type, InsertType, UpdateType>` is used throughout.
 * `never` for InsertType or UpdateType indicates columns that are not directly set
 * on insert or are not updatable (e.g., generated IDs, immutable fields).
 * Timestamps are generally stored as ISO 8601 strings.
 */
import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

// Assuming these types are correctly imported and defined elsewhere
import { DownloadStatus, UploadStatus } from '@colanode/client/types/files';
import { NodeCounterType } from '@colanode/client/types/nodes';
import {
  MutationType,
  NodeType,
  WorkspaceRole,
  UserStatus,
  DocumentType,
} from '@colanode/core'; // These should point to where these core enums/types are defined

// --- Users Table ---
/**
 * Defines the structure of the `users` table within a workspace database.
 * Stores information about users who are members of this specific workspace.
 *
 * @property id - Primary Key. Unique identifier for the user within this workspace (could be the global Account ID or a specific UserWorkspaceLink ID).
 * @property email - User's email address. Typically not updatable here.
 * @property name - User's global display name.
 * @property avatar - Optional URL for the user's global avatar.
 * @property custom_name - Optional custom display name for the user within this workspace.
 * @property custom_avatar - Optional custom avatar URL for the user within this workspace.
 * @property role - User's {@link WorkspaceRole} in this workspace.
 * @property status - User's {@link UserStatus} in this workspace (e.g., Active, Removed).
 * @property created_at - ISO 8601 timestamp: When the user was added to this workspace. Not updatable.
 * @property updated_at - ISO 8601 timestamp: Last update to workspace-specific user details. Nullable.
 * @property revision - Revision identifier for optimistic concurrency control or sync state.
 */
interface UserTable {
  id: ColumnType<string, string, never>; // PK
  email: ColumnType<string, string, never>;
  name: ColumnType<string, string, string>;
  avatar: ColumnType<string | null, string | null, string | null>;
  custom_name: ColumnType<string | null, string | null, string | null>;
  custom_avatar: ColumnType<string | null, string | null, string | null>;
  role: ColumnType<WorkspaceRole, WorkspaceRole, WorkspaceRole>;
  status: ColumnType<UserStatus, UserStatus, UserStatus>;
  created_at: ColumnType<string, string, never>; // ISO 8601 string
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
  revision: ColumnType<string, string, string>;
}
export type SelectUser = Selectable<UserTable>;
export type CreateUser = Insertable<UserTable>;
export type UpdateUser = Updateable<UserTable>;

// --- Nodes Table ---
/**
 * Defines the structure of the `nodes` table.
 * Stores metadata for all nodes (pages, folders, databases, etc.) within the workspace.
 *
 * @property id - Primary Key. Unique identifier for the node.
 * @property type - The {@link NodeType} (e.g., "page", "folder"). Not updatable.
 * @property parent_id - ID of the parent node. Nullable for root nodes within a space. Not updatable.
 * @property root_id - ID of the ultimate root of this node's hierarchy (e.g., Space ID). Not updatable.
 * @property attributes - Serialized JSON string of the node's specific attributes (e.g., PageAttributes, FolderAttributes).
 * @property local_revision - Revision identifier for the local state of the node.
 * @property server_revision - Revision identifier for the server state of the node, used for synchronization.
 * @property created_at - ISO 8601 timestamp: Node creation time. Not updatable.
 * @property updated_at - ISO 8601 timestamp: Last update time for node attributes. Nullable.
 * @property created_by - ID of the user who created the node. Not updatable.
 * @property updated_by - ID of the user who last updated the node attributes. Nullable.
 */
interface NodeTable {
  id: ColumnType<string, string, never>; // PK
  type: ColumnType<NodeType, NodeType, never>; // NodeType is string literal union
  parent_id: ColumnType<string | null, string | null, never>;
  root_id: ColumnType<string, string, never>;
  attributes: ColumnType<string, string, string>; // JSON stringified NodeAttributes
  local_revision: ColumnType<string, string, string>;
  server_revision: ColumnType<string, string, string>;
  created_at: ColumnType<string, string, never>; // ISO 8601 string
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
  created_by: ColumnType<string, string, never>; // User ID
  updated_by: ColumnType<string | null, string | null, string | null>; // User ID
}
export type SelectNode = Selectable<NodeTable>;
export type CreateNode = Insertable<NodeTable>;
export type UpdateNode = Updateable<NodeTable>;

// --- Node States Table ---
/**
 * Defines the structure of the `node_states` table.
 * Stores the CRDT state (Yjs state vector) for nodes that support collaborative attributes.
 *
 * @property id - Primary Key. Foreign Key to `NodeTable.id`. Represents the node whose state this is.
 * @property state - The CRDT state as a Uint8Array (or Blob/Buffer depending on driver).
 * @property revision - Revision identifier associated with this state.
 */
interface NodeStateTable {
  id: ColumnType<string, string, never>; // PK, FK to nodes.id
  state: ColumnType<Uint8Array, Uint8Array, Uint8Array>;
  revision: ColumnType<string, string, string>;
}
export type SelectNodeState = Selectable<NodeStateTable>;
export type CreateNodeState = Insertable<NodeStateTable>;
export type UpdateNodeState = Updateable<NodeStateTable>;

// --- Node Updates Table ---
/**
 * Defines the structure of the `node_updates` table.
 * Stores individual CRDT updates (Yjs update blobs) for node attributes, queued for synchronization.
 *
 * @property id - Primary Key. Unique identifier for this update.
 * @property node_id - Foreign Key to `NodeTable.id`. The node this update applies to.
 * @property data - The CRDT update data as a Uint8Array. Not updatable.
 * @property created_at - ISO 8601 timestamp: When this update was generated. Not updatable.
 */
interface NodeUpdateTable {
  id: ColumnType<string, string, never>; // PK, unique update ID
  node_id: ColumnType<string, string, never>; // FK to nodes.id
  data: ColumnType<Uint8Array, Uint8Array, never>;
  created_at: ColumnType<string, string, never>; // ISO 8601 string
}
export type SelectNodeUpdate = Selectable<NodeUpdateTable>;
export type CreateNodeUpdate = Insertable<NodeUpdateTable>;
export type UpdateNodeUpdate = Updateable<NodeUpdateTable>; // Likely only specific fields updatable, if any.

// --- Node Interactions Table ---
/**
 * Defines the structure of the `node_interactions` table.
 * Tracks user interactions with nodes, like seen status and open times.
 * Composite Primary Key: (node_id, collaborator_id).
 *
 * @property node_id - Foreign Key to `NodeTable.id`.
 * @property collaborator_id - Foreign Key to `UserTable.id`. The user interacting.
 * @property root_id - Root ID of the node's hierarchy for context.
 * @property revision - Revision identifier for this interaction state.
 * @property first_seen_at - ISO 8601 timestamp: When the user first saw this version/node. Nullable.
 * @property last_seen_at - ISO 8601 timestamp: Last time user saw this version/node. Nullable.
 * @property first_opened_at - ISO 8601 timestamp: When user first opened this node. Nullable.
 * @property last_opened_at - ISO 8601 timestamp: Last time user opened this node. Nullable.
 */
interface NodeInteractionTable {
  node_id: ColumnType<string, string, never>; // Part of PK
  collaborator_id: ColumnType<string, string, never>; // Part of PK, User ID
  root_id: ColumnType<string, string, string>; // For context or partitioning
  revision: ColumnType<string, string, string>;
  first_seen_at: ColumnType<string | null, string | null, string | null>;
  last_seen_at: ColumnType<string | null, string | null, string | null>;
  first_opened_at: ColumnType<string | null, string | null, string | null>;
  last_opened_at: ColumnType<string | null, string | null, string | null>;
}
export type SelectNodeInteraction = Selectable<NodeInteractionTable>;
export type CreateNodeInteraction = Insertable<NodeInteractionTable>;
export type UpdateNodeInteraction = Updateable<NodeInteractionTable>;

// --- Node Reactions Table ---
/**
 * Defines the structure of the `node_reactions` table.
 * Stores user reactions (e.g., emojis) to nodes.
 * Composite Primary Key: (node_id, collaborator_id, reaction).
 *
 * @property node_id - Foreign Key to `NodeTable.id`.
 * @property collaborator_id - Foreign Key to `UserTable.id`. User who reacted.
 * @property reaction - The reaction string (e.g., emoji character or identifier).
 * @property root_id - Root ID of the node's hierarchy.
 * @property revision - Revision identifier for this reaction state.
 * @property created_at - ISO 8601 timestamp: When the reaction was added. Not updatable.
 */
interface NodeReactionTable {
  node_id: ColumnType<string, string, never>; // Part of PK
  collaborator_id: ColumnType<string, string, never>; // Part of PK, User ID
  reaction: ColumnType<string, string, string>; // Part of PK
  root_id: ColumnType<string, string, string>;
  revision: ColumnType<string, string, string>;
  created_at: ColumnType<string, string, never>; // ISO 8601 string
}
export type SelectNodeReaction = Selectable<NodeReactionTable>;
export type CreateNodeReaction = Insertable<NodeReactionTable>;
export type UpdateNodeReaction = Updateable<NodeReactionTable>; // Usually, reactions are created/deleted, not updated.

// --- Node References Table ---
/**
 * Defines the structure of the `node_references` table.
 * Tracks explicit references between nodes (e.g., links, mentions within content that are resolved to nodes).
 * Composite Primary Key: (node_id, reference_id, inner_id, type).
 *
 * @property node_id - ID of the node containing the reference (source).
 * @property reference_id - ID of the node being referenced (target).
 * @property inner_id - An ID for the reference itself if multiple identical references can exist (e.g., specific mention instance ID).
 * @property type - Type of reference (e.g., "link", "mention", "embed").
 * @property created_at - ISO 8601 timestamp: When the reference was created.
 * @property created_by - ID of the user who created the reference.
 */
interface NodeReferenceTable {
  node_id: ColumnType<string, string, never>; // Part of PK
  reference_id: ColumnType<string, string, never>; // Part of PK
  inner_id: ColumnType<string, string, never>; // Part of PK, e.g., block_id or mention_id
  type: ColumnType<string, string, string>; // Part of PK
  created_at: ColumnType<string, string, never>; // ISO 8601 string
  created_by: ColumnType<string, string, never>; // User ID
}
export type SelectNodeReference = Selectable<NodeReferenceTable>;
export type CreateNodeReference = Insertable<NodeReferenceTable>;
export type UpdateNodeReference = Updateable<NodeReferenceTable>; // References might not be updatable, only created/deleted.

// --- Node Counters Table ---
/**
 * Defines the structure of the `node_counters` table.
 * Stores aggregated counts related to nodes (e.g., number of children, unread messages, reactions).
 * Composite Primary Key: (node_id, type).
 *
 * @property node_id - Foreign Key to `NodeTable.id`.
 * @property type - The {@link NodeCounterType} (e.g., "children", "unread").
 * @property count - The numerical value of the counter.
 * @property created_at - ISO 8601 timestamp: When this counter entry was first created.
 * @property updated_at - ISO 8601 timestamp: Last time this counter was updated. Nullable.
 */
interface NodeCounterTable {
  node_id: ColumnType<string, string, never>; // Part of PK
  type: ColumnType<NodeCounterType, NodeCounterType, never>; // Part of PK
  count: ColumnType<number, number, number>;
  created_at: ColumnType<string, string, string>; // ISO 8601 string
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
}
export type SelectNodeCounter = Selectable<NodeCounterTable>;
export type CreateNodeCounter = Insertable<NodeCounterTable>;
export type UpdateNodeCounter = Updateable<NodeCounterTable>;

// --- Node Texts Table ---
/**
 * Defines the structure of the `node_texts` table.
 * Likely an FTS (Full-Text Search) table for node content (name, attributes).
 *
 * @property id - Primary Key. Foreign Key to `NodeTable.id`.
 * @property name - Name/title of the node, for searching. Nullable.
 * @property attributes - Other searchable text extracted from node attributes. Nullable.
 */
interface NodeTextTable {
  id: ColumnType<string, string, never>; // PK, FK to nodes.id
  name: ColumnType<string | null, string | null, string | null>;
  attributes: ColumnType<string | null, string | null, string | null>; // Concatenated searchable text
}
export type SelectNodeText = Selectable<NodeTextTable>;
export type CreateNodeText = Insertable<NodeTextTable>;
export type UpdateNodeText = Updateable<NodeTextTable>;

// --- Collaborations Table ---
/**
 * Defines the structure of the `collaborations` table.
 * Stores explicit collaborator roles on nodes, if not solely managed within node attributes.
 * Composite Primary Key: (node_id, role) - assuming role here means user_id or similar.
 * If `role` is `NodeRole`, then (node_id, user_id_representing_the_role) would be more typical.
 * This schema seems to imply `role` stores the user ID, and the actual role is implicit or stored elsewhere.
 * Re-interpreting based on common patterns: (node_id, user_id, role_type).
 * The current schema `role: ColumnType<string, string, string>` is ambiguous.
 * Assuming it means: node_id, user_id, role_name (NodeRole).
 * Let's adjust for a more standard (node_id, user_id) PK with role as an attribute.
 *
 * @property node_id - Foreign Key to `NodeTable.id`.
 * @property user_id - Foreign Key to `UserTable.id`. The collaborator. (Assuming this interpretation)
 * @property role - The {@link NodeRole} assigned to the user for this node.
 * @property revision - Revision identifier for this collaboration state.
 * @property created_at - ISO 8601 timestamp: When collaboration was established.
 * @property updated_at - ISO 8601 timestamp: Last update to this collaboration. Nullable.
 * @property deleted_at - ISO 8601 timestamp: If the collaboration was removed. Nullable (for soft deletes).
 */
interface CollaborationTable {
  // This table structure might be better if it explicitly links a user to a node with a role.
  // E.g., node_id (PK, FK), user_id (PK, FK), role (NodeRole)
  node_id: ColumnType<string, string, never>; // PK, FK to nodes.id
  // Assuming 'role' here might encompass user_id and their role, or needs user_id column.
  // For now, documenting as is, but it's unusual.
  // If 'role' is meant to be the NodeRole string, then a user_id column is missing for a proper link.
  // Let's assume a more standard structure for documentation clarity, and it might need fixing in code.
  // User_id: ColumnType<string, string, never>; // Example if user_id was missing
  role: ColumnType<string, string, string>; // This should ideally be NodeRole enum and linked to a user_id
  revision: ColumnType<string, string, string>;
  created_at: ColumnType<string, string, string>; // ISO 8601 string
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
  deleted_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
}
export type SelectCollaboration = Selectable<CollaborationTable>;
export type CreateCollaboration = Insertable<CollaborationTable>;
export type UpdateCollaboration = Updateable<CollaborationTable>;


// --- Documents Table ---
/**
 * Defines the structure of the `documents` table.
 * Stores metadata for rich-text documents associated with nodes (e.g., content of a PageNode).
 *
 * @property id - Primary Key. Foreign Key to `NodeTable.id` (the node owning this document).
 * @property type - The {@link DocumentType} (e.g., "rich_text"). Not updatable.
 * @property local_revision - Revision of the local document state.
 * @property server_revision - Revision of the server document state, for synchronization.
 * @property content - Serialized JSON string of the document's block structure (e.g., RichTextContent).
 * @property created_at - ISO 8601 timestamp: Document creation. Not updatable.
 * @property created_by - User ID of the creator. Not updatable.
 * @property updated_at - ISO 8601 timestamp: Last document update. Nullable.
 * @property updated_by - User ID of the last updater. Nullable.
 */
interface DocumentTable {
  id: ColumnType<string, string, never>; // PK, FK to nodes.id
  type: ColumnType<DocumentType, DocumentType, never>; // DocumentType is string literal union
  local_revision: ColumnType<string, string, string>;
  server_revision: ColumnType<string, string, string>;
  content: ColumnType<string, string, string>; // JSON stringified DocumentContent
  created_at: ColumnType<string, string, never>; // ISO 8601 string
  created_by: ColumnType<string, string, never>; // User ID
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
  updated_by: ColumnType<string | null, string | null, string | null>; // User ID
}
export type SelectDocument = Selectable<DocumentTable>;
export type CreateDocument = Insertable<DocumentTable>;
export type UpdateDocument = Updateable<DocumentTable>;

// --- Document States Table ---
/**
 * Defines the structure of the `document_states` table.
 * Stores CRDT state (Yjs state vector) for collaborative document content.
 *
 * @property id - Primary Key. Foreign Key to `DocumentTable.id`.
 * @property state - The CRDT state as a Uint8Array.
 * @property revision - Revision identifier for this document state.
 */
interface DocumentStateTable {
  id: ColumnType<string, string, never>; // PK, FK to documents.id
  state: ColumnType<Uint8Array, Uint8Array, Uint8Array>;
  revision: ColumnType<string, string, string>;
}
export type SelectDocumentState = Selectable<DocumentStateTable>;
export type CreateDocumentState = Insertable<DocumentStateTable>;
export type UpdateDocumentState = Updateable<DocumentStateTable>;

// --- Document Updates Table ---
/**
 * Defines the structure of the `document_updates` table.
 * Stores individual CRDT updates (Yjs update blobs) for document content, queued for synchronization.
 *
 * @property id - Primary Key. Unique identifier for this update.
 * @property document_id - Foreign Key to `DocumentTable.id`.
 * @property data - The CRDT update data as a Uint8Array. Not updatable.
 * @property created_at - ISO 8601 timestamp: When this update was generated. Not updatable.
 */
interface DocumentUpdateTable {
  id: ColumnType<string, string, never>; // PK, unique update ID
  document_id: ColumnType<string, string, never>; // FK to documents.id
  data: ColumnType<Uint8Array, Uint8Array, never>;
  created_at: ColumnType<string, string, never>; // ISO 8601 string
}
export type SelectDocumentUpdate = Selectable<DocumentUpdateTable>;
export type CreateDocumentUpdate = Insertable<DocumentUpdateTable>;
export type UpdateDocumentUpdate = Updateable<DocumentUpdateTable>; // Unlikely to be updated

// --- Document Texts Table ---
/**
 * Defines the structure of the `document_texts` table.
 * Likely an FTS table for the textual content of documents.
 *
 * @property id - Primary Key. Foreign Key to `DocumentTable.id`.
 * @property text - Extracted plain text from the document content for searching. Nullable.
 */
interface DocumentTextTable {
  id: ColumnType<string, string, never>; // PK, FK to documents.id
  text: ColumnType<string | null, string | null, string | null>;
}
export type SelectDocumentText = Selectable<DocumentTextTable>;
export type CreateDocumentText = Insertable<DocumentTextTable>;
export type UpdateDocumentText = Updateable<DocumentTextTable>;

// --- File States Table ---
/**
 * Defines the structure of the `file_states` table.
 * Tracks the local state of files, including download and upload progress and status.
 *
 * @property id - Primary Key. Foreign Key to a `NodeTable.id` of type 'file'.
 * @property version - Version identifier of the file this state pertains to.
 * @property download_status - Current {@link DownloadStatus} of the file. Nullable.
 * @property download_progress - Download progress (0-100). Nullable.
 * @property download_retries - Number of download retries attempted. Nullable.
 * @property download_started_at - ISO 8601 timestamp: When download started. Nullable.
 * @property download_completed_at - ISO 8601 timestamp: When download completed. Nullable.
 * @property upload_status - Current {@link UploadStatus} of the file. Nullable.
 * @property upload_progress - Upload progress (0-100). Nullable.
 * @property upload_retries - Number of upload retries attempted. Nullable.
 * @property upload_started_at - ISO 8601 timestamp: When upload started. Nullable.
 * @property upload_completed_at - ISO 8601 timestamp: When upload completed. Nullable.
 */
interface FileStateTable {
  id: ColumnType<string, string, never>; // PK, FK to nodes.id (where node type is 'file')
  version: ColumnType<string, string, string>; // File version identifier (e.g., server revision)
  download_status: ColumnType<DownloadStatus | null, DownloadStatus | null, DownloadStatus | null>;
  download_progress: ColumnType<number | null, number | null, number | null>;
  download_retries: ColumnType<number | null, number | null, number | null>;
  download_started_at: ColumnType<string | null, string | null, string | null>; // ISO 8601
  download_completed_at: ColumnType<string | null, string | null, string | null>; // ISO 8601
  upload_status: ColumnType<UploadStatus | null, UploadStatus | null, UploadStatus | null>;
  upload_progress: ColumnType<number | null, number | null, number | null>;
  upload_retries: ColumnType<number | null, number | null, number | null>;
  upload_started_at: ColumnType<string | null, string | null, string | null>; // ISO 8601
  upload_completed_at: ColumnType<string | null, string | null, string | null>; // ISO 8601
}
export type SelectFileState = Selectable<FileStateTable>;
export type CreateFileState = Insertable<FileStateTable>;
export type UpdateFileState = Updateable<FileStateTable>;

// --- Mutations Table ---
/**
 * Defines the structure of the `mutations` table.
 * Stores pending mutations (data changes) that need to be synchronized with the server.
 *
 * @property id - Primary Key. Unique identifier for the mutation.
 * @property type - The {@link MutationType} string discriminator. Not updatable.
 * @property data - Serialized JSON string of the mutation's specific data payload. Not updatable.
 * @property created_at - ISO 8601 timestamp: When the mutation was generated locally. Not updatable.
 * @property retries - Number of synchronization attempts made for this mutation.
 */
interface MutationTable {
  id: ColumnType<string, string, never>; // PK
  type: ColumnType<MutationType, MutationType, never>; // MutationType is string literal union
  data: ColumnType<string, string, never>; // JSON stringified mutation-specific data
  created_at: ColumnType<string, string, never>; // ISO 8601 string
  retries: ColumnType<number, number, number>;
}
export type SelectMutation = Selectable<MutationTable>;
export type CreateMutation = Insertable<MutationTable>;
export type UpdateMutation = Updateable<MutationTable>; // Only 'retries' likely updatable

// --- Tombstones Table ---
/**
 * Defines the structure of the `tombstones` table.
 * Stores records of deleted entities (nodes, documents, etc.) to ensure proper synchronization of deletions.
 *
 * @property id - Primary Key. The ID of the entity that was deleted.
 * @property data - Optional serialized JSON string of the entity's data at the time of deletion (for potential recovery or context). Not updatable.
 * @property deleted_at - ISO 8601 timestamp: When the entity was marked as deleted. Not updatable.
 */
interface TombstoneTable {
  id: ColumnType<string, string, never>; // PK, ID of the deleted entity
  data: ColumnType<string, string, never>; // JSON string of the object at deletion time, or type of object
  deleted_at: ColumnType<string, string, never>; // ISO 8601 string
}
export type SelectTombsonte = Selectable<TombstoneTable>;
export type CreateTombstone = Insertable<TombstoneTable>;
export type UpdateTombstone = Updateable<TombstoneTable>; // Tombstones are typically immutable.

// --- Cursors Table ---
/**
 * Defines the structure of the `cursors` table.
 * Stores synchronization cursors for various data types or synchronizers,
 * indicating the last successfully synced point.
 *
 * @property key - Primary Key. Unique key identifying the cursor (e.g., "nodes_sync_cursor", "user_activities_cursor").
 * @property value - The cursor string value itself.
 * @property created_at - ISO 8601 timestamp: When this cursor was first created.
 * @property updated_at - ISO 8601 timestamp: Last time this cursor was updated. Nullable.
 */
interface CursorTable {
  key: ColumnType<string, string, never>; // PK
  value: ColumnType<string, string, string>;
  created_at: ColumnType<string, string, string>; // ISO 8601 string
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
}
export type SelectCursor = Selectable<CursorTable>;
export type CreateCursor = Insertable<CursorTable>;
export type UpdateCursor = Updateable<CursorTable>;

// --- Metadata Table (Workspace-specific) ---
/**
 * Defines the structure of the `metadata` table within a workspace database.
 * A key-value store for settings or metadata specific to this workspace.
 *
 * @property key - Primary Key. The unique key for the metadata item.
 * @property value - The string value associated with the key.
 * @property created_at - ISO 8601 timestamp: When this metadata item was first created.
 * @property updated_at - ISO 8601 timestamp: Last update to this metadata item's value. Nullable.
 */
interface MetadataTable {
  key: ColumnType<string, string, never>; // PK
  value: ColumnType<string, string, string>;
  created_at: ColumnType<string, string, string>; // ISO 8601 string
  updated_at: ColumnType<string | null, string | null, string | null>; // ISO 8601 string
}
export type SelectWorkspaceMetadata = Selectable<MetadataTable>;
export type CreateWorkspaceMetadata = Insertable<MetadataTable>;
export type UpdateWorkspaceMetadata = Updateable<MetadataTable>;

/**
 * Defines the complete schema for a workspace-specific local database.
 * Maps table names to their respective Kysely table interface definitions.
 */
export interface WorkspaceDatabaseSchema {
  users: UserTable;
  nodes: NodeTable;
  node_states: NodeStateTable;
  node_interactions: NodeInteractionTable;
  node_updates: NodeUpdateTable;
  node_reactions: NodeReactionTable;
  node_references: NodeReferenceTable;
  node_counters: NodeCounterTable;
  node_texts: NodeTextTable; // For FTS on nodes
  documents: DocumentTable;
  document_states: DocumentStateTable;
  document_updates: DocumentUpdateTable;
  document_texts: DocumentTextTable; // For FTS on documents
  collaborations: CollaborationTable; // Or user_roles_on_nodes if more explicit
  file_states: FileStateTable;
  mutations: MutationTable; // Pending outgoing changes
  tombstones: TombstoneTable; // Records of deletions
  cursors: CursorTable; // Sync cursors
  metadata: MetadataTable; // Workspace-specific metadata
}
