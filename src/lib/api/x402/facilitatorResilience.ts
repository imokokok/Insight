import { HTTPFacilitatorClient, type FacilitatorClient } from '@x402/core/server';

import { createCdpAuthHeaders, createStaticBearerAuthHeaders } from './cdpAuth';

/**
 * Wire types derived from the core `FacilitatorClient` interface because the
 * core package does not export them from its public entries.
 */
type SupportedResponse = Awaited<ReturnType<FacilitatorClient['getSupported']>>;
type SupportedKind = SupportedResponse['kinds'][number];
type VerifyResponse = Awaited<ReturnType<FacilitatorClient['verify']>>;
type SettleResponse = Awaited<ReturnType<FacilitatorClient['settle']>>;
type PaymentPayload = Parameters<FacilitatorClient['verify']>[0];
type PaymentRequirements = Parameters<FacilitatorClient['verify']>[1];

/**
 * Resilient facilitator for the resource-server build path.
 *
 * Problem this solves (production incident 2026-10-16, INT-07): cold Vercel
 * instances call facilitator `GET /supported` during
 * `x402HTTPResourceServer.initialize()`. The core `HTTPFacilitatorClient`
 * retries a 429 up to three times with ~30s backoff per attempt, so a rate-
 * limited cold start stalls ~91s — exceeding the 60s payment-authorization
 * window (clients sign against `validBefore` and the request outlives it) and
 * the pre-trade route's 30s `maxDuration` (→ 504).
 *
 * This wrapper keeps `verify`/`settle` untouched (bounded per-request timeout)
 * and replaces `getSupported` with:
 *
 * 1. an in-process cache (10 min fresh window, single-flight refresh),
 * 2. stale-while-error: on upstream failure, serve the last good response for
 *    up to 24h,
 * 3. a failure backoff (30s) so a down facilitator is probed at most once per
 *    interval instead of once per request,
 * 4. a built-in fallback synthesized from the networks our own config intends
 *    to use — one bounded request (≤ `timeoutMs`) in the worst case instead of
 *    ~91s of core retries. If the facilitator genuinely does not support a
 *    configured network, this surfaces later as a verify/settle failure
 *    instead of a build-time throw; that trade is deliberate: a rate-limited
 *    facilitator must not take the whole paid surface down.
 */

/** How long a successful /supported response is reused without revalidation. */
const SUPPORTED_FRESH_TTL_MS = 10 * 60_000;
/** How long a stale /supported response may be served while upstream fails. */
const SUPPORTED_STALE_MAX_MS = 24 * 60 * 60_000;
/** Minimum interval between upstream probes after a failure. */
const SUPPORTED_FAILURE_BACKOFF_MS = 30_000;

interface SupportedCacheEntry {
  value: SupportedResponse;
  fetchedAt: number;
}

interface FailureState {
  failedAt: number;
}

const supportedCache = new Map<string, SupportedCacheEntry>();
const lastFailure = new Map<string, FailureState>();
const inflightRefresh = new Map<string, Promise<SupportedResponse>>();

export interface ResilientFacilitatorOptions {
  /** Facilitator base URL (no trailing slash normalization needed). */
  url: string;
  /** Per-request timeout for the /supported probe, in milliseconds. */
  timeoutMs: number;
  /** CDP credentials when the facilitator requires JWT auth; null otherwise. */
  cdpAuth?: { apiKeyId: string; apiKeySecret: string } | null;
  /** Static server-side Bearer token for non-CDP facilitators. */
  bearerToken?: string | null;
  /** Kinds to advertise when the facilitator is unreachable and no cache exists. */
  fallbackKinds: SupportedKind[];
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
  /** Injectable clock for tests. */
  now?: () => number;
}

/** Minimal structural validation before a response enters the cache. */
function isValidSupportedResponse(value: unknown): value is SupportedResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.kinds) &&
    Array.isArray(v.extensions) &&
    typeof v.signers === 'object' &&
    v.signers !== null
  );
}

/**
 * Wrap an {@link HTTPFacilitatorClient} so that `initialize()`'s
 * `getSupported()` round trip can never stall a cold instance. The returned
 * client satisfies the core `FacilitatorClient` interface and can be passed
 * directly to `new x402ResourceServer(...)`.
 */
export function createResilientFacilitator(
  options: ResilientFacilitatorOptions
): FacilitatorClient {
  const {
    url,
    timeoutMs,
    cdpAuth = null,
    bearerToken = null,
    fallbackKinds,
    fetchImpl = fetch,
    now = Date.now,
  } = options;

  if (cdpAuth && bearerToken) {
    throw new Error('a facilitator cannot use both CDP credentials and a static Bearer token');
  }
  const createAuthHeaders = cdpAuth
    ? createCdpAuthHeaders(cdpAuth)
    : bearerToken
      ? createStaticBearerAuthHeaders(bearerToken)
      : undefined;

  // verify/settle keep the core client: same URL, same bounded timeout, and
  // the configured per-operation authentication. Only getSupported is replaced.
  const inner = new HTTPFacilitatorClient({
    url,
    timeoutMs,
    ...(createAuthHeaders ? { createAuthHeaders } : {}),
  });

  const base = url.replace(/\/+$/, '');
  const fallback: SupportedResponse = {
    kinds: fallbackKinds,
    extensions: [],
    signers: {},
  };

  const refresh = async (): Promise<SupportedResponse> => {
    const stale = supportedCache.get(base);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (createAuthHeaders) {
      const auth = await createAuthHeaders();
      Object.assign(headers, auth.supported ?? {});
    }
    try {
      const response = await fetchImpl(`${base}/supported`, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`facilitator /supported failed (${response.status})`);
      }
      const value: unknown = await response.json();
      if (!isValidSupportedResponse(value)) {
        throw new Error('facilitator /supported returned an unexpected shape');
      }
      supportedCache.set(base, { value, fetchedAt: now() });
      lastFailure.delete(base);
      return value;
    } catch (error) {
      lastFailure.set(base, { failedAt: now() });
      const age = stale ? now() - stale.fetchedAt : Number.POSITIVE_INFINITY;
      if (stale && age < SUPPORTED_STALE_MAX_MS) {
        console.warn(
          `[x402] facilitator /supported unavailable, serving stale cache (age=${Math.round(age / 1000)}s):`,
          error instanceof Error ? error.message : error
        );
        return stale.value;
      }
      console.error(
        '[x402] facilitator /supported unavailable and no cache, serving config-derived fallback:',
        error instanceof Error ? error.message : error
      );
      return fallback;
    }
  };

  return {
    verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse> {
      return inner.verify(payload, requirements);
    },
    settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse> {
      return inner.settle(payload, requirements);
    },
    async getSupported(): Promise<SupportedResponse> {
      const entry = supportedCache.get(base);
      if (entry && now() - entry.fetchedAt < SUPPORTED_FRESH_TTL_MS) {
        return entry.value;
      }
      const failure = lastFailure.get(base);
      if (failure && now() - failure.failedAt < SUPPORTED_FAILURE_BACKOFF_MS) {
        // Upstream just failed; do not re-probe every request.
        if (entry) return entry.value;
        return fallback;
      }
      const existing = inflightRefresh.get(base);
      if (existing) return existing;
      const task = refresh().finally(() => inflightRefresh.delete(base));
      inflightRefresh.set(base, task);
      return task;
    },
  };
}

/** Test-only: drop all module-level state so tests start from a cold process. */
export function resetFacilitatorResilienceForTests(): void {
  supportedCache.clear();
  lastFailure.clear();
  inflightRefresh.clear();
}
