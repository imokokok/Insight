import { isAppError } from './errorToResponse';

export { AppError } from './AppError';

export { ValidationError, InternalError } from './BusinessErrors';

export {
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  OracleProviderError,
} from './OracleError';

export { errorToResponse, isAppError } from './errorToResponse';

interface ErrorClassification {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function classifyError(error: unknown): ErrorClassification {
  if (isAppError(error)) {
    return {
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      logLevel: error.getLogLevel(),
    };
  }

  if (error instanceof TypeError) {
    return {
      category: 'validation',
      severity: 'medium',
      retryable: false,
      logLevel: 'warn',
    };
  }

  if (error instanceof RangeError) {
    return {
      category: 'internal',
      severity: 'high',
      retryable: false,
      logLevel: 'error',
    };
  }

  if (error instanceof SyntaxError) {
    return {
      category: 'validation',
      severity: 'high',
      retryable: false,
      logLevel: 'error',
    };
  }

  return {
    category: 'unknown',
    severity: 'critical',
    retryable: false,
    logLevel: 'error',
  };
}

export type StringMatchErrorType =
  | 'timeout'
  | 'cors'
  | 'server_error'
  | 'network'
  | 'rate_limit'
  | 'data_format'
  | 'authorization';

export function classifyByStringMatching(
  error: Error
): { errorType: StringMatchErrorType; retryable: boolean } | null {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
    return { errorType: 'timeout', retryable: true };
  }

  if (
    message.includes('cors') ||
    message.includes('cross-origin') ||
    message.includes('blocked by cors') ||
    message.includes('access-control')
  ) {
    return { errorType: 'cors', retryable: false };
  }

  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('internal server error') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable') ||
    message.includes('gateway timeout')
  ) {
    return { errorType: 'server_error', retryable: true };
  }

  if (
    name.includes('network') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('enotfound') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('networkerror') ||
    message.includes('failed to fetch')
  ) {
    return { errorType: 'network', retryable: true };
  }

  if (
    message.includes('rate limit') ||
    message.includes('too many') ||
    message.includes('429') ||
    message.includes('throttl') ||
    message.includes('quota exceeded')
  ) {
    return { errorType: 'rate_limit', retryable: true };
  }

  if (
    message.includes('parse') ||
    message.includes('json') ||
    message.includes('format') ||
    message.includes('invalid') ||
    message.includes('unexpected token') ||
    message.includes('syntaxerror')
  ) {
    return { errorType: 'data_format', retryable: false };
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return { errorType: 'authorization', retryable: false };
  }

  return null;
}
