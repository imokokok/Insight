import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '@modelcontextprotocol/sdk/types.js';

import { getCorsHeaders } from '@/lib/api/handler';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { getMppConfig } from '@/lib/api/mpp/config';
import { getX402Config } from '@/lib/api/x402/config';
import { handleMcpIndexerQuote, handleMcpPaidToolCall } from '@/lib/api/x402/mcpBridge';
import { createLogger } from '@/lib/utils/logger';

import packageJson from '../../../package.json';
import { authenticateMcpRequest, type McpAuthContext } from '../auth';
import { checkMcpQuota, checkMcpRateLimit } from '../middleware';

import type { McpServerOptions } from '../server';

const logger = createLogger('mcp-http-transport');

interface McpHttpHandlerResult {
  response: Response;
  cleanup: () => Promise<void>;
}

/**
 * CORS headers applied to every MCP HTTP response so external browser-based
 * MCP clients can call /api/mcp cross-origin. Mirrors the v1 REST CORS config
 * (origin *, includes X-API-Key) and additionally exposes the rate-limit /
 * quota headers so browser clients can read usage info.
 */
const CORS_HEADERS: Record<string, string> = {
  ...getCorsHeaders({}),
  'Access-Control-Expose-Headers':
    'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Quota-Limit, X-Quota-Remaining, X-Quota-Reset, X-Request-Id',
};

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * JSON-RPC methods an UNAUTHENTICATED client may invoke. These are read-only
 * protocol/discovery operations (browse the server identity and the tool
 * catalog); none of them touch data or execute tools. Everything else —
 * notably `tools/call` — still requires credentials.
 */
const ANON_ALLOWED_METHODS = new Set([
  'initialize',
  'notifications/initialized',
  'tools/list',
  'ping',
]);

const ANON_RATE_LIMIT = { windowMs: 60 * 60_000, maxRequests: 12 };

interface JsonRpcMessage {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

/**
 * Parse the JSON-RPC envelope without consuming the original request. Invalid
 * payloads deliberately fall through to the SDK transport so it retains its
 * protocol-standard error behavior.
 */
async function parseRpcMessages(request: Request): Promise<JsonRpcMessage[] | null> {
  try {
    if (request.method !== 'POST') return null;
    const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('application/json')) return null;

    const body: unknown = JSON.parse(await request.clone().text());
    const messages: unknown[] = Array.isArray(body) ? body : [body];
    if (messages.length === 0 || messages.length > 100) return null;
    for (const message of messages) {
      if (
        !message ||
        typeof message !== 'object' ||
        typeof (message as JsonRpcMessage).method !== 'string'
      ) {
        return null;
      }
    }
    return messages as JsonRpcMessage[];
  } catch {
    return null;
  }
}

async function createMcpServer(auth?: McpAuthContext, options?: McpServerOptions) {
  const { createMcpServer: createServer } = await import('../server');
  return createServer(auth, options);
}

function hasJsonRpcRequestId(
  message: JsonRpcMessage
): message is JsonRpcMessage & { id: string | number } {
  return typeof message.id === 'string' || typeof message.id === 'number';
}

function anonymousDiscoveryCapabilities(mppPaymentEnabled: boolean) {
  return {
    tools: {},
    ...(mppPaymentEnabled
      ? {
          experimental: {
            payment: {
              methods: {
                evm: { intents: ['charge'] },
              },
            },
          },
        }
      : {}),
  };
}

function withAnonymousRateLimitHeaders(
  response: Response,
  rate: { count: number; resetTime: number }
): Response {
  response.headers.set('X-RateLimit-Limit', String(ANON_RATE_LIMIT.maxRequests));
  response.headers.set(
    'X-RateLimit-Remaining',
    String(Math.max(0, ANON_RATE_LIMIT.maxRequests - rate.count))
  );
  response.headers.set('X-RateLimit-Reset', String(Math.floor(rate.resetTime / 1000)));
  return withCors(response);
}

/**
 * The anonymous discovery methods are stateless by design. Serving their
 * single-message form directly avoids creating a complete MCP server and
 * transport for every directory crawler. Unsupported/batched requests retain
 * the SDK fallback below, keeping protocol compatibility conservative.
 */
