import { createLogger } from '@/lib/utils/logger';

import { MarketDataError } from './types';

const logger = createLogger('marketData:defiLlamaApi');

export const DEFILLAMA_API_BASE = 'https://api.llama.fi';
export const REQUEST_TIMEOUT = 10000;
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000;

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MarketDataError('Request timeout', 'TIMEOUT_ERROR', 408);
    }
    throw error;
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new MarketDataError(
            `Rate limited or forbidden: ${response.statusText}`,
            'RATE_LIMIT_ERROR',
            response.status
          );
        }
        throw new MarketDataError(
          `HTTP error: ${response.status} ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i === retries - 1) {
        break;
      }

      logger.warn(`Fetch attempt ${i + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY * (i + 1));
    }
  }

  throw new MarketDataError(
    `Failed after ${retries} retries: ${lastError?.message}`,
    'RETRY_EXHAUSTED',
    undefined,
    lastError
  );
}

export { logger };
