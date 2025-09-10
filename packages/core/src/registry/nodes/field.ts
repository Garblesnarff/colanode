// packages/core/src/registry/nodes/field.ts
/**
 * @file Defines Zod schemas and TypeScript types for various types of Fields
 * that can be part of a Database Node. Each field type has a common structure
 * (id, type, name, index) and type-specific properties.
 */
import { z } from 'zod/v4';

/**
 * Zod schema for attributes of an option within a Select or MultiSelect field.
 *
 * @property id - Unique identifier for this select option.
 * @property name - The display name of the option.
 * @property color - A string representing the color associated with this option (e.g., hex code, color name).
 * @property index - Fractional index string for ordering this option among others in the same field.
 */
export const selectOptionAttributesSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Option name cannot be empty" }),
  color: z.string(), // Could be refined with z.regex(/^#([0-9a-f]{3}){1,2}$/i) for hex or an enum for named colors
  index: z.string(),
});

/** TypeScript type for attributes of a select option. */
export type SelectOptionAttributes = z.infer<
  typeof selectOptionAttributesSchema
>;

// --- Boolean Field ---
/** Zod schema for Boolean Field attributes. */
export const booleanFieldAttributesSchema = z.object({
  /** Unique identifier for the field. */
  id: z.string(),
  /** Discriminator type, must be "boolean". */
  type: z.literal('boolean'),
  /** Display name of the field. */
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  /** Fractional index for ordering this field among others in the database. */
  index: z.string(),
});
/** TypeScript type for Boolean Field attributes. */
export type BooleanFieldAttributes = z.infer<
  typeof booleanFieldAttributesSchema
>;

// --- Collaborator Field ---
/** Zod schema for Collaborator Field attributes. Values would typically be user IDs. */
export const collaboratorFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('collaborator'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Collaborator Field attributes. */
export type CollaboratorFieldAttributes = z.infer<
  typeof collaboratorFieldAttributesSchema
>;

// --- Created At Field ---
/** Zod schema for Created At Field attributes. Stores record creation timestamp. Read-only. */
export const createdAtFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('created_at'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Created At Field attributes. */
export type CreatedAtFieldAttributes = z.infer<
  typeof createdAtFieldAttributesSchema
>;

// --- Created By Field ---
/** Zod schema for Created By Field attributes. Stores ID of user who created the record. Read-only. */
export const createdByFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('created_by'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Created By Field attributes. */
export type CreatedByFieldAttributes = z.infer<
  typeof createdByFieldAttributesSchema
>;

// --- Date Field ---
/** Zod schema for Date Field attributes. */
export const dateFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('date'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  // Future properties: dateFormat (e.g., "YYYY-MM-DD"), timeFormat (e.g., "HH:mm"), includeTime (boolean)
});
/** TypeScript type for Date Field attributes. */
export type DateFieldAttributes = z.infer<typeof dateFieldAttributesSchema>;

// --- Email Field ---
/** Zod schema for Email Field attributes. */
export const emailFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('email'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Email Field attributes. */
export type EmailFieldAttributes = z.infer<typeof emailFieldAttributesSchema>;

// --- File Field ---
/** Zod schema for File Field attributes. Values would typically be arrays of file IDs or objects. */
export const fileFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('file'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for File Field attributes. */
export type FileFieldAttributes = z.infer<typeof fileFieldAttributesSchema>;

// --- Multi-Select Field ---
/** Zod schema for Multi-Select Field attributes. Allows selecting multiple options. */
export const multiSelectFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('multi_select'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  /** A record of available options for this multi-select field, keyed by option ID. */
  options: z.record(z.string(), selectOptionAttributesSchema).optional(),
});
/** TypeScript type for Multi-Select Field attributes. */
export type MultiSelectFieldAttributes = z.infer<
  typeof multiSelectFieldAttributesSchema
>;

// --- Number Field ---
/** Zod schema for Number Field attributes. */
export const numberFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('number'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  // Future properties: numberFormat (e.g., "integer", "decimal"), precision (number), prefix, suffix
});
/** TypeScript type for Number Field attributes. */
export type NumberFieldAttributes = z.infer<typeof numberFieldAttributesSchema>;

// --- Phone Field ---
/** Zod schema for Phone Field attributes. */
export const phoneFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('phone'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Phone Field attributes. */
export type PhoneFieldAttributes = z.infer<typeof phoneFieldAttributesSchema>;

// --- Relation Field ---
/** Zod schema for Relation Field attributes. Links records to another database. */
export const relationFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('relation'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  /** The ID of the database this field relates to. Optional if relation is configured later or for self-relations. */
  databaseId: z.string().optional().nullable(),
  // Future properties: relationType ("one-way", "two-way"), relatedFieldId (for two-way)
});
/** TypeScript type for Relation Field attributes. */
export type RelationFieldAttributes = z.infer<
  typeof relationFieldAttributesSchema
>;

// --- Rollup Field ---
/** Zod schema for Rollup Field attributes. Aggregates data from related records. */
export const rollupFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('rollup'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  // Future properties: relationFieldId, targetFieldId, aggregationFunction (e.g., "sum", "average", "count")
});
/** TypeScript type for Rollup Field attributes. */
export type RollupFieldAttributes = z.infer<typeof rollupFieldAttributesSchema>;

// --- Select Field ---
/** Zod schema for Select Field attributes. Allows selecting a single option. */
export const selectFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('select'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  /** A record of available options for this select field, keyed by option ID. */
  options: z.record(z.string(), selectOptionAttributesSchema).optional(),
});
/** TypeScript type for Select Field attributes. */
export type SelectFieldAttributes = z.infer<typeof selectFieldAttributesSchema>;

