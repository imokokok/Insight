import { after, type NextRequest, NextResponse } from 'next/server';

import { type ZodSchema } from 'zod';

import { applyCreditBillingHeaders } from '@/lib/billing/billingHeaders';
import { precheckCredits } from '@/lib/billing/creditWallet';
import {
  BILLING_ZERO_REASONS,
  classifyBatchZeroReason,
  isDeterministicZeroReason,
  isUpstreamTimeoutError,
} from '@/lib/billing/exemptions';
import { batchChargeCredits, REST_BATCH_METERED_PATHS } from '@/lib/billing/metering';
import {
  resolveClientIdempotencyKey,
  restIdempotencyMeteringKeys,
  restRequestFingerprint,
} from '@/lib/billing/requestIdempotency';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import { createZodValidationMiddleware } from '@/lib/validation/middleware';

import { logApiKeyUsage } from './apiKey';
import {
  applyRestBillingReceipt,
  buildConsumeRejectedResponse,
  buildSettlementUnavailableResponse,
  chargeRestRequest,
  countUsableBatchRows,
  echoBatchBilling,
  maybeRecordErrorWaiver,
  recordBatchWaiver,
  type RestChargeOutcome,
} from './billing/restBilling';
import { verifyInternalToken, INTERNAL_COOKIE_NAME } from './internalToken';
import {
  createAuthMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  createQuotaMiddleware,
  logResponse,
  type AuthContext,
  type LoggingMiddlewareOptions,
  type ErrorMiddlewareOptions,
  type RateLimitMiddlewareOptions,
  type QuotaMiddlewareOptions,
  type QuotaInfo,
} from './middleware';
import { checkPreAuthBurstLimit } from './middleware/preAuthBurstLimiter';
import { extractClientIp, rateLimitKeyGenerator } from './middleware/rateLimitMiddleware';
import {
  cacheRestReplayResult,
  getCachedMcpResult,
  readBodyForFingerprint,
  shouldCacheRestResult,
} from './replay/restReplay';
import { rejectOversizedRequest, rejectStreamedOversizedRequest } from './requestLimits';
import { ApiResponseBuilder } from './response';
import { withRouteDeadline } from './routeDeadline';
import { applyCorsHeaders, getCorsHeaders, type CorsOptions } from './transport/cors';

import type { ApiSuccessResponse } from './response/ApiResponse';

const logger = createLogger('api-handler');

const PROTECTED_CACHE_CONTROL = 'private, no-store, max-age=0';

/**
 * Attach the rate-limit, billing, CORS and diagnostic headers to a successful
 * response. Extracted so `createApiHandler` stays inside the line budget.
 */
function applySuccessTail(params: {
  response: NextResponse;
  quotaInfo: QuotaInfo | undefined;
  chargeOutcome: RestChargeOutcome | null;
  exemption: string | undefined;
  chargedItems: number;
  receiptKey: string | null;
  rateLimitInfo: RateLimitInfo | undefined;
  corsHeaders: Record<string, string> | null;
  requestId: string;
  startTime: number;
}): NextResponse {
  if (params.rateLimitInfo) {
    applyRateLimitHeaders(params.response, params.rateLimitInfo);
  }
  // Advisory: this key has reached 80% of its monthly spend cap.
  // precheck_credits still hard-stops the call at 100%.
  if (params.quotaInfo?.creditBudgetWarning) {
    params.response.headers.set('X-Credit-Budget-Warning', '80');
  }
  // Per-request billing receipt. Non-2xx responses are never charged.
  const receiptExemption =
    params.exemption ??
    (params.response.status >= 200 && params.response.status < 300 ? undefined : 'failed');
  applyRestBillingReceipt(
    params.response,
    params.quotaInfo,
    params.chargeOutcome,
    receiptExemption,
    params.chargedItems,
    params.receiptKey
  );
  if (params.corsHeaders) applyCorsHeaders(params.response, params.corsHeaders);
  applyDiagnosticHeaders(params.response, params.requestId, params.startTime);
  return params.response;
}

