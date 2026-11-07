import { NextResponse } from 'next/server';

import { isJsonRecord } from '@/lib/api/client/responseValidation';
import { RouteDeadlineExceededError } from '@/lib/api/routeDeadline';
import { isUpstreamTimeoutError, UPSTREAM_TIMEOUT_CODE } from '@/lib/billing/exemptions';
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
          const payload: unknown = await clonedResponse.json();
          if (!isJsonRecord(payload)) throw new Error('Error response is not a JSON object');
          return NextResponse.json(
            {
              ...payload,
              meta: {
                ...(isJsonRecord(payload.meta) ? payload.meta : {}),
                requestId,
              },
            },
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
      // No usable conclusion: explicit, non-retryable code instead of a
      // generic 500. These requests are never billed.
      if (/INSUFFICIENT_DATA/.test(error.message)) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'INSUFFICIENT_DATA',
            'Insufficient data to produce a usable conclusion',
            { retryable: false, requestId }
          ),
          { status: 422 }
        );
      }

      const stringResult = classifyByStringMatching(error);
      const isNetworkError =
        stringResult?.errorType === 'network' || stringResult?.errorType === 'timeout';
      const isTimeout = stringResult?.errorType === 'timeout' || isUpstreamTimeoutError(error);

      const isProduction = process.env.NODE_ENV === 'production';

      // A route deadline is our own decision to stop waiting, not an upstream
      // timeout. Keep the codes apart so upstream health statistics stay
      // attributable: 504 + ROUTE_DEADLINE_EXCEEDED here, 504 +
      // UPSTREAM_TIMEOUT when an upstream reported the timeout itself.
      if (error instanceof RouteDeadlineExceededError) {
        const deadlineBody = ApiResponseBuilder.error(
          'ROUTE_DEADLINE_EXCEEDED',
          isProduction ? 'Route deadline exceeded' : error.message,
          { retryable: true, requestId }
        );
        deadlineBody.error.details = {
          ...deadlineBody.error.details,
          scope: 'route',
          deadlineMs: error.deadlineMs,
        };
        if (includeStackTrace && !isProduction) {
          deadlineBody.error.details = {
            ...deadlineBody.error.details,
            stack: error.stack,
          };
        }
        return NextResponse.json(deadlineBody, { status: 504 });
      }

      const clientMessage = isProduction
        ? isTimeout
          ? 'Upstream service timed out'
          : 'Internal server error'
        : error.message;

      const response = ApiResponseBuilder.error(
        isTimeout ? UPSTREAM_TIMEOUT_CODE : 'INTERNAL_ERROR',
        clientMessage,
        {
          retryable: isNetworkError || isTimeout,
          requestId,
        }
      );

      if (includeStackTrace && !isProduction) {
        response.error.details = { ...response.error.details, stack: error.stack };
      }

      return NextResponse.json(response, { status: isTimeout ? 504 : 500 });
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
