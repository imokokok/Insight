/**
 * @fileoverview MCP rate-limit, quota and plan-guard helpers
 *
 * These helpers reuse the same backend primitives as the REST API
 * (rateLimitStore, incrementApiKeyQuota, PLANS) but are shaped for the MCP
 * streaming HTTP transport, which uses standard Request/Response instead of
 * Next.js types.
 */

import { incrementApiKeyQuota, logApiKeyUsage } from '@/lib/api/apiKey';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { isTrialActive, normalizePlan, planSatisfies, PLANS } from '@/lib/billing/plans';
import { createLogger } from '@/lib/utils/logger';

import { getToolTier } from './tiers';

import type { McpAuthContext, McpApiKeyAuth } from './auth';

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
 * Pre-check the monthly quota for API-key authenticated MCP calls WITHOUT
 * consuming it. This runs at the HTTP boundary so an already-exhausted key is
 * short-circuited with a 402 before the JSON-RPC message is even dispatched.
 *
 * The actual quota decrement happens later, in {@link consumeMcpQuota}, only
 * when a tool call succeeds — so protocol overhead (`initialize`, `tools/list`,
 * `ping`) and plan-guarded / failed tool calls do NOT cost the user quota.
 * Session and shared-bearer callers are never metered by the API-key quota.
 */
export function checkMcpQuota(auth: McpAuthContext): McpQuotaResult {
  if (auth.type !== 'apikey') {
    return { allowed: true, limit: -1, remaining: -1, resetAt: new Date().toISOString() };
  }

  return checkApiKeyQuota(auth);
}

function checkApiKeyQuota(auth: McpApiKeyAuth): McpQuotaResult {
  const plan = normalizePlan(auth.apiKey.plan);
  const planConfig = PLANS[plan];
  const limit = planConfig.monthlyQuota;

  if (limit < 0) {
    return { allowed: true, limit: -1, remaining: -1, resetAt: auth.apiKey.quotaResetAt };
  }

  const used = auth.apiKey.monthlyQuotaUsed ?? 0;
  const resetAt = auth.apiKey.quotaResetAt ?? new Date().toISOString();
  const effectiveUsed = new Date(resetAt).getTime() < Date.now() ? 0 : used;

  if (effectiveUsed >= limit) {
    logger.warn('MCP monthly quota exceeded', {
      apiKeyId: auth.apiKey.keyId,
      plan,
      used: effectiveUsed,
      limit,
    });

    return { allowed: false, limit, remaining: 0, resetAt };
  }

  // NOTE: do NOT increment here. The counter is decremented only when a tool
  // call actually succeeds (see consumeMcpQuota). Reporting the pre-decrement
  // remaining so the header reflects the cached usage snapshot consistently
  // with the fire-and-forget increment semantics used by the REST API.
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - effectiveUsed),
    resetAt,
  };
}

/**
 * Consume one unit of monthly quota for a successful MCP tool call.
 * Fire-and-forget, mirroring the REST quota middleware. No-op for session and
 * shared-bearer callers, and for unlimited plans (increment_api_key_quota is a
 * harmless no-op on unlimited keys but we skip the DB round-trip anyway).
 */
export function consumeMcpQuota(auth: McpAuthContext): void {
  if (auth.type !== 'apikey') {
    return;
  }

  incrementApiKeyQuota(auth.apiKey.keyId).catch((err) => {
    logger.warn('MCP async quota increment failed', {
      apiKeyId: auth.apiKey.keyId,
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

interface McpPlanGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Enforce per-tool plan access, mirroring the REST API planGuard so the same
 * data is gated identically via MCP and REST.
 *
 *   - 'free' tools: never gated.
 *   - 'pro' (Tier 2) tools: pass for pro/protocol/enterprise keys, and for
 *     free keys with an active Pro trial. Other free keys are blocked.
 *   - 'protocol' (Tier 3) tools: hard gate — only protocol/enterprise keys
 *     pass. Pro (even during a trial) and free are blocked.
 *
 * Session (website) and shared-bearer callers always bypass the gate, matching
 * the REST behaviour where Bearer session requests skip planGuard.
 */
export function checkMcpPlanGuard(auth: McpAuthContext, toolName: string): McpPlanGuardResult {
  const requiredTier = getToolTier(toolName);

  // Free tools, and session/bearer callers (app UI / shared token), are never gated.
  if (requiredTier === 'free' || auth.type !== 'apikey') {
    return { allowed: true };
  }

  const plan = normalizePlan(auth.apiKey.plan);

  // Paid plans that satisfy the required tier pass.
  if (planSatisfies(plan, requiredTier)) {
    return { allowed: true };
  }

  // Tier 2 (pro) tools: an active Pro trial grants access, mirroring the REST
  // planGuard. Tier 3 (protocol) tools are a hard gate — trials do NOT apply.
  if (requiredTier === 'pro' && isTrialActive(auth.apiKey.trialEndsAt)) {
    return { allowed: true };
  }

  const planName = PLANS[requiredTier].name;
  return {
    allowed: false,
    reason: `Tool "${toolName}" requires the ${planName} plan or higher. Upgrade at /api#pricing.`,
  };
}
