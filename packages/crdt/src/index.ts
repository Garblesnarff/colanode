// packages/crdt/src/index.ts
/**
 * @file Main entry point for the `@colanode/crdt` package.
 *
 * This package encapsulates the core logic for Conflict-free Replicated Data Types (CRDTs),
 * primarily leveraging the Yjs library. It provides a `YDoc` class that serves as a
 * wrapper around Yjs documents, integrating with Zod schemas for type-safe operations
 * on collaborative data structures.
 *
 * Key functionalities include:
 * - Encoding and decoding Yjs document states and updates (to/from Uint8Array and base64 strings).
 * - Applying structured updates to a Yjs document based on a Zod schema.
 * - Handling nested objects, arrays, records (maps), and special Yjs text types (Y.Text).
 * - Implementing undo/redo functionality using Yjs's UndoManager.
 * - Diffing and applying changes to Y.Text objects.
 * - Abstracting away the direct complexities of Yjs for easier use in the application.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { diffChars } from 'diff';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { isEqual } from 'lodash-es';
import * as Y from 'yjs';
import { z } from 'zod/v4';

import { ZodText } from '@colanode/core';

/**
 * Encodes a Yjs state vector (Uint8Array) into a base64 string.
 * This is useful for storing or transmitting Yjs states in text format.
 * @param state The Yjs state vector as a Uint8Array.
 * @returns The base64 encoded string representation of the state.
 */
export const encodeState = (state: Uint8Array): string => {
  return fromUint8Array(state);
};

/**
 * Decodes a base64 string representation of a Yjs state back into a Uint8Array.
 * This is used to restore a Yjs state from its string format.
 * @param state The base64 encoded string.
 * @returns The Yjs state vector as a Uint8Array.
 */
export const decodeState = (state: string): Uint8Array => {
  return toUint8Array(state);
};

/**
 * Defines the origin identifier for transactions made by the current client.
 * This helps Yjs's UndoManager track changes made locally versus those
 * received from other clients.
 */
const ORIGIN = 'this';

/**
 * Represents a Yjs document, providing an abstraction layer for CRDT operations.
 * It integrates with Zod schemas for type-safe manipulation of shared data
 * and manages Yjs-specific functionalities like updates, undo/redo, and state encoding.
 *
 * The internal structure of the Yjs document managed by `YDoc` typically consists
 * of a single root-level Y.Map named 'object', which holds the collaborative data.
 */
export class YDoc {
  /** The underlying Yjs document instance. */
  private readonly doc: Y.Doc;
  /** Manages undo/redo operations for the Yjs document. */
  private readonly undoManager: Y.UndoManager;

  /**
   * Creates a new YDoc instance.
   * Optionally initializes the document with a given state or a series of updates.
   * @param state Optional initial state or updates. Can be a single Uint8Array/string
   *              or an array of Uint8Array/string updates to be applied sequentially.
   *              Strings are assumed to be base64 encoded Yjs updates.
   */
  constructor(state?: Uint8Array | string | Uint8Array[] | string[]) {
    this.doc = new Y.Doc();
    this.undoManager = new Y.UndoManager(this.doc, {
      trackedOrigins: new Set([ORIGIN]), // Track only local changes for undo/redo
    });

    if (state) {
      if (Array.isArray(state)) {
        // Apply an array of updates
        for (const update of state) {
          Y.applyUpdate(
            this.doc,
            typeof update === 'string' ? decodeState(update) : update
          );
        }
      } else {
        // Apply a single initial state or update
        Y.applyUpdate(
          this.doc,
          typeof state === 'string' ? decodeState(state) : state
        );
      }
    }
  }

