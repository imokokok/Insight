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
}

interface FetchHistoricalParams extends FetchPriceParams {
  period: number;
}

const REQUEST_TIMEOUT_MS = 15_000;

interface PendingRequest<T> {
  promise: Promise<T>;
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest<unknown>>();

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

function removePendingRequest(key: string): void {
  const pending = pendingRequests.get(key);
  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingRequests.delete(key);
  }
}

function createAbortControllerWithTimeout(
  key: string,
  signal?: AbortSignal
): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const previous = pendingRequests.get(key);
  if (previous) {
    previous.controller.abort();
    clearTimeout(previous.timeoutId);
    pendingRequests.delete(key);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    pendingRequests.delete(key);
  }, REQUEST_TIMEOUT_MS);

  if (signal) {
    const onExternalAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
      pendingRequests.delete(key);
    };
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  return { controller, timeoutId };
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
  validateData: (data: unknown) => T
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing.promise as Promise<T>;
  }

  const { controller, timeoutId } = createAbortControllerWithTimeout(key, externalSignal);

  const promise = fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  })
    .then((response) => handleApiResponse<T>(response, url, context, validateData))
    .finally(() => {
      removePendingRequest(key);
    });

  pendingRequests.set(key, { promise, controller, timeoutId });

  return promise;
}

async function fetchPriceFromApi({
  provider,
  symbol,
  chain,
  signal: externalSignal,
}: FetchPriceParams): Promise<PriceData> {
  const key = buildRequestKey('price', provider, symbol, chain);
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching price from API: ${url.toString()}`);

  return deduplicatedFetch<PriceData>(
    key,
    url.toString(),
    'Price',
    externalSignal,
    validatePriceData
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
    validatePriceDataArray
  );
}

export const oracleApiClient = {
  fetchPrice: fetchPriceFromApi,
  fetchHistorical: fetchHistoricalFromApi,
};
