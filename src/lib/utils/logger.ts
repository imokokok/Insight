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

const cachedMinLogLevel: LogLevel = getMinLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[cachedMinLogLevel];
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

  // eslint-disable-next-line no-console
  const logFn = console[level].bind(console);

  if (level === 'error' && error) {
    logFn(prefix, message, { error, ...data });
  } else if (data) {
    logFn(prefix, message, data);
  } else {
    logFn(prefix, message);
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

const logger: Logger = createLogger('app');

/**
 * Usage examples:
 *
 * const log = createLogger('PriceService');
 *
 * log.info('Price updated successfully', { symbol: 'BTC/USD', price: 45000 });
 *
 * log.warn('High price volatility', { symbol: 'ETH/USD', volatility: 0.15 });
 *
 * try {
 *   // ... some operation
 * } catch (error) {
 *   log.error('Failed to fetch price', error instanceof Error ? error : new Error(String(error)), { symbol: 'BTC/USD' });
 * }
 *
 * log.debug('API request params', { endpoint: '/api/prices', params: { limit: 100 } });
 *
 * logger.info('Application started', { version: '1.0.0' });
 *
 * Environment variable control:
 * - Development (NODE_ENV=development): outputs all log levels
 * - Production (NODE_ENV=production): outputs only error level logs
 *
 * Log format:
 * [timestamp] [level] [module] message {data}
 * e.g.: [2024-01-15T10:30:45.123Z] [INFO ] [PriceService] Price updated successfully { symbol: 'BTC/USD', price: 45000 }
 */
