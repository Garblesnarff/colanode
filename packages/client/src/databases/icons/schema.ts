// packages/client/src/databases/icons/schema.ts
/**
 * @file Defines the Kysely database schema for the local icons database.
 * This database stores icon data, including categories, individual icon metadata,
 * SVG images, and a search index.
 * The data is likely pre-populated and primarily read-only on the client side.
 *
 * Kysely's `ColumnType<Type, InsertType, UpdateType>` is used.
 * `never` for InsertType or UpdateType suggests columns not set during inserts or not updatable.
 */
import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Interface defining the structure of the `categories` table for icons.
 *
 * @property id - Primary key. Unique identifier for the icon category (e.g., "arrows", "files").
 * @property name - Display name of the category (e.g., "Arrows & Navigation").
 * @property count - Number of icons in this category.
 * @property display_order - Integer for sorting categories in the UI.
 */
interface IconCategoriesTable {
  /** Primary Key: Unique ID for the icon category. */
  id: ColumnType<string, string, never>; // PK, insertable, not updatable
  /** Display name of the category. */
  name: ColumnType<string, string, never>;
  /** Number of icons within this category. */
  count: ColumnType<number, number, never>;
  /** Order for displaying categories. */
  display_order: ColumnType<number, number, never>;
}
/** Kysely type for selecting a row from the `categories` (icon categories) table. */
export type SelectIconCategory = Selectable<IconCategoriesTable>;
/** Kysely type for inserting a new row into the `categories` table. */
export type CreateIconCategory = Insertable<IconCategoriesTable>;
/** Kysely type for updating a row in the `categories` table. (Likely unused if read-only) */
export type UpdateIconCategory = Updateable<IconCategoriesTable>;


/**
 * Interface defining the structure of the `icons` table.
 * Stores metadata for individual icons.
 *
 * @property id - Primary key. Unique identifier for the icon (e.g., "arrow_left", "file_document").
 * @property category_id - Foreign key referencing `IconCategoriesTable.id`.
 * @property code - A code or keyword for the icon (e.g., its name in an icon font or library).
 * @property name - Descriptive name of the icon (e.g., "Arrow Left", "Document File").
 * @property tags - Comma-separated string of keywords for searching.
 */
interface IconsTable {
  /** Primary Key: Unique ID for the icon. */
  id: ColumnType<string, string, never>; // PK
  /** Foreign Key: ID of the category this icon belongs to. */
  category_id: ColumnType<string, string, never>; // FK
  /** Code or identifier for the icon (e.g., from an icon set). */
  code: ColumnType<string, string, never>;
  /** Descriptive name of the icon. */
  name: ColumnType<string, string, never>;
  /** Comma-separated list of search tags. */
  tags: ColumnType<string, string, never>; // CSV
}
/** Kysely type for selecting a row from the `icons` table. */
export type SelectIcon = Selectable<IconsTable>;
/** Kysely type for inserting a new row into the `icons` table. */
export type CreateIcon = Insertable<IconsTable>;
/** Kysely type for updating a row in the `icons` table. */
export type UpdateIcon = Updateable<IconsTable>;


/**
 * Interface defining the structure of the `icon_svgs` table.
 * Stores SVG image data for icons.
 *
 * @property id - Primary key. The ID of the icon this SVG belongs to (foreign key to `IconsTable.id`).
 * @property svg - The SVG image data, stored as a Buffer or text.
 */
interface IconSvgsTable {
  /** Primary Key & Foreign Key: ID of the icon this SVG data represents. */
  id: ColumnType<string, string, never>; // PK, FK to IconsTable.id
  /** SVG image content, stored as a Buffer or text. */
  svg: ColumnType<Buffer, Buffer, never>; // SVG content as Buffer
}
/** Kysely type for selecting a row from the `icon_svgs` table. */
export type SelectIconSvg = Selectable<IconSvgsTable>;
/** Kysely type for inserting a new row into the `icon_svgs` table. */
export type CreateIconSvg = Insertable<IconSvgsTable>;
/** Kysely type for updating a row in the `icon_svgs` table. */
export type UpdateIconSvg = Updateable<IconSvgsTable>;


/**
 * Interface defining the structure of the `icon_search` table.
 * Likely an FTS (Full-Text Search) table or denormalized table for optimizing icon searches.
 *
 * @property id - The ID of the icon (foreign key to `IconsTable.id`).
 * @property text - Concatenated string of searchable text (name, tags, code) for the icon.
 */
interface IconSearchTable {
  /** Foreign Key: ID of the icon. Often corresponds to `rowid` in FTS tables. */
  id: ColumnType<string, string, never>; // FK to IconsTable.id
  /** Aggregated searchable text for the icon. */
  text: ColumnType<string, string, never>; // Searchable text
}
/** Kysely type for selecting a row from the `icon_search` table. */
export type SelectIconSearch = Selectable<IconSearchTable>;
/** Kysely type for inserting a new row into the `icon_search` table. */
export type CreateIconSearch = Insertable<IconSearchTable>;
/** Kysely type for updating a row in the `icon_search` table. */
export type UpdateIconSearch = Updateable<IconSearchTable>;


/**
 * Defines the complete schema for the local icons database.
 * Maps table names to their respective Kysely table interface definitions.
 */
export interface IconDatabaseSchema {
  /** Table storing individual icon metadata. */
  icons: IconsTable;
  /** Table storing SVG data for icons. */
  icon_svgs: IconSvgsTable;
  /** Table storing icon categories. */
  categories: IconCategoriesTable;
  /** Table for full-text search or optimized searching of icons. */
  icon_search: IconSearchTable;
}
