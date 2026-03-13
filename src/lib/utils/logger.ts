type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, dataOrError?: Record<string, unknown> | Error): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): LogLevel {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? 'error' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    module,
    message,
  };

  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

function formatConsoleOutput(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.module}]`;
  return prefix;
}

function outputToConsole(entry: LogEntry): void {
  const prefix = formatConsoleOutput(entry);
  const { level, message, data, error } = entry;

  const consoleMethod = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }[level];

  if (level === 'error' && error) {
    consoleMethod(prefix, message, { error, ...data });
  } else if (data) {
    consoleMethod(prefix, message, data);
  } else {
    consoleMethod(prefix, message);
  }
}

class LoggerImpl implements Logger {
  private moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    const entry = formatLogEntry('info', this.moduleName, message, data);
    outputToConsole(entry);
  }

  warn(message: string, dataOrError?: Record<string, unknown> | Error): void {
    if (!shouldLog('warn')) return;
    let data: Record<string, unknown> | undefined;
    let error: Error | undefined;

    if (dataOrError instanceof Error) {
      error = dataOrError;
    } else if (dataOrError) {
      data = dataOrError;
    }

    const entry = formatLogEntry('warn', this.moduleName, message, data, error);
    outputToConsole(entry);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    if (!shouldLog('error')) return;
    const entry = formatLogEntry('error', this.moduleName, message, data, error);
    outputToConsole(entry);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    const entry = formatLogEntry('debug', this.moduleName, message, data);
    outputToConsole(entry);
  }
}

export function createLogger(moduleName: string): Logger {
  return new LoggerImpl(moduleName);
}

export const logger: Logger = createLogger('app');

/**
 * 使用示例:
 *
 * // 创建模块专用日志实例
 * const log = createLogger('PriceService');
 *
 * // 记录信息日志
 * log.info('价格更新成功', { symbol: 'BTC/USD', price: 45000 });
 *
 * // 记录警告日志
 * log.warn('价格波动较大', { symbol: 'ETH/USD', volatility: 0.15 });
 *
 * // 记录错误日志（带错误对象）
 * try {
 *   // ... 某些操作
 * } catch (error) {
 *   log.error('获取价格失败', error instanceof Error ? error : new Error(String(error)), { symbol: 'BTC/USD' });
 * }
 *
 * // 记录调试日志
 * log.debug('API 请求参数', { endpoint: '/api/prices', params: { limit: 100 } });
 *
 * // 使用全局日志实例
 * logger.info('应用启动完成', { version: '1.0.0' });
 *
 * 环境变量控制:
 * - 开发环境 (NODE_ENV=development): 输出所有级别日志
 * - 生产环境 (NODE_ENV=production): 仅输出 error 级别日志
 *
 * 日志格式:
 * [时间戳] [日志级别] [模块名] 消息内容 {数据}
 * 例如: [2024-01-15T10:30:45.123Z] [INFO ] [PriceService] 价格更新成功 { symbol: 'BTC/USD', price: 45000 }
 */
