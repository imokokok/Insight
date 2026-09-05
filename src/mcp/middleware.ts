/**
 * @fileoverview MCP rate-limit and credit helpers
 *
 * These helpers reuse the same backend primitives as the REST API
 * (rateLimitStore, creditWallet, PLANS) but are shaped for the MCP streaming
 * HTTP transport, which uses standard Request/Response instead of Next.js
 * types.
 *
 * Metering is a single credit-wallet path shared with REST: an API key may
 * call a tool iff its balance covers the tool's credit cost (getToolCreditCost).
 * There is no recurring free tier and no plan-based feature gating — the only
 * "free" credits are the one-time 100-credit signup trial grant, which simply
 * tops up the same wallet.
 */

import { logApiKeyUsage } from '@/lib/api/apiKey';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { consumeCredits, makeMeteringKey, precheckCredits } from '@/lib/billing/creditWallet';
import { getToolCreditCost } from '@/lib/billing/metering';
import { normalizePlan, PLANS } from '@/lib/billing/plans';
import { createLogger } from '@/lib/utils/logger';

import type { McpAuthContext } from './auth';

const logger = createLogger('mcp-middleware');

const PRESETS = {
  strict: { windowMs: 60_000, maxRequests: 20 },
  moderate: { windowMs: 60_000, maxRequests: 60 },
  api: { windowMs: 60_000, maxRequests: 100 },
} as const;

interface McpRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Apply a per-minute rate limit keyed by the authenticated identity.
 * Session users get the moderate preset; API keys use their own rate_limit;
 * shared bearer tokens get the api preset.
 */
export async function checkMcpRateLimit(
  auth: McpAuthContext,
  preset: keyof typeof PRESETS = 'moderate'
): Promise<McpRateLimitResult> {
  const config = PRESETS[preset];
  const identity = getIdentity(auth);

  let maxRequests: number = config.maxRequests;
  if (auth.type === 'apikey') {
    const apiRateLimit = auth.apiKey.rateLimit;
    if (apiRateLimit < 0) {
      // Unlimited plan.
      return { allowed: true, limit: -1, remaining: -1, resetAt: Date.now() + config.windowMs };
    }
    maxRequests = apiRateLimit;
  }

  const result = await rateLimitStore.increment(`mcp:${identity}`, config.windowMs);

  if (result.count > maxRequests) {
    const now = Date.now();
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: result.resetTime,
      retryAfter: Math.max(1, Math.ceil((result.resetTime - now) / 1000)),
    };
  }

  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - result.count),
    resetAt: result.resetTime,
  };
}

function getIdentity(auth: McpAuthContext): string {
  if (auth.type === 'session') {
    return `session:${auth.userId}`;
  }
  if (auth.type === 'apikey') {
    return `apikey:${auth.apiKey.keyId}`;
  }
  return `bearer:${auth.label}`;
}

interface McpQuotaResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
}

/**
 * Pre-check the credit balance for API-key authenticated MCP calls WITHOUT
 * consuming it. This runs at the HTTP boundary so an already-exhausted key is
 * short-circuited with a 402 before the JSON-RPC message is even dispatched.
 *
 * The actual credit charge happens later, in {@link consumeMcpQuota}, only
 * when a tool call succeeds — so protocol overhead (`initialize`,
 * `tools/list`, `ping`) and failed tool calls do NOT cost the user. Session
 * and shared-bearer callers are never metered.
 *
 * Tool name is unavailable at the HTTP boundary, so API keys are checked
 * against the cheapest class cost (0.5) — enough to short-circuit an empty
 * wallet. The precise per-tool cost is charged in consumeMcpQuota.
 */
