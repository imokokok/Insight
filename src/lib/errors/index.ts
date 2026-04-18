// ==================== Base Error Classes ====================
// ==================== Import Types for Utility Functions ====================
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

// ==================== Business Errors ====================
export {
  // validateerror
  ValidationError,

  // error
  NotFoundError,

  // authentication/authorizationerror
  AuthenticationError,
  AuthorizationError,

  // error
  RateLimitError,

  // internalerror
  InternalError,

  // error
  NetworkError,

  // externalserviceerror
} from './BusinessErrors';

// ==================== Oracle Errors ====================
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
  type DIAErrorCode,
  WINkLinkError,
  type WINkLinkErrorCode,
} from './OracleError';

// ==================== Error Response Handling ====================
export { errorToResponse, isAppError } from './errorToResponse';

// ==================== Error Utility Functions ====================

/**
 * Check if error is of a specific type
 */
export function isValidationError(error: unknown): error is InstanceType<typeof ValidationError> {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is InstanceType<typeof NotFoundError> {
  return error instanceof NotFoundError;
}

export function isAuthenticationError(
  error: unknown
): error is InstanceType<typeof AuthenticationError> {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(
  error: unknown
): error is InstanceType<typeof AuthorizationError> {
  return error instanceof AuthorizationError;
}

export function isRateLimitError(error: unknown): error is InstanceType<typeof RateLimitError> {
  return error instanceof RateLimitError;
}

export function isNetworkError(error: unknown): error is InstanceType<typeof NetworkError> {
  return error instanceof NetworkError;
}

/**
 * Safely get error message
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.getUserMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Safely get error code
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Check if error should be displayed to user
 */
export function shouldShowErrorToUser(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppErrorType {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, { originalError: error.name }, error) as AppErrorType;
  }

  return new InternalError(typeof error === 'string' ? error : 'An unexpected error occurred', {
    originalValue: String(error),
  }) as AppErrorType;
}

/**
 * Error classifier
 */
export interface ErrorClassification {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Classify error
 */
export function classifyError(error: unknown): ErrorClassification {
  if (isAppError(error)) {
    return {
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      logLevel: error.toLogEntry().level as 'debug' | 'info' | 'warn' | 'error',
    };
  }

  // Infer classification from error type
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

  // Default classification
  return {
    category: 'unknown',
    severity: 'critical',
    retryable: false,
    logLevel: 'error',
  };
}

/**
 * Create error handler
 */
export function createErrorHandler<T>(
  handler: (error: AppErrorType) => T,
  fallback?: T
): (error: unknown) => T {
  return (error: unknown) => {
    try {
      const appError = toAppError(error);
      return handler(appError);
    } catch (handlerError) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw handlerError;
    }
  };
}

/**
 * Error boundary handler
 */
export interface ErrorBoundaryHandler {
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onReset?: () => void;
  fallback?: ReactNode;
}
