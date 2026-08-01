import { type NextRequest, NextResponse } from 'next/server';

import { type ZodSchema } from 'zod';

import { createLogger } from '@/lib/utils/logger';
import { createZodValidationMiddleware } from '@/lib/validation/middleware';

import { logApiKeyUsage } from './apiKey';
import { verifyInternalToken, INTERNAL_COOKIE_NAME } from './internalToken';
import {
  createAuthMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  createQuotaMiddleware,
  createPlanGuardMiddleware,
  logResponse,
  type AuthContext,
  type LoggingMiddlewareOptions,
  type ErrorMiddlewareOptions,
  type RateLimitMiddlewareOptions,
  type QuotaMiddlewareOptions,
  type QuotaInfo,
  type PlanGuardOptions,
  type PlanGuardInfo,
} from './middleware';
import { extractClientIp, rateLimitKeyGenerator } from './middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from './response';

import type { ApiResponse, ApiSuccessResponse } from './response/ApiResponse';

const logger = createLogger('api-handler');

/** Standard v1 middleware stack: authenticated (user or API key), API-rate-limited,
 *  quota-enforced, plan-gated, and CORS-enabled. Used by the majority of v1 endpoints. */
export const V1_STANDARD_MIDDLEWARES: MiddlewareConfig = {
  logging: true,
  auth: { required: true, allowApiKey: true },
  rateLimit: { preset: 'api' },
  quota: true,
  planGuard: true,
  cors: true,
};

/** Protocol-tier v1 middleware stack: same as standard but requires the 'protocol' plan.
 *  Used for protocol-level intelligence endpoints. */
export const V1_PROTOCOL_TIER_MIDDLEWARES: MiddlewareConfig = {
  logging: true,
  auth: { required: true, allowApiKey: true },
  rateLimit: { preset: 'api' },
  quota: true,
  planGuard: { minPlan: 'protocol' },
  cors: true,
};

/** Read-only v1 middleware stack: authenticated and rate-limited, but without plan gating.
 *  Used by endpoints that should be available to all authenticated users. */
export const V1_READ_ONLY_MIDDLEWARES: MiddlewareConfig = {
  logging: true,
  auth: { required: true, allowApiKey: true },
  rateLimit: { preset: 'api' },
  quota: true,
  cors: true,
};

interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

export interface ApiHandlerContext<
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TParams = Record<string, string>,
> {
  requestId: string;
  auth?: AuthContext;
  rateLimitInfo?: RateLimitInfo;
  quotaInfo?: QuotaInfo;
  planGuardInfo?: PlanGuardInfo;
  validated?: {
    body?: TBody;
    query?: TQuery;
    params?: TParams;
  };
}

type ApiHandler<
  T = unknown,
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TParams = Record<string, string>,
> = (
  request: NextRequest,
  context: ApiHandlerContext<TBody, TQuery, TParams>
) => Promise<NextResponse<ApiResponse<T>> | NextResponse<ApiSuccessResponse<T>> | NextResponse>;

interface MiddlewareConfig {
  auth?: { required?: boolean; roles?: string[]; allowApiKey?: boolean } | boolean;
  logging?: LoggingMiddlewareOptions | boolean;
  error?: ErrorMiddlewareOptions;
  rateLimit?: RateLimitMiddlewareOptions | boolean;
  cors?: CorsOptions | boolean;
  quota?: QuotaMiddlewareOptions | boolean;
  planGuard?: PlanGuardOptions | boolean;
}

interface CorsOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
  maxAge?: number;
}

interface ValidationConfig<
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TParams = Record<string, string>,
> {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}

interface CreateApiHandlerOptions<
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TParams = Record<string, string>,
> {
  middlewares?: MiddlewareConfig;
  validation?: ValidationConfig<TBody, TQuery, TParams>;
  onError?: (
    error: unknown,
    context: ApiHandlerContext<TBody, TQuery, TParams>
  ) => Promise<NextResponse> | NextResponse;
  /** When true, requests that carry a valid internal-token cookie will skip
   *  auth and rate-limit middleware.  This avoids costly Supabase RPC calls
   *  (rate-limit increments, token validation) for requests originating from
   *  the app's own UI, which don't need external-API-style protections.
   *  The cookie is HttpOnly + SameSite=Strict, making it unforgeable by
   *  external API consumers. */
  skipInternalAuthAndRateLimit?: boolean;
}

