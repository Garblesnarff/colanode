import WebSocket from 'isomorphic-ws';
import ms from 'ms';

import { BackoffCalculator } from '@colanode/client/lib/backoff-calculator';
import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { AccountService } from '@colanode/client/services/accounts/account-service';
// packages/client/src/services/accounts/account-socket.ts
/**
 * @file Defines the `AccountSocket` class, responsible for managing the WebSocket
 * connection for a specific user account to its server. It handles connection
 * establishment, message sending/receiving, automatic reconnection with backoff,
 * and event publishing related to socket state changes.
 */
import WebSocket from 'isomorphic-ws'; // Universal WebSocket client
import ms from 'ms'; // For time string parsing

import { BackoffCalculator } from '@colanode/client/lib/backoff-calculator';
import { eventBus } from '@colanode/client/lib/event-bus';
import { EventLoop } from '@colanode/client/lib/event-loop';
import { AccountService } from '@colanode/client/services/accounts/account-service';
import { Message, SocketInitOutput, createDebugger } from '@colanode/core';

const debug = createDebugger('client:service:account-socket'); // Standardized debug namespace

/**
 * Manages the WebSocket connection for a specific account.
 * Handles connection lifecycle (init, open, message, error, close),
 * reconnection logic using exponential backoff, and message serialization/deserialization.
 */
export class AccountSocket {
  /** Reference to the parent {@link AccountService} to access account and server details. */
  private readonly account: AccountService;
  /** EventLoop for periodically checking and attempting to maintain the WebSocket connection. */
  private readonly eventLoop: EventLoop;

  /** The actual WebSocket instance. Null if not connected or during connection attempts. */
  private socket: WebSocket | null;
  /** Utility to calculate delays for reconnection attempts. */
  private backoffCalculator: BackoffCalculator;
  /** Counter to track consecutive 'CLOSING' states to eventually terminate a stuck socket. */
  private closingCount: number;
  /** ID of the subscription to the global event bus for server availability changes. */
  private eventSubscriptionId: string;

  /**
   * Constructs an `AccountSocket`.
   * Initializes backoff calculator, closing counter, and an event loop to periodically
   * check the connection status. Subscribes to server availability events to trigger
   * connection checks.
   *
   * @param accountService - The {@link AccountService} this socket is associated with.
   */
  constructor(accountService: AccountService) {
    this.account = accountService;
    this.socket = null;
    this.backoffCalculator = new BackoffCalculator(ms('5s'), ms('1m')); // Custom backoff: 5s base, 1min max
    this.closingCount = 0;

    // Event loop to periodically check connection health and attempt reconnections.
    this.eventLoop = new EventLoop(
      ms('30 seconds'), // Check connection status every 30 seconds
      ms('1 second'),   // Debounce for immediate check on trigger
      this.checkConnection.bind(this)
    );

    // Listen for server availability changes to proactively manage the socket.
    this.eventSubscriptionId = eventBus.subscribe((event) => {
      if (
        event.type === 'server.availability.changed' &&
        event.server.domain === this.account.server.domain
      ) {
        debug(`Server ${this.account.server.domain} availability changed to ${event.isAvailable}. Triggering connection check for account ${this.account.id}.`);
        this.eventLoop.trigger(); // Trigger a connection check
      }
      // Note: Does not directly subscribe to 'account.connection.message.received' here,
      // as that's published by this class itself.
    });
  }