/**
 * Serve a cached REST result with a fresh balance and request diagnostics.
 * Cache storage lives in replay/restReplay; the handler owns these request
 * lifecycle effects (rate-limit, CORS, logging and protected caching).
 */
async function buildRestReplayResponse(
  cached: NonNullable<ReturnType<typeof getCachedMcpResult>>,
  apiContext: Pick<ApiHandlerContext, 'requestId' | 'auth' | 'rateLimitInfo'>,
  request: NextRequest,
  startTime: number,
  corsHeaders: Record<string, string> | null | undefined
): Promise<NextResponse> {
  const rest = cached.rest!;
  const response = new NextResponse(rest.body, {
    status: rest.status,
    headers: rest.contentType ? { 'Content-Type': rest.contentType } : undefined,
  });
  applyProtectedCachePolicy(response);

  const keyId = apiContext.auth?.apiKey?.keyId;
  const balance = keyId ? (await precheckCredits(keyId, 0)).balance : undefined;
  applyCreditBillingHeaders(response.headers, {
    costCredits: 0,
    balance: balance ?? null,
    balanceAfter: balance ?? null,
    status: 'replayed',
    zeroReason: 'replay',
    receipt: rest.receipt ?? null,
  });
  if (apiContext.rateLimitInfo) applyRateLimitHeaders(response, apiContext.rateLimitInfo);
  if (corsHeaders) applyCorsHeaders(response, corsHeaders);
  applyDiagnosticHeaders(response, apiContext.requestId, startTime);
  logResponse(apiContext.requestId, response.status, startTime);
  recordApiKeyUsage(request, response.status, startTime, keyId);
  return response;
}

/**
 * Authenticated responses must never be stored by a browser or shared CDN.
 *
 * Several read endpoints intentionally cache their underlying public market
 * data, but their HTTP response also proves API-key validity and triggers
 * metering. Allowing that response into a shared cache lets later requests
 * reuse it without running authentication, revocation, rate-limit, or credit
 * checks. Apply this policy at the handler boundary so an endpoint cannot
 * accidentally override it with a public cache preset.
 */
export function applyProtectedCachePolicy(response: NextResponse): void {
  response.headers.set('Cache-Control', PROTECTED_CACHE_CONTROL);
  response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}

/** Standard v1 middleware stack: API-key authenticated, API-rate-limited,
 *  credit-quota-enforced, and CORS-enabled. Used by the majority of v1
 *  endpoints.
 *
 *  NOTE: auth requires an API key (requireApiKey) — Bearer session tokens are
 *  NOT accepted on the external v1 API surface. Session users carry no API key,
 *  so the quota middleware would skip credit metering entirely, letting a
 *  registered user call the paid API for free. The app's own interactive UI
 *  uses separate session-authenticated, rate-limited non-v1 demo routes. */
export const V1_STANDARD_MIDDLEWARES: MiddlewareConfig = {
  logging: true,
  auth: { required: true, allowApiKey: true, requireApiKey: true },
  rateLimit: { preset: 'api' },
  quota: true,
  cors: true,
};

/** Read-oriented v1 middleware stack. These endpoints remain authenticated,
 *  rate-limited, and credit-metered like the rest of the paid API; the name
 *  describes HTTP behaviour, not a billing exemption. */
export const V1_READ_ONLY_MIDDLEWARES: MiddlewareConfig = {
  logging: true,
  auth: { required: true, allowApiKey: true, requireApiKey: true },
  rateLimit: { preset: 'api' },
  quota: true,
  cors: true,
};

/**
 * Historical alias for the old protocol-tier stack. With the Codex-style model
 * there is no feature gating — every paying user gets all endpoints — so this
 * is now identical to V1_STANDARD_MIDDLEWARES. Kept as a named export so the
 * routes that referenced it don't need individual edits.
 */