export async function checkMcpQuota(auth: McpAuthContext): Promise<McpQuotaResult> {
  if (auth.type !== 'apikey') {
    return { allowed: true, limit: -1, remaining: -1, resetAt: new Date().toISOString() };
  }

  const plan = normalizePlan(auth.apiKey.plan);
  const planConfig = PLANS[plan];

  // Unlimited (enterprise) plans skip the check.
  if (planConfig.monthlyQuota < 0) {
    return { allowed: true, limit: -1, remaining: -1, resetAt: new Date().toISOString() };
  }

  // Credit-wallet precheck at the cheapest class cost. Fail open on transient
  // DB error (precheckCredits already fall-open).
  const minCost = 0.5;
  const precheck = await precheckCredits(auth.apiKey.keyId, minCost);
  if (!precheck.ok) {
    logger.warn('MCP credit precheck rejected', {
      apiKeyId: auth.apiKey.keyId,
      plan,
      reason: precheck.reason,
    });
    return { allowed: false, limit: -1, remaining: 0, resetAt: new Date().toISOString() };
  }

  return {
    allowed: true,
    limit: -1,
    remaining: precheck.balance ?? 0,
    resetAt: new Date().toISOString(),
  };
}

/**
 * Per-tool credit precheck for API keys. Runs inside the tool-call handler
 * where the tool name IS known, so a key whose balance is below the ACTUAL
 * cost of this specific tool is rejected BEFORE the tool executes.
 *
 * The HTTP-boundary {@link checkMcpQuota} only prechecks against the cheapest
 * class (0.5cr) because the tool name is unavailable there. Without this
 * per-tool check, a key with e.g. 1 credit could call a C4 tool (10cr)
 * repeatedly and get it for free — the fire-and-forget consume would fail
 * silently afterwards. Mirrors the REST precheck, which uses the actual
 * endpoint cost.
 */
export async function precheckMcpToolQuota(
  auth: McpAuthContext,
  toolName: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (auth.type !== 'apikey') {
    return { allowed: true };
  }

  const plan = normalizePlan(auth.apiKey.plan);
  // Unlimited (enterprise) plans are never metered.
  if (PLANS[plan].monthlyQuota < 0) {
    return { allowed: true };
  }

  const cost = getToolCreditCost(toolName);
  const precheck = await precheckCredits(auth.apiKey.keyId, cost);
  if (!precheck.ok) {
    return { allowed: false, reason: precheck.reason ?? 'Insufficient credits' };
  }

  return { allowed: true };
}

/**
 * Consume credits for a successful MCP tool call. Fire-and-forget, mirroring
 * the REST quota middleware. No-op for session, shared-bearer and unlimited
 * (enterprise) callers.
 */
export function consumeMcpQuota(auth: McpAuthContext, toolName: string): void {
  if (auth.type !== 'apikey') {
    return;
  }

  const plan = normalizePlan(auth.apiKey.plan);

  if (PLANS[plan].monthlyQuota < 0) {
    // Unlimited (enterprise) — not metered.
    return;
  }

  const cost = getToolCreditCost(toolName);
  const meteringKey = makeMeteringKey(`mcp:${auth.apiKey.keyId}:${toolName}`);
  consumeCredits(auth.apiKey.keyId, cost, meteringKey, `/mcp/tools/${toolName}`).catch((err) => {
    logger.warn('MCP async credit consume failed', {
      apiKeyId: auth.apiKey.keyId,
      cost,
      toolName,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Log one MCP tool invocation for usage analytics. Fire-and-forget.
 */
export function recordMcpToolUsage(
  auth: McpAuthContext,
  toolName: string,
  statusCode: number,
  responseTimeMs: number
): void {
  if (auth.type !== 'apikey') {
    return;
  }

  logApiKeyUsage({
    apiKeyId: auth.apiKey.keyId,
    endpoint: `/mcp/tools/${toolName}`,
    method: 'CALL',
    statusCode,
    responseTimeMs,
  }).catch((err) => {
    logger.warn('Failed to log MCP tool usage', {
      apiKeyId: auth.apiKey.keyId,
      toolName,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