  /**
   * Applies changes to the Yjs document based on the provided schema and object.
   * This method compares the given `object` with the current state of the Yjs document
   * and generates a Yjs update if there are any differences.
   * The changes are applied transactionally.
   *
   * @template S - The Zod schema type.
   * @param schema The Zod schema defining the structure of the object. Must be a `z.ZodObject`.
   * @param object The new state of the object to apply.
   * @returns A `Uint8Array` representing the Yjs update if changes were made, otherwise `null`.
   * @throws If the provided `object` is invalid according to the `schema`.
   * @throws If the `schema` is not a `z.ZodObject`.
   * @throws If the internal Yjs document state becomes invalid after applying changes.
   * @throws If more than one Yjs update is generated in a single transaction (should not happen).
   */
  public update<S extends z.ZodSchema>(
    schema: S,
    object: z.infer<S>
  ): Uint8Array | null {
    // Validate the input object against the schema
    const validationResult = schema.safeParse(object);
    if (!validationResult.success) {
      throw new Error(
        'Invalid object provided to YDoc.update',
        validationResult.error
      );
    }

    // Ensure the base schema is a ZodObject, after unwrapping optionals/nullables.
    const objectSchema = this.extractType(schema, object);
    if (!(objectSchema instanceof z.ZodObject)) {
      throw new Error(
        'Base schema provided to YDoc.update must be a ZodObject.'
      );
    }

    const updates: Uint8Array[] = [];
    const onUpdateCallback = (update: Uint8Array): void => {
      updates.push(update);
    };

    this.doc.on('update', onUpdateCallback);

    // All collaborative data is stored under a root Y.Map named 'object'.
    const rootMap = this.doc.getMap('object');
    this.doc.transact(() => {
      // Recursively apply changes to the Yjs document based on the input object and schema.
      this.applyObjectChanges(
        objectSchema as z.ZodObject<any, any, any>, // Cast is safe due to prior check
        object,
        rootMap
      );

      // Post-transaction validation: ensure the Yjs doc's JSON representation still matches the schema.
      // This is a sanity check. If this fails, it indicates a bug in the `apply*Changes` logic
      // or an incompatibility between the Zod schema and how Yjs structures are being built.
      const finalState = rootMap.toJSON();
      const finalValidationResult = schema.safeParse(finalState);
      if (!finalValidationResult.success) {
        // This indicates an internal inconsistency or a bug in applyObjectChanges.
        console.error('YDoc internal state mismatch after update:', {
          expectedObject: object,
          actualYjsJson: finalState,
          validationError: finalValidationResult.error.errors,
        });
        throw new Error(
          'Internal YDoc state became invalid after applying changes.',
          finalValidationResult.error
        );
      }
    }, ORIGIN); // ORIGIN ensures UndoManager can track this transaction

    this.doc.off('update', onUpdateCallback);

    if (updates.length === 0) {
      return null; // No changes were made
    }

    // A single transaction should ideally produce a single cumulative update.
    // If multiple updates are generated, it might indicate an issue or an unexpected Yjs behavior.
    if (updates.length > 1) {
      console.warn(
        `YDoc.update generated ${updates.length} updates in a single transaction. Merging them.`
      );
      return Y.mergeUpdates(updates);
    }

    const update = updates[0];
    if (!update) {
      // This case should ideally not be reached if updates.length > 0
      throw new Error('No Yjs update found despite changes being made.');
    }

    return update;
  }

  /**
   * Undoes the last local transaction.
   * Relies on Yjs's UndoManager to revert changes.
   * @returns A `Uint8Array` representing the Yjs update for the undo operation, or `null` if no operation to undo or no update generated.
   * @throws If more than one Yjs update is generated by the undo operation.
   */
  public undo(): Uint8Array | null {
    const updates: Uint8Array[] = [];
    const onUpdateCallback = (update: Uint8Array): void => {
      updates.push(update);
    };

    this.doc.on('update', onUpdateCallback);
    const canUndo = this.undoManager.undo();
    this.doc.off('update', onUpdateCallback);

    if (!canUndo || updates.length === 0) {
      return null; // Nothing to undo or no update generated
    }

    if (updates.length > 1) {
      console.warn(
        `YDoc.undo generated ${updates.length} updates. Merging them.`
      );
      return Y.mergeUpdates(updates);
    }

    return updates[0] || null;
  }

  /**
   * Redoes the last undone local transaction.
   * Relies on Yjs's UndoManager to reapply changes.
   * @returns A `Uint8Array` representing the Yjs update for the redo operation, or `null` if no operation to redo or no update generated.
   * @throws If more than one Yjs update is generated by the redo operation.
   */
  public redo(): Uint8Array | null {
    const updates: Uint8Array[] = [];
    const onUpdateCallback = (update: Uint8Array): void => {
      updates.push(update);
    };

    this.doc.on('update', onUpdateCallback);
    const canRedo = this.undoManager.redo();
    this.doc.off('update', onUpdateCallback);

    if (!canRedo || updates.length === 0) {
      return null; // Nothing to redo or no update generated
    }

    if (updates.length > 1) {
      console.warn(
        `YDoc.redo generated ${updates.length} updates. Merging them.`
      );
      return Y.mergeUpdates(updates);
    }

    return updates[0] || null;
  }

