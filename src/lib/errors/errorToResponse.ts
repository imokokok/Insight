import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';
import { createErrorResponse as createStandardErrorResponse, ErrorCode } from '@/types/api/error';

import { AppError } from './AppError';

const logger = createLogger('error-handler');

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}
/**
 * Convert error to NextResponse response
 * Reuse the standard error response creation function from errorTypes.ts
 */
export function errorToResponse(error: unknown): NextResponse {
  // Log error
  if (error instanceof AppError) {
    logger.error(`AppError: ${error.code} - ${error.message}`, error as Error, {
      statusCode: error.statusCode,
      details: error.details,
    });

    // Use the standard error response creation function
    const errorCode = Object.values(ErrorCode).includes(error.code as ErrorCode)
      ? (error.code as ErrorCode)
      : ErrorCode.INTERNAL_ERROR;
    const standardResponse = createStandardErrorResponse(errorCode, error.message, {
      details: error.details,
    });

    return NextResponse.json(standardResponse, { status: error.statusCode });
  }

  // Handle native Error
  if (error instanceof Error) {
    logger.error(`Unhandled Error: ${error.message}`, error);

    const isDev = process.env.NODE_ENV === 'development';
    const standardResponse = createStandardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      isDev ? error.message : 'An internal error occurred'
    );

    return NextResponse.json(standardResponse, { status: 500 });
  }

  // Handle unknown error type
  logger.error('Unknown error type');

  const standardResponse = createStandardErrorResponse(
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred'
  );

  return NextResponse.json(standardResponse, { status: 500 });
}

/**
 * Handle error and add context information
 */
function handleError(
  error: unknown,
  context?: {
    operation?: string;
    provider?: string;
    symbol?: string;
  }
): NextResponse {
  if (context) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error in ${context.operation || 'unknown operation'}`, err, {
      context,
    });
  }

  return errorToResponse(error);
}

/**
 * Check if error is of AppError type
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if error is an operational error
 */
function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Check if error should be retried
 * Reuse logic from errorTypes.ts
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    // Check if error message contains retryable patterns
    const retryablePatterns = [
      'network',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'fetch',
      'abort',
      'ECONNRESET',
      'EAI_AGAIN',
    ];
    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  return false;
}
