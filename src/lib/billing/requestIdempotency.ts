/**
 * Request-level idempotency for MCP tool calls.
 *
 * A logical request is identified by caller + tool + canonical arguments. Two
 * replays within the same 10-minute window are treated as one billable
 * request:
 *
 *   - a process-local result cache returns the original successful response
 *     without re-executing or re-charging it;
 *   - the credit ledger uses a deterministic metering key per 10-minute
 *     bucket, so even a replay served by another serverless instance (cold
 *     cache) cannot be charged twice.
 *
 * Failures are never cached: only results the server is willing to bill for
 * (or deliberately serve for free) enter the cache.
 */

import { createHmac, scryptSync } from 'node:crypto';

export const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

/**
 * Server-side salt for the caller tag. The fallback keeps fingerprints stable
 * when the variable is unset; this value only scopes idempotency, it protects
 * no secret material.
 */
const FINGERPRINT_SECRET =
  process.env.IDEMPOTENCY_FINGERPRINT_SECRET?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  'insight-request-fingerprint-v1';

/**
 * Irreversible caller tag. The auth layer hands us the API-key identity and
 * CodeQL treats that value as a password source, so it goes through a strong
 * password KDF (scrypt) rather than a fast digest. The KDF is deliberately
 * expensive, so the result is cached per process (bounded) instead of being
 * recomputed on every request.
 */
const MAX_CALLER_TAGS = 2_000;
const callerTagCache = new Map<string, string>();

function callerTag(identity: string): string {
  const cached = callerTagCache.get(identity);
  if (cached) return cached;
  const tag = scryptSync(identity, FINGERPRINT_SECRET, 16).toString('hex');
  if (callerTagCache.size >= MAX_CALLER_TAGS) callerTagCache.clear();
  callerTagCache.set(identity, tag);
  return tag;
}

/**
 * Keyed digest over already-canonical parts. The caller identity only reaches
 * the digest through its scrypt tag; the remaining parts are request content.
 */
function keyedDigest(parts: readonly string[]): string {
  const [identity, ...rest] = parts;
  const joined = [callerTag(identity), ...rest].join('\n');
  return createHmac('sha256', FINGERPRINT_SECRET).update(joined).digest('hex').slice(0, 32);
}

/** Upper bound on cached responses; the process is shared across callers. */
const MAX_CACHED_RESULTS = 5_000;

interface CachedRequestResult {
  expiresAt: number;
  priceCredits: number;
  billableItems: number;
  /** Ledger metering key of the original debit (for X-Credit-Receipt on replay). */
  receipt?: string | null;
  result: unknown;
  /** REST-only: the serialized response a replay must return verbatim. */
  rest?: {
    status: number;
    contentType: string | null;
    body: string;
    /** Ledger key of the original debit, replayed in X-Credit-Receipt. */
    receipt?: string | null;
  };
}

const resultCache = new Map<string, CachedRequestResult>();

/** Longest client-supplied idempotency key accepted; longer values are ignored. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * Resolve the caller-supplied idempotency key. `Idempotency-Key` wins
 * (IETF-style, explicit intent), then `X-Request-Id` (already a de-facto
 * retry id on this API). Invalid/oversized values are ignored so they cannot
 * be used to poison the process-local cache.
 */
export function resolveClientIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get('idempotency-key') ?? headers.get('x-request-id');
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > IDEMPOTENCY_KEY_MAX_LENGTH) return null;
  if (!IDEMPOTENCY_KEY_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Stable identifier for one logical request. Caller identity first so two
 * callers sending identical arguments never share a cache entry or a ledger
 * key. When the caller supplies an idempotency key it participates in the
 * fingerprint, so an explicit retry can never collide with a different
 * logical request from the same caller.
 */
export function mcpRequestFingerprint(
  identity: string,
  toolName: string,
  args: unknown,
  clientKey: string | null = null
): string {
  return keyedDigest([identity, toolName, clientKey ?? '', canonicalize(args ?? {})]);
}

/**
 * REST counterpart of {@link mcpRequestFingerprint}. The billed unit is the
 * WHOLE request: method + path + query + body (and the caller's idempotency
 * key when supplied). A batch call is one idempotent unit priced by its item
 * count, so a replay can neither under- nor over-charge the batch.
 */
export function restRequestFingerprint(input: {
  identity: string;
  method: string;
  path: string;
  search: string;
  bodyText: string;
  clientKey: string | null;
}): string {
  return keyedDigest([
    input.identity,
    input.method,
    input.path,
    input.search,
    input.clientKey ?? '',
    input.bodyText,
  ]);
}

/**
 * Deterministic ledger key for one fingerprint in its 10-minute window.
 * `consume_credits` is idempotent on this key, so concurrent or cross-instance
 * replays charge at most once.
 */
export function idempotencyMeteringKey(fingerprint: string, now = Date.now()): string {
  const bucket = Math.floor(now / IDEMPOTENCY_WINDOW_MS);
  return `mcp:req:${fingerprint}:${bucket}`;
}

/** REST ledger key for one logical request in its 10-minute window. */
export function restIdempotencyMeteringKey(fingerprint: string, now = Date.now()): string {
  const bucket = Math.floor(now / IDEMPOTENCY_WINDOW_MS);
  return `rest:req:${fingerprint}:${bucket}`;
}

/** Return a cached successful result, dropping expired entries lazily. */
export function getCachedMcpResult(
  fingerprint: string,
  now = Date.now()
): CachedRequestResult | null {
  const entry = resultCache.get(fingerprint);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    resultCache.delete(fingerprint);
    return null;
  }
  return entry;
}

/** Cache one successful result for the remainder of the idempotency window. */
export function setCachedMcpResult(
  fingerprint: string,
  entry: Omit<CachedRequestResult, 'expiresAt'>,
  now = Date.now()
): void {
  if (resultCache.size >= MAX_CACHED_RESULTS) {
    const oldestKey = resultCache.keys().next().value;
    if (oldestKey !== undefined) resultCache.delete(oldestKey);
  }
  resultCache.set(fingerprint, { ...entry, expiresAt: now + IDEMPOTENCY_WINDOW_MS });
}

/** Test hook: clear the process-local cache. */
export function clearMcpRequestCache(): void {
  resultCache.clear();
}
