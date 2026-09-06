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

function isExpectedAbort(message: string, error?: Error): boolean {
  const combined = `${message} ${error?.name ?? ''} ${error?.message ?? ''}`;
  if (/timed?\s*out|timeout/i.test(combined)) return false;
  const code = (error as (Error & { code?: string }) | undefined)?.code;
  return code === 'ABORT_ERROR' || /AbortError|\babort(?:ed)?\b/i.test(combined);
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

function reportToSentry(entry: LogEntry): void {
  if (entry.level !== 'error' || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const error = entry.error
    ? Object.assign(new Error(entry.error.message), {
        name: entry.error.name,
        stack: entry.error.stack,
      })
    : new Error(entry.message);

  // Error reporting must not put the full browser SDK on every route's
  // critical path. Load it only if an error actually needs reporting.
  void import('@sentry/nextjs')
    .then((Sentry) =>
      Sentry.captureException(error, {
        tags: { module: entry.module, logger: 'createLogger' },
        extra: { ...entry.data, logMessage: entry.message },
      })
    )
    .catch(() => {
      // Sentry is optional and must never make logging fail.
    });
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
    if (isExpectedAbort(message, error)) return;
    const entry = formatLogEntry('error', this.moduleName, message, data, error);
    outputToConsole(entry);
    reportToSentry(entry);
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

/**
 * Normalizes an unknown caught value into an `Error` for `logger.error`,
 * which requires a concrete `Error` instance. Used pervasively at catch sites
 * so the `instanceof Error ? error : new Error(String(error))` idiom lives in
 * exactly one place.
 */
export function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
