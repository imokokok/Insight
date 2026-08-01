import { TTLCache } from '@/lib/utils/cache';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { withRetry, type EnhancedRetryConfig } from './retry/enhancedRetry';
import {
  validatePriceData,
  validatePriceDataArray,
  OracleDataValidationError,
} from './validation/oracleDataValidation';

const logger = createLogger('OracleApiClient');

interface FetchPriceParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

interface FetchHistoricalParams extends FetchPriceParams {
  period: number;
}

interface FetchBatchPricesParams {
  provider: OracleProvider;
  symbol: string;
  chains: Blockchain[];
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

interface BatchPriceResult {
  provider: string;
  symbol: string;
  chain?: string;
  price: PriceData | null;
  error: string | null;
}

interface BatchPriceResponse {
  success: boolean;
  data: BatchPriceResult[];
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

const ORACLE_RETRY_CONFIG: Partial<EnhancedRetryConfig> = {
  maxAttempts: 2,
  baseDelay: 1000,
  maxDelay: 5000,
  strategy: 'exponential',
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  enableCircuitBreaker: false,
};

const ORACLE_TIMEOUT_CONFIG: Record<string, number> = {
  chainlink: 10_000,
  pyth: 30_000,
  api3: 20_000,
  dia: 25_000,
  winklink: 20_000,
  redstone: 12_000,
  supra: 10_000,
  twap: 15_000,
  reflector: 20_000,
  flare: 12_000,
  switchboard: 12_000,
};

function getRequestTimeout(provider?: string): number {
  if (provider && ORACLE_TIMEOUT_CONFIG[provider]) {
    return ORACLE_TIMEOUT_CONFIG[provider];
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
  createdAt: number;
}

const pendingRequests = new Map<string, PendingRequest<unknown>>();
const MAX_PENDING_REQUESTS = 100;

const responseCache = new TTLCache({ maxSize: 200, cleanupIntervalMs: 60000 });
const CACHE_TTL_MS = 15_000;
const PENDING_REQUEST_TIMEOUT = 30_000;

// Throttle lazy cleanup so we don't scan the pending-requests map on every
// single fetch. Under burst traffic (e.g. cross-oracle page loading 10+
// providers concurrently) the per-call scan made total cleanup cost O(N²);
// throttling to once per minute keeps it O(N) with identical eviction
// semantics (stale entries are still cleared, just on the next call after
// the throttle window rather than immediately).
const CLEANUP_THROTTLE_MS = 60_000;
let lastCleanupAt = 0;

function cleanupStalePendingRequests(): void {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_THROTTLE_MS) return;
  lastCleanupAt = now;

  for (const [key, request] of pendingRequests) {
    if (now - request.createdAt >= PENDING_REQUEST_TIMEOUT) {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      request.controller.abort(
        new Error(`Request ${key} timed out after ${PENDING_REQUEST_TIMEOUT}ms`)
      );
      pendingRequests.delete(key);
    }
  }
}

// Note: cleanup is performed lazily inside deduplicatedFetch (throttled to
// once per CLEANUP_THROTTLE_MS), rather than via a module-level setInterval
// which would keep a serverless function alive and prevent it from being
// frozen/recycled.

function setCachedResponse(key: string, data: unknown): void {
  responseCache.set(key, data, CACHE_TTL_MS);
}

function buildRequestKey(
  prefix: string,
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain,
  period?: number
): string {
  let key = `${prefix}:${provider}:${symbol}`;
  if (chain) key += `:${chain}`;
  if (period !== undefined) key += `:p${period}`;
  return key;
}

function getCachedResponse<T>(key: string): T | undefined {
  const cached = responseCache.get<T>(key);
  return cached ?? undefined;
}

function removePendingRequest(key: string): void {
  const pending = pendingRequests.get(key);
  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingRequests.delete(key);
  }
}

function createAbortControllerWithTimeout(
  key: string,
  signal?: AbortSignal,
  provider?: string
): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
  cleanup: () => void;
  getTimedOut: () => boolean;
} {
  const previous = pendingRequests.get(key);
  if (previous) {
    previous.controller.abort(new Error(`Request superseded by newer request for ${key}`));
    clearTimeout(previous.timeoutId);
    pendingRequests.delete(key);
  }

  const timeoutMs = getRequestTimeout(provider);
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`${provider || 'Oracle'} request timed out after ${timeoutMs}ms`));
    removePendingRequest(key);
  }, timeoutMs);

  const onExternalAbort = signal
    ? () => {
        clearTimeout(timeoutId);
        controller.abort(new Error(`External abort for ${key}`));
        removePendingRequest(key);
      }
    : undefined;

  if (signal && onExternalAbort) {
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const cleanup = () => {
    if (onExternalAbort && signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
    const pending = pendingRequests.get(key);
    if (pending) {
      clearTimeout(pending.timeoutId);
      if (!pending.controller.signal.aborted) {
        // Abort the underlying fetch if it is still in-flight. This happens
        // when withRetry's withTimeout (15s) fires before the per-provider
        // timeout (e.g. pyth 30s): the retry exhausts, .finally runs this
        // cleanup, and without an explicit abort the fetch would hang until
        // the server closes the connection. If the fetch already completed,
        // abort() is a no-op.
        pending.controller.abort(new Error(`Request ${key} cleaned up`));
      }
      pendingRequests.delete(key);
    }
  };

  return { controller, timeoutId, cleanup, getTimedOut: () => timedOut };
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_APP_URL environment variable is required in production but is not set'
    );
  }
  return 'http://localhost:3000';
}

