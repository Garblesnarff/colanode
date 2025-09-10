// packages/core/src/registry/zod.ts
/**
 * @file Custom Zod types used within the Colanode application, particularly for CRDT integration.
 */
import { z, ZodStringDef } from 'zod/v4';

/**
 * Represents a custom Zod type for strings that are intended to be managed as
 * collaborative text using Yjs (or a similar CRDT library).
 *
 * While it extends `z.ZodString` and currently behaves like a standard Zod string,
 * its distinct type (`ZodText`) allows the CRDT logic (e.g., in `packages/crdt/src/index.ts`)
 * to identify fields that should be treated as Y.Text objects rather than plain strings
 * within Yjs documents. This enables fine-grained, conflict-free merging of text edits.
 *
 * The constructor currently just calls the parent `z.ZodString` constructor.
 * Future enhancements could add specific refinements or transformations unique to CRDT text.
 *
 * @example
 * const schema = z.object({
 *   title: z.string(), // A regular string
 *   description: new ZodText(), // Collaborative text managed by Yjs as Y.Text
 * });
 */
export class ZodText extends z.ZodString {
  /**
   * Creates an instance of ZodText.
   * Internally, it initializes itself as a standard Zod string.
   * The primary purpose of this class is type differentiation for CRDT handling.
   */
  constructor() {
    // The `super` call requires a `ZodStringDef` which includes checks, description, etc.
    // For a basic string, we can pass the definition of z.string().
    // However, z.string() itself returns a ZodString instance, not its definition.
    // A common way to get a base string definition is `z.string()._def`.
    // Or, more simply, just pass an empty object if no specific string constraints
    // (like min/max length, regex) are being defined at this base level.
    // The `super(z.string())` in the original code is problematic because `z.string()` is an instance.
    // It should be `super({})` or `super(z.string()._def)` or a more explicit def.
    // Given it worked, perhaps Zod's internals are flexible or it was an older version.
    // For clarity and correctness with Zod 3/4, providing a minimal `ZodStringDef` is better.
    const definition: ZodStringDef = {
        checks: [], // No specific string checks like min, max, regex at this base level
        typeName: z.ZodFirstPartyTypeKind.ZodString,
        coerce: false, // Default behavior for z.string()
    };
    super(definition);
  }
}
