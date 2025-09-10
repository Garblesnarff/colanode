# AGENTS.md - `packages/crdt`

This guide is for AI assistants working specifically within the `packages/crdt` package.

## Core Concepts

1.  **`YDoc` Class (`src/index.ts`)**: This is the primary interface to Yjs functionality in Colanode. It encapsulates a Yjs document (`Y.Doc`) and provides methods to:
    *   Initialize a document from a state or updates.
    *   Apply structured changes based on Zod schemas (from `packages/core`). This is a key feature: the `update` method traverses a Zod schema and maps Zod types (`ZodObject`, `ZodArray`, `ZodText`, primitives) to corresponding Yjs shared types (`Y.Map`, `Y.Array`, `Y.Text`).
    *   Handle undo/redo operations via `Y.UndoManager`.
    *   Encode/decode Yjs states and updates.

2.  **Schema-Driven CRDT Operations**: A critical design principle here is that changes to the Yjs document via `YDoc.update()` are driven by Zod schemas. This ensures that the structure of the collaborative data remains consistent with its defined schema. Pay close attention to how `applyObjectChanges`, `applyArrayChanges`, `applyRecordChanges`, and `applyTextChanges` methods in `YDoc` use Zod schema information.

3.  **`ZodText`**: The custom `ZodText` type (defined in `packages/core/src/registry/zod.ts`) is a signal that a string field should be treated as a collaborative rich-text field managed by `Y.Text` within Yjs.

## Working with this Package

*   **High Sensitivity**: The logic in this package is fundamental to real-time collaboration and data synchronization. Changes here can have wide-ranging and subtle impacts. Exercise extreme caution.
*   **Yjs Documentation**: If modifying core Yjs interactions, refer to the official [Yjs documentation](https://docs.yjs.dev/) for understanding Yjs shared types, updates, and transaction mechanisms.
*   **Testing**: Rigorous testing is essential for any changes in this package. Ensure existing tests pass and add new tests to cover any modifications to CRDT handling logic.
*   **Focus on `YDoc`**: Most interactions with Yjs from other parts of the Colanode system should go through the `YDoc` abstraction. Avoid direct manipulation of `Y.Doc` instances outside of `YDoc` unless absolutely necessary and well-justified.

Refer to the main `ARCHITECTURE.md` and the JSDoc comments within `src/index.ts` for more detailed explanations of the `YDoc` class methods.
