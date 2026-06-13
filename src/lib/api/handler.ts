import { type NextRequest, NextResponse } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

import {
  createAuthMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  logResponse,
  type AuthContext,
  type LoggingMiddlewareOptions,
  type ErrorMiddlewareOptions,
  type RateLimitMiddlewareOptions,
} from './middleware';
import { ApiResponseBuilder, type ApiResponse, type ApiSuccessResponse } from './response';

const logger = createLogger('api-handler');

interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

interface ApiHandlerContext {
  requestId: string;
  auth?: AuthContext;
  rateLimitInfo?: RateLimitInfo;
  validated?: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, string>;
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
  cors?: CorsOptions | boolean;
}

interface CorsOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
  maxAge?: number;
}

interface CreateApiHandlerOptions {
  middlewares?: MiddlewareConfig;
  onError?: (error: unknown, context: ApiHandlerContext) => Promise<NextResponse> | NextResponse;
}

const DEFAULT_CORS_HEADERS = ['Content-Type', 'Authorization', 'X-Request-Id', 'Cache-Control'];

function getCorsHeaders(options: CorsOptions): Record<string, string> {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    headers = DEFAULT_CORS_HEADERS,
    maxAge = 86400,
  } = options;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': headers.join(', '),
    'Access-Control-Max-Age': String(maxAge),
  };
}

function applyRateLimitHeaders(response: NextResponse, rateLimitInfo: RateLimitInfo): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rateLimitInfo.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimitInfo.resetTime / 1000)));
  return response;
}

function applyCorsHeaders(
  response: NextResponse,
  corsHeaders: Record<string, string>
): NextResponse {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
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

  const baseRateLimitOptions = middlewares.rateLimit
    ? typeof middlewares.rateLimit === 'boolean'
      ? {}
      : middlewares.rateLimit
    : null;

  const corsOptions: CorsOptions =
    middlewares.cors === false
      ? { origin: '', methods: [], headers: [] }
      : typeof middlewares.cors === 'object'
        ? middlewares.cors
        : {};

  const corsHeaders = corsOptions.origin !== '' ? getCorsHeaders(corsOptions) : null;

  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const apiContext: ApiHandlerContext = {
      requestId: '',
    };

    try {
      const params = await routeContext.params;
      apiContext.validated = { ...apiContext.validated, params };
    } catch {
      // params may not be available in all contexts
    }

    if (corsHeaders && request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 });
      applyCorsHeaders(preflightResponse, corsHeaders);
      return preflightResponse;
    }

    try {
      if (loggingMiddleware) {
        const logResult = await loggingMiddleware(request);
        apiContext.requestId = logResult.requestId;
      } else {
        apiContext.requestId = `req_${crypto.randomUUID().replace(/-/g, '')}`;
      }

      let currentMaxRequests = 0;

      if (baseRateLimitOptions) {
        const rateLimitOptions = { ...baseRateLimitOptions };
        const rateLimitMiddleware = createRateLimitMiddleware(rateLimitOptions);
        const rateLimitResult = await rateLimitMiddleware(request);
        currentMaxRequests =
          (typeof rateLimitOptions === 'object' && 'maxRequests' in rateLimitOptions
            ? (rateLimitOptions as { maxRequests?: number }).maxRequests
            : undefined) ?? 100;

        if (!rateLimitResult.success) {
          logResponse(apiContext.requestId, 429, startTime);
          if (corsHeaders) applyCorsHeaders(rateLimitResult.response, corsHeaders);
          return rateLimitResult.response;
        }

        apiContext.rateLimitInfo = {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          limit: currentMaxRequests,
        };
      }

      if (authMiddleware) {
        const authResult = await authMiddleware(request);
        if (!authResult.success) {
          logResponse(apiContext.requestId, authResult.response.status, startTime);
          if (corsHeaders) applyCorsHeaders(authResult.response, corsHeaders);
          return authResult.response;
        }
        apiContext.auth = authResult.context;
      }

      const response = await handler(request, apiContext);

      if (apiContext.rateLimitInfo) {
        applyRateLimitHeaders(response, apiContext.rateLimitInfo);
      }

      if (corsHeaders) {
        applyCorsHeaders(response, corsHeaders);
      }

      logResponse(apiContext.requestId, response.status, startTime);
      return response;
    } catch (error) {
      logResponse(apiContext.requestId, 500, startTime);

      if (onError) {
        try {
          const errorResponse = await onError(error, apiContext);
          if (corsHeaders) applyCorsHeaders(errorResponse, corsHeaders);
          return errorResponse;
        } catch (handlerError) {
          logger.error(
            'Error in custom error handler',
            handlerError instanceof Error ? handlerError : new Error(String(handlerError))
          );
          const errResponse = await errorMiddleware(error, apiContext.requestId);
          if (corsHeaders) applyCorsHeaders(errResponse, corsHeaders);
          return errResponse;
        }
      }

      const errResponse = await errorMiddleware(error, apiContext.requestId);
      if (corsHeaders) applyCorsHeaders(errResponse, corsHeaders);
      return errResponse;
    }
  };
}

export { ApiResponseBuilder };
