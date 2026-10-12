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
import { createHash } from 'node:crypto';

const logger = createLogger('GoPlusTokenSecurity');

export const GOPLUS_TIMEOUT_MS = 3_000;
export const GOPLUS_CACHE_TTL_MS = 15 * 60_000;

const GOPLUS_BASE_URL = 'https://api.gopluslabs.io';
const GOPLUS_TOKEN_URL = `${GOPLUS_BASE_URL}/api/v1/token`;
const GOPLUS_TOKEN_REFRESH_SKEW_SECONDS = 60;

interface CachedAccessToken {
  value: string;
  expiresAt: number;
}

let cachedAccessToken: CachedAccessToken | null = null;
let accessTokenPromise: Promise<string | null> | null = null;

/**
 * GoPlus credentials are an app key + app secret, not an access token. Mint
 * and cache the short-lived API token from GoPlus at runtime so secrets never
 * leave the server. Read env at call time to support runtime configuration.
 */
async function getGoPlusAccessToken(
  fetchImpl: typeof globalThis.fetch,
  callerSignal: AbortSignal
): Promise<string | null> {
  const appKey = process.env.GOPLUS_APP_KEY?.trim() ?? '';
  const appSecret = process.env.GOPLUS_APP_SECRET?.trim() ?? '';
  if (!appKey && !appSecret) return null;
  if (!appKey || !appSecret) {
    logger.warn('GoPlus app credentials incomplete; advisory omitted');
    return null;
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return waitForAbort(cachedAccessToken.value, callerSignal);
  }

  if (!accessTokenPromise) {
    const time = Math.floor(now / 1000).toString();
    const sign = createHash('sha1').update(`${appKey}${time}${appSecret}`).digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error('GoPlus token request timed out')),
      GOPLUS_TIMEOUT_MS
    );
    const request = (async (): Promise<string | null> => {
      try {
        const response = await fetchImpl(GOPLUS_TOKEN_URL, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_key: appKey, time, sign }),
          signal: controller.signal,
        });
        if (!response.ok) {
          logger.warn('GoPlus access token request failed; advisory omitted', {
            status: response.status,
          });
          return null;
        }

        const payload: unknown = await response.json().catch(() => null);
        if (
          typeof payload !== 'object' ||
          payload === null ||
          (payload as { code?: unknown }).code !== 1
        ) {
          logger.warn('GoPlus access token response rejected; advisory omitted', {
            payloadCode: (payload as { code?: unknown } | null)?.code,
          });
          return null;
        }

        const result = (payload as { result?: unknown }).result;
        if (typeof result !== 'object' || result === null) {
          logger.warn('GoPlus access token response malformed; advisory omitted');
          return null;
        }
        const token = (result as { access_token?: unknown }).access_token;
        const expiresInValue = (result as { expires_in?: unknown }).expires_in;
        const expiresIn =
          typeof expiresInValue === 'number' || typeof expiresInValue === 'string'
            ? Number(expiresInValue)
            : Number.NaN;
        if (
          typeof token !== 'string' ||
          token.length === 0 ||
          !Number.isFinite(expiresIn) ||
          expiresIn <= 0
        ) {
          logger.warn('GoPlus access token response malformed; advisory omitted');
          return null;
        }

        const refreshInSeconds = Math.max(1, expiresIn - GOPLUS_TOKEN_REFRESH_SKEW_SECONDS);
        cachedAccessToken = {
          value: token,
          expiresAt: Date.now() + refreshInSeconds * 1000,
        };
        return token;
      } catch (error) {
        logger.warn('GoPlus access token request failed; advisory omitted', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })();
    accessTokenPromise = request;
    void request.finally(() => {
      if (accessTokenPromise === request) accessTokenPromise = null;
    });
  }

  return waitForAbort(accessTokenPromise, callerSignal);
}

function waitForAbort<T>(value: T, signal: AbortSignal): Promise<T>;
function waitForAbort<T>(value: Promise<T>, signal: AbortSignal): Promise<T>;
function waitForAbort<T>(value: T | Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('GoPlus request timed out'));
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error('GoPlus request timed out'));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(value).then(
      (result) => {
        signal.removeEventListener('abort', abort);
        resolve(result);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      }
    );
  });
}

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

/** One-line lane outcome for the opt-in debugTokenSec response surface. */
export type GoPlusLaneOutcome =
  | 'not_requested'
  | 'unresolved_address'
  | 'fetched'
  | 'http_error'
  | 'malformed_json'
  | 'error_code'
  | 'no_scan_record'
  | 'fetch_exception'
  | 'cached_null';

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
  cachedAccessToken = null;
  accessTokenPromise = null;
}