async function tryLightweightAnonymousDiscovery(
  messages: JsonRpcMessage[],
  rate: { count: number; resetTime: number },
  mppPaymentEnabled: boolean
): Promise<McpHttpHandlerResult | null> {
  if (messages.length !== 1) return null;
  const [message] = messages;
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') return null;

  if (message.method === 'notifications/initialized') {
    if (hasJsonRpcRequestId(message)) return null;
    return { response: withCors(new Response(null, { status: 202 })), cleanup: async () => {} };
  }

  if (!hasJsonRpcRequestId(message)) return null;

  if (message.method === 'initialize') {
    const params = message.params;
    if (
      !params ||
      typeof params !== 'object' ||
      typeof (params as { protocolVersion?: unknown }).protocolVersion !== 'string'
    ) {
      return null;
    }
    const requestedVersion = (params as { protocolVersion: string }).protocolVersion;
    const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
      ? requestedVersion
      : LATEST_PROTOCOL_VERSION;
    return {
      response: withAnonymousRateLimitHeaders(
        jsonResponse(
          {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion,
              capabilities: anonymousDiscoveryCapabilities(mppPaymentEnabled),
              serverInfo: { name: 'insight-oracle-mcp-server', version: packageJson.version },
            },
          },
          200
        ),
        rate
      ),
      cleanup: async () => {},
    };
  }

  if (message.method === 'tools/list') {
    // Keep anonymous discovery on a data-only chunk. Importing ../tools
    // eagerly loads every tool handler (and its database/RPC dependencies)
    // even though tools/list needs only name, description and JSON Schema.
    // The catalog is generated from getToolDefinitions during the build, and
    // the public server card is generated from that same source of truth.
    const { default: MCP_TOOL_CATALOG } = await import('../tools/generatedCatalog.json');
    return {
      response: withAnonymousRateLimitHeaders(
        jsonResponse({ jsonrpc: '2.0', id: message.id, result: { tools: MCP_TOOL_CATALOG } }, 200),
        rate
      ),
      cleanup: async () => {},
    };
  }

  if (message.method === 'ping') {
    return {
      response: withAnonymousRateLimitHeaders(
        jsonResponse({ jsonrpc: '2.0', id: message.id, result: {} }, 200),
        rate
      ),
      cleanup: async () => {},
    };
  }

  return null;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Normalize the Accept header so JSON-only MCP clients are not bounced.
 *
 * The streamable HTTP transport hard-rejects (406) any POST whose Accept
 * header does not name BOTH application/json and text/event-stream, per the
 * MCP spec. Real-world clients — health checkers, minimal SDK wrappers, some
 * directory crawlers — often send an Accept header naming only one of the
 * two (or none at all) and would fail before reaching discovery. Every
 * server below is created with enableJsonResponse: true, so SSE is never
 * emitted and advertising both types is safe: responses stay JSON either way.
 */
async function normalizeAcceptHeader(request: Request): Promise<Request> {
  if (request.method !== 'POST') return request;

  const types = (request.headers.get('accept') ?? '')
    .split(',')
    .map((type) => type.trim().split(';')[0].toLowerCase())
    .filter(Boolean);
  if (types.includes('application/json') && types.includes('text/event-stream')) {
    return request;
  }

  const merged = [...new Set([...types, 'application/json', 'text/event-stream'])].join(', ');
  const headers = new Headers(request.headers);
  headers.set('Accept', merged);
  // Buffer the body instead of forwarding request.body: constructing a
  // Request from a ReadableStream requires the `duplex` option, which is not
  // in this project's RequestInit typings. MCP POSTs are small JSON documents.
  const body = await request.arrayBuffer();
  return new Request(request.url, { method: request.method, headers, body });
}

/**
 * Mirror the SDK's canonical response for methods the stateless streamable
 * transport never serves (GET SSE streams, DELETE session teardown).
 *
 * Unauthenticated GET/DELETE used to fall through to the plain 401, which is
 * a misleading signal for directory health checkers: the protocol-correct
 * answer is 405 Method Not Allowed, matching what an authenticated request
 * already gets from the transport itself.
 */
function methodNotAllowedResponse(): Response {
  return jsonResponse(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null },
    405,
    { Allow: 'GET, POST, DELETE' }
  );
}

/** True when a GET asks for the transport's SSE stream, as real MCP clients do. */
function sseRequested(request: Request): boolean {
  return (request.headers.get('accept') ?? '').toLowerCase().includes('text/event-stream');
}

/** Per-minute IP rate limit for the unauthenticated x402 tools/call tier. */
const PAID_TOOLS_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 };

