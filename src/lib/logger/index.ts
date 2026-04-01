/**
 * 统一日志记录服务
 *
 * 功能特性：
 * 1. 多级日志支持（debug/info/warn/error）
 * 2. 结构化日志输出
 * 3. 环境感知（开发/生产）
 * 4. Sentry 集成
 * 5. 日志过滤和采样
 * 6. 性能指标记录
 */

import * as Sentry from '@sentry/nextjs';

// ==================== 类型定义 ====================

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志条目
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  error?: ErrorInfo;
  metadata?: LogMetadata;
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
}

/**
 * 日志元数据
 */
export interface LogMetadata {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  userAgent?: string;
  environment?: string;
  version?: string;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableSentry: boolean;
  enableBatching: boolean;
  batchSize: number;
  flushInterval: number;
  sampleRate: number;
  redactFields: string[];
}

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
}

// ==================== 常量 ====================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableSentry: process.env.NODE_ENV === 'production',
  enableBatching: true,
  batchSize: 10,
  flushInterval: 5000,
  sampleRate: 1.0,
  redactFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
};

// ==================== 工具函数 ====================

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 脱敏数据
 */
function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (DEFAULT_CONFIG.redactFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * 检查是否应该记录日志
 */
function shouldLog(level: LogLevel, config: LoggerConfig): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * 采样检查
 */
function shouldSample(config: LoggerConfig): boolean {
  return Math.random() < config.sampleRate;
}

// ==================== Logger 类 ====================

class Logger {
  private moduleName: string;
  private config: LoggerConfig;
  private batch: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(moduleName: string, config: Partial<LoggerConfig> = {}) {
    this.moduleName = moduleName;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableBatching) {
      this.startFlushTimer();
    }
  }

  /**
   * 记录调试日志
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * 记录信息日志
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, dataOrError?: Record<string, unknown> | Error): void {
    let data: Record<string, unknown> | undefined;
    let error: Error | undefined;

    if (dataOrError instanceof Error) {
      error = dataOrError;
    } else {
      data = dataOrError;
    }

    this.log('warn', message, data, error);
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, data, error);
  }

  /**
   * 记录致命错误日志
   */
  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('fatal', message, data, error);
  }

  /**
   * 记录性能指标
   */
  metric(metric: PerformanceMetric, data?: Record<string, unknown>): void {
    this.log('info', `Metric: ${metric.name}`, {
      ...data,
      metric: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      },
    });
  }

  /**
   * 记录业务事件
   */
  event(eventName: string, data?: Record<string, unknown>): void {
    this.log('info', `Event: ${eventName}`, {
      ...data,
      event: eventName,
      eventType: 'business',
    });
  }

  /**
   * 核心日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!shouldLog(level, this.config)) {
      return;
    }

    if (!shouldSample(this.config)) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, error);

    if (this.config.enableBatching && level !== 'fatal') {
      this.batch.push(entry);
      if (this.batch.length >= this.config.batchSize) {
        this.flush();
      }
    } else {
      this.output(entry);
    }

    // 致命错误立即发送
    if (level === 'fatal') {
      this.sendToSentry(entry);
    }
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      id: generateId(),
      timestamp: formatTimestamp(),
      level,
      module: this.moduleName,
      message,
    };

    if (data && Object.keys(data).length > 0) {
      entry.data = redactSensitiveData(data);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // 添加元数据
    entry.metadata = {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
    };

    return entry;
  }

  /**
   * 输出日志
   */
  private output(entry: LogEntry): void {
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    if ((this.config.enableSentry && entry.level === 'error') || entry.level === 'fatal') {
      this.sendToSentry(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.module}]`;
    const { level, message, data, error } = entry;

    const consoleMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error,
    }[level];

    const styles = {
      debug: 'color: #6b7280',
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      fatal: 'color: #dc2626; font-weight: bold',
    }[level];

    if (level === 'error' || level === 'fatal') {
      if (error) {
        consoleMethod(`%c${prefix}`, styles, message, { error, ...data });
      } else {
        consoleMethod(`%c${prefix}`, styles, message, data);
      }
    } else if (data) {
      consoleMethod(`%c${prefix}`, styles, message, data);
    } else {
      consoleMethod(`%c${prefix}`, styles, message);
    }
  }

  /**
   * 发送到 Sentry
   */
  private sendToSentry(entry: LogEntry): void {
    if (typeof window === 'undefined') return;

    const context = {
      module: entry.module,
      logId: entry.id,
      ...entry.data,
      ...entry.metadata,
    };

    if (entry.error) {
      const error = new Error(entry.error.message);
      error.name = entry.error.name;
      error.stack = entry.error.stack;
      Sentry.captureException(error, { extra: context });
    } else {
      Sentry.captureMessage(entry.message, {
        level: entry.level === 'fatal' ? 'fatal' : 'error',
        extra: context,
      });
    }
  }

  /**
   * 启动刷新定时器
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * 刷新批量日志
   */
  private flush(): void {
    if (this.batch.length === 0) return;

    const entries = [...this.batch];
    this.batch = [];

    // 批量输出到控制台
    if (this.config.enableConsole) {
      console.group(`[Logger] Batch flush (${entries.length} entries)`);
      entries.forEach((entry) => this.outputToConsole(entry));
      console.groupEnd();
    }

    // 批量发送到 Sentry（只发送错误级别）
    if (this.config.enableSentry) {
      entries
        .filter((entry) => entry.level === 'error' || entry.level === 'fatal')
        .forEach((entry) => this.sendToSentry(entry));
    }
  }

  /**
   * 销毁 logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

// ==================== 全局 Logger 实例 ====================

const loggers = new Map<string, Logger>();

/**
 * 创建或获取 Logger 实例
 */
export function createLogger(moduleName: string, config?: Partial<LoggerConfig>): Logger {
  const key = `${moduleName}-${JSON.stringify(config)}`;

  if (!loggers.has(key)) {
    loggers.set(key, new Logger(moduleName, config));
  }

  return loggers.get(key)!;
}

/**
 * 获取全局 Logger
 */
export const logger = createLogger('app');

/**
 * 刷新所有 Logger
 */
export function flushAllLoggers(): void {
  loggers.forEach((logger) => {
    // 访问私有属性进行刷新
    (logger as unknown as { flush: () => void }).flush?.();
  });
}

/**
 * 销毁所有 Logger
 */
export function destroyAllLoggers(): void {
  loggers.forEach((logger) => logger.destroy());
  loggers.clear();
}

// ==================== 便捷函数 ====================

/**
 * 记录性能指标
 */
export function logMetric(metric: PerformanceMetric, module?: string): void {
  const log = module ? createLogger(module) : logger;
  log.metric(metric);
}

/**
 * 记录业务事件
 */
export function logEvent(eventName: string, data?: Record<string, unknown>, module?: string): void {
  const log = module ? createLogger(module) : logger;
  log.event(eventName, data);
}

/**
 * 创建性能计时器
 */
export function createTimer(name: string, module?: string) {
  const startTime = performance.now();
  const log = module ? createLogger(module) : logger;

  return {
    end: (data?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      log.metric(
        {
          name,
          value: duration,
          unit: 'ms',
        },
        data
      );
      return duration;
    },
  };
}

// ==================== 导出 ====================

export { Logger };
export { DEFAULT_CONFIG };
