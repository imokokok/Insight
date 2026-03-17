import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { ApiResponseBuilder, ApiResponse, ApiSuccessResponse } from './response';
import {
  createAuthMiddleware,
  createValidationMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  logResponse,
  AuthContext,
  AuthMiddlewareOptions,
  ValidationMiddlewareOptions,
  LoggingMiddlewareOptions,
  ErrorMiddlewareOptions,
  RateLimitMiddlewareOptions,
} from './middleware';

const logger = createLogger('api-handler');

export interface ApiHandlerContext {
  requestId: string;
  auth?: AuthContext;
  validated?: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
  };
}

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<NextResponse<ApiResponse<T>> | NextResponse<ApiSuccessResponse<T>> | NextResponse>;

export interface MiddlewareConfig {
  auth?: AuthMiddlewareOptions | boolean;
  validation?: ValidationMiddlewareOptions;
  logging?: LoggingMiddlewareOptions | boolean;
  error?: ErrorMiddlewareOptions;
  rateLimit?: RateLimitMiddlewareOptions | boolean;
}

export interface CreateApiHandlerOptions {
  middlewares?: MiddlewareConfig;
  onError?: (error: unknown, context: ApiHandlerContext) => Promise<NextResponse> | NextResponse;
}

export function createApiHandler<T = unknown>(
  handler: ApiHandler<T>,
  options: CreateApiHandlerOptions = {}
): (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  const { middlewares = {}, onError } = options;

  const authMiddleware = middlewares.auth
    ? createAuthMiddleware(
        typeof middlewares.auth === 'boolean' ? { required: middlewares.auth } : middlewares.auth
      )
    : null;

  const validationMiddleware = middlewares.validation
    ? createValidationMiddleware(middlewares.validation)
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

  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
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
          logResponse(apiContext.requestId, 401, startTime);
          return authResult.response;
        }
        apiContext.auth = authResult.context;
      }

      if (validationMiddleware) {
        const resolvedParams = context?.params ? await context.params : undefined;
        const validationResult = await validationMiddleware(request, resolvedParams);
        if (!validationResult.success) {
          logResponse(apiContext.requestId, 400, startTime);
          return validationResult.response;
        }
        apiContext.validated = validationResult.data;
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

export function createGetHandler<T>(handler: ApiHandler<T>, options?: CreateApiHandlerOptions) {
  return createApiHandler(handler, options);
}

export function createPostHandler<T>(handler: ApiHandler<T>, options?: CreateApiHandlerOptions) {
  return createApiHandler(handler, options);
}

export function createPutHandler<T>(handler: ApiHandler<T>, options?: CreateApiHandlerOptions) {
  return createApiHandler(handler, options);
}

export function createPatchHandler<T>(handler: ApiHandler<T>, options?: CreateApiHandlerOptions) {
  return createApiHandler(handler, options);
}

export function createDeleteHandler<T>(handler: ApiHandler<T>, options?: CreateApiHandlerOptions) {
  return createApiHandler(handler, options);
}

export interface CrudHandlers<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  list?: ApiHandler<T[]>;
  get?: ApiHandler<T>;
  create?: ApiHandler<T>;
  update?: ApiHandler<T>;
  delete?: ApiHandler<void>;
}

export function createCrudHandlers<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>(
  handlers: CrudHandlers<T, CreateDTO, UpdateDTO>,
  options?: CreateApiHandlerOptions
) {
  return {
    GET: handlers.list ? createApiHandler(handlers.list, options) : undefined,
    POST: handlers.create ? createApiHandler(handlers.create, options) : undefined,
    PUT: handlers.update ? createApiHandler(handlers.update, options) : undefined,
    PATCH: handlers.update ? createApiHandler(handlers.update, options) : undefined,
    DELETE: handlers.delete ? createApiHandler(handlers.delete, options) : undefined,
  };
}

export function withMiddleware<T>(
  handler: ApiHandler<T>,
  ...middlewares: Array<
    (request: NextRequest, context: ApiHandlerContext) => Promise<NextResponse | void>
  >
): ApiHandler<T> {
  return async (request: NextRequest, context: ApiHandlerContext) => {
    for (const middleware of middlewares) {
      const result = await middleware(request, context);
      if (result instanceof NextResponse) {
        return result;
      }
    }
    return handler(request, context);
  };
}

export { ApiResponseBuilder };
