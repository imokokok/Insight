import { createLogger } from '@/lib/utils/logger';
import { captureException, addBreadcrumb } from '@/lib/monitoring';

const logger = createLogger('enhanced-retry');

/**
 * 重试策略类型
 */
export type RetryStrategy = 'fixed' | 'exponential' | 'linear' | 'decorrelated-jitter';

/**
 * 增强的重试配置接口
 */
export interface EnhancedRetryConfig {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay: number;
  /** 退避乘数（用于指数退避） */
  backoffMultiplier: number;
  /** 重试策略 */
  strategy: RetryStrategy;
  /** 可重试的 HTTP 状态码 */
  retryableStatuses: number[];
  /** 可重试的错误码 */
  retryableErrorCodes: string[];
  /** 超时时间（毫秒） */
  timeout: number;
  /** 是否启用断路器模式 */
  enableCircuitBreaker: boolean;
  /** 断路器失败阈值 */
  circuitBreakerThreshold: number;
  /** 断路器重置时间（毫秒） */
  circuitBreakerResetTime: number;
}

/**
 * 重试上下文
 */
export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error: Error;
  timestamp: number;
}

/**
 * 重试事件回调
 */
export interface RetryCallbacks<T> {
  onRetry?: (context: RetryContext) => void;
  onSuccess?: (result: T, context: RetryContext) => void;
  onFailure?: (error: Error, context: RetryContext) => void;
  onTimeout?: (context: RetryContext) => void;
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  strategy: RetryStrategy;
}

/**
 * 断路器状态
 */
enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * 断路器
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private readonly threshold: number;
  private readonly resetTime: number;

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
        this.failureCount = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

/**
 * 默认重试配置
 */
export const defaultEnhancedRetryConfig: EnhancedRetryConfig = {
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

/**
 * 计算延迟时间
 */
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
      // 去相关抖动算法：减少重试风暴
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

  // 添加随机抖动（±10%）
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  delay = Math.min(delay + jitter, maxDelay);

  return Math.max(0, Math.round(delay));
}

/**
 * 判断是否应该重试
 */
function shouldRetry(error: Error, attempt: number, config: EnhancedRetryConfig): boolean {
  if (attempt >= config.maxAttempts) {
    return false;
  }

  // 检查错误码
  const errorCode = (error as Error & { code?: string }).code;
  if (errorCode && config.retryableErrorCodes.includes(errorCode)) {
    return true;
  }

  // 检查 HTTP 状态码
  const statusMatch = error.message.match(/\b(\d{3})\b/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 100 && status < 600 && config.retryableStatuses.includes(status)) {
      return true;
    }
  }

  // 检查错误对象上的状态码属性
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

  // 检查网络错误
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

/**
 * 带超时的 Promise 包装器
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${operationName || ''} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * 增强的重试管理器
 */
export class EnhancedRetryManager {
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

  /**
   * 执行带有重试机制的异步操作
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string,
    callbacks?: RetryCallbacks<T>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();

    // 检查断路器状态
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

        // 记录成功
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

        // 检查是否是超时错误
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

    // 所有重试都失败了
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

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取断路器状态
   */
  getCircuitBreakerState(): string | undefined {
    return this.circuitBreaker?.getState();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<EnhancedRetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): EnhancedRetryConfig {
    return { ...this.config };
  }
}

/**
 * 创建重试管理器实例
 */
export function createRetryManager(config?: Partial<EnhancedRetryConfig>): EnhancedRetryManager {
  return new EnhancedRetryManager(config);
}

/**
 * 便捷函数：使用重试执行操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName?: string,
  config?: Partial<EnhancedRetryConfig>,
  callbacks?: RetryCallbacks<T>
): Promise<RetryResult<T>> {
  const manager = new EnhancedRetryManager(config);
  return manager.execute(operation, operationName, callbacks);
}

/**
 * 便捷函数：创建可重试的 fetch
 */
export function createRetryableFetch(
  fetchFn: typeof fetch,
  config?: Partial<EnhancedRetryConfig>
): typeof fetch {
  const manager = new EnhancedRetryManager(config);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const result = await manager.execute(
      () => fetchFn(input, init),
      `fetch:${typeof input === 'string' ? input : input.toString()}`
    );

    if (!result.success) {
      throw result.error || new Error('Fetch failed after retries');
    }

    return result.data!;
  };
}

/**
 * 重试策略预设
 */
export const retryStrategies = {
  /** 快速重试：适用于对延迟敏感的操作 */
  fast: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    strategy: 'fixed' as RetryStrategy,
  },

  /** 标准重试：默认策略 */
  standard: defaultEnhancedRetryConfig,

  /** 激进重试：适用于关键操作 */
  aggressive: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 60000,
    backoffMultiplier: 2,
    strategy: 'exponential' as RetryStrategy,
  },

  /** 温和重试：适用于非关键操作 */
  gentle: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    strategy: 'linear' as RetryStrategy,
  },

  /** 抖动重试：适用于高并发场景 */
  jitter: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    strategy: 'decorrelated-jitter' as RetryStrategy,
  },
};

export default EnhancedRetryManager;