export const V1_PROTOCOL_TIER_MIDDLEWARES: MiddlewareConfig = V1_STANDARD_MIDDLEWARES;

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
  validated?: {
    body?: TBody;
    query?: TQuery;
    params?: TParams;
  };
}

/**
 * What a route handler may return from `createApiHandler`:
 *   - a ready-made `NextResponse` / `Response` (passed through untouched —
 *     required when the route needs custom status, headers or caching);
 *   - a pre-built success envelope (`ApiSuccessResponse`, e.g. via `ok()`);
 *   - raw payload data (object, array or primitive), which is wrapped in the
 *     standard success envelope automatically.
 *
 * Raw-payload return is the low-boilerplate path for new routes: return the
 * data, the handler supplies `success`/`meta`/`timestamp`. Payloads must not
 * carry a top-level `success` boolean — that shape is reserved for the
 * envelope (asserted nowhere at runtime on raw payloads, but enforced by the
 * TS types for envelope returns).
 */
type ApiHandlerResult<T = unknown> = Response | ApiSuccessResponse<T> | T;

type ApiHandler<
  T = unknown,
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TParams = Record<string, string>,
> = (
  request: NextRequest,
  context: ApiHandlerContext<TBody, TQuery, TParams>
) => Promise<ApiHandlerResult<T>> | ApiHandlerResult<T>;

interface MiddlewareConfig {
  auth?:
    | { required?: boolean; roles?: string[]; allowApiKey?: boolean; requireApiKey?: boolean }
    | boolean;
  logging?: LoggingMiddlewareOptions | boolean;
  error?: ErrorMiddlewareOptions;
  rateLimit?: RateLimitMiddlewareOptions | boolean;
  cors?: CorsOptions | boolean;
  quota?: QuotaMiddlewareOptions | boolean;
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
  /** When true, non-v1 requests that carry a valid internal-token cookie may
   *  skip auth and the database-backed rate limiter. The cheap per-instance
   *  burst shield still applies. Paid `/api/v1/*` routes never honor
   *  this browser cookie: cookies are bearer credentials and can be replayed
   *  by arbitrary HTTP clients after visiting a public page. */
  skipInternalAuthAndRateLimit?: boolean;
  /** Per-instance burst shield applied before validation/auth. Set < 0 to disable. */
  preAuthBurstLimit?: number;
  /** Maximum declared request body size. Defaults to MAX_REQUEST_SIZE or 1 MiB. */
  maxBodyBytes?: number;
}

export { getCorsHeaders } from './transport/cors';

