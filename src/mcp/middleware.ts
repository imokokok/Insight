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
import { consumeCredits, makeMeteringKey, precheckCredits } from '@/lib/billing/creditWallet';
import { getToolCreditCost } from '@/lib/billing/metering';
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
 * Pre-check the monthly quota / credit balance for API-key authenticated MCP
 * calls WITHOUT consuming it. This runs at the HTTP boundary so an
 * already-exhausted key is short-circuited with a 402 before the JSON-RPC
 * message is even dispatched.
 *
 * The actual credit charge happens later, in {@link consumeMcpQuota}, only
 * when a tool call succeeds — so protocol overhead (`initialize`,
 * `tools/list`, `ping`) and plan-guarded / failed tool calls do NOT cost the
 * user. Session and shared-bearer callers are never metered.
 *
 * Tool name is unavailable at the HTTP boundary, so paid keys are checked
 * against the cheapest class cost (0.5) — enough to short-circuit an empty
 * wallet. The precise per-tool cost is charged in consumeMcpQuota.
 */
export async function checkMcpQuota(auth: McpAuthContext): Promise<McpQuotaResult> {
  if (auth.type !== 'apikey') {
    return { allowed: true, limit: -1, remaining: -1, resetAt: new Date().toISOString() };
  }

  const plan = normalizePlan(auth.apiKey.plan);
  const planConfig = PLANS[plan];

  // Free keys: legacy monthly-quota check from the cached validation result.
  if (plan === 'free') {
    return checkFreeMonthlyQuota(auth);
  }

  // Paid keys: credit-wallet precheck at the cheapest class cost. Fail open on
  // transient DB error (precheckCredits already fall-open). Unlimited
  // (enterprise) plans skip the check.
  if (planConfig.monthlyQuota < 0) {
    return { allowed: true, limit: -1, remaining: -1, resetAt: auth.apiKey.quotaResetAt };
  }

  const minCost = 0.5;
  const precheck = await precheckCredits(auth.apiKey.keyId, minCost);
  if (!precheck.ok) {
    logger.warn('MCP credit precheck rejected', {
      apiKeyId: auth.apiKey.keyId,
      plan,
      reason: precheck.reason,
    });
    return { allowed: false, limit: -1, remaining: 0, resetAt: auth.apiKey.quotaResetAt };
  }

  return {
    allowed: true,
    limit: -1,
    remaining: precheck.balance ?? 0,
    resetAt: auth.apiKey.quotaResetAt,
  };
}

function checkFreeMonthlyQuota(auth: McpApiKeyAuth): McpQuotaResult {
  const plan = normalizePlan(auth.apiKey.plan);
  const limit = PLANS[plan].monthlyQuota;

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

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - effectiveUsed),
    resetAt,
  };
}

/**
 * Per-tool credit precheck for paid API keys. Runs inside the tool-call
 * handler where the tool name IS known, so a key whose balance is below the
 * ACTUAL cost of this specific tool is rejected BEFORE the tool executes.
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
  // Free keys use the legacy monthly counter; unlimited (enterprise) plans
  // are never metered.
  if (plan === 'free' || PLANS[plan].monthlyQuota < 0) {
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
 * Consume credits for a successful MCP tool call (paid keys), or increment
 * the monthly-quota counter (free keys). Fire-and-forget, mirroring the REST
 * quota middleware. No-op for session and shared-bearer callers.
 */
export function consumeMcpQuota(auth: McpAuthContext, toolName: string): void {
  if (auth.type !== 'apikey') {
    return;
  }

  const plan = normalizePlan(auth.apiKey.plan);

  if (plan === 'free') {
    incrementApiKeyQuota(auth.apiKey.keyId).catch((err) => {
      logger.warn('MCP async quota increment failed', {
        apiKeyId: auth.apiKey.keyId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return;
  }

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
