import { NextResponse } from 'next/server';
import { AppError } from './AppError';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('error-handler');

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    i18nKey?: string;
  };
}

export function errorToResponse(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof AppError) {
    const err = error as Error;
    logger.error(`AppError: ${error.code} - ${error.message}`, err, {
      statusCode: error.statusCode,
      details: error.details,
    });

    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        retryable: !error.isOperational,
        details: error.details,
        i18nKey: error.i18nKey,
      },
    };

    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof Error) {
    logger.error(`Unhandled Error: ${error.message}`, error);

    const isNetworkError =
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED');

    const response: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        retryable: isNetworkError,
      },
    };

    return NextResponse.json(response, { status: 500 });
  }

  logger.error('Unknown error type');

  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      retryable: true,
    },
  };

  return NextResponse.json(response, { status: 500 });
}

export function handleError(
  error: unknown,
  context?: {
    operation?: string;
    provider?: string;
    symbol?: string;
  }
): NextResponse<ErrorResponse> {
  if (context) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error in ${context.operation || 'unknown operation'}`, err, {
      context,
    });
  }

  return errorToResponse(error);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
