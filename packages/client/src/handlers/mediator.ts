// packages/client/src/handlers/mediator.ts
/**
 * @file Defines the Mediator class, responsible for orchestrating query and mutation execution.
 * It acts as a central dispatcher, routing requests to appropriate handlers and managing
 * subscriptions for queries that need to stay updated with application events.
 */
import { isEqual } from 'lodash-es';

import {
  buildMutationHandlerMap,
  MutationHandlerMap,
} from '@colanode/client/handlers/mutations';
import {
  buildQueryHandlerMap,
  QueryHandlerMap,
} from '@colanode/client/handlers/queries';
import { eventBus } from '@colanode/client/lib/event-bus';
import {
  MutationHandler,
  QueryHandler,
  SubscribedQuery,
} from '@colanode/client/lib/types';
import {
  MutationError,
  MutationErrorCode,
  MutationInput,
  MutationResult,
} from '@colanode/client/mutations';
import { QueryInput, QueryMap } from '@colanode/client/queries';
import { AppService } from '@colanode/client/services/app-service';
import { Event } from '@colanode/client/types/events';
import { createDebugger } from '@colanode/core';

const debug = createDebugger('desktop:mediator'); // Changed from 'desktop:mediator' to 'client:mediator' for broader client-side context

/**
 * The Mediator class acts as a central dispatcher for executing queries and mutations.
 * It maintains a map of registered query and mutation handlers and routes incoming
 * requests to the appropriate handler.
 *
 * For queries, it also manages a system of subscriptions. Clients (e.g., UI components)
 * can subscribe to queries, and the Mediator will monitor relevant application events.
 * If an event might affect the result of a subscribed query, the Mediator re-evaluates
 * the query (or asks the handler to check for changes) and notifies subscribers if the
 * query result has changed.
 */
export class Mediator {
  /** Reference to the main application service, providing access to databases, API clients, etc. */
  private readonly app: AppService;
  /** Map of query types to their respective handler implementations. */
  private readonly queryHandlerMap: QueryHandlerMap;
  /** Map of mutation types to their respective handler implementations. */
  private readonly mutationHandlerMap: MutationHandlerMap;

  /**
   * Stores active query subscriptions.
   * The key is a unique subscription key (string), and the value is a {@link SubscribedQuery} object
   * containing the input, last known result, and window IDs of subscribers.
   */
  private readonly subscribedQueries: Map<string, SubscribedQuery<QueryInput>> =
    new Map();

  /** Queue for incoming application events that might trigger updates to subscribed queries. */
  private readonly eventsQueue: Event[] = [];
  /** Flag to prevent concurrent processing of the events queue. */
  private isProcessingEvents = false;

  /**
   * Constructs a new Mediator instance.
   * Initializes query and mutation handler maps by calling builder functions.
   * Subscribes to the global `eventBus` to receive application events.
   *
   * @param app An instance of `AppService`, providing dependencies to handlers.
   */
  constructor(app: AppService) {
    this.app = app;
    this.queryHandlerMap = buildQueryHandlerMap(app); // Assumes this function returns a map of query handlers
    this.mutationHandlerMap = buildMutationHandlerMap(app); // Assumes this function returns a map of mutation handlers

    // Subscribe to all events on the event bus.
    // If an event is not 'query.result.updated' (which is published by this Mediator),
    // add it to the queue and trigger processing.
    eventBus.subscribe((event: Event) => {
      if (event.type === 'query.result.updated') {
        // Avoid processing events published by the mediator itself in this loop
        return;
      }
      this.eventsQueue.push(event);
      this.processEventsQueue(); // Debounced or direct call
    });
  }