/**
 * Extract the tool name from a single (non-batch) `tools/call` JSON-RPC
 * message without consuming the request. Returns null for batches, other
 * methods, or a missing/unnamed tool — the caller then falls through.
 */
async function probeToolName(request: Request): Promise<string | null> {
  try {
    if (request.method !== 'POST') return null;
    const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('application/json')) return null;

    const body: unknown = JSON.parse(await request.clone().text());
    if (Array.isArray(body)) return null;
    if (
      !body ||
      typeof body !== 'object' ||
      (body as { method?: unknown }).method !== 'tools/call'
    ) {
      return null;
    }
    const name = (body as { params?: { name?: unknown } }).params?.name;
    return typeof name === 'string' && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/**
 * Serve an UNAUTHENTICATED `tools/call` through the x402 pay-per-call bridge:
 * a 402 quote priced by the tool's metering class when no payment signature
 * is present, or verify → dispatch → settle when it is (see mcpBridge).
 *
 * Returns null when the paid tier is disarmed or the request is not a single
 * named tools/call, in which case the caller falls back to the 401 path.
 * The MCP server instance runs WITHOUT an auth context — metering happens
 * on-chain, not against credit wallets — and is only reachable because the
 * probe above pins the request to exactly one tools/call message.
 */
async function tryPaidToolCall(request: Request): Promise<McpHttpHandlerResult | null> {
  const cfg = getX402Config();
  if (!cfg.enabled) {
    return null;
  }

  const toolName = await probeToolName(request);
  if (!toolName) {
    return null;
  }

  const identity = `mcp:x402:${getClientIp(request)}`;
  const rate = await rateLimitStore.increment(identity, PAID_TOOLS_RATE_LIMIT.windowMs);
  if (rate.count > PAID_TOOLS_RATE_LIMIT.maxRequests) {
    return {
      response: jsonResponse({ error: 'Rate limit exceeded' }, 429, {
        'X-RateLimit-Limit': String(PAID_TOOLS_RATE_LIMIT.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(rate.resetTime / 1000)),
        'Retry-After': String(Math.max(1, Math.ceil((rate.resetTime - Date.now()) / 1000))),
      }),
      cleanup: async () => {},
    };
  }

  logger.info('Paid anonymous MCP tools/call', { toolName, identity });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = await createMcpServer(undefined);
  server.onerror = (error) => {
    logger.error('Paid MCP tools/call server error', error);
  };
  await server.connect(transport);

  const cleanup = async (): Promise<void> => {
    try {
      await server.close();
    } catch {
      // ignore
    }
  };

  try {
    const response = await handleMcpPaidToolCall({
      request,
      cfg,
      toolName,
      runBusiness: async () => {
        const raw = await transport.handleRequest(request);
        return new Response(raw.body, {
          status: raw.status,
          statusText: raw.statusText,
          headers: raw.headers,
        });
      },
    });

    response.headers.set('X-RateLimit-Limit', String(PAID_TOOLS_RATE_LIMIT.maxRequests));
    response.headers.set(
      'X-RateLimit-Remaining',
      String(Math.max(0, PAID_TOOLS_RATE_LIMIT.maxRequests - rate.count))
    );
    response.headers.set('X-RateLimit-Reset', String(Math.floor(rate.resetTime / 1000)));
    withCors(response);

    return { response, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/**
 * Serve an unauthenticated discovery request (initialize / tools/list /
 * notifications / ping) with an IP-keyed rate limit. Returns null when the
 * request is not anonymous-discovery eligible and should fall through to the
 * regular 401 path.
 *
 * The MCP server is created WITHOUT an auth context, matching the stdio
 * path. This is safe only because the method allowlist above is enforced
 * before dispatch: `tools/call` can never reach this server, and mixed
 * batches (e.g. [tools/list, tools/call]) fail the every() check and are
 * rejected with 401 instead.
 */
async function tryAnonymousDiscovery(
  request: Request,
  mppPaymentEnabled = false
): Promise<McpHttpHandlerResult | null> {
  const messages = await parseRpcMessages(request);
  if (
    !messages ||
    !messages.every(
      (message) => typeof message.method === 'string' && ANON_ALLOWED_METHODS.has(message.method)
    )
  ) {
    return null;
  }

  const identity = `mcp:anon:${getClientIp(request)}`;
  const rate = await rateLimitStore.increment(identity, ANON_RATE_LIMIT.windowMs);
  if (rate.count > ANON_RATE_LIMIT.maxRequests) {
    return {
      response: jsonResponse({ error: 'Rate limit exceeded' }, 429, {
        'X-RateLimit-Limit': String(ANON_RATE_LIMIT.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(rate.resetTime / 1000)),
        'Retry-After': String(Math.max(1, Math.ceil((rate.resetTime - Date.now()) / 1000))),
      }),
      cleanup: async () => {},
    };
  }

  logger.info('Anonymous MCP discovery request', {
    methods: messages.map((message) => message.method),
    identity,
  });

  const lightweight = await tryLightweightAnonymousDiscovery(messages, rate, mppPaymentEnabled);
  if (lightweight) return lightweight;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = await createMcpServer(undefined, { mppPaymentEnabled });
  server.onclose = async () => {
    logger.debug('Anonymous MCP discovery server closed');
  };
  server.onerror = (error) => {
    logger.error('Anonymous MCP discovery server error', error);
  };

  await server.connect(transport);
  const response = await transport.handleRequest(request);

  const merged = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  withAnonymousRateLimitHeaders(merged, rate);

  return {
    response: merged,
    cleanup: async () => {
      try {
        await server.close();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Serve the MPP MCP pilot on its dedicated endpoint. Only the pre-trade tool
 * is priced here; the existing /api/mcp x402 flow remains unchanged.
 */
async function tryMppPaidToolCall(
  request: Request,
  cfg: ReturnType<typeof getX402Config>,
  mppConfig: ReturnType<typeof getMppConfig>
): Promise<McpHttpHandlerResult | null> {
  if (!mppConfig.mcpEnabled || !mppConfig.secretKey) return null;

  const toolName = await probeToolName(request);
  if (!toolName) return null;

  if (request.headers.has('payment-signature')) {
    return {
      response: jsonResponse(
        { error: 'This endpoint accepts MPP credentials; use /api/mcp for x402 payments.' },
        400
      ),
      cleanup: async () => {},
    };
  }
  // MCP MPP credentials travel in params._meta. Header credentials belong to
  // the normal authentication/x402 paths and must never be ignored here.
  if (request.headers.has('x-api-key') || request.headers.has('authorization')) {
    return null;
  }

  const identity = `mcp:mpp:${getClientIp(request)}`;
  const rate = await rateLimitStore.increment(identity, PAID_TOOLS_RATE_LIMIT.windowMs);
  if (rate.count > PAID_TOOLS_RATE_LIMIT.maxRequests) {
    return {
      response: jsonResponse({ error: 'Rate limit exceeded' }, 429, {
        'X-RateLimit-Limit': String(PAID_TOOLS_RATE_LIMIT.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(rate.resetTime / 1000)),
        'Retry-After': String(Math.max(1, Math.ceil((rate.resetTime - Date.now()) / 1000))),
      }),
      cleanup: async () => {},
    };
  }

  logger.info('MPP anonymous MCP tools/call', { toolName, identity });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const { createMppMcpCallHandler } = await import('@/lib/api/mpp/mcp');
  const server = await createMcpServer(undefined, {
    mppPaymentEnabled: true,
    mppCallHandler: createMppMcpCallHandler(cfg, mppConfig.secretKey),
  });
  server.onerror = (error) => {
    logger.error('MPP MCP tools/call server error', error);
  };
  await server.connect(transport);

  const cleanup = async (): Promise<void> => {
    try {
      await server.close();
    } catch {
      // ignore
    }
  };

  try {
    const response = await transport.handleRequest(request);
    response.headers.set('X-RateLimit-Limit', String(PAID_TOOLS_RATE_LIMIT.maxRequests));
    response.headers.set(
      'X-RateLimit-Remaining',
      String(Math.max(0, PAID_TOOLS_RATE_LIMIT.maxRequests - rate.count))
    );
    response.headers.set('X-RateLimit-Reset', String(Math.floor(rate.resetTime / 1000)));
    withCors(response);
    return { response, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/**
 * Handle a single MCP HTTP request using the streamable HTTP transport.
 * Each request gets its own transport/server pair (stateless mode).
 *
 * Before the request reaches the MCP server we run:
 *   1. Authentication (API key, Supabase session, or MCP_BEARER_TOKEN)
 *   2. Anonymous discovery fallback: unauthenticated clients may invoke
 *      read-only protocol methods (initialize/tools/list) so agents can
 *      browse the catalog without credentials (see tryAnonymousDiscovery)
 *   3. x402 paid fallback: an unauthenticated single tools/call is served
 *      through the pay-per-call bridge (402 quote → verify → settle) when
 *      the paid tier is armed (see tryPaidToolCall)
 *   4. Per-identity rate limiting
 *   5. Credit-wallet precheck for API-key users (402 when balance is empty)
 *
 * The resulting auth context is passed into the MCP server so individual tool
 * calls can apply credit prechecks/charges and usage logging.
 */
export interface McpHttpHandlerOptions {
  paymentRail?: 'x402' | 'mpp';
}

export async function handleMcpHttpRequest(
  request: Request,
  options: McpHttpHandlerOptions = {}
): Promise<McpHttpHandlerResult> {
  const normalized = await normalizeAcceptHeader(request);
  const x402Config = options.paymentRail === 'mpp' ? getX402Config() : null;
  const mppConfig = x402Config ? getMppConfig(x402Config) : null;
  const authResult = await authenticateMcpRequest(normalized);

  if (!authResult.success) {
    if (normalized.method !== 'POST') {
      // CDP Bazaar's indexer probes the resource URL with GET and requires
      // the x402 402 challenge; real MCP clients asking for the GET SSE
      // stream keep the protocol-correct 405 below.
      if (normalized.method === 'GET' && !sseRequested(normalized)) {
        // The x402 rail resolves its config lazily inside tryPaidToolCall;
        // the MPP rail already carries it above.
        const probeCfg = x402Config ?? getX402Config();
        if (probeCfg) {
          return {
            response: await handleMcpIndexerQuote(normalized, probeCfg),
            cleanup: async () => {},
          };
        }
      }
      return {
        response: methodNotAllowedResponse(),
        cleanup: async () => {},
      };
    }
    const anonymous = await tryAnonymousDiscovery(normalized, Boolean(mppConfig?.mcpEnabled));
    if (anonymous) {
      return anonymous;
    }
    const paid =
      x402Config && mppConfig
        ? await tryMppPaidToolCall(normalized, x402Config, mppConfig)
        : await tryPaidToolCall(normalized);
    if (paid) {
      return paid;
    }
    return {
      response: jsonResponse({ error: authResult.error }, authResult.statusCode),
      cleanup: async () => {},
    };
  }

  const rateLimit = await checkMcpRateLimit(authResult.auth);
  if (!rateLimit.allowed) {
    return {
      response: jsonResponse(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        429,
        {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
          'Retry-After': String(rateLimit.retryAfter ?? 60),
        }
      ),
      cleanup: async () => {},
    };
  }

  const quota = await checkMcpQuota(authResult.auth);
  if (!quota.allowed) {
    return {
      response: jsonResponse(
        { error: 'Quota or credit balance exhausted', resetAt: quota.resetAt },
        402,
        {
          'X-Quota-Limit': String(quota.limit),
          'X-Quota-Remaining': '0',
          'X-Quota-Reset': String(Math.floor(new Date(quota.resetAt).getTime() / 1000)),
        }
      ),
      cleanup: async () => {},
    };
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = await createMcpServer(authResult.auth, {
    mppPaymentEnabled: Boolean(mppConfig?.mcpEnabled),
  });

  server.onclose = async () => {
    logger.debug('MCP HTTP server closed');
  };

  server.onerror = (error) => {
    logger.error('MCP HTTP server error', error);
  };

  await server.connect(transport);

  const response = await transport.handleRequest(normalized);

  // Merge rate-limit/credit headers into the final MCP response so consumers
  // can track limits and their credit balance without parsing JSON-RPC bodies.
  const merged = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  merged.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  merged.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  merged.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimit.resetAt / 1000)));
  // Credit model: X-Quota-* carries the remaining credit balance (limit is -1
  // — there is no monthly call cap). Only set for API-key callers that have a
  // wallet (remaining >= 0).
  if (quota.remaining >= 0) {
    merged.headers.set('X-Quota-Limit', String(quota.limit));
    merged.headers.set('X-Quota-Remaining', String(quota.remaining));
    merged.headers.set(
      'X-Quota-Reset',
      String(Math.floor(new Date(quota.resetAt).getTime() / 1000))
    );
  }

  withCors(merged);

  return {
    response: merged,
    cleanup: async () => {
      try {
        await server.close();
      } catch {
        // ignore
      }
    },
  };
}
