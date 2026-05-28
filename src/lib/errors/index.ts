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