  /**
   * Executes a query without establishing a persistent subscription.
   * Finds the appropriate handler for the query type and invokes it.
   *
   * @template T - The specific type of {@link QueryInput}.
   * @param input The query input object, containing the query type and parameters.
   * @returns A promise that resolves with the output of the query, as defined by `QueryMap[T['type']]['output']`.
   * @throws If no handler is found for the given query type.
   */
  public async executeQuery<T extends QueryInput>(
    input: T
  ): Promise<QueryMap[T['type']]['output']> {
    debug(`Executing query: ${input.type}`);

    const handler = this.queryHandlerMap[input.type] as QueryHandler<T> | undefined;

    if (!handler) {
      throw new Error(`No handler found for query type: ${input.type}`);
    }

    const result = await handler.handleQuery(input);
    return result;
  }

  /**
   * Executes a query and establishes a subscription for it.
   * If the query (identified by `key`) is already subscribed, it adds the `windowId`
   * to the existing subscribers and returns the cached result.
   * Otherwise, it executes the query, stores the result, and sets up the subscription.
   *
   * @template T - The specific type of {@link QueryInput}.
   * @param key A unique string key identifying this query subscription.
   * @param windowId An identifier for the client window or component subscribing to this query.
   * @param input The query input object.
   * @returns A promise that resolves with the query output.
   * @throws If no handler is found for the given query type.
   */
  public async executeQueryAndSubscribe<T extends QueryInput>(
    key: string,
    windowId: string,
    input: T
  ): Promise<QueryMap[T['type']]['output']> {
    debug(`Executing query and subscribing: ${key} (type: ${input.type}, window: ${windowId})`);

    const existingSubscription = this.subscribedQueries.get(key);
    if (existingSubscription) {
      // Type check to ensure existing input matches new input if we were to re-evaluate.
      // For now, just add windowId and return cached result.
      if (!isEqual(existingSubscription.input, input)) {
          console.warn(`Subscribing to key '${key}' with different input. Returning cached result of original input.`);
          // Potentially, one might want to update the input and re-fetch,
          // or throw an error, or manage multiple input versions per key.
          // Current behavior: adds to existing, returns existing result.
      }
      existingSubscription.windowIds.add(windowId);
      debug(`Added window ${windowId} to existing subscription ${key}. Total subscribers: ${existingSubscription.windowIds.size}`);
      return existingSubscription.result as QueryMap[T['type']]['output']; // Cast needed due to generic map value
    }

    const handler = this.queryHandlerMap[input.type] as QueryHandler<T> | undefined;
    if (!handler) {
      throw new Error(`No handler found for query type: ${input.type}`);
    }

    const result = await handler.handleQuery(input);
    this.subscribedQueries.set(key, {
      input,
      result,
      windowIds: new Set([windowId]),
    });
    debug(`New subscription ${key} created with result. Window: ${windowId}`);
    return result;
  }

  /**
   * Unsubscribes a specific window/component from a query.
   * If this is the last subscriber for the query key, the entire subscription is removed.
   *
   * @param key The unique key of the query subscription.
   * @param windowId The identifier of the window/component to unsubscribe.
   */
  public unsubscribeQuery(key: string, windowId: string): void {
    debug(`Unsubscribing window ${windowId} from query: ${key}`);

    const subscribedQuery = this.subscribedQueries.get(key);
    if (!subscribedQuery) {
      debug(`No subscription found for key: ${key} to unsubscribe.`);
      return;
    }

    subscribedQuery.windowIds.delete(windowId);
    if (subscribedQuery.windowIds.size === 0) {
      this.subscribedQueries.delete(key);
      debug(`Subscription ${key} removed as no windows are subscribed.`);
    } else {
      debug(`Window ${windowId} removed from subscription ${key}. Remaining subscribers: ${subscribedQuery.windowIds.size}`);
    }
  }

  /**
   * Clears all active query subscriptions.
   * Useful during application shutdown or user logout.
   */
  public clearSubscriptions(): void {
    debug('Clearing all query subscriptions.');
    this.subscribedQueries.clear();
  }

