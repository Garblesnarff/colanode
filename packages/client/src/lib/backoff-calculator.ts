// packages/client/src/lib/backoff-calculator.ts
/**
 * @file Implements an exponential backoff calculator.
 * This utility class helps in managing retry attempts for operations that might fail,
 * such as network requests. It calculates increasing delays between retries to avoid
 * overwhelming a server or retrying too frequently during persistent issues.
 */
export class BackoffCalculator {
  /** Initial delay in milliseconds before the first retry. Defaults to 5000ms (5 seconds). */
  private baseDelay: number = 5000;
  /** Maximum delay in milliseconds between retries. Defaults to 600000ms (10 minutes). */
  private maxDelay: number = 600000;
  /** Current number of failed attempts. Starts at 0. */
  private attempt: number = 0;
  /** Timestamp of the last failed attempt. Null if no attempts made or after a reset. */
  private lastAttemptTime: number | null = null;

  /**
   * Constructs a new `BackoffCalculator` instance with default delay settings.
   * Optionally, custom base and max delays can be provided.
   *
   * @param baseDelayMs Optional initial delay in milliseconds. Defaults to 5000.
   * @param maxDelayMs Optional maximum delay in milliseconds. Defaults to 600000.
   */
  constructor(baseDelayMs?: number, maxDelayMs?: number) {
    if (baseDelayMs !== undefined) {
      this.baseDelay = baseDelayMs;
    }
    if (maxDelayMs !== undefined) {
      this.maxDelay = maxDelayMs;
    }
  }

  /**
   * Call this method when an attempt fails.
   * It increments the attempt counter and records the time of failure.
   */
  public increaseError(): void {
    this.attempt += 1;
    this.lastAttemptTime = Date.now();
  }

  /**
   * Checks if enough time has passed since the last failed attempt to allow a new retry.
   * The time is based on the calculated exponential backoff delay.
   *
   * @returns `true` if a retry can be attempted, `false` otherwise.
   *          Returns `true` if no errors have occurred yet (`attempt === 0`).
   */
  public canRetry(): boolean {
    if (this.attempt === 0 || this.lastAttemptTime === null) {
      return true; // Can retry immediately if no failures yet or after reset
    }
    const delay = this.getDelay();
    const timeSinceLastAttempt = Date.now() - this.lastAttemptTime;
    return timeSinceLastAttempt >= delay;
  }

  /**
   * Calculates the current backoff delay based on the number of attempts.
   * The delay is calculated as `baseDelay * (2 ^ (attempt - 1))`, capped by `maxDelay`.
   * If `attempt` is 0, it implies the first attempt, so delay is effectively 0 (or immediate).
   *
   * @private
   * @returns The calculated delay in milliseconds.
   */
  private getDelay(): number {
    if (this.attempt === 0) {
        return 0; // No delay for the first attempt (or after reset)
    }
    // Exponential backoff: baseDelay * 2^(n-1)
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt - 1),
      this.maxDelay
    );
    return delay;
  }

  /**
   * Resets the backoff calculator to its initial state.
   * Call this after a successful attempt or when the operation should no longer be retried.
   */
  public reset(): void {
    this.attempt = 0;
    this.lastAttemptTime = null;
  }

  /**
   * Returns the current calculated delay time in milliseconds.
   * This can be used for informational purposes, e.g., to inform the user
   * how long until the next retry.
   *
   * @returns The current backoff delay in milliseconds.
   */
  public getCurrentDelay(): number {
    // If called before any errors or after a reset, getDelay() would return 0.
    // If called after an error, it returns the delay that should pass before next retry.
    return this.getDelay();
  }
}
