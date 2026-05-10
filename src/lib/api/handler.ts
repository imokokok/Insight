import { type NextRequest, type NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

import {
  createAuthMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  createApiKeyMiddleware,
  logResponse,
  type AuthContext,
  type LoggingMiddlewareOptions,
  type ErrorMiddlewareOptions,
  type RateLimitMiddlewareOptions,
  type ApiKeyContext,
  type ApiKeyMiddlewareOptions,
} from './middleware';
import { ApiResponseBuilder, type ApiResponse, type ApiSuccessResponse } from './response';

const logger = createLogger('api-handler');

interface ApiHandlerContext {
  requestId: string;
  auth?: AuthContext;
  apiKey?: ApiKeyContext;
  validated?: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
  };
}

type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<NextResponse<ApiResponse<T>> | NextResponse<ApiSuccessResponse<T>> | NextResponse>;

interface MiddlewareConfig {
  auth?: { required?: boolean; roles?: string[] } | boolean;
  logging?: LoggingMiddlewareOptions | boolean;
  error?: ErrorMiddlewareOptions;
  rateLimit?: RateLimitMiddlewareOptions | boolean;
  apiKey?: ApiKeyMiddlewareOptions | boolean;
}

interface CreateApiHandlerOptions {
  middlewares?: MiddlewareConfig;
  onError?: (error: unknown, context: ApiHandlerContext) => Promise<NextResponse> | NextResponse;
}

export function createApiHandler<T = unknown>(
  handler: ApiHandler<T>,
  options: CreateApiHandlerOptions = {}
): (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  const { middlewares = {}, onError } = options;

  const authMiddleware = middlewares.auth
    ? createAuthMiddleware(
        typeof middlewares.auth === 'boolean' ? { required: middlewares.auth } : middlewares.auth
      )
    : null;

  const loggingMiddleware = middlewares.logging
    ? createLoggingMiddleware(typeof middlewares.logging === 'boolean' ? {} : middlewares.logging)
    : null;

  const errorMiddleware = createErrorMiddleware(middlewares.error);

  const rateLimitMiddleware = middlewares.rateLimit
    ? createRateLimitMiddleware(
        typeof middlewares.rateLimit === 'boolean' ? {} : middlewares.rateLimit
      )
    : null;

  const apiKeyMiddleware = middlewares.apiKey
    ? createApiKeyMiddleware(typeof middlewares.apiKey === 'boolean' ? {} : middlewares.apiKey)
    : null;

  return async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const apiContext: ApiHandlerContext = {
      requestId: '',
    };

    try {
      if (loggingMiddleware) {
        const logResult = await loggingMiddleware(request);
        apiContext.requestId = logResult.requestId;
      } else {
        apiContext.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }

      if (rateLimitMiddleware) {
        const rateLimitResult = await rateLimitMiddleware(request);
        if (!rateLimitResult.success) {
          logResponse(apiContext.requestId, 429, startTime);
          return rateLimitResult.response;
        }
      }

      if (authMiddleware) {
        const authResult = await authMiddleware(request);
        if (!authResult.success) {
          logResponse(apiContext.requestId, authResult.response.status, startTime);
          return authResult.response;
        }
        apiContext.auth = authResult.context;
      }

      if (apiKeyMiddleware) {
        const apiKeyResult = await apiKeyMiddleware(request);
        if (!apiKeyResult.success) {
          logResponse(apiContext.requestId, apiKeyResult.response.status, startTime);
          return apiKeyResult.response;
        }
        apiContext.apiKey = apiKeyResult.context;
      }

      const response = await handler(request, apiContext);

      logResponse(apiContext.requestId, response.status, startTime);
      return response;
    } catch (error) {
      logResponse(apiContext.requestId, 500, startTime);

      if (onError) {
        try {
          return await onError(error, apiContext);
        } catch (handlerError) {
          logger.error(
            'Error in custom error handler',
            handlerError instanceof Error ? handlerError : new Error(String(handlerError))
          );
          return errorMiddleware(error, apiContext.requestId);
        }
      }

      return errorMiddleware(error, apiContext.requestId);
    }
  };
}

export { ApiResponseBuilder };
