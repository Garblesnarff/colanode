// packages/client/src/lib/event-loop.ts
/**
 * @file Implements a customizable event loop class.
 * This class manages the execution of a callback function at regular intervals,
 * with a debounce mechanism for immediate re-triggering. It's useful for tasks
 * like periodic data synchronization, polling, or other background processes
 * that need to run regularly but also respond quickly to explicit triggers.
 */

/**
 * Represents the possible operational statuses of the {@link EventLoop}.
 * - `idle`: The loop is not active and no callback is scheduled.
 * - `scheduled`: A callback execution is scheduled for the future.
 * - `processing`: The callback is currently being executed.
 * @internal
 */
type EventLoopStatus = 'idle' | 'scheduled' | 'processing';

/**
 * A utility class to manage a recurring, debounced event loop.
 * It executes a provided callback at a specified `interval`. If `trigger()` is called,
 * the callback execution is debounced, meaning it will run after a shorter `debounce`
 * period, resetting any pending interval timer.
 */
export class EventLoop {
  /** The regular interval (in milliseconds) at which the callback should be executed. */
  private readonly interval: number;
  /** The debounce time (in milliseconds) used when the loop is explicitly triggered. */
  private readonly debounce: number;
  /** The callback function to be executed by the event loop. Can be synchronous or asynchronous. */
  private readonly callback: () => void | Promise<void>;

  /** Holds the NodeJS.Timeout object for the scheduled execution, or null if not scheduled. */
  private timeout: NodeJS.Timeout | null;
  /** Current operational status of the event loop. */
  private status: EventLoopStatus = 'idle';
  /**
   * Flag indicating if the loop has been explicitly triggered while it was already processing.
   * If true, the next execution will use the `debounce` delay.
   */
  private triggered: boolean = false;

  /**
   * Constructs an `EventLoop` instance.
   *
   * @param intervalMs The regular interval in milliseconds for callback execution.
   * @param debounceMs The debounce time in milliseconds for triggered execution.
   * @param callback The function to execute periodically or when triggered.
   *                 This function can be synchronous or return a Promise.
   */
  constructor(
    intervalMs: number,
    debounceMs: number,
    callback: () => void | Promise<void>
  ) {
    if (intervalMs <= 0 || debounceMs <= 0) {
      throw new Error("Interval and debounce times must be positive.");
    }
    this.interval = intervalMs;
    this.debounce = debounceMs;
    this.callback = callback;
    this.timeout = null;
  }

  /**
   * Starts the event loop.
   * If the loop is already running (not 'idle'), this method does nothing.
   * The first execution will be scheduled after the `debounce` period.
   * Subsequent executions (if not re-triggered) will occur at the specified `interval`.
   */
  public start(): void {
    if (this.status !== 'idle') {
      // console.log('EventLoop: Start called but already active with status:', this.status);
      return;
    }

    // console.log('EventLoop: Starting. Scheduling first execution after debounce period.');
    this.status = 'scheduled';
    // Initial start uses debounce time to allow for quick first execution if needed.
    this.timeout = setTimeout(() => {
      this.execute();
    }, this.debounce);
  }

  /**
   * Stops the event loop.
   * Clears any pending scheduled execution and sets the status to 'idle'.
   */
  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
      // console.log('EventLoop: Stopped. Cleared pending timeout.');
    }
    this.status = 'idle';
    this.triggered = false; // Reset triggered flag on stop
  }

  /**
   * Explicitly triggers the event loop to execute the callback after the `debounce` period.
   * If the loop is currently 'processing' the callback, it sets a flag (`triggered`)
   * to ensure the next execution uses the `debounce` delay.
   * If the loop is 'idle' or 'scheduled', it stops any pending execution and starts a new
   * one scheduled after the `debounce` period.
   */
  public trigger(): void {
    // console.log('EventLoop: Trigger called. Current status:', this.status);
    if (this.status === 'processing') {
      // If already processing, mark that it was triggered so the next cycle uses debounce.
      this.triggered = true;
      // console.log('EventLoop: Triggered during processing. Flag set for next cycle.');
      return;
    }

    // If idle or already scheduled, stop the current timer and start a new one with debounce.
    this.stop(); // Clears existing timeout and sets status to idle
    this.start(); // Starts with debounce delay due to internal logic of start.
    // console.log('EventLoop: Trigger initiated new execution cycle with debounce.');
  }

  /**
   * The core execution logic of the event loop.
   * This private method is called by `setTimeout`. It executes the callback,
   * handles errors, and schedules the next execution based on whether the loop
   * was explicitly `triggered` or if it's a regular interval tick.
   *
   * @private
   */
  private async execute(): Promise<void> {
    // Ensure it was meant to run (e.g., not stopped while timeout was pending)
    if (this.status !== 'scheduled') {
      // console.log('EventLoop: Execute called but status is not "scheduled". Current status:', this.status);
      return;
    }

    this.status = 'processing';
    // console.log('EventLoop: Executing callback.');

    try {
      // Await the callback if it's a Promise, or wrap sync callback in Promise.resolve.
      await Promise.resolve(this.callback());
      // console.log('EventLoop: Callback execution finished.');
    } catch (error) {
      console.error('EventLoop: Callback execution failed:', error);
      // Depending on requirements, might stop the loop on error or continue.
      // Current implementation continues.
    }

    // Check if the status changed during callback execution (e.g., if stop() was called)
    if (this.status !== 'processing') {
      // console.log('EventLoop: Status changed during callback execution. Halting further scheduling from this cycle. New status:', this.status);
      return;
    }

    // Determine next timeout period: debounce if triggered, otherwise regular interval.
    const nextTimeoutPeriod = this.triggered ? this.debounce : this.interval;
    this.status = 'scheduled'; // Set status back to scheduled for the next run
    this.timeout = setTimeout(() => {
      this.execute();
    }, nextTimeoutPeriod);

    // console.log(`EventLoop: Next execution scheduled in ${nextTimeoutPeriod}ms. Triggered flag was: ${this.triggered}`);
    this.triggered = false; // Reset the triggered flag for the next cycle.
  }
}
