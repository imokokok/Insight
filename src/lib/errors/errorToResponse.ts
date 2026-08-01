import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';
import { createErrorResponse as createStandardErrorResponse, ErrorCode } from '@/types/api/error';

import { AppError } from './AppError';

const logger = createLogger('error-handler');

/** Maximum error message length exposed in development responses. */
const MAX_DEV_ERROR_MESSAGE_LENGTH = 200;

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
    const standardResponse = createStandardErrorResponse(errorCode, error.message);

    return NextResponse.json(standardResponse, { status: error.statusCode });
  }

  // Handle native Error
  if (error instanceof Error) {
    logger.error(`Unhandled Error: ${error.message}`, error);

    const isDev = process.env.NODE_ENV === 'development';
    const standardResponse = createStandardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      isDev && error.message.length < MAX_DEV_ERROR_MESSAGE_LENGTH
        ? error.message
        : 'An internal error occurred'
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

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
