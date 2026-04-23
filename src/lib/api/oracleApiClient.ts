import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

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

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

const ORACLE_TIMEOUT_CONFIG: Record<string, number> = {
  chainlink: 10_000,
  pyth: 8_000,
  api3: 20_000,
  dia: 25_000,
  winklink: 20_000,
  redstone: 12_000,
  supra: 10_000,
  twap: 15_000,
  reflector: 20_000,
  flare: 12_000,
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
}

const pendingRequests = new Map<string, PendingRequest<unknown>>();

const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5_000;
const MAX_CACHE_SIZE = 200;
const CACHE_CLEANUP_INTERVAL = 60_000;
let lastCacheCleanup = Date.now();

function setCachedResponse(key: string, data: unknown): void {
  const now = Date.now();
  if (now - lastCacheCleanup > CACHE_CLEANUP_INTERVAL) {
    for (const [k, v] of responseCache) {
      if (now - v.timestamp >= CACHE_TTL_MS) {
        responseCache.delete(k);
      }
    }
    lastCacheCleanup = now;
  }
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey !== undefined) {
      responseCache.delete(oldestKey);
    }
  }
  responseCache.set(key, { data, timestamp: now });
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
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  if (cached) {
    responseCache.delete(key);
  }
  return undefined;
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
): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout>; cleanup: () => void } {
  const previous = pendingRequests.get(key);
  if (previous) {
    previous.controller.abort();
    clearTimeout(previous.timeoutId);
    pendingRequests.delete(key);
  }

  const timeoutMs = getRequestTimeout(provider);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    removePendingRequest(key);
  }, timeoutMs);

  let cleanup: () => void = () => {};

  if (signal) {
    const onExternalAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
      removePendingRequest(key);
    };
    signal.addEventListener('abort', onExternalAbort, { once: true });
    cleanup = () => {
      signal.removeEventListener('abort', onExternalAbort);
      removePendingRequest(key);
    };
  }

  return { controller, timeoutId, cleanup };
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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

  if (data.error) {
    const errMsg =
      data.error && typeof data.error === 'object' && 'message' in data.error
        ? String((data.error as { message: unknown }).message)
        : 'Unknown error from API';
    throw new Error(errMsg);
  }

  try {
    return validateData(data);
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
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing.promise as Promise<T>;
  }

  if (!forceRefresh) {
    const cached = getCachedResponse<T>(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
  }

  const { controller, timeoutId, cleanup } = createAbortControllerWithTimeout(
    key,
    externalSignal,
    provider
  );

  const promise = fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  })
    .then((response) => handleApiResponse<T>(response, url, context, validateData))
    .then((data) => {
      if (!forceRefresh) {
        setCachedResponse(key, data);
      }
      return data;
    })
    .finally(() => {
      cleanup();
    });

  pendingRequests.set(key, { promise, controller, timeoutId });

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

export const oracleApiClient = {
  fetchPrice: fetchPriceFromApi,
  fetchHistorical: fetchHistoricalFromApi,
};
