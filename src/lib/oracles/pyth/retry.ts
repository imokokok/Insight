import { createLogger } from '@/lib/utils/logger';

import { DEFAULT_RETRY_CONFIG } from '../pythConstants';

import type { RetryConfig } from '../pythConstants';

const logger = createLogger('PythRetry');

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
