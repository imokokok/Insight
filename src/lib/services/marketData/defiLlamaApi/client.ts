import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { createLogger } from '@/lib/utils/logger';

import { MarketDataError } from './types';

const logger = createLogger('marketData:defiLlamaApi');

export const DEFILLAMA_API_BASE = 'https://api.llama.fi';
export const REQUEST_TIMEOUT = 10000;

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

export async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  return withOracleRetry(
    async () => {
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
    },
    'defiLlamaFetch',
    ORACLE_RETRY_PRESETS.standard
  );
}

export { logger };
