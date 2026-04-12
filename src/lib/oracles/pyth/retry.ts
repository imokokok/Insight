import { DEFAULT_RETRY_CONFIG } from '../pythConstants';
import { withOracleRetry, ORACLE_RETRY_PRESETS, type OracleRetryConfig } from '../utils/retry';

import type { RetryConfig } from '../pythConstants';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  const oracleConfig: OracleRetryConfig = {
    maxAttempts: config.maxAttempts,
    baseDelay: config.baseDelay,
    maxDelay: config.maxDelay,
    backoffMultiplier: config.backoffMultiplier,
  };

  return withOracleRetry(operation, operationName, oracleConfig);
}
