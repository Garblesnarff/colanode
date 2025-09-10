// packages/client/src/lib/types.ts
/**
 * @file Defines common TypeScript interfaces and types used within the client library,
 * particularly for structuring mutation handlers, query handlers, and managing
 * query subscriptions and event-driven updates.
 */
import { MutationInput, MutationMap } from '@colanode/client/mutations';
import { QueryInput, QueryMap } from '@colanode/client/queries';
import { Event } from '@colanode/client/types/events';

/**
 * Interface for a mutation handler.
 * Each specific mutation type (e.g., 'node.create', 'user.update') will have an
 * implementation of this interface.
 *
 * @template T - A specific type of {@link MutationInput}, constraining the input parameter.
 */
export interface MutationHandler<T extends MutationInput> {
  /**
   * Handles the execution of a specific mutation.
   *
   * @param input - The mutation input object, conforming to the specific type `T`.
   * @returns A promise that resolves to the output of the mutation, as defined by
   *          `MutationMap[T['type']]['output']` (i.e., the output type associated
   *          with the specific mutation type `T['type']`).
   */
  handleMutation: (input: T) => Promise<MutationMap[T['type']]['output']>;
}

/**
 * Interface for a query handler.
 * Each specific query type (e.g., 'nodes.get', 'user.list') will have an
 * implementation of this interface. Query handlers are responsible for fetching data
 * and also for determining if application events affect their cached results.
 *
 * @template T - A specific type of {@link QueryInput}, constraining the input parameter.
 */
export interface QueryHandler<T extends QueryInput> {
  /**
   * Handles the execution of a specific query.
   *
   * @param input - The query input object, conforming to type `T`.
   * @returns A promise that resolves to the output of the query, as defined by
   *          `QueryMap[T['type']]['output']`.
   */
  handleQuery: (input: T) => Promise<QueryMap[T['type']]['output']>;

  /**
   * Checks if a given application {@link Event} affects the result of a query
   * that was previously executed with `input` and yielded `currentOutput`.
   * If the event causes a change, this method should re-fetch or recalculate
   * the query result and return it.
   *
   * @param event - The application event that occurred.
   * @param input - The original input for the query being checked.
   * @param currentOutput - The last known result of the query for the given `input`.
   * @returns A promise that resolves to a {@link ChangeCheckResult}, indicating
   *          if changes occurred and providing the new result if so.
   */
  checkForChanges: (
    event: Event,
    input: T,
    currentOutput: QueryMap[T['type']]['output'] // Renamed from 'output' for clarity
  ) => Promise<ChangeCheckResult<T>>;
}

/**
 * Represents the state of a query that is actively subscribed to by one or more clients (e.g., UI windows).
 * The Mediator uses this to track active subscriptions and manage updates.
 *
 * @template T - A specific type of {@link QueryInput}.
 * @property input - The original {@link QueryInput} for this subscribed query.
 * @property result - The last known result (output) of executing this query.
 * @property windowIds - A set of unique string identifiers for the windows or components
 *                       that are currently subscribed to this query.
 */
export type SubscribedQuery<T extends QueryInput> = {
  /** The input parameters for the subscribed query. */
  input: T;
  /** The most recent result obtained for this query. */
  result: QueryMap[T['type']]['output'];
  /** Set of unique IDs representing subscribers (e.g., window IDs). */
  windowIds: Set<string>;
};

/**
 * Represents the outcome of a `checkForChanges` call on a {@link QueryHandler}.
 *
 * @template T - A specific type of {@link QueryInput}.
 * @property hasChanges - Boolean indicating whether the event caused a change in the query's result.
 * @property result - Optional. If `hasChanges` is true, this property holds the new
 *                    query output. If `hasChanges` is false, this property may be undefined.
 */
export type ChangeCheckResult<T extends QueryInput> = {
  /** True if the event caused the query result to change, false otherwise. */
  hasChanges: boolean;
  /** The new query result, if `hasChanges` is true. */
  result?: QueryMap[T['type']]['output'];
};
