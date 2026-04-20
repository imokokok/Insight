import { captureException, addBreadcrumb } from '@/lib/monitoring';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('enhanced-retry');

export type RetryStrategy = 'fixed' | 'exponential' | 'linear' | 'decorrelated-jitter';

export interface EnhancedRetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  strategy: RetryStrategy;
  retryableStatuses: number[];
  retryableErrorCodes: string[];
  timeout: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
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

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private readonly threshold: number;
  private readonly resetTime: number;
  private halfOpenInProgress = false;

  constructor(threshold: number, resetTime: number) {
    this.threshold = threshold;
    this.resetTime = resetTime;
  }

  canExecute(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.resetTime) {
        this.state = CircuitBreakerState.HALF_OPEN;
        return true;
      }
      return false;
    }

    if (this.halfOpenInProgress) {
      return false;
    }
    this.halfOpenInProgress = true;
    return true;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.state = CircuitBreakerState.CLOSED;
    this.halfOpenInProgress = false;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN || this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.halfOpenInProgress = false;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
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
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 60000,
};

function calculateDelay(attempt: number, config: EnhancedRetryConfig): number {
  const { strategy, baseDelay, maxDelay, backoffMultiplier } = config;

  let delay: number;

  switch (strategy) {
    case 'fixed':
      delay = baseDelay;
      break;

    case 'linear':
      delay = baseDelay * attempt;
      break;

    case 'exponential':
      delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
      break;

    case 'decorrelated-jitter': {
      const prevDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 2);
      delay = Math.random() * (maxDelay - baseDelay) + baseDelay;
      if (attempt > 1) {
        delay = Math.min(maxDelay, Math.random() * (delay + prevDelay));
      }
      break;
    }

    default:
      delay = baseDelay;
  }

  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  delay = Math.min(delay + jitter, maxDelay);

  return Math.max(0, Math.round(delay));
}

function shouldRetry(error: Error, attempt: number, config: EnhancedRetryConfig): boolean {
  if (attempt >= config.maxAttempts) {
    return false;
  }

  const errorCode = (error as Error & { code?: string }).code;
  if (errorCode && config.retryableErrorCodes.includes(errorCode)) {
    return true;
  }

  const statusMatch = error.message.match(/(?:status[:=\s]+|HTTP\s+)(\d{3})(?:\s|$|\b)/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 100 && status < 600 && config.retryableStatuses.includes(status)) {
      return true;
    }
  }

  const statusWordMatch = error.message.match(/\b(\d{3})\s+[A-Z][a-zA-Z\s]+/);
  if (statusWordMatch) {
    const status = parseInt(statusWordMatch[1], 10);
    if (status >= 100 && status < 600 && config.retryableStatuses.includes(status)) {
      return true;
    }
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

  const errorMessage = error.message.toLowerCase();
  return networkErrorPatterns.some((pattern) => errorMessage.includes(pattern.toLowerCase()));
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation ${operationName || ''} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

class EnhancedRetryManager {
  private config: EnhancedRetryConfig;
  private circuitBreaker?: CircuitBreaker;

  constructor(config: Partial<EnhancedRetryConfig> = {}) {
    this.config = { ...defaultEnhancedRetryConfig, ...config };

    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerResetTime
      );
    }
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
    callbacks?: RetryCallbacks<T>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();

    if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
      const error = new Error(
        `Circuit breaker is OPEN for operation: ${operationName || 'unknown'}`
      );
      logger.warn('Circuit breaker blocked operation', { operationName });

      return {
        success: false,
        error,
        attempts: 0,
        totalDuration: Date.now() - startTime,
        strategy: this.config.strategy,
      };
    }

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

        this.circuitBreaker?.recordSuccess();

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
        lastError = error instanceof Error ? error : new Error(String(error));

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
          this.circuitBreaker?.recordFailure();
          callbacks?.onFailure?.(lastError, context);

          captureException(lastError, {
            operationName,
            attempt,
            maxAttempts: this.config.maxAttempts,
            strategy: this.config.strategy,
          });

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

    this.circuitBreaker?.recordFailure();

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

  getCircuitBreakerState(): string | undefined {
    return this.circuitBreaker?.getState();
  }

  updateConfig(config: Partial<EnhancedRetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EnhancedRetryConfig {
    return { ...this.config };
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName?: string,
  config?: Partial<EnhancedRetryConfig>,
  callbacks?: RetryCallbacks<T>
): Promise<RetryResult<T>> {
  const manager = new EnhancedRetryManager(config);
  return manager.execute(operation, operationName, callbacks);
}
