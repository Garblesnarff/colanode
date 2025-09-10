// packages/core/src/registry/nodes/index.ts
/**
 * @file Aggregates and exports various Node entity types and their related models/attributes.
 * This file serves as a central point for accessing different concrete Node implementations
 * (like PageNode, FolderNode, etc.) and provides a union type `Node` representing any of them.
 * It also defines a base structure `NodeBase` common to all nodes and a utility function
 * `getNodeModel` to retrieve the Zod model for a given node type.
 */

import { ChannelAttributes, channelModel } from './channel';
import { ChatAttributes, chatModel } from './chat';
import { DatabaseAttributes, databaseModel } from './database';
import { DatabaseViewAttributes, databaseViewModel } from './database-view';
import { FileAttributes, fileModel } from './file';
import { FolderAttributes, folderModel } from './folder';
import { MessageAttributes, messageModel } from './message';
import { PageAttributes, pageModel } from './page';
import { RecordAttributes, recordModel } from './record';
import { SpaceAttributes, spaceModel } from './space';

/**
 * Defines the base properties common to all Node entities.
 * Each specific Node type (e.g., {@link PageNode}, {@link FolderNode}) will extend this base.
 *
 * @property id - Unique identifier for the node.
 * @property parentId - Identifier of the parent node. For root nodes in a workspace, this might be the workspace ID or a special root ID.
 * @property rootId - Identifier of the root node of the hierarchy this node belongs to (often a Workspace or Space ID).
 * @property createdAt - ISO 8601 timestamp of when the node was created.
 * @property createdBy - Identifier of the user who created the node.
 * @property updatedAt - ISO 8601 timestamp of the last update, or null if never updated.
 * @property updatedBy - Identifier of the user who last updated the node, or null.
 */
type NodeBase = {
  /** Unique identifier for the node. */
  id: string;
  /** Identifier of the parent node. */
  parentId: string;
  /** Identifier of the root of this node's hierarchy (e.g., Workspace or Space ID). */
  rootId: string;
  /** ISO 8601 string: Timestamp of creation. */
  createdAt: string;
  /** User ID of the creator. */
  createdBy: string;
  /** ISO 8601 string: Timestamp of last update, or `null`. */
  updatedAt: string | null;
  /** User ID of the last updater, or `null`. */
  updatedBy: string | null;
};

/** Represents a Channel Node, inheriting from {@link NodeBase} and containing channel-specific attributes. */
export type ChannelNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'channel';
  /** Channel-specific attributes. */
  attributes: ChannelAttributes;
};

/** Represents a Chat Node, inheriting from {@link NodeBase} and containing chat-specific attributes. */
export type ChatNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'chat';
  /** Chat-specific attributes. */
  attributes: ChatAttributes;
};

/** Represents a Database Node, inheriting from {@link NodeBase} and containing database-specific attributes. */
export type DatabaseNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'database';
  /** Database-specific attributes. */
  attributes: DatabaseAttributes;
};

/** Represents a Database View Node, inheriting from {@link NodeBase} and containing database view-specific attributes. */
export type DatabaseViewNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'database_view';
  /** Database view-specific attributes. */
  attributes: DatabaseViewAttributes;
};

/** Represents a Folder Node, inheriting from {@link NodeBase} and containing folder-specific attributes. */
export type FolderNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'folder';
  /** Folder-specific attributes. */
  attributes: FolderAttributes;
};

/** Represents a Page Node, inheriting from {@link NodeBase} and containing page-specific attributes. */
export type PageNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'page';
  /** Page-specific attributes. */
  attributes: PageAttributes;
};

/** Represents a Record Node (database entry), inheriting from {@link NodeBase} and containing record-specific attributes. */
export type RecordNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'record';
  /** Record-specific attributes. */
  attributes: RecordAttributes;
};

/** Represents a Space Node, inheriting from {@link NodeBase} and containing space-specific attributes. */
export type SpaceNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'space';
  /** Space-specific attributes. */
  attributes: SpaceAttributes;
};

/** Represents a Message Node (e.g., chat message), inheriting from {@link NodeBase} and containing message-specific attributes. */
export type MessageNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'message';
  /** Message-specific attributes. */
  attributes: MessageAttributes;
};

/** Represents a File Node, inheriting from {@link NodeBase} and containing file-specific attributes. */
export type FileNode = NodeBase & {
  /** Discriminator for the node type. */
  type: 'file';
  /** File-specific attributes. */
  attributes: FileAttributes;
};

/**
 * Union type representing all possible string literal types for a Node (e.g., "page", "folder").
 * This is derived from the `type` property of the {@link NodeAttributes} union.
 */
export type NodeType = NodeAttributes['type'];

/**
 * A union type encompassing all possible attribute structures for the different node types.
 * Each specific attribute type (e.g., {@link SpaceAttributes}, {@link PageAttributes})
 * includes a `type` discriminator property.
 */
export type NodeAttributes =
  | SpaceAttributes
  | DatabaseAttributes
  | ChannelAttributes
  | ChatAttributes
  | FolderAttributes
  | PageAttributes
  | RecordAttributes
  | MessageAttributes
  | FileAttributes
  | DatabaseViewAttributes;

/**
 * A union type representing any concrete Node entity.
 * This allows for functions that can operate on any type of node,
 * often using the `type` property to determine the specific kind of node.
 */
export type Node =
  | SpaceNode
  | DatabaseNode
  | DatabaseViewNode
  | ChannelNode
  | ChatNode
  | FolderNode
  | PageNode
  | RecordNode
  | MessageNode
  | FileNode;

/**
 * Retrieves the Zod validation model for a given {@link NodeType}.
 * This function acts as a registry or factory for accessing the Zod schemas
 * associated with each specific node type.
 *
 * @param type The {@link NodeType} string discriminator (e.g., "page", "folder").
 * @returns The Zod model (schema) corresponding to the provided node type,
 *          or `undefined` if the type is not recognized.
 *
 * @example
 * const pageSchema = getNodeModel('page');
 * if (pageSchema) {
 *   pageSchema.parse(somePageData);
 * }
 */
export const getNodeModel = (type: NodeType) => {
  // This function maps a node type string to its corresponding Zod schema,
  // which is typically defined and exported alongside the node's attribute type.
  // e.g., channelModel from './channel.ts'
  switch (type) {
    case 'channel':
      return channelModel;
    case 'chat':
      return chatModel;
    case 'database':
      return databaseModel;
    case 'database_view':
      return databaseViewModel;
    case 'folder':
      return folderModel;
    case 'page':
      return pageModel;
    case 'record':
      return recordModel;
    case 'space':
      return spaceModel;
    case 'message':
      return messageModel;
    case 'file':
      return fileModel;
  }
};
