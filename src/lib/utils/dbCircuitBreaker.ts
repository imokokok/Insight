import { createLogger } from './logger';

const logger = createLogger('db-circuit-breaker');

/**
 * Process-level circuit breaker for Supabase (PostgREST) access.
 *
 * Why this exists: during the 2026-10-16 database outage every serverless
 * instance kept issuing full-concurrency, 30s-hanging queries against a
 * database that could not accept connections. Each request held its Vercel
 * instance for the whole runtime timeout while the retry storm multiplied the
 * load on the already-saturated PostgREST pool. A saturated database only
 * recovers once traffic stops — and the application had no mechanism to stop.
 *
 * Design:
 * - `FAILURE_THRESHOLD` consecutive availability failures (timeouts, gateway
 *   errors, connection failures) open the breaker.
 * - While open, DB calls fail fast; callers fall back to the memory / stale /
 *   hardcoded paths that already exist, and fire-and-forget writes are skipped.
 * - After `COOLDOWN_MS` the breaker goes half-open: exactly one probe request
 *   may pass through (`claimProbe`). Success closes the breaker; failure
 *   restarts the cooldown.
 *
 * Availability failures are matched by `isDbUnavailableError`; ordinary
 * business errors (4xx PostgREST responses, constraint violations, empty
 * results) neither open nor extend the breaker.
 */

const FAILURE_THRESHOLD = Number(process.env.DB_BREAKER_THRESHOLD ?? 5);
const COOLDOWN_MS = Number(process.env.DB_BREAKER_COOLDOWN_MS ?? 30_000);

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database unavailable (circuit breaker open)');
    this.name = 'DatabaseUnavailableError';
  }
}

/** Error signatures produced by a saturated or unreachable PostgREST/DB. */
export function isDbUnavailableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'TimeoutError') return true;
  if (error instanceof DatabaseUnavailableError) return true;
  const raw = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const s = raw.toLowerCase();
  return (
    s.includes('timeout') ||
    s.includes('timed out') ||
    s.includes('gateway timeout') ||
    s.includes('fetch failed') ||
    s.includes('connection terminated') ||
    s.includes('connection refused') ||
    s.includes('econnreset') ||
    s.includes('socket hang up') ||
    s.includes('network') ||
    s.includes('internal server error') ||
    s.includes('error occurred with your deployment') ||
    /<html/.test(raw)
  );
}

class DbCircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private probeInFlight = false;

  /**
   * Claim permission to touch the database. Returns false only while the
   * breaker is open and the cooldown has not elapsed, or when another call
   * already holds the half-open probe slot.
   */
  claimProbe(): boolean {
    if (this.openedAt === null) return true;
    if (Date.now() - this.openedAt < COOLDOWN_MS) return false;
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.probeInFlight = false;
    if (this.openedAt !== null) {
      this.openedAt = null;
      logger.info('Database circuit breaker closed (probe succeeded)');
    }
  }

  recordFailure(error?: unknown): void {
    // Ordinary business errors do not indicate an outage: ignore them entirely.
    if (error !== undefined && !isDbUnavailableError(error)) return;
    this.consecutiveFailures += 1;
    if (this.openedAt !== null) {
      // Probe failed while half-open: restart the cooldown.
      this.openedAt = Date.now();
      this.probeInFlight = false;
      logger.warn('Database circuit breaker reopened (probe failed)', {
        consecutiveFailures: this.consecutiveFailures,
        error: error instanceof Error ? error.message : String(error ?? ''),
      });
      return;
    }
    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this.openedAt = Date.now();
      this.probeInFlight = false;
      logger.warn('Database circuit breaker opened — failing DB calls fast', {
        consecutiveFailures: this.consecutiveFailures,
        cooldownMs: COOLDOWN_MS,
      });
    }
  }

  get state(): 'closed' | 'open' | 'half-open' {
    if (this.openedAt === null) return 'closed';
    return Date.now() - this.openedAt >= COOLDOWN_MS ? 'half-open' : 'open';
  }
}

export const dbCircuitBreaker = new DbCircuitBreaker();
