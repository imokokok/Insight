import {
  withRetry as enhancedWithRetry,
  type EnhancedRetryConfig,
} from '@/lib/api/retry/enhancedRetry';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('OracleRetry');

export interface OracleRetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

export const ORACLE_RETRY_PRESETS = {
  fast: {
    maxAttempts: 2,
    baseDelay: 200,
    maxDelay: 1000,
    backoffMultiplier: 2,
    timeout: 5000,
  },
  standard: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    timeout: 15000,
  },
  aggressive: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 30000,
    backoffMultiplier: 2,
    timeout: 30000,
  },
} as const;

export async function withOracleRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: OracleRetryConfig = ORACLE_RETRY_PRESETS.standard
): Promise<T> {
  const enhancedConfig: Partial<EnhancedRetryConfig> = {
    maxAttempts: config.maxAttempts ?? 3,
    baseDelay: config.baseDelay ?? 1000,
    maxDelay: config.maxDelay ?? 10000,
    backoffMultiplier: config.backoffMultiplier ?? 2,
    timeout: config.timeout ?? 15000,
    strategy: 'exponential',
    enableCircuitBreaker: false,
  };

  const result = await enhancedWithRetry(operation, operationName, enhancedConfig);

  if (!result.success) {
    logger.error(`Oracle operation failed after ${result.attempts} attempts`, result.error, {
      operationName,
      totalDuration: result.totalDuration,
    });
    if (result.error instanceof Error) {
      throw result.error;
    }
    throw new Error(`${operationName} failed after ${result.attempts} attempts`);
  }

  logger.debug(`Oracle operation succeeded`, {
    operationName,
    attempts: result.attempts,
    totalDuration: result.totalDuration,
  });

  return result.data!;
}