  /**
   * Processes the queue of accumulated application events.
   * For each subscribed query, it checks if any of the queued events might have
   * changed its result. If a change is detected and the new result differs from
   * the cached result, it updates the cache and publishes a `query.result.updated` event.
   * This method uses a flag (`isProcessingEvents`) to prevent re-entrancy.
   *
   * @private
   */
  private async processEventsQueue(): Promise<void> {
    if (this.isProcessingEvents) {
      return;
    }
    this.isProcessingEvents = true;
    debug(`Processing events queue. ${this.eventsQueue.length} events.`);

    // Take all current events from the queue. New events might arrive while processing.
    const eventsToProcess = this.eventsQueue.splice(0, this.eventsQueue.length);
    if (eventsToProcess.length === 0) {
      this.isProcessingEvents = false;
      return;
    }

    for (const [subscriptionKey, subscribedQuery] of this.subscribedQueries) {
      const handler = this.queryHandlerMap[subscribedQuery.input.type] as QueryHandler<typeof subscribedQuery.input> | undefined;
      if (!handler || !handler.checkForChanges) { // Ensure handler and checkForChanges exist
        continue;
      }

      // Type assertion for QueryOutput based on the specific input type of the subscribed query.
      type QueryOutputType = QueryMap[(typeof subscribedQuery.input)['type']]['output'];
      let currentResult: QueryOutputType = subscribedQuery.result as QueryOutputType;
      let hasPotentiallyChanged = false;

      for (const event of eventsToProcess) {
        // The handler's checkForChanges method determines if the event affects the query
        // and returns the new result if it does.
        const changeCheck = await handler.checkForChanges(
          event,
          subscribedQuery.input,
          currentResult // Pass the latest known result for this iteration
        );

        if (changeCheck.hasChanges) {
          currentResult = changeCheck.result as QueryOutputType;
          hasPotentiallyChanged = true;
        }
      }

      if (hasPotentiallyChanged && !isEqual(currentResult, subscribedQuery.result)) {
        debug(`Query ${subscriptionKey} result updated due to events.`);
        this.subscribedQueries.set(subscriptionKey, {
          ...subscribedQuery,
          result: currentResult,
        });

        eventBus.publish({
          type: 'query.result.updated',
          id: subscriptionKey, // Use the subscription key as the event ID
          result: currentResult,
        });
      }
    }

    this.isProcessingEvents = false;
    // If new events came in while processing, re-trigger.
    if (this.eventsQueue.length > 0) {
      debug('New events arrived during processing, re-triggering queue processing.');
      this.processEventsQueue();
    }
  }

  /**
   * Executes a mutation.
   * Finds the appropriate handler for the mutation type and invokes it.
   * Wraps the execution in a try-catch block to standardize error responses.
   *
   * @template T - The specific type of {@link MutationInput}.
   * @param input The mutation input object, containing the mutation type and parameters.
   * @returns A promise that resolves with a {@link MutationResult}, indicating success or failure.
   *          If successful, `success` is true and `output` contains the mutation's result.
   *          If failed, `success` is false and `error` contains code and message.
   * @throws If no handler is found for the given mutation type (this is caught and returned as an error result).
   */
  public async executeMutation<T extends MutationInput>(
    input: T
  ): Promise<MutationResult<T>> {
    const handler = this.mutationHandlerMap[input.type] as MutationHandler<T> | undefined;

    debug(`Executing mutation: ${input.type}`);

    try {
      if (!handler) {
        // This case should ideally be caught by type system if MutationHandlerMap is well-typed
        // or by an explicit check before casting.
        throw new Error(`No handler found for mutation type: ${input.type}`);
      }

      const output = await handler.handleMutation(input);
      return { success: true, output };
    } catch (error: any) {
      debug(`Error executing mutation: ${input.type}`, error);
      if (error instanceof MutationError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }
      // For unexpected errors, return a generic unknown error.
      return {
        success: false,
        error: {
          code: MutationErrorCode.Unknown,
          message: error.message || 'Something went wrong trying to execute the mutation.',
        },
      };
    }
  }
}
