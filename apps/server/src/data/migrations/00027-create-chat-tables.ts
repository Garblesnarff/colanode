import { Migration } from 'kysely';

export const createChatTables: Migration = {
  up: async (db) => {
    // Create chats table
    await db.schema
      .createTable('chats')
      .addColumn('id', 'varchar(36)', (col) => col.notNull().primaryKey())
      .addColumn('workspace_id', 'varchar(36)', (col) => col.notNull())
      .addColumn('name', 'varchar(500)', (col) => col.notNull())
      .addColumn('context_node_ids', 'jsonb', (col) => col.defaultTo('[]'))
      .addColumn('provider_config', 'jsonb', (col) => col.notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.notNull())
      .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
      .addColumn('updated_at', 'timestamptz')
      .addColumn('updated_by', 'varchar(36)')
      .execute();

    // Create chat_messages table
    await db.schema
      .createTable('chat_messages')
      .addColumn('id', 'varchar(36)', (col) => col.notNull().primaryKey())
      .addColumn('chat_id', 'varchar(36)', (col) => col.notNull())
      .addColumn('parent_id', 'varchar(36)')
      .addColumn('type', 'varchar(50)', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('context_node_ids', 'jsonb')
      .addColumn('citations', 'jsonb')
      .addColumn('provider_used', 'varchar(100)')
      .addColumn('model_used', 'varchar(100)')
      .addColumn('created_at', 'timestamptz', (col) => col.notNull())
      .addColumn('created_by', 'varchar(36)', (col) => col.notNull())
      .execute();

    // Add foreign key constraints
    await db.schema
      .alterTable('chats')
      .addForeignKeyConstraint(
        'chats_workspace_id_fk',
        ['workspace_id'],
        'workspaces',
        ['id']
      )
      .execute();

    await db.schema
      .alterTable('chats')
      .addForeignKeyConstraint(
        'chats_created_by_fk',
        ['created_by'],
        'users',
        ['id']
      )
      .execute();

    await db.schema
      .alterTable('chats')
      .addForeignKeyConstraint(
        'chats_updated_by_fk',
        ['updated_by'],
        'users',
        ['id']
      )
      .execute();

    await db.schema
      .alterTable('chat_messages')
      .addForeignKeyConstraint(
        'chat_messages_chat_id_fk',
        ['chat_id'],
        'chats',
        ['id']
      )
      .execute();

    await db.schema
      .alterTable('chat_messages')
      .addForeignKeyConstraint(
        'chat_messages_parent_id_fk',
        ['parent_id'],
        'chat_messages',
        ['id']
      )
      .execute();

    await db.schema
      .alterTable('chat_messages')
      .addForeignKeyConstraint(
        'chat_messages_created_by_fk',
        ['created_by'],
        'users',
        ['id']
      )
      .execute();

    // Create indexes
    await db.schema
      .createIndex('chats_workspace_id_idx')
      .on('chats')
      .column('workspace_id')
      .execute();

    await db.schema
      .createIndex('chats_created_by_idx')
      .on('chats')
      .column('created_by')
      .execute();

    await db.schema
      .createIndex('chat_messages_chat_id_idx')
      .on('chat_messages')
      .column('chat_id')
      .execute();

    await db.schema
      .createIndex('chat_messages_created_at_idx')
      .on('chat_messages')
      .column('created_at')
      .execute();
  },

  down: async (db) => {
    await db.schema.dropTable('chat_messages').execute();
    await db.schema.dropTable('chats').execute();
  },
};