// packages/client/src/databases/workspace/migrations/index.ts
/**
 * @file Aggregates and exports all database migrations for workspace-specific local databases.
 * This file serves as a central Kysely migration registry for the schema defined in
 * `packages/client/src/databases/workspace/schema.ts`.
 */
import { Migration } from 'kysely';

// Import individual migration files. Each defines a Kysely `Migration` object.
import { createUsersTable } from './00001-create-users-table';
import { createNodesTable } from './00002-create-nodes-table';
import { createNodeStatesTable } from './00003-create-node-states-table';
import { createNodeUpdatesTable } from './00004-create-node-updates-table';
import { createNodeInteractionsTable } from './00005-create-node-interactions-table';
import { createNodeReactionsTable } from './00006-create-node-reactions-table';
import { createNodeTextsTable } from './00007-create-node-texts-table';
import { createDocumentsTable } from './00008-create-documents-table';
import { createDocumentStatesTable } from './00009-create-document-states-table';
import { createDocumentUpdatesTable } from './00010-create-document-updates-table';
import { createDocumentTextsTable } from './00011-create-document-texts-table';
import { createCollaborationsTable } from './00012-create-collaborations-table';
import { createFileStatesTable } from './00013-create-file-states-table';
import { createMutationsTable } from './00014-create-mutations-table';
import { createTombstonesTable } from './00015-create-tombstones-table';
import { createCursorsTable } from './00016-create-cursors-table';
import { createMetadataTable } from './00017-create-metadata-table';
import { createNodeReferencesTable } from './00018-create-node-references-table';
import { createNodeCountersTable } from './00019-create-node-counters-table';

/**
 * A record mapping migration identifiers (typically version numbers or descriptive names)
 * to their corresponding Kysely {@link Migration} objects for the workspace database.
 * The Kysely migrator uses this record to apply migrations in sequential order based on the keys.
 *
 * Each key (e.g., "00001-create-users-table") is used by Kysely to track applied migrations.
 * The associated value is a migration object with `up` and `down` methods defining schema changes.
 */
export const workspaceDatabaseMigrations: Record<string, Migration> = {
  /** Migration to create the `users` table for workspace members. */
  '00001-create-users-table': createUsersTable,
  /** Migration to create the `nodes` table for all workspace entities. */
  '00002-create-nodes-table': createNodesTable,
  /** Migration to create the `node_states` table for CRDT state of nodes. */
  '00003-create-node-states-table': createNodeStatesTable,
  /** Migration to create the `node_updates` table for CRDT updates to nodes. */
  '00004-create-node-updates-table': createNodeUpdatesTable,
  /** Migration to create the `node_interactions` table (seen, opened status). */
  '00005-create-node-interactions-table': createNodeInteractionsTable,
  /** Migration to create the `node_reactions` table for emoji reactions on nodes. */
  '00006-create-node-reactions-table': createNodeReactionsTable,
  /** Migration to create the `node_texts` table for FTS on node attributes. */
  '00007-create-node-texts-table': createNodeTextsTable,
  /** Migration to create the `documents` table for rich-text content associated with nodes. */
  '00008-create-documents-table': createDocumentsTable,
  /** Migration to create the `document_states` table for CRDT state of documents. */
  '00009-create-document-states-table': createDocumentStatesTable,
  /** Migration to create the `document_updates` table for CRDT updates to documents. */
  '00010-create-document-updates-table': createDocumentUpdatesTable,
  /** Migration to create the `document_texts` table for FTS on document content. */
  '00011-create-document-texts-table': createDocumentTextsTable,
  /** Migration to create the `collaborations` table for node-level collaborator roles. */
  '00012-create-collaborations-table': createCollaborationsTable,
  /** Migration to create the `file_states` table for tracking file upload/download states. */
  '00013-create-file-states-table': createFileStatesTable,
  /** Migration to create the `mutations` table for queueing local changes for sync. */
  '00014-create-mutations-table': createMutationsTable,
  /** Migration to create the `tombstones` table for tracking deleted entities. */
  '00015-create-tombstones-table': createTombstonesTable,
  /** Migration to create the `cursors` table for storing synchronization cursors. */
  '00016-create-cursors-table': createCursorsTable,
  /** Migration to create the `metadata` table for workspace-specific key-value settings. */
  '00017-create-metadata-table': createMetadataTable,
  /** Migration to create the `node_references` table for tracking links between nodes. */
  '00018-create-node-references-table': createNodeReferencesTable,
  /** Migration to create the `node_counters` table for aggregated counts on nodes. */
  '00019-create-node-counters-table': createNodeCountersTable,
  // Future migrations for the workspace database would be added here.
};
