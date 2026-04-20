import type { ReactNode } from 'react';

import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NetworkError,
  InternalError,
} from './BusinessErrors';
import { isAppError } from './errorToResponse';

import type { AppError as AppErrorType } from './AppError';

export { AppError } from './AppError';

export {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  InternalError,
  NetworkError,
} from './BusinessErrors';

export {
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  RedStoneApiError,
  type RedStoneErrorCode,
  ChainlinkError,
  PythError,
  API3Error,
  SupraError,
  FlareError,
  DIAError,
  WINkLinkError,
} from './OracleError';

export { errorToResponse, isAppError } from './errorToResponse';

interface ErrorBoundaryHandler {
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onReset?: () => void;
  fallback?: ReactNode;
}

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
      logLevel: error.toLogEntry().level as 'debug' | 'info' | 'warn' | 'error',
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
