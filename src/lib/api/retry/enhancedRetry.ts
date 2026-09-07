import { captureException, addBreadcrumb } from '@/lib/monitoring';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('enhanced-retry');

type RetryStrategy = 'exponential';

export interface EnhancedRetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  strategy: RetryStrategy;
  retryableStatuses: number[];
  retryableErrorCodes: string[];
  timeout: number;
}

interface RetryContext {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error: Error;
  timestamp: number;
}

interface RetryCallbacks<T> {
  onRetry?: (context: RetryContext) => void;
  onSuccess?: (result: T, context: RetryContext) => void;
  onFailure?: (error: Error, context: RetryContext) => void;
  onTimeout?: (context: RetryContext) => void;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  strategy: RetryStrategy;
}

const defaultEnhancedRetryConfig: EnhancedRetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  strategy: 'exponential',
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR',
    'SERVICE_UNAVAILABLE',
  ],
  timeout: 30000,
};

function calculateDelay(attempt: number, config: EnhancedRetryConfig): number {
  const { baseDelay, maxDelay, backoffMultiplier } = config;

  const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);

  return Math.max(baseDelay, Math.round(Math.min(delay + jitter, maxDelay)));
}

function isAbortError(error: Error): boolean {
  if (error.name === 'AbortError') return true;
  const code = (error as Error & { code?: string }).code;
  return code === 'ABORT_ERROR' || /\babort(?:ed)?\b/i.test(error.message);
}

function shouldRetry(error: Error, attempt: number, config: EnhancedRetryConfig): boolean {
  if (attempt >= config.maxAttempts) {
    return false;
  }

  if (error.name === 'AbortError') {
    return false;
  }

  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return false;
  }

  const errorMessageLower = error.message.toLowerCase();
  if (errorMessageLower.includes('abort') && !errorMessageLower.includes('503')) {
    return false;
  }

  const errorCode = (error as Error & { code?: string }).code;
  if (errorCode && config.retryableErrorCodes.includes(errorCode)) {
    return true;
  }

  const errorWithStatus = error as Error & { status?: number; statusCode?: number };
  if (
    typeof errorWithStatus.status === 'number' &&
    config.retryableStatuses.includes(errorWithStatus.status)
  ) {
    return true;
  }
  if (
    typeof errorWithStatus.statusCode === 'number' &&
    config.retryableStatuses.includes(errorWithStatus.statusCode)
  ) {
    return true;
  }

  const statusMatch = error.message.match(/(?:status[:=\s]+|HTTP\s+)(\d{3})(?:\s|$|\b)/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 100 && status < 600 && config.retryableStatuses.includes(status)) {
      return true;
    }
  }

  const networkErrorPatterns = [
    'network',
    'fetch',
    'timeout',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNABORTED',
  ];

  return networkErrorPatterns.some((pattern) => errorMessageLower.includes(pattern.toLowerCase()));
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation ${operationName || ''} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
}

class EnhancedRetryManager {
  private config: EnhancedRetryConfig;