function extractErrorMessage(
  errorData: unknown,
  fallbackPrefix: string,
  status: number,
  statusText: string
): string {
  if (errorData && typeof errorData === 'object' && 'message' in errorData) {
    return (
      String((errorData as { message: unknown }).message) ||
      `${fallbackPrefix}: ${status} ${statusText}`
    );
  }
  return `${fallbackPrefix}: ${status} ${statusText}`;
}

async function handleApiResponse<T>(
  response: Response,
  url: string,
  context: string,
  validateData: (data: unknown) => T
): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorData: unknown = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // Not JSON, use text as is
    }
    logger.error(`[oracleApiClient] ${context} API error:`, undefined, {
      status: response.status,
      statusText: response.statusText,
      url,
      errorData,
      errorText,
    });
    throw new Error(extractErrorMessage(errorData, context, response.status, response.statusText));
  }

  const data = await response.json();

  // Support both v1 wrapped responses ({ success, data, meta }) and legacy raw
  // responses. The /api/oracles/* routes now return the wrapped format.
  const isWrapped = data && typeof data === 'object' && 'success' in data;
  const payload = isWrapped ? data.data : data;

  if (data.error || (isWrapped && data.success === false)) {
    const errorObj = data.error;
    const errMsg =
      errorObj && typeof errorObj === 'object' && 'message' in errorObj
        ? String((errorObj as { message: unknown }).message)
        : 'Unknown error from API';
    throw new Error(errMsg);
  }

  try {
    return validateData(payload);
  } catch (validationError) {
    if (validationError instanceof OracleDataValidationError) {
      logger.error(`[oracleApiClient] ${context} data validation failed:`, undefined, {
        missingFields: validationError.missingFields,
        rawData: validationError.rawData,
      });
    }
    throw validationError;
  }
}

