import { type EnhancedRetryConfig, withRetry } from '@/lib/api/retry/enhancedRetry';

// Cloudflare's 522–524 responses are transient origin failures. These writes
// are deliberately limited to `upsert` calls with stable conflict keys, so a
// retry cannot duplicate data or repeat a side effect.
const idempotentWriteRetryConfig: Partial<EnhancedRetryConfig> = {
  maxAttempts: 3,
  baseDelay: 750,
  maxDelay: 3_000,
  backoffMultiplier: 2,
  strategy: 'exponential',
  timeout: 15_000,
  retryableStatuses: [408, 429, 500, 502, 503, 504, 522, 523, 524],
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR',
    'SERVICE_UNAVAILABLE',
  ],
};

/**
 * Retries a transient database failure for an idempotent Supabase `upsert`.
 * Do not use this for inserts or mutations without a stable conflict key.
 */
export async function retryIdempotentSupabaseWrite<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const result = await withRetry(operation, operationName, idempotentWriteRetryConfig);

  if (result.success) {
    return result.data as T;
  }

  throw result.error ?? new Error(`${operationName} failed after ${result.attempts} attempts`);
}
