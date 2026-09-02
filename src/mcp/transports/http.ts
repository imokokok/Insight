import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { getCorsHeaders } from '@/lib/api/handler';
import { createLogger } from '@/lib/utils/logger';

import { authenticateMcpRequest } from '../auth';
import { checkMcpQuota, checkMcpRateLimit } from '../middleware';
import { createMcpServer } from '../server';

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
    'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Quota-Limit, X-Quota-Remaining, X-Quota-Reset',
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
 * Handle a single MCP HTTP request using the streamable HTTP transport.
 * Each request gets its own transport/server pair (stateless mode).
 *
 * Before the request reaches the MCP server we run:
 *   1. Authentication (API key, Supabase session, or MCP_BEARER_TOKEN)
 *   2. Per-identity rate limiting
 *   3. Credit-wallet precheck for API-key users (402 when balance is empty)
 *
 * The resulting auth context is passed into the MCP server so individual tool
 * calls can apply credit prechecks/charges and usage logging.
 */
export async function handleMcpHttpRequest(request: Request): Promise<McpHttpHandlerResult> {
  const authResult = await authenticateMcpRequest(request);

  if (!authResult.success) {
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

  const server = createMcpServer(authResult.auth);

  server.onclose = async () => {
    logger.debug('MCP HTTP server closed');
  };

  server.onerror = (error) => {
    logger.error('MCP HTTP server error', error);
  };

  await server.connect(transport);

  const response = await transport.handleRequest(request);

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
