import { createLogger } from '@/lib/utils/logger';

import type { RetryConfig } from './diaTypes';

const logger = createLogger('DIADataService');

export const DIA_API_BASE_URL = process.env.DIA_API_URL || 'https://api.diadata.org/v1';

export const CACHE_TTL = {
  PRICE: 30000,
  HISTORICAL: 60000,
  NFT: 60000,
  SUPPLY: 300000,
  DIGITAL_ASSETS: 300000,
  NETWORK_STATS: 120000,
  STAKING: 300000,
  ECOSYSTEM: 600000,
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.baseDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`${operationName} failed (attempt ${attempt}/${config.maxAttempts})`, {
        error: lastError.message,
      });

      if (attempt < config.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
}
