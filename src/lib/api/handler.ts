import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
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

interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

interface ApiHandlerContext {
  requestId: string;
  auth?: AuthContext;
  apiKey?: ApiKeyContext;
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
  apiKey?: ApiKeyMiddlewareOptions | boolean;
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

const DEFAULT_CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'x-api-key',
  'X-Request-Id',
  'Cache-Control',
];

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

function recordApiKeyUsage(
  keyId: string,
  request: NextRequest,
  statusCode: number,
  responseTimeMs: number
): void {
  try {
    const client = createServerClient();
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = realIp || forwarded?.split(',').pop()?.trim() || null;

    client
      .from('api_key_usage')
      .insert({
        api_key_id: keyId,
        endpoint: request.nextUrl.pathname,
        method: request.method,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        ip_address: ip,
        user_agent: request.headers.get('user-agent')?.substring(0, 500) || null,
      })
      .then(({ error: insertError }) => {
        if (insertError) {
          logger.warn('Failed to record API key usage', { keyId, error: insertError.message });
        }
      });
  } catch (error) {
    logger.warn('Failed to record API key usage', {
      keyId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

  const apiKeyMiddleware = middlewares.apiKey
    ? createApiKeyMiddleware(typeof middlewares.apiKey === 'boolean' ? {} : middlewares.apiKey)
    : null;

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

      if (apiKeyMiddleware) {
        const apiKeyResult = await apiKeyMiddleware(request);
        if (!apiKeyResult.success) {
          logResponse(apiContext.requestId, apiKeyResult.response.status, startTime);
          if (corsHeaders) applyCorsHeaders(apiKeyResult.response, corsHeaders);
          return apiKeyResult.response;
        }
        apiContext.apiKey = apiKeyResult.context;
      }

      let currentMaxRequests = 0;

      if (baseRateLimitOptions) {
        const rateLimitOptions = { ...baseRateLimitOptions };
        if (apiContext.apiKey?.rateLimit) {
          rateLimitOptions.maxRequests = apiContext.apiKey.rateLimit;
          rateLimitOptions.keyGenerator = (req: NextRequest) => {
            const baseKey = `api:${apiContext.apiKey!.keyId}`;
            const path = req.nextUrl.pathname;
            return `${baseKey}:${path}`;
          };
        }
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

      if (apiContext.apiKey?.keyId) {
        const duration = Date.now() - startTime;
        recordApiKeyUsage(apiContext.apiKey.keyId, request, response.status, duration);
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