  /**
   * Initializes or re-initializes the WebSocket connection.
   * It first checks if the associated server is available and if a retry is permitted by the backoff calculator.
   * It then attempts to fetch a socket session ID from the server and establish the WebSocket connection.
   * Sets up handlers for `onmessage`, `onopen`, `onerror`, and `onclose` events.
   *
   * @async
   */
  public async init(): Promise<void> {
    this.eventLoop.start(); // Ensure connection check loop is running

    if (!this.account.server.isAvailable) {
      debug(`Server ${this.account.server.domain} is not available. Socket initialization for account ${this.account.id} skipped.`);
      return;
    }

    if (this.socket && this.isConnected()) {
      debug(`Socket for account ${this.account.id} is already connected. Initialization skipped.`);
      return;
    }

    if (!this.backoffCalculator.canRetry()) {
      const delay = this.backoffCalculator.getCurrentDelay();
      debug(`Socket connection for account ${this.account.id} cannot retry yet. Delay: ${ms(delay)}`);
      return;
    }

    debug(`Initializing socket connection for account ${this.account.id} to ${this.account.server.socketBaseUrl}`);

    try {
      // Request a new socket session ID from the server's HTTP endpoint.
      const response = await this.account.client // Uses account-specific Ky instance with auth
        .post('v1/sockets') // Endpoint to create a socket session
        .json<SocketInitOutput>(); // Expects { id: string }

      debug(`Socket session ID ${response.id} received for account ${this.account.id}. Establishing WebSocket connection.`);
      this.socket = new WebSocket(
        `${this.account.server.socketBaseUrl}/v1/sockets/${response.id}` // Append session ID to WebSocket URL
      );

      this.socket.onmessage = (event: WebSocket.MessageEvent) => {
        try {
          const data: string = event.data.toString();
          const message: Message = JSON.parse(data); // Assumes messages are JSON strings

          debug(`Received message of type ${message.type} for account ${this.account.id}`);
          eventBus.publish({
            type: 'account.connection.message.received',
            accountId: this.account.id,
            message,
          });
        } catch (parseError) {
          console.error(`Error parsing WebSocket message for account ${this.account.id}:`, parseError, event.data);
        }
      };

      this.socket.onopen = () => {
        debug(`Socket connection for account ${this.account.id} opened successfully.`);
        this.backoffCalculator.reset(); // Reset backoff on successful connection
        this.closingCount = 0; // Reset stuck closing counter
        eventBus.publish({
          type: 'account.connection.opened',
          accountId: this.account.id,
        });
      };

      this.socket.onerror = (errorEvent: WebSocket.ErrorEvent) => {
        // WebSocket.ErrorEvent often doesn't contain detailed error, underlying reason usually leads to 'onclose'.
        debug(`Socket connection error for account ${this.account.id}:`, errorEvent.message || 'Unknown WebSocket error');
        this.backoffCalculator.increaseError();
        // Publishing 'closed' on error as well, as browsers often fire 'close' immediately after 'error'.
        // If a distinct 'error' event is needed by consumers, it could be added.
        eventBus.publish({
          type: 'account.connection.closed', // Or a specific 'account.connection.error'
          accountId: this.account.id,
          // error: errorEvent.message // Optionally include error details
        });
        // The 'onclose' handler will also be called.
      };

      this.socket.onclose = (closeEvent: WebSocket.CloseEvent) => {
        debug(`Socket connection for account ${this.account.id} closed. Code: ${closeEvent.code}, Reason: "${closeEvent.reason}", WasClean: ${closeEvent.wasClean}`);
        if (!closeEvent.wasClean) { // If not a clean closure (e.g., server down, network issue)
            this.backoffCalculator.increaseError();
        }
        this.socket = null; // Clear the socket instance
        eventBus.publish({
          type: 'account.connection.closed',
          accountId: this.account.id,
        });
        // The eventLoop's checkConnection will attempt to re-init if appropriate.
      };
    } catch (httpError) {
      // Error during the initial HTTP POST to /v1/sockets to get session ID
      debug(`Failed to initialize socket session for account ${this.account.id}:`, httpError);
      this.backoffCalculator.increaseError();
      // No socket was created, so no onclose/onerror will fire for this attempt.
      // The eventLoop will retry `init()` later based on backoff.
    }
  }