  constructor(config: Partial<EnhancedRetryConfig> = {}) {
    this.config = { ...defaultEnhancedRetryConfig, ...config };
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
    callbacks?: RetryCallbacks<T>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const delay = attempt > 1 ? calculateDelay(attempt - 1, this.config) : 0;

        const context: RetryContext = {
          attempt,
          maxAttempts: this.config.maxAttempts,
          delay,
          error: lastError || new Error('Unknown'),
          timestamp: Date.now(),
        };

        if (attempt > 1) {
          logger.info(
            `Retry attempt ${attempt}/${this.config.maxAttempts} for ${operationName || 'operation'}`,
            {
              delay,
              strategy: this.config.strategy,
            }
          );

          addBreadcrumb({
            category: 'retry',
            message: `Retry attempt ${attempt}/${this.config.maxAttempts}`,
            level: 'info',
            data: { operationName, delay, strategy: this.config.strategy },
          });

          callbacks?.onRetry?.(context);
          await this.sleep(delay);
        }

        const result = await withTimeout(operation(), this.config.timeout, operationName);

        const successContext: RetryContext = {
          ...context,
          error: new Error('Success'),
        };

        callbacks?.onSuccess?.(result, successContext);

        addBreadcrumb({
          category: 'retry',
          message: `Operation succeeded after ${attempt} attempt(s)`,
          level: 'info',
          data: { operationName, attempts: attempt },
        });

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          strategy: this.config.strategy,
        };
      } catch (error) {
        lastError = normalizeError(error);

        const context: RetryContext = {
          attempt,
          maxAttempts: this.config.maxAttempts,
          delay: 0,
          error: lastError,
          timestamp: Date.now(),
        };

        if (lastError.message.includes('timed out')) {
          logger.warn(`Operation ${operationName || ''} timed out`, { attempt });
          callbacks?.onTimeout?.(context);
        }

        const shouldRetryResult = shouldRetry(lastError, attempt, this.config);

        if (!shouldRetryResult) {
          // Navigation and component lifecycle cancellation are expected control
          // flow. They must not pollute monitoring.
          if (!isAbortError(lastError)) {
            callbacks?.onFailure?.(lastError, context);

            captureException(lastError, {
              operationName,
              attempt,
              maxAttempts: this.config.maxAttempts,
              strategy: this.config.strategy,
            });
          }

          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDuration: Date.now() - startTime,
            strategy: this.config.strategy,
          };
        }

        logger.warn(`Attempt ${attempt} failed, will retry`, {
          operationName,
          error: lastError.message,
          strategy: this.config.strategy,
        });
      }
    }

    if (lastError) {
      callbacks?.onFailure?.(lastError, {
        attempt: this.config.maxAttempts,
        maxAttempts: this.config.maxAttempts,
        delay: 0,
        error: lastError,
        timestamp: Date.now(),
      });

      captureException(lastError, {
        operationName,
        attempts: this.config.maxAttempts,
        strategy: this.config.strategy,
        message: 'All retry attempts exhausted',
      });
    }

    return {
      success: false,
      error: lastError || new Error('Max retry attempts reached'),
      attempts: this.config.maxAttempts,
      totalDuration: Date.now() - startTime,
      strategy: this.config.strategy,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const retryManagerRegistry = new Map<
  string,
  { manager: EnhancedRetryManager; configKey: string; lastAccessed: number }
>();

const MAX_REGISTRY_SIZE = 100;

function enforceRegistryCapacity(): void {
  if (retryManagerRegistry.size <= MAX_REGISTRY_SIZE) return;

  const entries = Array.from(retryManagerRegistry.entries()).sort(
    (a, b) => a[1].lastAccessed - b[1].lastAccessed
  );

  const toRemove = retryManagerRegistry.size - MAX_REGISTRY_SIZE;
  for (let i = 0; i < toRemove; i++) {
    retryManagerRegistry.delete(entries[i][0]);
  }
}

function configSignature(config?: Partial<EnhancedRetryConfig>): string {
  if (!config) return '';
  return JSON.stringify(config);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName?: string,
  config?: Partial<EnhancedRetryConfig>,
  callbacks?: RetryCallbacks<T>
): Promise<RetryResult<T>> {
  const key = operationName || '__default__';
  const signature = configSignature(config);
  let entry = retryManagerRegistry.get(key);
  // Create a new manager when there is no cached entry, or when the caller
  // passes a different config than the one the cached manager was built with.
  // Previously the config of subsequent calls was silently ignored, which meant
  // callers could never change retry behavior for a named operation after the
  // first invocation.
  if (!entry || entry.configKey !== signature) {
    entry = {
      manager: new EnhancedRetryManager(config),
      configKey: signature,
      lastAccessed: Date.now(),
    };
    retryManagerRegistry.set(key, entry);
    enforceRegistryCapacity();
  } else {
    entry.lastAccessed = Date.now();
  }
  return entry.manager.execute(operation, operationName, callbacks);
}
