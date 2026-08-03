/**
 * Exponential reconnect backoff for Iranian mobile networks (ADR-039).
 * Caps delay; optional full-jitter reduces reconnect stampedes.
 */

export type ReconnectBackoffConfig = {
  /** First retry delay after disconnect. */
  initialDelayMs: number;
  /** Hard cap — avoid multi-minute stalls on shop-floor mobiles. */
  maxDelayMs: number;
  multiplier: number;
  /** When true, randomize within [0, computed] (full jitter). */
  fullJitter: boolean;
};

export const DEFAULT_RECONNECT_BACKOFF: ReconnectBackoffConfig = {
  initialDelayMs: 1_000,
  maxDelayMs: 30_000,
  multiplier: 2,
  fullJitter: true,
};

export type BackoffClock = {
  /** Attempt index starting at 0 for the first reconnect. */
  attempt: number;
};

/**
 * Compute delay before the next reconnect attempt.
 * `attempt` 0 → initialDelayMs (before jitter).
 */
export function computeReconnectDelayMs(
  attempt: number,
  config: ReconnectBackoffConfig = DEFAULT_RECONNECT_BACKOFF,
  random: () => number = Math.random,
): number {
  if (!Number.isFinite(attempt) || attempt < 0) {
    throw new Error("Reconnect attempt must be a non-negative number (ADR-039).");
  }
  const raw = Math.min(
    config.maxDelayMs,
    config.initialDelayMs * config.multiplier ** attempt,
  );
  if (!config.fullJitter) {
    return Math.floor(raw);
  }
  const r = random();
  if (!Number.isFinite(r) || r < 0 || r > 1) {
    throw new Error("Backoff random() must return [0, 1] (ADR-039).");
  }
  return Math.floor(raw * r);
}

export function nextBackoffAttempt(clock: BackoffClock): BackoffClock {
  return { attempt: clock.attempt + 1 };
}

export function resetBackoff(): BackoffClock {
  return { attempt: 0 };
}
