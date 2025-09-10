// packages/core/src/registry/nodes/field-value.ts
/**
 * @file Defines Zod schemas and TypeScript types for the values stored in Database Record fields.
 * Each field value type corresponds to a basic data type (boolean, string, number, text, etc.)
 * and includes a `type` discriminator to identify the kind of value.
 */
import { z } from 'zod/v4';

import { ZodText } from '@colanode/core/registry/zod'; // Corrected import path

// --- Boolean Field Value ---
/** Zod schema for a boolean field value. */
export const booleanFieldValueSchema = z.object({
  /** Discriminator type, must be "boolean". */
  type: z.literal('boolean'),
  /** The boolean value. */
  value: z.boolean(),
});
/** TypeScript type for a boolean field value. */
export type BooleanFieldValue = z.infer<typeof booleanFieldValueSchema>;

// --- String Field Value ---
/** Zod schema for a simple string field value. */
export const stringFieldValueSchema = z.object({
  /** Discriminator type, must be "string". */
  type: z.literal('string'),
  /** The string value. */
  value: z.string(),
});
/** TypeScript type for a string field value. */
export type StringFieldValue = z.infer<typeof stringFieldValueSchema>;

// --- String Array Field Value ---
/** Zod schema for a field value that is an array of strings (e.g., for multi-select, tags). */
export const stringArrayFieldValueSchema = z.object({
  /** Discriminator type, must be "string_array". */
  type: z.literal('string_array'),
  /** The array of string values. */
  value: z.array(z.string()),
});
/** TypeScript type for a string array field value. */
export type StringArrayFieldValue = z.infer<typeof stringArrayFieldValueSchema>;

// --- Number Field Value ---
/** Zod schema for a numeric field value. */
export const numberFieldValueSchema = z.object({
  /** Discriminator type, must be "number". */
  type: z.literal('number'),
  /** The numeric value. */
  value: z.number(),
});
/** TypeScript type for a numeric field value. */
export type NumberFieldValue = z.infer<typeof numberFieldValueSchema>;

// --- Text Field Value (CRDT-enabled) ---
/**
 * Zod schema for a text field value that is intended for collaborative editing.
 * Uses {@link ZodText} to signify that this text should be handled by CRDT logic (e.g., Y.Text).
 */
export const textFieldValueSchema = z.object({
  /** Discriminator type, must be "text". */
  type: z.literal('text'),
  /** The collaborative text value. */
  value: new ZodText(),
});
/** TypeScript type for a collaborative text field value. */
export type TextFieldValue = z.infer<typeof textFieldValueSchema>;

/**
 * Zod discriminated union schema for all possible field value types.
 * The `type` property serves as the discriminator. This allows parsing
 * a field value object and determining its specific underlying data type.
 *
 * This union should be expanded as more field value types are introduced
 * (e.g., for Date, Collaborator, File, Relation fields).
 */
export const fieldValueSchema = z.discriminatedUnion('type', [
  booleanFieldValueSchema,
  stringFieldValueSchema,
  stringArrayFieldValueSchema,
  numberFieldValueSchema,
  textFieldValueSchema,
  // TODO: Add schemas for other field types as they are implemented, e.g.:
  // dateFieldValueSchema, (value: z.string().datetime() or z.date())
  // collaboratorFieldValueSchema, (value: z.string() for userId)
  // fileFieldValueSchema, (value: z.array(z.object({ fileId: z.string(), name: z.string(), ... })))
  // relationFieldValueSchema, (value: z.array(z.string()) for related record IDs)
]);

/**
 * TypeScript union type representing any possible field value structure.
 * Inferred from the `fieldValueSchema` discriminated union.
 */
export type FieldValue = z.infer<typeof fieldValueSchema>;

/**
 * Extracts a union of all possible string literal types for field values
 * (e.g., "boolean", "string", "text").
 */
export type FieldValueType = FieldValue['type'];