const DEFAULT_CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-Id',
  'Cache-Control',
  'X-API-Key',
];

export function getCorsHeaders(options: CorsOptions): Record<string, string> {
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

function recordApiKeyUsage(
  request: NextRequest,
  statusCode: number,
  startTime: number,
  apiKeyId?: string
): void {
  if (!apiKeyId) {
    return;
  }

  logApiKeyUsage({
    apiKeyId,
    endpoint: request.nextUrl.pathname,
    method: request.method,
    statusCode,
    responseTimeMs: Date.now() - startTime,
    ipAddress: extractClientIp(request),
    userAgent: request.headers.get('user-agent') ?? undefined,
  }).catch((error) => {
    logger.warn('Failed to record API key usage', {
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/**
 * Create an OPTIONS handler that returns proper CORS preflight headers.
 * Next.js App Router only routes OPTIONS requests to an exported `OPTIONS`
 * function — the CORS logic inside `createApiHandler` is unreachable for
 * preflight requests unless we explicitly export this.
 */
export function createOptionsHandler(
  corsOptions: CorsOptions | boolean = true
): (request: NextRequest) => NextResponse {
  const resolved: CorsOptions =
    corsOptions === false
      ? { origin: '', methods: [], headers: [] }
      : typeof corsOptions === 'object'
        ? corsOptions
        : {};

  const headers = resolved.origin !== '' ? getCorsHeaders(resolved) : null;

  return () => {
    const response = new NextResponse(null, { status: 204 });
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    }
    return response;
  };
}

export function createApiHandler<
  T = unknown,
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TParams = Record<string, string>,
>(
  handler: ApiHandler<T, TBody, TQuery, TParams>,
  options: CreateApiHandlerOptions<TBody, TQuery, TParams> = {}
): (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> {
  const { middlewares = {}, validation, onError, skipInternalAuthAndRateLimit = false } = options;

  const validationMiddleware = validation
    ? createZodValidationMiddleware<TBody, TQuery, TParams>(validation)
    : null;

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

  const quotaOptions: QuotaMiddlewareOptions | null = middlewares.quota
    ? typeof middlewares.quota === 'boolean'
      ? {}
      : middlewares.quota
    : null;

  const planGuardOptions: PlanGuardOptions | null = middlewares.planGuard
    ? typeof middlewares.planGuard === 'boolean'
      ? {}
      : middlewares.planGuard
    : null;

  const corsOptions: CorsOptions =
    middlewares.cors === false
      ? { origin: '', methods: [], headers: [] }
      : typeof middlewares.cors === 'object'
        ? middlewares.cors
        : {};

  const corsHeaders = corsOptions.origin !== '' ? getCorsHeaders(corsOptions) : null;

  async function isInternalRequest(request: NextRequest): Promise<boolean> {
    if (!skipInternalAuthAndRateLimit) return false;

    // Verify the HttpOnly + SameSite=Strict cookie set by middleware
    // when the user visits the website.  This cookie:
    //   - Cannot be read or forged by JavaScript (HttpOnly)
    //   - Is only sent for same-site requests (SameSite=Strict)
    //   - Contains an HMAC-signed timestamp that we verify server-side
    // External API callers (curl, Postman, third-party services) never
    // possess this cookie, so they always go through auth + rate-limit.
    const token = request.cookies.get(INTERNAL_COOKIE_NAME)?.value;
    if (token && (await verifyInternalToken(token))) {
      return true;
    }

    return false;
  }

  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> }
    // eslint-disable-next-line complexity -- orchestrator wires up 6+ middleware chains; splitting would harm readability
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const apiContext: ApiHandlerContext<TBody, TQuery, TParams> = {
      requestId: '',
    };

    try {
      const params = await routeContext.params;
      apiContext.validated = { ...apiContext.validated, params: params as TParams };
    } catch (error) {
      logger.warn(
        'Failed to parse route params',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (corsHeaders && request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 });
      applyCorsHeaders(preflightResponse, corsHeaders);
      return preflightResponse;
    }

    const internal = await isInternalRequest(request);

    try {
      if (loggingMiddleware && !internal) {
        const logResult = await loggingMiddleware(request);
        apiContext.requestId = logResult.requestId;
      } else {
        apiContext.requestId = `req_${crypto.randomUUID().replace(/-/g, '')}`;
      }

      // Run Zod validation after logging so the requestId is available, but
      // before auth/rate-limit to fail fast on malformed input.
      if (validationMiddleware) {
        const validationResult = await validationMiddleware(
          request,
          apiContext.validated?.params as Record<string, string> | undefined
        );
        if (!validationResult.success) {
          logResponse(apiContext.requestId, 400, startTime);
          recordApiKeyUsage(request, 400, startTime, apiContext.auth?.apiKey?.keyId);
          const validationResponse = validationResult.response!;
          if (corsHeaders) applyCorsHeaders(validationResponse, corsHeaders);
          return validationResponse;
        }
        apiContext.validated = {
          ...apiContext.validated,
          ...validationResult.data,
        };
      }

      // Skip auth for internal requests — they originate from the app's own
      // UI and don't carry API keys or Bearer tokens.  External requests
      // still go through the full auth pipeline.
      if (authMiddleware && !internal) {
        const authResult = await authMiddleware(request);
        if (!authResult.success) {
          logResponse(apiContext.requestId, authResult.response.status, startTime);
          if (corsHeaders) applyCorsHeaders(authResult.response, corsHeaders);
          return authResult.response;
        }
        apiContext.auth = authResult.context;
      }

      // Skip rate-limit for internal requests — each page load triggers
      // many oracle fetches in parallel and the per-request DB write
      // (SupabaseRateLimitStore) adds significant latency.  The internal UI
      // doesn't need rate-limiting protection.
      if (baseRateLimitOptions && !internal) {
        const rateLimitContext = apiContext.auth?.apiKey
          ? { apiKeyId: apiContext.auth.apiKey.keyId }
          : undefined;
        const apiKeyRateLimit = apiContext.auth?.apiKey?.rateLimit;

        // Enterprise/unlimited plans use rateLimit = -1. Skip the rate-limit
        // middleware entirely — passing maxRequests = -1 would reject the
        // very first request (count 1 > -1). Mirrors how quotaMiddleware
        // treats monthlyQuota < 0.
        const isUnlimitedRateLimit = apiKeyRateLimit !== undefined && apiKeyRateLimit < 0;

        if (!isUnlimitedRateLimit) {
          const rateLimitOptions = { ...baseRateLimitOptions };
          // API key's own rate limit always takes priority over route preset.
          // This ensures Pro (30/min) and Protocol (60/min) users are not
          // capped by a lower preset like 'api' (100/min).
          if (apiKeyRateLimit !== undefined) {
            rateLimitOptions.maxRequests = apiKeyRateLimit;
          }
          if (rateLimitOptions.keyGenerator === undefined) {
            rateLimitOptions.keyGenerator = rateLimitKeyGenerator;
          }

          const rateLimitMiddleware = createRateLimitMiddleware(rateLimitOptions, rateLimitContext);
          const rateLimitResult = await rateLimitMiddleware(request);

          if (!rateLimitResult.success) {
            logResponse(apiContext.requestId, 429, startTime);
            recordApiKeyUsage(request, 429, startTime, apiContext.auth?.apiKey?.keyId);
            if (corsHeaders) applyCorsHeaders(rateLimitResult.response, corsHeaders);
            return rateLimitResult.response;
          }

          apiContext.rateLimitInfo = {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            limit: rateLimitResult.limit,
          };
        }
      }

      // Quota middleware: monthly quota enforcement (depends on apiKey, must run after auth)
      if (quotaOptions && !internal) {
        const apiKey = apiContext.auth?.apiKey;
        const quotaContext = apiKey
          ? {
              apiKeyId: apiKey.keyId,
              userId: apiKey.userId,
              plan: apiKey.plan,
              monthlyQuotaUsed: apiKey.monthlyQuotaUsed,
              quotaResetAt: apiKey.quotaResetAt,
            }
          : undefined;

        const quotaMiddleware = createQuotaMiddleware(quotaOptions, quotaContext);
        const quotaResult = await quotaMiddleware(request);

        if (!quotaResult.success) {
          logResponse(apiContext.requestId, 402, startTime);
          recordApiKeyUsage(request, 402, startTime, apiKey?.keyId);
          if (corsHeaders) applyCorsHeaders(quotaResult.response, corsHeaders);
          return quotaResult.response;
        }

        apiContext.quotaInfo = quotaResult.quotaInfo;
      }

      // PlanGuard middleware: highest-value endpoint access control (depends on apiKey)
      if (planGuardOptions && !internal) {
        const apiKey = apiContext.auth?.apiKey;
        const planGuardContext = apiKey
          ? {
              apiKeyId: apiKey.keyId,
              userId: apiKey.userId,
              plan: apiKey.plan,
              trialEndsAt: apiKey.trialEndsAt,
            }
          : undefined;

        const planGuardMiddleware = createPlanGuardMiddleware(planGuardOptions, planGuardContext);
        const planGuardResult = await planGuardMiddleware(request);

        if (!planGuardResult.success) {
          logResponse(apiContext.requestId, 402, startTime);
          recordApiKeyUsage(request, 402, startTime, apiKey?.keyId);
          if (corsHeaders) applyCorsHeaders(planGuardResult.response, corsHeaders);
          return planGuardResult.response;
        }

        apiContext.planGuardInfo = planGuardResult.info;
      }

      const response = await handler(request, apiContext);

      if (apiContext.rateLimitInfo) {
        applyRateLimitHeaders(response, apiContext.rateLimitInfo);
      }

      if (apiContext.quotaInfo && apiContext.quotaInfo.limit >= 0) {
        response.headers.set('X-Quota-Limit', String(apiContext.quotaInfo.limit));
        response.headers.set('X-Quota-Remaining', String(apiContext.quotaInfo.remaining));
        response.headers.set(
          'X-Quota-Reset',
          String(Math.floor(new Date(apiContext.quotaInfo.resetAt).getTime() / 1000))
        );
      }

      if (apiContext.planGuardInfo && apiContext.planGuardInfo.isHighestValueEndpoint) {
        response.headers.set('X-Plan', apiContext.planGuardInfo.plan);
        if (apiContext.planGuardInfo.trialRemaining >= 0) {
          response.headers.set(
            'X-Plan-Trial-Remaining',
            String(apiContext.planGuardInfo.trialRemaining)
          );
        }
      }

      if (corsHeaders) {
        applyCorsHeaders(response, corsHeaders);
      }

      logResponse(apiContext.requestId, response.status, startTime);
      recordApiKeyUsage(request, response.status, startTime, apiContext.auth?.apiKey?.keyId);
      return response;
    } catch (error) {
      logResponse(apiContext.requestId, 500, startTime);

      if (onError) {
        try {
          const errorResponse = await onError(error, apiContext);
          recordApiKeyUsage(
            request,
            errorResponse.status,
            startTime,
            apiContext.auth?.apiKey?.keyId
          );
          if (corsHeaders) applyCorsHeaders(errorResponse, corsHeaders);
          return errorResponse;
        } catch (handlerError) {
          logger.error(
            'Error in custom error handler',
            handlerError instanceof Error ? handlerError : new Error(String(handlerError))
          );
          const errResponse = await errorMiddleware(error, apiContext.requestId);
          recordApiKeyUsage(request, errResponse.status, startTime, apiContext.auth?.apiKey?.keyId);
          if (corsHeaders) applyCorsHeaders(errResponse, corsHeaders);
          return errResponse;
        }
      }

      const errResponse = await errorMiddleware(error, apiContext.requestId);
      recordApiKeyUsage(request, errResponse.status, startTime, apiContext.auth?.apiKey?.keyId);
      if (corsHeaders) applyCorsHeaders(errResponse, corsHeaders);
      return errResponse;
    }
  };
}

export { ApiResponseBuilder };
