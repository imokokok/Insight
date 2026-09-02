/**
 * @fileoverview MCP HTTP authentication layer
 *
 * MCP exposes the same data as the REST API through a long-lived streaming
 * HTTP endpoint. This module provides a single authentication gate for both:
 *
 *   - the standalone MCP HTTP server (`npm run mcp:http`)
 *   - the Next.js API route (`/api/mcp`)
 *
 * Supported credentials (checked in order):
 *   1. `Authorization: Bearer <supabase-session-jwt>` — website users
 *   2. `X-API-Key: <ins_...>` — external API consumers (reuses existing
 *      api_keys table, plan, quota, rate-limit)
 *   3. `Authorization: Bearer <MCP_BEARER_TOKEN>` — simple shared secret for
 *      team/internal deployments that do not want to issue per-user API keys
 *
 * The stdio transport is intentionally NOT protected here: it runs locally in
 * the user's own environment and relies on OS/process isolation.
 */

import { timingSafeEqual } from 'node:crypto';

import { getInternalTokenFromCookieHeader, verifyInternalToken } from '@/lib/api/internalToken';
import { createUserClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { validateApiKey, type ApiKeyValidationResult } from '../lib/api/apiKey';

const logger = createLogger('mcp-auth');

export interface McpSessionAuth {
  type: 'session';
  userId: string;
  email?: string;
  role?: string;
  accessToken: string;
}

export interface McpApiKeyAuth {
  type: 'apikey';
  userId: string;
  apiKey: ApiKeyValidationResult;
}

export interface McpBearerAuth {
  type: 'bearer';
  label: string;
}

export type McpAuthContext = McpSessionAuth | McpApiKeyAuth | McpBearerAuth;

interface McpAuthResult {
  success: true;
  auth: McpAuthContext;
}

interface McpAuthFailure {
  success: false;
  error: string;
  statusCode: number;
}

function isAuthEnabled(): boolean {
  const explicit = process.env.MCP_AUTH_REQUIRED;
  if (explicit === 'false' || explicit === '0') {
    return false;
  }
  if (explicit === 'true' || explicit === '1') {
    return true;
  }
  // Default: require auth in production, allow open local dev.
  return process.env.NODE_ENV === 'production';
}

function getSharedBearerToken(): string | undefined {
  return process.env.MCP_BEARER_TOKEN;
}

async function extractSessionAuth(bearerToken: string): Promise<McpSessionAuth | null> {
  try {
    const client = createUserClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser(bearerToken);

    if (error || !user) {
      return null;
    }

    return {
      type: 'session',
      userId: user.id,
      email: user.email ?? undefined,
      role: user.app_metadata?.role,
      accessToken: bearerToken,
    };
  } catch (error) {
    logger.debug('Session auth extraction failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function extractApiKeyAuth(apiKeyHeader: string): Promise<McpApiKeyAuth | null> {
  const validation = await validateApiKey(apiKeyHeader);
  if (!validation) {
    return null;
  }

  return {
    type: 'apikey',
    userId: validation.userId,
    apiKey: validation,
  };
}

function extractSharedBearerAuth(bearerToken: string): McpBearerAuth | null {
  const sharedToken = getSharedBearerToken();
  if (!sharedToken) {
    return null;
  }

  if (timingSafeEqualString(bearerToken, sharedToken)) {
    return { type: 'bearer', label: 'mcp-shared-token' };
  }

  return null;
}

/**
 * Constant-time string comparison. `crypto.timingSafeEqual` requires equal-
 * length buffers (it throws otherwise), so we still short-circuit on length
 * mismatch — but the per-byte comparison is constant-time, closing the timing
 * side channel of a plain `===` against an attacker that can measure many
 * requests. Better than the previous `bearerToken === sharedToken`.
 */
function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Verify the request carries a valid internal-token cookie (issued to the
 * app's own UI on page load). Used to distinguish website-playground requests
 * (free) from external agents trying to use a stolen/self-issued session JWT
 * (must pay via an API key).
 */
async function hasValidInternalCookie(request: Request): Promise<boolean> {
  const token = getInternalTokenFromCookieHeader(request.headers.get('cookie'));
  if (!token) return false;
  try {
    return await verifyInternalToken(token);
  } catch (error) {
    logger.warn('Internal token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Authenticate an incoming MCP HTTP request.
 *
 * Returns the auth context on success, or a structured failure that can be
 * turned into an HTTP response. Never throws.
 */
export async function authenticateMcpRequest(
  request: Request
): Promise<McpAuthResult | McpAuthFailure> {
  if (!isAuthEnabled()) {
    // In local dev mode we still return a bearer-like context so downstream
    // quota/rate-limit code has a stable identity key.
    return {
      success: true,
      auth: { type: 'bearer', label: 'dev-open-access' },
    };
  }

  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    const sessionAuth = await extractSessionAuth(token);
    if (sessionAuth) {
      // Session JWTs are only accepted from the website's own playground (the
      // browser sends the HttpOnly internal cookie automatically). An external
      // agent carrying a session token has no such cookie and must use an API
      // key — otherwise a registered user could bypass credit metering.
      if (await hasValidInternalCookie(request)) {
        return { success: true, auth: sessionAuth };
      }
      return {
        success: false,
        error:
          'Session tokens are only accepted from the website UI. Use X-API-Key for API access.',
        statusCode: 401,
      };
    }

    const bearerAuth = extractSharedBearerAuth(token);
    if (bearerAuth) {
      return { success: true, auth: bearerAuth };
    }

    return {
      success: false,
      error: 'Invalid bearer token',
      statusCode: 401,
    };
  }

  if (apiKeyHeader) {
    const apiKeyAuth = await extractApiKeyAuth(apiKeyHeader);
    if (apiKeyAuth) {
      return { success: true, auth: apiKeyAuth };
    }

    return {
      success: false,
      error: 'Invalid API key',
      statusCode: 401,
    };
  }

  return {
    success: false,
    error: 'Authentication required. Provide X-API-Key or Authorization: Bearer <token>.',
    statusCode: 401,
  };
}
