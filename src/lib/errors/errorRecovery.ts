import { captureException, addBreadcrumb } from '@/lib/monitoring';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  error: Error;
  context: ErrorContext;
  resolved: boolean;
  retryCount: number;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  errorId: string;
  timestamp: Date;
  error: Error;
  context: ErrorContext;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

class ErrorRecoveryManager {
  private errorLogs: ErrorLogEntry[] = [];
  private readonly maxLogSize = 100;
  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...defaultRetryConfig, ...config };
  }

  /**
   * 执行带有重试机制的异步操作
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {},
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          addBreadcrumb({
            category: 'recovery',
            message: `Operation succeeded after ${attempt} attempts`,
            level: 'info',
            data: { context, attempt },
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const shouldRetry = this.shouldRetryError(lastError, attempt, config);

        if (!shouldRetry) {
          this.logError(lastError, context, attempt - 1);
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, config);

        addBreadcrumb({
          category: 'recovery',
          message: `Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms`,
          level: 'warning',
          data: { context, attempt, delay, error: lastError.message },
        });

        await this.sleep(delay);
      }
    }

    this.logError(lastError!, context, config.maxAttempts - 1);
    throw lastError;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetryError(error: Error, attempt: number, config: RetryConfig): boolean {
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // 检查是否是网络错误
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return true;
    }

    // 检查是否是超时错误
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return true;
    }

    // 检查 HTTP 状态码
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return config.retryableStatuses.includes(status);
    }

    return false;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 1000; // 添加随机抖动
    return Math.min(delay + jitter, config.maxDelay);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 记录错误到日志
   */
  private logError(error: Error, context: ErrorContext, retryCount: number): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      error,
      context,
      resolved: false,
      retryCount,
    };

    this.errorLogs.unshift(entry);

    // 限制日志大小
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogSize);
    }

    // 发送到监控系统
    captureException(error, {
      ...context,
      retryCount,
      errorId: entry.id,
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(): ErrorLogEntry[] {
    return [...this.errorLogs];
  }

  /**
   * 清除错误日志
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * 标记错误为已解决
   */
  resolveError(errorId: string): boolean {
    const entry = this.errorLogs.find((log) => log.id === errorId);
    if (entry) {
      entry.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 生成错误报告
   */
  generateErrorReport(errorId: string): ErrorReport | null {
    const entry = this.errorLogs.find((log) => log.id === errorId);
    if (!entry) return null;

    return {
      errorId: entry.id,
      timestamp: entry.timestamp,
      error: entry.error,
      context: entry.context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      stackTrace: entry.error.stack,
    };
  }

  /**
   * 导出所有错误报告
   */
  exportAllReports(): ErrorReport[] {
    return this.errorLogs.map((entry) => ({
      errorId: entry.id,
      timestamp: entry.timestamp,
      error: entry.error,
      context: entry.context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      stackTrace: entry.error.stack,
    }));
  }

  /**
   * 更新重试配置
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }
}

// 创建单例实例
export const errorRecovery = new ErrorRecoveryManager();

/**
 * React Hook for error recovery
 */
export function useErrorRecovery() {
  return {
    withRetry: errorRecovery.withRetry.bind(errorRecovery),
    getErrorLogs: errorRecovery.getErrorLogs.bind(errorRecovery),
    clearErrorLogs: errorRecovery.clearErrorLogs.bind(errorRecovery),
    resolveError: errorRecovery.resolveError.bind(errorRecovery),
    generateErrorReport: errorRecovery.generateErrorReport.bind(errorRecovery),
    exportAllReports: errorRecovery.exportAllReports.bind(errorRecovery),
  };
}

/**
 * 创建带有自动重试的数据获取函数
 */
export function createRetryableFetch<T>(
  fetchFn: () => Promise<T>,
  context: ErrorContext = {},
  config?: Partial<RetryConfig>
) {
  return () => errorRecovery.withRetry(fetchFn, context, config);
}

/**
 * 错误报告服务
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private reporters: Array<(report: ErrorReport) => Promise<void>> = [];

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  /**
   * 注册错误报告处理器
   */
  registerReporter(reporter: (report: ErrorReport) => Promise<void>): void {
    this.reporters.push(reporter);
  }

  /**
   * 提交错误报告
   */
  async submitReport(report: ErrorReport): Promise<void> {
    // 发送到所有注册的报告处理器
    await Promise.all(
      this.reporters.map(async (reporter) => {
        try {
          await reporter(report);
        } catch (error) {
          console.error('Error reporter failed:', error);
        }
      })
    );

    // 同时发送到监控系统
    captureException(report.error, {
      errorId: report.errorId,
      ...report.context,
      userAgent: report.userAgent,
      url: report.url,
    });
  }

  /**
   * 从错误日志提交报告
   */
  async submitReportFromLog(errorId: string): Promise<boolean> {
    const report = errorRecovery.generateErrorReport(errorId);
    if (!report) return false;

    await this.submitReport(report);
    return true;
  }
}

export const errorReporting = ErrorReportingService.getInstance();