/**
 * Fetch the GoPlus token_security record for one contract. Returns null on any
 * failure (timeout, rate limit, error code, empty result, unsupported chain) —
 * null means "no evidence", never "safe".
 *
 * `onOutcome` receives the terminal lane outcome (including the silent
 * cache-hit paths) for the opt-in debug surface; production logging is separate.
 */
export async function fetchGoPlusTokenSecurity(
  chainId: number,
  contractAddress: string,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
  onOutcome?: (outcome: GoPlusLaneOutcome) => void
): Promise<GoPlusRawResult | null> {
  const address = contractAddress.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    onOutcome?.('unresolved_address');
    return null;
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    onOutcome?.('unresolved_address');
    return null;
  }

  const key = goPlusCacheKey(chainId, address);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    onOutcome?.(cached.value ? 'fetched' : 'cached_null');
    return cached.value;
  }

  const result = await fetchOnce(chainId, address, fetchImpl, onOutcome);
  cache.set(key, { value: result, expiresAt: Date.now() + GOPLUS_CACHE_TTL_MS });
  return result;
}

async function fetchOnce(
  chainId: number,
  address: string,
  fetchImpl: typeof globalThis.fetch,
  onOutcome?: (outcome: GoPlusLaneOutcome) => void
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
    const hasAppKey = Boolean(process.env.GOPLUS_APP_KEY?.trim());
    const hasAppSecret = Boolean(process.env.GOPLUS_APP_SECRET?.trim());
    if (hasAppKey !== hasAppSecret) {
      logger.warn('GoPlus app credentials incomplete; advisory omitted');
      onOutcome?.('fetch_exception');
      return null;
    }
    const accessToken = hasAppKey ? await getGoPlusAccessToken(fetchImpl, controller.signal) : null;
    if (hasAppKey && !accessToken) {
      onOutcome?.('fetch_exception');
      return null;
    }
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // GoPlus validates the raw token here; adding "Bearer " yields 4012.
        ...(accessToken ? { Authorization: accessToken } : {}),
      },
    });
    const rawBody = await response.text();
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      onOutcome?.('http_error');
      logger.warn('GoPlus token_security non-OK response; advisory omitted', {
        chainId,
        status: response.status,
        contentType: response.headers.get('content-type') ?? 'none',
        bodyHead: rawBody.slice(0, 160),
        latencyMs,
        keyed: Boolean(process.env.GOPLUS_APP_KEY && process.env.GOPLUS_APP_SECRET),
      });
      return null;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      onOutcome?.('malformed_json');
      logger.warn('GoPlus token_security malformed JSON; advisory omitted', {
        chainId,
        bodyHead: rawBody.slice(0, 160),
      });
      return null;
    }
    if (
      typeof payload !== 'object' ||
      payload === null ||
      (payload as { code?: unknown }).code !== 1
    ) {
      onOutcome?.('error_code');
      logger.warn('GoPlus token_security error code; advisory omitted', {
        chainId,
        payloadCode: (payload as { code?: unknown })?.code,
        payloadMessage: (payload as { message?: unknown })?.message,
      });
      return null;
    }
    const result = (payload as { result?: unknown }).result;
    const record =
      typeof result === 'object' && result !== null
        ? ((result as Record<string, unknown>)[address] as unknown)
        : undefined;
    if (typeof record !== 'object' || record === null) {
      // Unknown contract (no scan available) — omit, never synthesize. Logged
      // so a shape mismatch on GoPlus's side is diagnosable, not invisible.
      onOutcome?.('no_scan_record');
      logger.warn('GoPlus token_security no scan record; advisory omitted', {
        chainId,
        address,
        resultKind: result === null ? 'null' : Array.isArray(result) ? 'array' : typeof result,
      });
      return null;
    }
    const normalized: GoPlusTokenSecurityRecord = {};
    for (const [field, value] of Object.entries(record as Record<string, unknown>)) {
      if (typeof value === 'string') normalized[field] = value;
    }
    logger.info('GoPlus token_security fetched', { chainId, address, latencyMs });
    onOutcome?.('fetched');
    return {
      contractAddress: address,
      rawBody,
      record: normalized,
      fetchedAt: new Date().toISOString(),
      latencyMs,
    };
  } catch (error) {
    onOutcome?.('fetch_exception');
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