  /**
   * Checks if the WebSocket is currently connected (socket exists and readyState is OPEN).
   * @returns `true` if connected, `false` otherwise.
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Sends a message over the WebSocket if the connection is active.
   * The message is JSON stringified before sending.
   *
   * @param message - The {@link Message} object to send.
   * @returns `true` if the message was sent (or queued by WebSocket), `false` if not connected.
   */
  public send(message: Message): boolean {
    if (this.socket && this.isConnected()) {
      debug(`Sending message of type ${message.type} for account ${this.account.id}`);
      try {
        this.socket.send(JSON.stringify(message));
        return true;
      } catch (sendError) {
        debug(`Error sending message for account ${this.account.id}:`, sendError);
        // Potentially handle by closing and re-initializing the socket if send fails due to connection state.
        this.socket.close(); // Close if send fails, assuming connection is broken
        this.socket = null;
        this.backoffCalculator.increaseError();
        this.eventLoop.trigger(); // Attempt to reconnect sooner
        return false;
      }
    }
    debug(`Cannot send message for account ${this.account.id}: socket not connected.`);
    return false;
  }

  /**
   * Closes the WebSocket connection, stops the connection check event loop,
   * and unsubscribes from global events. This should be called when the account
   * service is being shut down (e.g., on logout).
   */
  public close(): void {
    debug(`Closing socket connection explicitly for account ${this.account.id}.`);
    this.eventLoop.stop(); // Stop periodic checks/reconnections
    eventBus.unsubscribe(this.eventSubscriptionId); // Clean up global event bus subscription

    if (this.socket) {
      // Remove event listeners to prevent them from firing during/after explicit close
      // and potentially triggering reconnection logic or error reporting.
      this.socket.onmessage = null;
      this.socket.onopen = null;
      this.socket.onerror = null;
      this.socket.onclose = null; // Prevent our onclose handler from running and increasing backoff

      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
    this.backoffCalculator.reset(); // Reset backoff as we are intentionally closing
    this.closingCount = 0;
    debug(`Socket resources cleaned up for account ${this.account.id}.`);
  }

  /**
   * Periodically checks the WebSocket connection status.
   * If the server is available but the socket is not connected (or is closed),
   * it attempts to re-initialize the connection via `init()`.
   * If the socket is stuck in a 'CLOSING' state for too long, it terminates it.
   * This method is typically called by the `eventLoop`.
   * @private
   */
  private checkConnection(): void {
    try {
      debug(`Checking socket connection for account ${this.account.id}. Current state: ${this.socket?.readyState}, Server available: ${this.account.server.isAvailable}`);
      if (!this.account.server.isAvailable) {
        // If server is not available, ensure socket is closed and don't attempt to connect.
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            debug(`Server ${this.account.server.domain} is unavailable. Closing active socket for account ${this.account.id}.`);
            this.socket.close(); // This will trigger onclose, which sets socket to null.
        } else {
            this.socket = null; // Ensure it's null if not open/connecting
        }
        return;
      }

      // If server is available, but we are not connected, try to init.
      // init() itself contains backoff logic, so it's safe to call.
      if (!this.isConnected()) {
        debug(`Socket for account ${this.account.id} is not connected. Attempting init.`);
        this.init(); // init() handles backoff and existing socket states.
        return; // init() will establish the connection if possible.
      }

      // If socket is stuck in CLOSING state for too many checks, terminate it.
      // This is a safeguard against sockets that don't transition to CLOSED properly.
      if (this.socket && this.socket.readyState === WebSocket.CLOSING) {
        this.closingCount++;
        debug(`Socket for account ${this.account.id} is CLOSING. Count: ${this.closingCount}`);
        if (this.closingCount > 5) { // Arbitrary threshold for "too long"
          debug(`Socket for account ${this.account.id} stuck in CLOSING state. Terminating.`);
          this.socket.terminate(); // Forcefully close
          this.socket = null; // Assume it's now closed
          this.closingCount = 0;
          this.backoffCalculator.increaseError(); // Treat as an error for backoff
          this.eventLoop.trigger(); // Attempt to reconnect sooner
        }
      } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.closingCount = 0; // Reset if connection is open and healthy
      }
    } catch (error) {
      // Catch errors from within checkConnection itself (e.g., if this.account.server access fails)
      debug(`Error during connection check for account ${this.account.id}:`, error);
      this.backoffCalculator.increaseError(); // Assume an error means connection is problematic
    }
  }
}