function deduplicatedFetch<T>(
  key: string,
  url: string,
  context: string,
  externalSignal: AbortSignal | undefined,
  validateData: (data: unknown) => T,
  provider?: string,
  forceRefresh: boolean = false
): Promise<T> {
  // Lazy cleanup of stale pending requests on every access.
  cleanupStalePendingRequests();

  const existing = pendingRequests.get(key);
  if (existing && !forceRefresh) {
    return existing.promise as Promise<T>;
  }

  if (!forceRefresh) {
    const cached = getCachedResponse<T>(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
  }

  const { controller, timeoutId, cleanup, getTimedOut } = createAbortControllerWithTimeout(
    key,
    externalSignal,
    provider
  );

  // Reserve the map slot with a deferred placeholder BEFORE creating the real
  // promise. This closes the dedup window and guarantees that even if the real
  // promise is synchronously rejected, concurrent callers wait on the
  // placeholder (which forwards the outcome) instead of reusing a stale
  // rejected promise that would be cleaned up only asynchronously in finally.
  let resolvePlaceholder!: (value: T | PromiseLike<T>) => void;
  let rejectPlaceholder!: (reason?: unknown) => void;
  const placeholder: Promise<T> = new Promise<T>((resolve, reject) => {
    resolvePlaceholder = resolve;
    rejectPlaceholder = reject;
  });

  pendingRequests.set(key, {
    promise: placeholder,
    controller,
    timeoutId,
    createdAt: Date.now(),
  });

  const promise = withRetry(
    () =>
      fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
        .then((response) => handleApiResponse<T>(response, url, context, validateData))
        .catch((error) => {
          // The internal per-provider timeout aborts the controller, which
          // produces an AbortError. enhancedRetry treats all AbortErrors as
          // non-retryable, so we convert our own timeout into a regular Error
          // that will be retried according to ORACLE_RETRY_CONFIG.
          if (error instanceof Error && error.name === 'AbortError' && getTimedOut()) {
            throw new Error(
              `${provider || 'Oracle'} request timed out after ${getRequestTimeout(provider)}ms`
            );
          }
          throw error;
        }),
    `oracle:${context}`,
    ORACLE_RETRY_CONFIG
  )
    .then((result) => {
      if (result.success && result.data !== undefined) {
        if (!forceRefresh) {
          setCachedResponse(key, result.data);
        }
        return result.data;
      }
      throw result.error ?? new Error(`${context} request failed after retry`);
    })
    .finally(() => {
      cleanup();
    });

  // Forward the real promise outcome to the placeholder so concurrent waiters
  // receive the same result.
  promise.then(resolvePlaceholder, rejectPlaceholder);

  if (pendingRequests.size > MAX_PENDING_REQUESTS) {
    const oldestKey = pendingRequests.keys().next().value;
    if (oldestKey !== undefined && oldestKey !== key) {
      const oldest = pendingRequests.get(oldestKey);
      if (oldest) {
        clearTimeout(oldest.timeoutId);
        oldest.controller.abort();
      }
      pendingRequests.delete(oldestKey);
    }
  }

  return promise;
}

async function fetchPriceFromApi({
  provider,
  symbol,
  chain,
  signal: externalSignal,
  forceRefresh = false,
}: FetchPriceParams): Promise<PriceData> {
  const key = buildRequestKey('price', provider, symbol, chain);
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  if (chain) {
    url.searchParams.set('chain', chain);
  }
  if (forceRefresh) {
    url.searchParams.set('forceRefresh', 'true');
  }

  logger.info(`Fetching price from API: ${url.toString()}`);

  if (forceRefresh) {
    responseCache.delete(key);
  }

  return deduplicatedFetch<PriceData>(
    key,
    url.toString(),
    'Price',
    externalSignal,
    validatePriceData,
    provider,
    forceRefresh
  );
}

async function fetchHistoricalFromApi({
  provider,
  symbol,
  chain,
  period,
  signal: externalSignal,
}: FetchHistoricalParams): Promise<PriceData[]> {
  const key = buildRequestKey('hist', provider, symbol, chain, period);
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('period', period.toString());
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching historical prices from API: ${url.toString()}`);

  return deduplicatedFetch<PriceData[]>(
    key,
    url.toString(),
    'Historical price',
    externalSignal,
    validatePriceDataArray,
    provider
  );
}

async function fetchBatchPricesFromApi({
  provider,
  symbol,
  chains,
  signal: externalSignal,
  forceRefresh = false,
}: FetchBatchPricesParams): Promise<Map<Blockchain, PriceData>> {
  const result = new Map<Blockchain, PriceData>();

  if (chains.length === 0) return result;

  // Batch responses were previously fetched without any caching or request
  // deduplication, unlike the single-price path. Reuse the shared response
  // cache so repeated batch calls within the TTL reuse the same result.
  const cacheKey = `batch:${provider}:${symbol.toUpperCase()}:${[...chains].sort().join(',')}`;
  if (!forceRefresh) {
    const cached = getCachedResponse<Map<Blockchain, PriceData>>(cacheKey);
    if (cached) {
      return new Map(cached);
    }
  }

  const url = new URL('/api/oracles/batch', getBaseUrl());

  const controller = new AbortController();
  const timeoutMs = getRequestTimeout(provider) * 2;

  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Batch request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  let onExternalAbort: (() => void) | null = null;
  if (externalSignal) {
    onExternalAbort = () => controller.abort();
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: chains.map((chain) => ({
          provider,
          symbol,
          chain,
        })),
        forceRefresh,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('Batch price API error', undefined, {
        status: response.status,
        errorText,
      });
      throw new Error(`Batch price API error: ${response.status}`);
    }

    const data: BatchPriceResponse = await response.json();

    if (data.data) {
      for (const item of data.data) {
        if (item.price && !item.error && item.chain) {
          try {
            result.set(item.chain as Blockchain, validatePriceData(item.price));
          } catch {
            logger.warn('Invalid price data in batch response for chain', {
              chain: item.chain,
            });
          }
        }
      }
    }

    if (!forceRefresh && result.size > 0) {
      setCachedResponse(cacheKey, new Map(result));
    }
    return result;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

interface MultiOracleBatchResult {
  prices: PriceData[];
  errors: Array<{ provider: string; error: string }>;
}

async function fetchMultiOraclePrices({
  providers,
  symbol,
  signal: externalSignal,
  forceRefresh = false,
}: {
  providers: OracleProvider[];
  symbol: string;
  signal?: AbortSignal;
  forceRefresh?: boolean;
}): Promise<MultiOracleBatchResult> {
  if (providers.length === 0) return { prices: [], errors: [] };

  const cacheKey = `multi:${symbol.toUpperCase()}:${providers.slice().sort().join(',')}`;
  if (!forceRefresh) {
    const cached = getCachedResponse<MultiOracleBatchResult>(cacheKey);
    if (cached) return cached;
  }

  const url = new URL('/api/oracles/batch', getBaseUrl());
  const controller = new AbortController();
  const timeoutMs = getRequestTimeout(providers[0]) * 2;

  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Multi-oracle batch request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  let onExternalAbort: (() => void) | null = null;
  if (externalSignal) {
    onExternalAbort = () => controller.abort();
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: providers.map((provider) => ({
          provider,
          symbol,
        })),
        forceRefresh,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Multi-oracle batch API error: ${response.status} ${errorText}`);
    }

    const data: BatchPriceResponse = await response.json();

    const prices: PriceData[] = [];
    const errors: Array<{ provider: string; error: string }> = [];

    if (data.data) {
      for (const item of data.data) {
        if (item.price && !item.error) {
          try {
            prices.push(validatePriceData(item.price));
          } catch {
            errors.push({ provider: item.provider, error: 'Invalid price data' });
          }
        } else if (item.error) {
          errors.push({ provider: item.provider, error: item.error });
        }
      }
    }

    if (!forceRefresh && prices.length > 0) {
      setCachedResponse(cacheKey, { prices, errors });
    }

    return { prices, errors };
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export const oracleApiClient = {
  fetchPrice: fetchPriceFromApi,
  fetchHistorical: fetchHistoricalFromApi,
  fetchBatchPrices: fetchBatchPricesFromApi,
  fetchMultiOraclePrices,
};