// --- Text Field ---
/** Zod schema for Text Field attributes. For single-line or multi-line text. */
export const textFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
  // Future properties: multiline (boolean)
});
/** TypeScript type for Text Field attributes. */
export type TextFieldAttributes = z.infer<typeof textFieldAttributesSchema>;

// --- URL Field ---
/** Zod schema for URL Field attributes. */
export const urlFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('url'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for URL Field attributes. */
export type UrlFieldAttributes = z.infer<typeof urlFieldAttributesSchema>;

// --- Updated At Field ---
/** Zod schema for Updated At Field attributes. Stores record last update timestamp. Read-only. */
export const updatedAtFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('updated_at'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Updated At Field attributes. */
export type UpdatedAtFieldAttributes = z.infer<
  typeof updatedAtFieldAttributesSchema
>;

// --- Updated By Field ---
/** Zod schema for Updated By Field attributes. Stores ID of user who last updated the record. Read-only. */
export const updatedByFieldAttributesSchema = z.object({
  id: z.string(),
  type: z.literal('updated_by'),
  name: z.string().min(1, { message: "Field name cannot be empty" }),
  index: z.string(),
});
/** TypeScript type for Updated By Field attributes. */
export type UpdatedByFieldAttributes = z.infer<
  typeof updatedByFieldAttributesSchema
>;

/**
 * Zod discriminated union schema for all possible field attribute types.
 * The `type` property serves as the discriminator.
 */
export const fieldAttributesSchema = z.discriminatedUnion('type', [
  booleanFieldAttributesSchema,
  collaboratorFieldAttributesSchema,
  createdAtFieldAttributesSchema,
  createdByFieldAttributesSchema,
  dateFieldAttributesSchema,
  emailFieldAttributesSchema,
  fileFieldAttributesSchema,
  multiSelectFieldAttributesSchema,
  numberFieldAttributesSchema,
  phoneFieldAttributesSchema,
  relationFieldAttributesSchema,
  rollupFieldAttributesSchema,
  selectFieldAttributesSchema,
  textFieldAttributesSchema,
  urlFieldAttributesSchema,
  updatedAtFieldAttributesSchema,
  updatedByFieldAttributesSchema,
]);

/**
 * TypeScript union type representing the attributes of any kind of field.
 * Inferred from the `fieldAttributesSchema` discriminated union.
 */
export type FieldAttributes = z.infer<typeof fieldAttributesSchema>;

/**
 * Extracts a union of all possible string literal field types (e.g., "text", "number", "date").
 */
export type FieldType = FieldAttributes['type']; // Correctly extracts the union of literal types