  /**
   * Retrieves the current state of the Yjs document as a plain JavaScript object.
   * The object is constructed by serializing the root Y.Map ('object') to JSON.
   * @template T The expected type of the returned object.
   * @returns The JavaScript object representation of the Yjs document's content.
   */
  public getObject<T>(): T {
    const rootMap = this.doc.getMap('object');
    return rootMap.toJSON() as T;
  }

  /**
   * Applies a Yjs update to the document.
   * The update can be a `Uint8Array` or a base64 encoded string.
   * @param update The Yjs update to apply.
   */
  public applyUpdate(update: Uint8Array | string): void {
    Y.applyUpdate(
      this.doc,
      typeof update === 'string' ? decodeState(update) : update
    );
  }

  /**
   * Gets the entire state of the Yjs document encoded as a single update `Uint8Array`.
   * This is useful for persisting the document or sending its full state.
   * @returns The complete document state as a Yjs update `Uint8Array`.
   */
  public getState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Gets the entire state of the Yjs document encoded as a base64 string.
   * @returns The complete document state as a base64 encoded string.
   */
  public getEncodedState(): string {
    return encodeState(this.getState());
  }

  /**
   * Recursively applies changes from a JavaScript object (`attributes`) to a Y.Map (`yMap`),
   * guided by a Zod schema (`schema`).
   * This method handles nested objects, arrays, records, Y.Text, and primitive types.
   *
   * @private
   * @param schema The ZodObject schema for the current level of attributes.
   * @param attributes The JavaScript object containing new values.
   * @param yMap The Y.Map instance to update.
   * @throws If value types do not match schema definitions (e.g., expecting object, got string).
   */
  private applyObjectChanges(
    schema: z.ZodObject<any, any, any>,
    attributes: Record<string, any>,
    yMap: Y.Map<any>
  ): void {
    // Apply updates for keys present in the new attributes
    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined) {
        // If new value is null/undefined, delete from Y.Map if it exists
        if (yMap.has(key)) {
          yMap.delete(key);
        }
        continue;
      }

      // Determine the Zod type for the current field, unwrapping optionals/nullables.
      // This is important for handling unions or optional fields correctly.
      const fieldSchema = this.extractType(schema.shape[key], value);

