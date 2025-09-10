// packages/client/src/lib/event-bus.ts
/**
 * @file Implements a simple client-side event bus service.
 * This service allows different parts of the client application to publish events
 * and subscribe to them, enabling decoupled communication between components.
 */
import { Event } from '@colanode/client/types/events'; // Assuming Event is a union of all possible event types

/**
 * Represents a subscription to the event bus.
 *
 * @property id - A unique identifier for the subscription.
 * @property callback - The function to be called when an event is published.
 */
export interface Subscription {
  /** Unique ID for this subscription. */
  id: string;
  /** The callback function to execute when a relevant event is published. */
  callback: (event: Event) => void;
}

/**
 * Interface defining the contract for an event bus.
 */
export interface EventBus {
  /**
   * Subscribes a callback function to receive all events published on the bus.
   * @param callback - The function to call with the event data when an event is published.
   * @returns A unique subscription ID string, which can be used to unsubscribe later.
   */
  subscribe(callback: (event: Event) => void): string;

  /**
   * Unsubscribes a previously registered callback using its subscription ID.
   * If the subscription ID is not found, the method does nothing.
   * @param subscriptionId - The unique ID returned by the `subscribe` method.
   */
  unsubscribe(subscriptionId: string): void;

  /**
   * Publishes an event to all active subscribers.
   * Each subscribed callback will be invoked with the provided event object.
   * @param event - The {@link Event} object to publish.
   */
  publish(event: Event): void;
}

/**
 * A simple implementation of the {@link EventBus} interface.
 * It uses a Map to store subscriptions and a simple incrementing number for subscription IDs.
 */
export class EventBusService implements EventBus {
  /** Stores active subscriptions, mapping subscription IDs to {@link Subscription} objects. */
  private subscriptions: Map<string, Subscription>;
  /** Counter for generating unique subscription IDs. */
  private nextSubscriptionId: number = 0; // Renamed from 'id' for clarity

  /**
   * Initializes a new EventBusService instance with an empty map of subscriptions.
   */
  constructor() {
    this.subscriptions = new Map<string, Subscription>();
  }

  /**
   * @inheritdoc
   */
  public subscribe(callback: (event: Event) => void): string {
    const newId = (this.nextSubscriptionId++).toString(); // Use toString() for string ID
    this.subscriptions.set(newId, {
      callback,
      id: newId,
    });
    return newId;
  }

  /**
   * @inheritdoc
   */
  public unsubscribe(subscriptionId: string): void {
    if (!this.subscriptions.has(subscriptionId)) {
      // console.warn(`EventBus: Attempted to unsubscribe with non-existent ID "${subscriptionId}".`);
      return;
    }
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * @inheritdoc
   */
  public publish(event: Event): void {
    // Iterate over a copy of the values in case a callback tries to unsubscribe itself or another.
    // This avoids issues with modifying the map while iterating.
    const currentSubscriptions = Array.from(this.subscriptions.values());
    currentSubscriptions.forEach((subscription) => {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error(`EventBus: Error in subscription callback for event type "${event.type}" (ID: ${subscription.id}):`, error);
        // Optionally, decide if a faulty subscriber should be automatically unsubscribed.
      }
    });
  }
}

/**
 * A singleton instance of the {@link EventBusService}.
 * This instance is typically imported and used throughout the client application
 * for publishing and subscribing to events.
 */
export const eventBus: EventBus = new EventBusService();
