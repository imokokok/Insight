import { NextResponse } from 'next/server';

import { errorToResponse, isAppError, classifyByStringMatching } from '@/lib/errors';
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
        try {
          const clonedResponse = response.clone();
          const body = await clonedResponse.json();
          return NextResponse.json(
            { ...body, meta: { ...body.meta, requestId } },
            { status: response.status, headers: response.headers }
          );
        } catch {
          return NextResponse.json(
            ApiResponseBuilder.error(error.code || 'INTERNAL_ERROR', error.message, { requestId }),
            { status: response.status }
          );
        }
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
      const stringResult = classifyByStringMatching(error);
      const isNetworkError =
        stringResult?.errorType === 'network' || stringResult?.errorType === 'timeout';

      const isProduction = process.env.NODE_ENV === 'production';
      const clientMessage = isProduction ? 'Internal server error' : error.message;

      const response = ApiResponseBuilder.error('INTERNAL_ERROR', clientMessage, {
        retryable: isNetworkError,
        requestId,
      });

      if (includeStackTrace && !isProduction) {
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
