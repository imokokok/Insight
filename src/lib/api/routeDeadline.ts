/**
 * @fileoverview Route-level hard deadline for the REST API surface.
 *
 * Every route invocation gets its own 25-second wall-clock budget. The timer is
 * created per call and cleared when the work settles, so a slow route can never
 * consume another route's budget or bleed into a shared/global deadline. When
 * the budget expires the request fails like an upstream timeout: 504 with code
 * `UPSTREAM_TIMEOUT`, no credit charge, and a `waiver` ledger row with reason
 * `timeout`. Callers can tell this apart from our own refusals (402 credit
 * exhaustion, 429 rate limit, 503 settlement unavailable) by status and code.
 *
 * The deadline bounds the response, not the in-flight upstream call: the
 * abandoned promise keeps running (there is no cross-layer AbortSignal here),
 * but its late result is ignored and never charged.
 */

/** Hard wall-clock budget for one REST route invocation. */
export const ROUTE_DEADLINE_MS = 25_000;

/** Thrown when a route invocation exceeds {@link ROUTE_DEADLINE_MS}. */
export class RouteDeadlineExceededError extends Error {
  readonly deadlineMs: number;

  constructor(deadlineMs: number = ROUTE_DEADLINE_MS) {
    // The wording is deliberately matched by isUpstreamTimeoutError so the
    // existing 504/UPSTREAM_TIMEOUT and waiver(`timeout`) paths apply.
    super(`Route deadline exceeded after ${deadlineMs}ms`);
    this.name = 'RouteDeadlineExceededError';
    this.deadlineMs = deadlineMs;
  }
}

/**
 * Race one route invocation against its own deadline.
 * @param work Result or promise produced by this invocation (never shared).
 * @param deadlineMs Per-invocation budget; overridable only for tests.
 */
export async function withRouteDeadline<T>(
  work: T | Promise<T>,
  deadlineMs: number = ROUTE_DEADLINE_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new RouteDeadlineExceededError(deadlineMs)), deadlineMs);
  });

  try {
    return await Promise.race([Promise.resolve(work), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
