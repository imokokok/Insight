import { NextResponse } from 'next/server';
import { AppError, errorToResponse, isAppError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { ApiResponseBuilder } from '../response';

const logger = createLogger('error-middleware');

export interface ErrorMiddlewareOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
}

export function createErrorMiddleware(options: ErrorMiddlewareOptions = {}) {
  const { includeStackTrace = false, logErrors = true } = options;

  return async (error: unknown, requestId?: string): Promise<NextResponse> => {
    if (logErrors) {
      if (isAppError(error)) {
        logger.error(`AppError: ${error.code} - ${error.message}`, error as Error, {
          statusCode: error.statusCode,
          details: error.details,
          requestId,
        });
      } else if (error instanceof Error) {
        logger.error('Unhandled error', error, { requestId });
      } else {
        logger.error('Unknown error type', undefined, { error: String(error), requestId });
      }
    }

    if (isAppError(error)) {
      const response = errorToResponse(error);

      if (requestId) {
        const body = await response.json();
        return NextResponse.json(
          { ...body, meta: { ...body.meta, requestId } },
          { status: response.status, headers: response.headers }
        );
      }

      return response;
    }

    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON in request body', { requestId }),
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const isNetworkError =
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED');

      const response = ApiResponseBuilder.error('INTERNAL_ERROR', error.message, {
        retryable: isNetworkError,
        requestId,
      });

      if (includeStackTrace && process.env.NODE_ENV !== 'production') {
        response.error.details = { ...response.error.details, stack: error.stack };
      }

      return NextResponse.json(response, { status: 500 });
    }

    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', 'An unexpected error occurred', {
        retryable: true,
        requestId,
      }),
      { status: 500 }
    );
  };
}

export const defaultErrorMiddleware = createErrorMiddleware();
export const developmentErrorMiddleware = createErrorMiddleware({
  includeStackTrace: true,
  logErrors: true,
});

export function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: ErrorMiddlewareOptions
): Promise<T | NextResponse> {
  const errorMiddleware = createErrorMiddleware(options);

  return fn().catch((error) => errorMiddleware(error));
}