      // Based on the determined Zod type, map to the appropriate Yjs shared type
      // or recursively call the appropriate `apply*Changes` method.
      if (fieldSchema instanceof z.ZodObject) {
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(
            `Type mismatch for key "${key}": expected object, got ${typeof value}`
          );
        }
        // Ensure a Y.Map exists for this nested object.
        let nestedMap = yMap.get(key) as Y.Map<any> | undefined;
        if (!(nestedMap instanceof Y.Map)) {
          nestedMap = new Y.Map();
          yMap.set(key, nestedMap);
        }
        this.applyObjectChanges(fieldSchema, value, nestedMap);
      } else if (fieldSchema instanceof z.ZodRecord) {
        // ZodRecord maps to Y.Map in Yjs.
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(
            `Type mismatch for key "${key}": expected record object, got ${typeof value}`
          );
        }
        let recordMap = yMap.get(key) as Y.Map<any> | undefined;
        if (!(recordMap instanceof Y.Map)) {
          recordMap = new Y.Map();
          yMap.set(key, recordMap);
        }
        this.applyRecordChanges(fieldSchema, value, recordMap);
      } else if (fieldSchema instanceof z.ZodArray) {
        // ZodArray maps to Y.Array in Yjs.
        if (!Array.isArray(value)) {
          throw new Error(
            `Type mismatch for key "${key}": expected array, got ${typeof value}`
          );
        }
        let yArray = yMap.get(key) as Y.Array<any> | undefined;
        if (!(yArray instanceof Y.Array)) {
          yArray = new Y.Array();
          yMap.set(key, yArray);
        }
        this.applyArrayChanges(fieldSchema, value, yArray);
      } else if (fieldSchema instanceof ZodText) {
        // Custom ZodText type signals that this string should be a Y.Text for collaborative text editing.
        if (typeof value !== 'string') {
          throw new Error(
            `Type mismatch for key "${key}": expected string for ZodText, got ${typeof value}`
          );
        }
        let yText = yMap.get(key) as Y.Text | undefined;
        if (!(yText instanceof Y.Text)) {
          yText = new Y.Text();
          yMap.set(key, yText);
        }
        this.applyTextChanges(value, yText); // Diff and apply changes to Y.Text
      } else {
        // For primitive types (string, number, boolean) or other Zod types not handled above,
        // set the value directly on the Y.Map if it has changed.
        const currentValue = yMap.get(key);
        if (!isEqual(currentValue, value)) {
          yMap.set(key, value);
        }
      }
    }

    // After processing all keys from the input `attributes`, remove any keys from the Y.Map
    // that are no longer present in `attributes`. This handles deletions of properties.
    const attributeKeys = new Set(Object.keys(attributes));
    for (const yMapKey of Array.from(yMap.keys())) {
      if (!attributeKeys.has(yMapKey)) {
        yMap.delete(yMapKey);
      }
    }
  }

  /**
   * Recursively applies changes from a JavaScript array (`value`) to a Y.Array (`yArray`),
   * guided by a ZodArray schema (`schemaField`).
   * Handles nested objects, arrays, records, Y.Text, and primitive types within the array.
   *
   * @private
   * @param schemaField The ZodArray schema for the current array.
   * @param value The JavaScript array containing new values.
   * @param yArray The Y.Array instance to update.
   */
  private applyArrayChanges(
    schemaField: z.ZodArray<any, any>,
    value: Array<any>,
    yArray: Y.Array<any>
  ): void {
    const itemSchema = this.extractType(schemaField.element, value); // Infer item schema (can be union)
    const newLength = value.length;
    const currentLength = yArray.length;

    // Update existing or insert new items
    for (let i = 0; i < newLength; i++) {
      const itemValue = value[i];
      const concreteItemSchema = this.extractType(itemSchema, itemValue); // Resolve actual type for item

      if (itemValue === null || itemValue === undefined) {
        if (i < currentLength && yArray.get(i) !== null && yArray.get(i) !== undefined) {
          yArray.delete(i, 1);
          yArray.insert(i, [null]); // Maintain sparse array structure if Yjs supports it this way
        } else if (i >= currentLength) {
          yArray.insert(i, [null]);
        }
        continue;
      }

      let currentYjsItem = i < currentLength ? yArray.get(i) : undefined;

      if (concreteItemSchema instanceof z.ZodObject) {
        if (typeof itemValue !== 'object' || Array.isArray(itemValue)) throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Map)) {
          currentYjsItem = new Y.Map();
          if (i < currentLength) yArray.delete(i,1);
          yArray.insert(i, [currentYjsItem]);
        }
        this.applyObjectChanges(concreteItemSchema, itemValue, currentYjsItem);
      } else if (concreteItemSchema instanceof z.ZodRecord) {
         if (typeof itemValue !== 'object' || Array.isArray(itemValue)) throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Map)) {
          currentYjsItem = new Y.Map();
          if (i < currentLength) yArray.delete(i,1);
          yArray.insert(i, [currentYjsItem]);
        }
        this.applyRecordChanges(concreteItemSchema, itemValue, currentYjsItem);
      } else if (concreteItemSchema instanceof ZodText) {
        if (typeof itemValue !== 'string') throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Text)) {
          currentYjsItem = new Y.Text();
           if (i < currentLength) yArray.delete(i,1);
          yArray.insert(i, [currentYjsItem]);
        }
        this.applyTextChanges(itemValue, currentYjsItem);
      } else { // Primitive
        if (i < currentLength) {
          if (!isEqual(currentYjsItem, itemValue)) {
            yArray.delete(i, 1);
            yArray.insert(i, [itemValue]);
          }
        } else {
          yArray.insert(i, [itemValue]);
        }
      }
    }

    // Remove extra items from the end of yArray
    if (currentLength > newLength) {
      yArray.delete(newLength, currentLength - newLength);
    }
  }

  /**
   * Recursively applies changes from a JavaScript record object (`record`) to a Y.Map (`yMap`),
   * guided by a ZodRecord schema (`schemaField`). This is for `z.record(keyType, valueType)`.
   *
   * @private
   * @param schemaField The ZodRecord schema for the current record.
   * @param record The JavaScript object representing the record.
   * @param yMap The Y.Map instance to update (representing the record).
   */
  private applyRecordChanges(
    schemaField: z.ZodRecord<z.ZodTypeAny, z.ZodTypeAny>,
    record: Record<string | number | symbol, any>,
    yMap: Y.Map<any>
  ): void {
    const valueSchema = schemaField.valueType; // Schema for the values in the record

    // Apply updates for keys present in the new record object
    for (const [key, itemValue] of Object.entries(record)) {
      const concreteItemSchema = this.extractType(valueSchema, itemValue);

      if (itemValue === null || itemValue === undefined) {
        if (yMap.has(key)) {
          yMap.delete(key);
        }
        continue;
      }

      let currentYjsItem = yMap.get(key);

      if (concreteItemSchema instanceof z.ZodObject) {
        if (typeof itemValue !== 'object' || Array.isArray(itemValue)) throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Map)) {
          currentYjsItem = new Y.Map();
          yMap.set(key, currentYjsItem);
        }
        this.applyObjectChanges(concreteItemSchema, itemValue, currentYjsItem);
      } else if (concreteItemSchema instanceof z.ZodRecord) {
         if (typeof itemValue !== 'object' || Array.isArray(itemValue)) throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Map)) {
          currentYjsItem = new Y.Map();
          yMap.set(key, currentYjsItem);
        }
        this.applyRecordChanges(concreteItemSchema, itemValue, currentYjsItem);
      } else if (concreteItemSchema instanceof z.ZodArray) {
        if (!Array.isArray(itemValue)) throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Array)) {
          currentYjsItem = new Y.Array();
          yMap.set(key, currentYjsItem);
        }
        this.applyArrayChanges(concreteItemSchema, itemValue, currentYjsItem);
      } else if (concreteItemSchema instanceof ZodText) {
        if (typeof itemValue !== 'string') throw new Error(/* ... */);
        if (!(currentYjsItem instanceof Y.Text)) {
          currentYjsItem = new Y.Text();
          yMap.set(key, currentYjsItem);
        }
        this.applyTextChanges(itemValue, currentYjsItem);
      } else { // Primitive
        if (!isEqual(currentYjsItem, itemValue)) {
          yMap.set(key, itemValue);
        }
      }
    }

    // Remove keys from Y.Map that are not present in the new record object
    const recordKeys = new Set(Object.keys(record));
    for (const yMapKey of Array.from(yMap.keys())) {
      if (!recordKeys.has(yMapKey)) {
        yMap.delete(yMapKey);
      }
    }
  }

  /**
   * Applies changes from a string value to a Y.Text instance.
   * It calculates character differences between the current Y.Text content
   * and the new string value, then applies insertions and deletions to Y.Text.
   *
   * @private
   * @param value The new string value.
   * @param yText The Y.Text instance to update.
   */
  private applyTextChanges(value: string, yText: Y.Text): void {
    const currentText = yText.toString();
    const newText = value ?? ''; // Ensure newText is a string, even if value is null/undefined

    if (currentText === newText) {
      return; // No changes needed
    }

    const diffs = diffChars(currentText, newText);
    let yjsIndex = 0; // Current index in the Y.Text object

    for (const diff of diffs) {
      if (diff.added) {
        yText.insert(yjsIndex, diff.value);
        yjsIndex += diff.value.length;
      } else if (diff.removed) {
        yText.delete(yjsIndex, diff.value.length);
        // yjsIndex remains the same as content is deleted at this position
      } else { // diff.common
        yjsIndex += diff.value.length;
      }
    }
  }

  /**
   * Extracts the underlying Zod type from potentially wrapped types like
   * ZodOptional, ZodNullable, ZodUnion, or ZodDiscriminatedUnion.
   * For unions, it attempts to find the first option that successfully parses the value.
   *
   * @private
   * @param schema The initial ZodType.
   * @param value The value to be checked against union options.
   * @returns The unwrapped or resolved ZodType.
   */
  private extractType(schema: z.ZodTypeAny, value: unknown): z.ZodTypeAny {
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      return this.extractType(schema.unwrap(), value);
    }

    if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
      // For unions, try to find a matching type. This is crucial for correct Yjs type mapping.
      // Note: This might not be perfect for all union scenarios, especially if multiple types could match.
      // It picks the first successful parse.
      const options = (schema as z.ZodUnion<any> | z.ZodDiscriminatedUnion<any, any>)
        .options;
      for (const option of options) {
        // Use a temporary safeParse to check; do not throw errors here.
        if (option.safeParse(value).success) {
          return this.extractType(option, value); // Recurse in case the option itself is wrapped
        }
      }
      // If no option matches, and it's a discriminated union, the discriminator might be missing or wrong.
      // For simple unions, it's harder to tell. Default to returning the original schema,
      // though this might lead to issues if not handled carefully by callers.
      // A more robust solution might require passing discriminator information or stricter schemas.
    }

    return schema; // Return the schema if not optional, nullable, or a successfully resolved union type.
  }
}