function applyRateLimitHeaders(response: NextResponse, rateLimitInfo: RateLimitInfo): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rateLimitInfo.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimitInfo.resetTime / 1000)));
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

  const task = async () => {
    await logApiKeyUsage({
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      statusCode,
      responseTimeMs: Date.now() - startTime,
      ipAddress: extractClientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
  };

  // `after` extends the serverless request lifetime without delaying the
  // response. Unit tests and non-Next callers have no request work store, so
  // retain a safe best-effort fallback there.
  try {
    after(task);
  } catch {
    void task().catch((error) => {
      logger.warn('Failed to record API key usage', {
        apiKeyId,
        endpoint: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

function applyDiagnosticHeaders(
  response: NextResponse,
  requestId: string,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  response.headers.set('X-Request-Id', requestId);
  response.headers.set('Server-Timing', `app;dur=${duration}`);
}

async function enforceRequestBodyLimit(params: {
  request: NextRequest;
  maxBodyBytes: number | undefined;
  requestId: string;
  startTime: number;
  corsHeaders: Record<string, string> | null;
}): Promise<NextResponse | null> {
  const response =
    rejectOversizedRequest(params.request, params.maxBodyBytes) ??
    (await rejectStreamedOversizedRequest(params.request, params.maxBodyBytes));
  if (!response) return null;
  applyDiagnosticHeaders(response, params.requestId, params.startTime);
  if (params.corsHeaders) applyCorsHeaders(response, params.corsHeaders);
  return response;
}

/**
 * Build a success envelope as a plain object (NOT a NextResponse). Return it
 * from a `createApiHandler` handler and the orchestrator serializes it as-is;
 * use this when a route needs custom `meta` fields without hand-writing
 * `NextResponse.json(ApiResponseBuilder.success(...))`.
 */
export function ok<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return ApiResponseBuilder.success(data, { meta });
}

/**
 * Normalize a handler result into a concrete NextResponse.
 *
 *   - Response instances pass through untouched (custom status/headers stay
 *     fully under the route's control).
 *   - Pre-built success envelopes (shape: `success: true` + `data`, e.g. from
 *     `ok()`) serialize verbatim.
 *   - Anything else is raw payload data and gets wrapped in the standard
 *     success envelope.
 *
 * Wire format for all three paths is identical to what
 * `NextResponse.json(ApiResponseBuilder.success(data))` produced before —
 * no existing response shape changes.
 */
function normalizeHandlerResult(result: unknown): NextResponse {
  if (result instanceof Response) {
    return result as NextResponse;
  }

  if (
    result !== null &&
    typeof result === 'object' &&
    (result as { success?: unknown }).success === true &&
    'data' in (result as Record<string, unknown>)
  ) {
    return NextResponse.json(result);
  }

  return NextResponse.json(ApiResponseBuilder.success(result));
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
  const {
    middlewares = {},
    validation,
    onError,
    skipInternalAuthAndRateLimit = false,
    preAuthBurstLimit,
    maxBodyBytes,
  } = options;
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

  const corsOptions: CorsOptions =
    middlewares.cors === false
      ? { origin: '', methods: [], headers: [] }
      : typeof middlewares.cors === 'object'
        ? middlewares.cors
        : {};

  const corsHeaders = corsOptions.origin !== '' ? getCorsHeaders(corsOptions) : null;

  async function isInternalRequest(request: NextRequest): Promise<boolean> {
    if (!skipInternalAuthAndRateLimit) return false;

    // This cookie is only a UI read-eligibility marker. A page visit can mint
    // it, so treating it as authorization for POST/PATCH/PUT/DELETE would let
    // an unauthenticated visitor invoke state-changing application routes.
    if (request.method !== 'GET' && request.method !== 'HEAD') return false;

    // The public v1 surface is the paid developer API. A cookie minted by a
    // website visit is not a server-to-server trust boundary and must never
    // bypass API-key authentication, rate limits, or credit charging.
    if (request.nextUrl.pathname.startsWith('/api/v1/')) return false;

    // Verify the signed UI cookie for legacy non-v1 read routes only.
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
      logger.warn('Failed to parse route params', normalizeError(error));
    }

    if (corsHeaders && request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 });
      applyCorsHeaders(preflightResponse, corsHeaders);
      return preflightResponse;
    }

    const internal = await isInternalRequest(request);
    let receiptKey: string | null = null;

    try {
      if (loggingMiddleware && !internal) {
        const logResult = await loggingMiddleware(request);
        apiContext.requestId = logResult.requestId;
      } else {
        apiContext.requestId = `req_${crypto.randomUUID().replace(/-/g, '')}`;
      }

      const oversizedResponse = await enforceRequestBodyLimit({
        request,
        maxBodyBytes,
        requestId: apiContext.requestId,
        startTime,
        corsHeaders,
      });
      if (oversizedResponse) {
        return oversizedResponse;
      }

      // A local burst shield applies even to requests with a UI cookie. That
      // cookie can be obtained by visiting a public page, so it must not turn
      // costly read routes into unlimited per-instance work. Keep the normal
      // distributed/API-key limiter below for requests without the UI cookie.
      if (baseRateLimitOptions) {
        const burstResponse = checkPreAuthBurstLimit(request, preAuthBurstLimit);
        if (burstResponse) {
          applyDiagnosticHeaders(burstResponse, apiContext.requestId, startTime);
          if (corsHeaders) applyCorsHeaders(burstResponse, corsHeaders);
          return burstResponse;
        }
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
          applyDiagnosticHeaders(validationResponse, apiContext.requestId, startTime);
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
          applyDiagnosticHeaders(authResult.response, apiContext.requestId, startTime);
          if (corsHeaders) applyCorsHeaders(authResult.response, corsHeaders);
          return authResult.response;
        }
        apiContext.auth = authResult.context;
      }

      // Skip only the database-backed limiter for UI-cookie requests: each
      // page load can trigger many parallel oracle reads, and a DB round-trip
      // for every read adds latency. The local burst shield above still caps
      // requests on each application instance.
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
            applyDiagnosticHeaders(rateLimitResult.response, apiContext.requestId, startTime);
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

      // Quota middleware: credit-wallet enforcement (depends on apiKey, must run after auth)
      let restReplayKey: string | null = null;
      let meteringKeys: { key: string; previous: string } | null = null;
      if (quotaOptions && !internal) {
        const apiKey = apiContext.auth?.apiKey;
        if (apiKey) {
          const clientKey = resolveClientIdempotencyKey(request.headers);
          restReplayKey = restRequestFingerprint({
            identity: apiKey.keyId,
            method: request.method,
            path: request.nextUrl.pathname,
            search: request.nextUrl.search,
            bodyText: await readBodyForFingerprint(request),
            clientKey,
          });
          meteringKeys = restIdempotencyMeteringKeys(restReplayKey);

          // A replay of the SAME logical request within the 10-minute window
          // returns the original result without re-executing or re-charging.
          // Failures and exemptions are never cached (see below).
          const cached = getCachedMcpResult(restReplayKey);
          if (cached?.rest) {
            return await buildRestReplayResponse(
              cached,
              apiContext,
              request,
              startTime,
              corsHeaders
            );
          }
        }

        const quotaContext = apiKey
          ? {
              apiKeyId: apiKey.keyId,
              userId: apiKey.userId,
              plan: apiKey.plan,
              requestId: apiContext.requestId,
              idempotencyMeteringKey: meteringKeys?.key,
              previousIdempotencyMeteringKey: meteringKeys?.previous,
            }
          : undefined;

        const quotaMiddleware = createQuotaMiddleware(quotaOptions, quotaContext);
        const quotaResult = await quotaMiddleware(request);

        if (!quotaResult.success) {
          logResponse(apiContext.requestId, 402, startTime);
          recordApiKeyUsage(request, 402, startTime, apiKey?.keyId);
          applyDiagnosticHeaders(quotaResult.response, apiContext.requestId, startTime);
          if (corsHeaders) applyCorsHeaders(quotaResult.response, corsHeaders);
          return quotaResult.response;
        }

        apiContext.quotaInfo = quotaResult.quotaInfo;
      }

      // Normalize raw payloads / plain envelopes; ready-made Responses pass
      // through. Each invocation has its own 25 s timer, never a global one.
      let response = normalizeHandlerResult(await withRouteDeadline(handler(request, apiContext)));

      // Route-level response helpers may opt into public caching for market
      // data. On an authenticated route the HTTP response itself is never
      // public: serving it from a CDN would bypass auth, revocation, rate
      // limits, usage logging, and credit metering entirely. This also covers
      // signed internal-cookie requests so they cannot prime a public cache
      // that an external caller could later hit.
      if (authMiddleware) {
        applyProtectedCachePolicy(response);
      }

      // Commit the credit charge only when the request SUCCEEDED (2xx).
      // The quota middleware sets pendingCharge but deliberately defers the
      // charge until here, so a request that fails in the handler (4xx/5xx) is
      // NOT metered — mirroring the MCP server, which consumes credits only
      // when a tool call succeeds. consumeCredits re-checks balance/budget
      // atomically and is idempotent, so it stays the source of truth.
      const pendingCharge = apiContext.quotaInfo?.pendingCharge;
      receiptKey = pendingCharge?.meteringKey ?? null;
      let chargeOutcome: RestChargeOutcome | null = null;
      let chargedCost = pendingCharge?.cost ?? 0;
      let chargedItems = apiContext.quotaInfo?.billableItems ?? 1;
      let exemption: string | undefined;

      if (pendingCharge && response.status >= 200 && response.status < 300) {
        // Batch requests are priced per requested item. A partial success bills
        // only the items that actually returned usable data; a response with
        // zero usable rows delivered no conclusion and is exempt entirely.
        if (REST_BATCH_METERED_PATHS.has(request.nextUrl.pathname)) {
          const inspected = await countUsableBatchRows(response);
          response = inspected.response;
          const usableRows = inspected.usable;
          const batchZero = classifyBatchZeroReason(usableRows);
          if (batchZero) {
            chargedCost = 0;
            chargedItems = 0;
            exemption = batchZero;
          } else if (usableRows !== null) {
            const unitCost = apiContext.quotaInfo?.creditUnitCost;
            if (unitCost !== undefined) {
              chargedItems = usableRows;
              chargedCost = batchChargeCredits(unitCost, usableRows);
            }
          }
        }

        if (chargedCost > 0) {
          const charge = await chargeRestRequest({
            path: request.nextUrl.pathname,
            pendingCharge,
            quotaInfo: apiContext.quotaInfo,
            chargedCost,
            chargedItems,
            exemption,
          });
          chargeOutcome = charge;

          if (!charge.ok) {
            // The authoritative charge was rejected (INSUFFICIENT_CREDITS /
            // BUDGET_EXCEEDED / KEY_NOT_FOUND) even though the precheck passed —
            // concurrent requests raced past the optimistic precheck. Do NOT hand
            // the response over for free: withhold it with a 402. consumeCredits
            // only reports ok:false for a genuine rejection (DB/RPC errors fail
            // open with ok:true), so this never mis-charges on transient issues.
            logger.warn('Credit consume rejected after handler success — withholding response', {
              apiKeyId: pendingCharge.apiKeyId,
              cost: chargedCost,
              reason: charge.reason,
            });
            const deniedResponse = buildConsumeRejectedResponse({
              cost: chargedCost,
              quotaInfo: apiContext.quotaInfo,
              charge,
              receiptKey: pendingCharge.meteringKey,
            });
            applyDiagnosticHeaders(deniedResponse, apiContext.requestId, startTime);
            if (corsHeaders) applyCorsHeaders(deniedResponse, corsHeaders);
            return deniedResponse;
          }

          // C4 (40 credits and above) is fail-closed: if we could not confirm
          // the debit, do not deliver the data while a pending settlement is
          // queued (§1.1 row 9 / §8.3). C1–C3 stay available and are marked
          // degraded; the pending ledger guarantees they are still collected.
          if (charge.confirmed === false && chargedCost >= 40) {
            logger.error(
              'C4 debit unconfirmed — withholding response',
              new Error('C4_SETTLEMENT_UNCONFIRMED'),
              {
                apiKeyId: pendingCharge.apiKeyId,
                cost: chargedCost,
                meteringKey: pendingCharge.meteringKey,
              }
            );
            const unavailable = buildSettlementUnavailableResponse({
              cost: chargedCost,
              quotaInfo: apiContext.quotaInfo,
              charge,
            });
            applyDiagnosticHeaders(unavailable, apiContext.requestId, startTime);
            if (corsHeaders) applyCorsHeaders(unavailable, corsHeaders);
            return unavailable;
          }
        } else {
          response.headers.set('X-Credit-Status', 'not_charged');
          // Bill-verifiable zero: the batch delivered no usable rows. A
          // `waiver` row (delta 0, source=free) proves it without touching the
          // wallet or the usage metering key.
          if (exemption === BILLING_ZERO_REASONS.upstreamFailed) {
            await recordBatchWaiver(pendingCharge, request.nextUrl.pathname, apiContext.quotaInfo);
          }
        }

        if (
          REST_BATCH_METERED_PATHS.has(request.nextUrl.pathname) &&
          response.status >= 200 &&
          response.status < 300
        ) {
          response = await echoBatchBilling(
            response,
            apiContext.quotaInfo,
            chargedCost,
            chargedItems,
            exemption
          );
        }

        // Cache a confirmed, positively-priced success and an all-failed
        // batch (deterministic terminal). Transient failures, unconfirmed
        // charges and other zero-charge exemptions are deliberately not cached
        // so a retry can re-attempt or fail again.
        const zeroReason = isDeterministicZeroReason(exemption) ? exemption : undefined;
        if (restReplayKey && shouldCacheRestResult(exemption, chargedCost, chargeOutcome)) {
          response = await cacheRestReplayResult({
            replayKey: restReplayKey,
            response,
            chargedCost,
            chargedItems,
            receiptKey: pendingCharge.meteringKey,
            zeroReason,
          });
        }
      }
      response = applySuccessTail({
        response,
        quotaInfo: apiContext.quotaInfo,
        chargeOutcome,
        exemption,
        chargedItems,
        receiptKey,
        rateLimitInfo: apiContext.rateLimitInfo,
        corsHeaders,
        requestId: apiContext.requestId,
        startTime,
      });

      logResponse(apiContext.requestId, response.status, startTime);
      recordApiKeyUsage(request, response.status, startTime, apiContext.auth?.apiKey?.keyId);
      return response;
    } catch (error) {
      logResponse(apiContext.requestId, 500, startTime);
      const timeout = isUpstreamTimeoutError(error);
      const errorExemption =
        error instanceof Error && /INSUFFICIENT_DATA/.test(error.message)
          ? BILLING_ZERO_REASONS.insufficientData
          : timeout
            ? 'upstream_timeout'
            : 'failed';
      const applyErrorBillingReceipt = (errorResponse: NextResponse) => {
        applyRestBillingReceipt(
          errorResponse,
          apiContext.quotaInfo,
          null,
          errorExemption,
          undefined,
          receiptKey ?? apiContext.quotaInfo?.pendingCharge?.meteringKey ?? null
        );
        if (timeout) errorResponse.headers.set('X-Credit-Status', 'not_charged');
      };

      await maybeRecordErrorWaiver({
        keyId: apiContext.auth?.apiKey?.keyId,
        // A route deadline rejects before the success path derives receiptKey.
        receiptKey: receiptKey ?? apiContext.quotaInfo?.pendingCharge?.meteringKey ?? null,
        path: request.nextUrl.pathname,
        exemption: errorExemption,
      });

      if (onError) {
        try {
          const errorResponse = await onError(error, apiContext);
          recordApiKeyUsage(
            request,
            errorResponse.status,
            startTime,
            apiContext.auth?.apiKey?.keyId
          );
          applyErrorBillingReceipt(errorResponse);
          applyDiagnosticHeaders(errorResponse, apiContext.requestId, startTime);
          if (corsHeaders) applyCorsHeaders(errorResponse, corsHeaders);
          return errorResponse;
        } catch (handlerError) {
          logger.error(
            'Error in custom error handler',
            handlerError instanceof Error ? handlerError : new Error(String(handlerError))
          );
          const errResponse = await errorMiddleware(error, apiContext.requestId);
          recordApiKeyUsage(request, errResponse.status, startTime, apiContext.auth?.apiKey?.keyId);
          applyErrorBillingReceipt(errResponse);
          applyDiagnosticHeaders(errResponse, apiContext.requestId, startTime);
          if (corsHeaders) applyCorsHeaders(errResponse, corsHeaders);
          return errResponse;
        }
      }

      const errResponse = await errorMiddleware(error, apiContext.requestId);
      recordApiKeyUsage(request, errResponse.status, startTime, apiContext.auth?.apiKey?.keyId);
      applyErrorBillingReceipt(errResponse);
      applyDiagnosticHeaders(errResponse, apiContext.requestId, startTime);
      if (corsHeaders) applyCorsHeaders(errResponse, corsHeaders);
      return errResponse;
    }
  };
}

export { ApiResponseBuilder };
