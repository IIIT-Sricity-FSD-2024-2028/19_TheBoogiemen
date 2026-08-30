/**
 * fixed-window-limiter.ts — the Map-based counting core shared by every
 * rate limiter in this app.
 *
 * Extracted out of rate-limit.middleware.ts (the auth-failure limiter) when
 * a second limiter (onboarding-rate-limit.middleware.ts) needed the same
 * fixed-window bookkeeping with different counting semantics — the auth one
 * counts only failures, the onboarding one counts every request. Duplicating
 * the Map/window logic across both would have meant a bug fixed in one
 * silently not fixed in the other, the same reasoning that already governs
 * why colleges.service.ts has one createCollegeAndSpoc() rather than two.
 *
 * What each middleware still owns itself: what counts as a "hit" (a login
 * failure vs. any request at all), the response shape, and its own env-var
 * names — this class only ever answers "is this key over its limit right
 * now", nothing about HTTP.
 *
 * ponytail: in-process Map, so the window is per-process and resets on
 * restart. Fine for one server; if this is ever load-balanced across
 * instances, the counter has to move to Redis or the limit is silently
 * multiplied by the number of instances. (Carried over unchanged from the
 * original file's own note — the constraint did not change by extracting it.)
 */

interface Window {
  count: number;
  resetAt: number;
}

export class FixedWindowLimiter {
  private readonly table = new Map<string, Window>();

  constructor(
    private readonly maxCount: number,
    private readonly windowMs: number,
    private readonly pruneThreshold = 5_000,
  ) {}

  /** Seconds until the window resets, or `null` if `key` is not currently limited. */
  retryAfterSeconds(key: string): number | null {
    const now = Date.now();
    const window = this.table.get(key);
    if (window && now < window.resetAt && window.count >= this.maxCount) {
      return Math.ceil((window.resetAt - now) / 1000);
    }
    return null;
  }

  /** Counts one hit against `key`, opening a new window if the last one lapsed. */
  record(key: string): void {
    const now = Date.now();
    const existing = this.table.get(key);

    if (existing && now < existing.resetAt) {
      existing.count++;
      return;
    }

    // Opening a new window is the only path that can grow the table, so it
    // is the only place that needs to check the size.
    if (this.table.size >= this.pruneThreshold) this.prune(now);
    this.table.set(key, { count: 1, resetAt: now + this.windowMs });
  }

  private prune(now: number): void {
    for (const [key, window] of this.table) {
      if (now >= window.resetAt) this.table.delete(key);
    }
  }

  /** Exposed for tests, which need a clean table between cases. */
  clear(): void {
    this.table.clear();
  }
}
