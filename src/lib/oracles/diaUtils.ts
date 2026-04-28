import { withOracleRetry } from './utils/retry';

import type { RetryConfig } from './diaTypes';

export const DIA_API_BASE_URL = process.env.DIA_API_URL || 'https://api.diadata.org/v1';

export const CACHE_TTL = {
  PRICE: 30000,
  HISTORICAL: 60000,
  SUPPLY: 300000,
  DIGITAL_ASSETS: 300000,
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  const oracleConfig = {
    maxAttempts: config.maxAttempts,
    baseDelay: config.baseDelay,
    maxDelay: config.maxDelay,
    backoffMultiplier: config.backoffMultiplier,
  };

  return withOracleRetry(operation, operationName, oracleConfig);
}

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithTimeout<T = unknown>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const { timeout = 10000, signal: externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return null as T;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw new Error(`Request aborted: ${url}`);
      }
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }

    throw error;
  }
}
