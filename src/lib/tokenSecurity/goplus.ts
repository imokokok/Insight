/**
 * GoPlus token_security client (decision-input expansion, first data lane).
 *
 * Advisory evidence lane only, per `decision-input-expansion-2026-10-12.md`:
 * - Whatever happens here NEVER enters the verdict, the rule engine, or the
 *   signed EIP-712 oracle attestation.
 * - Fail-closed: any timeout, rate-limit, non-OK code, or malformed body
 *   returns null and the caller OMITS the advisory fields entirely. We never
 *   synthesize a "looks safe" answer from missing data.
 * - 3s hard timeout, single attempt (no retry) — the advisory lane must not
 *   inflate pre-trade latency beyond its budget.
 * - 15-minute in-process cache per (chainId, contract) to respect the free-tier
 *   budget; cache misses after process restart simply re-fetch.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('GoPlusTokenSecurity');

export const GOPLUS_TIMEOUT_MS = 3_000;
export const GOPLUS_CACHE_TTL_MS = 15 * 60_000;

const GOPLUS_BASE_URL = 'https://api.gopluslabs.com';

/** Raw GoPlus token_security record — every field is a string on the wire. */
export type GoPlusTokenSecurityRecord = Record<string, string>;

export interface GoPlusRawResult {
  contractAddress: string;
  /** Verbatim response body — this exact byte string is what rawResponseSha256 pins. */
  rawBody: string;
  record: GoPlusTokenSecurityRecord;
  fetchedAt: string;
  latencyMs: number;
}

interface CacheSlot {
  value: GoPlusRawResult | null;
  expiresAt: number;
}

const cache = new Map<string, CacheSlot>();

export function goPlusCacheKey(chainId: number, contractAddress: string): string {
  return `${chainId}:${contractAddress.toLowerCase()}`;
}

/** Test seam — clears the in-process cache. */
export function clearGoPlusCacheForTest(): void {
  cache.clear();
}

/**
 * Fetch the GoPlus token_security record for one contract. Returns null on any
 * failure (timeout, rate limit, error code, empty result, unsupported chain) —
 * null means "no evidence", never "safe".
 */
export async function fetchGoPlusTokenSecurity(
  chainId: number,
  contractAddress: string,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): Promise<GoPlusRawResult | null> {
  const address = contractAddress.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null;
  if (!Number.isInteger(chainId) || chainId <= 0) return null;

  const key = goPlusCacheKey(chainId, address);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const result = await fetchOnce(chainId, address, fetchImpl);
  cache.set(key, { value: result, expiresAt: Date.now() + GOPLUS_CACHE_TTL_MS });
  return result;
}

async function fetchOnce(
  chainId: number,
  address: string,
  fetchImpl: typeof globalThis.fetch
): Promise<GoPlusRawResult | null> {
  const url =
    `${GOPLUS_BASE_URL}/api/v1/token_security/${chainId}` +
    `?contract_addresses=${encodeURIComponent(address)}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('GoPlus request timed out')),
    GOPLUS_TIMEOUT_MS
  );
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const rawBody = await response.text();
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      logger.warn('GoPlus token_security non-OK response; advisory omitted', {
        chainId,
        status: response.status,
      });
      return null;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.warn('GoPlus token_security malformed JSON; advisory omitted', { chainId });
      return null;
    }
    if (
      typeof payload !== 'object' ||
      payload === null ||
      (payload as { code?: unknown }).code !== 1
    ) {
      logger.warn('GoPlus token_security error code; advisory omitted', { chainId });
      return null;
    }
    const result = (payload as { result?: unknown }).result;
    const record =
      typeof result === 'object' && result !== null
        ? ((result as Record<string, unknown>)[address] as unknown)
        : undefined;
    if (typeof record !== 'object' || record === null) {
      // Unknown contract (no scan available) — omit, never synthesize.
      return null;
    }
    const normalized: GoPlusTokenSecurityRecord = {};
    for (const [field, value] of Object.entries(record as Record<string, unknown>)) {
      if (typeof value === 'string') normalized[field] = value;
    }
    return {
      contractAddress: address,
      rawBody,
      record: normalized,
      fetchedAt: new Date().toISOString(),
      latencyMs,
    };
  } catch (error) {
    logger.warn('GoPlus token_security fetch failed; advisory omitted', {
      chainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parsed advisory view for the `tokenSecurity` response object. Booleans are
 * set ONLY when GoPlus explicitly reports "0"/"1" — anything else stays
 * undefined (absence means "unreported", not "fine").
 */
export function parseTokenSecurityViewFields(record: GoPlusTokenSecurityRecord): {
  isHoneypot?: boolean;
  buyTaxPct?: number;
  sellTaxPct?: number;
  isOpenSource?: boolean;
  isProxy?: boolean;
  isMintable?: boolean;
  hiddenOwner?: boolean;
  holderCount?: number;
  isInCex?: boolean;
  trustList?: boolean;
  tokenSymbol?: string;
} {
  return {
    isHoneypot: parseFlag(record.is_honeypot),
    buyTaxPct: parseTaxPct(record.buy_tax),
    sellTaxPct: parseTaxPct(record.sell_tax),
    isOpenSource: parseFlag(record.is_open_source),
    isProxy: parseFlag(record.is_proxy),
    isMintable: parseFlag(record.is_mintable),
    hiddenOwner: parseFlag(record.hidden_owner),
    holderCount: parseNonNegativeInt(record.holder_count),
    isInCex: parseFlag(record.is_in_cex),
    trustList: parseFlag(record.trust_list),
    tokenSymbol: record.token_symbol || undefined,
  };
}

function parseFlag(value: string | undefined): boolean | undefined {
  if (value === '1') return true;
  if (value === '0') return false;
  return undefined;
}

function parseTaxPct(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  // GoPlus reports taxes as decimals ("0.1" = 10%).
  return Math.round(parsed * 10_000) / 100;
}

function parseNonNegativeInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}
