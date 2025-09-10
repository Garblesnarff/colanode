// packages/client/src/databases/emojis/schema.ts
/**
 * @file Defines the Kysely database schema for the local emojis database.
 * This database stores emoji data, including categories, individual emojis,
 * skin tone variations, SVG images, and a search index.
 * The data is likely pre-populated and read-only on the client.
 *
 * The `ColumnType<Type, InsertType, UpdateType>` structure is used by Kysely.
 * `never` for InsertType or UpdateType implies the column is not set during inserts
 * or is not updatable, respectively (e.g., generated columns or immutable data).
 * Given this is likely a read-only cache, most columns might be `never` for Insert/Update.
 */
import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Interface defining the structure of the `categories` table for emojis.
 *
 * @property id - Primary key. Unique identifier for the emoji category (e.g., "people", "nature").
 * @property name - Display name of the category (e.g., "Smileys & People").
 * @property count - Number of emojis in this category.
 * @property display_order - Integer for sorting categories in the UI.
 */
interface EmojiCategoriesTable {
  id: ColumnType<string, string, never>; // PK, insertable, not updatable
  name: ColumnType<string, string, never>;
  count: ColumnType<number, number, never>;
  display_order: ColumnType<number, number, never>;
}
/** Kysely type for selecting a row from the `categories` table. */
export type SelectEmojiCategory = Selectable<EmojiCategoriesTable>;
/** Kysely type for inserting a new row into the `categories` table. */
export type CreateEmojiCategory = Insertable<EmojiCategoriesTable>;
/** Kysely type for updating a row in the `categories` table. (Likely unused if read-only) */
export type UpdateEmojiCategory = Updateable<EmojiCategoriesTable>;


/**
 * Interface defining the structure of the `emojis` table.
 * Stores individual emoji characters and their metadata.
 *
 * @property id - Primary key. Unique identifier for the emoji (e.g., "grinning_face").
 * @property category_id - Foreign key referencing `EmojiCategoriesTable.id`.
 * @property code - The Unicode character(s) for the emoji (e.g., "😀").
 * @property name - Descriptive name of the emoji (e.g., "Grinning Face").
 * @property tags - Comma-separated string of keywords for searching.
 * @property emoticons - Comma-separated string of text-based emoticons (e.g., ":D", ":-)").
 * @property skins - Comma-separated string of skin tone variant IDs available for this emoji, if any.
 */
interface EmojisTable {
  id: ColumnType<string, string, never>; // PK
  category_id: ColumnType<string, string, never>; // FK
  code: ColumnType<string, string, never>; // Unicode char
  name: ColumnType<string, string, never>;
  tags: ColumnType<string, string, never>; // CSV
  emoticons: ColumnType<string, string, never>; // CSV
  skins: ColumnType<string, string, never>; // CSV of skin_ids
}
/** Kysely type for selecting a row from the `emojis` table. */
export type SelectEmoji = Selectable<EmojisTable>;
/** Kysely type for inserting a new row into the `emojis` table. */
export type CreateEmoji = Insertable<EmojisTable>;
/** Kysely type for updating a row in the `emojis` table. */
export type UpdateEmoji = Updateable<EmojisTable>;


/**
 * Interface defining the structure of the `emoji_skins` table.
 * Maps skin tone variations to their base emoji.
 *
 * @property skin_id - Primary key. Unique identifier for the skin tone variant (e.g., "grinning_face_medium_skin_tone").
 * @property emoji_id - Foreign key referencing `EmojisTable.id` for the base emoji.
 */
interface EmojiSkinsTable {
  skin_id: ColumnType<string, string, never>; // PK
  emoji_id: ColumnType<string, string, never>; // FK to EmojisTable.id
}
/** Kysely type for selecting a row from the `emoji_skins` table. */
export type SelectEmojiSkin = Selectable<EmojiSkinsTable>;
/** Kysely type for inserting a new row into the `emoji_skins` table. */
export type CreateEmojiSkin = Insertable<EmojiSkinsTable>;
/** Kysely type for updating a row in the `emoji_skins` table. */
export type UpdateEmojiSkin = Updateable<EmojiSkinsTable>;


/**
 * Interface defining the structure of the `emoji_svgs` table.
 * Stores SVG image data for emojis, linked to either a base emoji or a skin tone variant.
 *
 * @property skin_id - Identifier of the emoji or skin variant this SVG belongs to. Could be an emoji_id or a skin_id. Primary Key.
 * @property emoji_id - Base emoji ID, useful for grouping or reference. (Potentially redundant if skin_id can also be base emoji_id)
 * @property svg - The SVG image data, stored as a Buffer or Blob.
 */
interface EmojiSvgsTable {
  skin_id: ColumnType<string, string, never>; // PK (refers to an emoji_id or a skin_id from EmojiSkinsTable)
  emoji_id: ColumnType<string, string, never>; // Base emoji_id this SVG is related to
  svg: ColumnType<Buffer, Buffer, never>; // SVG content as Buffer
}
/** Kysely type for selecting a row from the `emoji_svgs` table. */
export type SelectEmojiSvg = Selectable<EmojiSvgsTable>;
/** Kysely type for inserting a new row into the `emoji_svgs` table. */
export type CreateEmojiSvg = Insertable<EmojiSvgsTable>;
/** Kysely type for updating a row in the `emoji_svgs` table. */
export type UpdateEmojiSvg = Updateable<EmojiSvgsTable>;


/**
 * Interface defining the structure of the `emoji_search` table.
 * This table is likely a Full-Text Search (FTS) table or a denormalized table
 * to optimize emoji searching by name, tags, or emoticons.
 *
 * @property id - The ID of the emoji (foreign key to `EmojisTable.id`).
 * @property text - Concatenated string of searchable text (name, tags, emoticons) for the emoji.
 */
interface EmojiSearchTable {
  // This often is a rowid in FTS tables, but mapping to emoji id is common.
  id: ColumnType<string, string, never>; // FK to EmojisTable.id
  text: ColumnType<string, string, never>; // Searchable text
}
/** Kysely type for selecting a row from the `emoji_search` table. */
export type SelectEmojiSearch = Selectable<EmojiSearchTable>;
/** Kysely type for inserting a new row into the `emoji_search` table. */
export type CreateEmojiSearch = Insertable<EmojiSearchTable>;
/** Kysely type for updating a row in the `emoji_search` table. */
export type UpdateEmojiSearch = Updateable<EmojiSearchTable>;


/**
 * Defines the complete schema for the local emojis database.
 * Maps table names to their respective Kysely table interface definitions.
 */
export interface EmojiDatabaseSchema {
  emojis: EmojisTable;
  emoji_skins: EmojiSkinsTable;
  emoji_svgs: EmojiSvgsTable;
  categories: EmojiCategoriesTable;
  emoji_search: EmojiSearchTable;
}
