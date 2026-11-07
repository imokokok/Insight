/**
 * @fileoverview MCP rate-limit and credit helpers
 *
 * These helpers reuse the same backend primitives as the REST API
 * (rateLimitStore, creditWallet, PLANS) but are shaped for the MCP streaming
 * HTTP transport, which uses standard Request/Response instead of Next.js
 * types.
 *
 * Metering is a single credit-wallet path shared with REST: an API key may
 * call a tool iff its balance covers the tool's credit cost. There is no
 * plan-based feature gating; offline verification kinds are free by design.
 */

import { logApiKeyUsage } from '@/lib/api/apiKey';
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { consumeCredits, makeMeteringKey, precheckCredits } from '@/lib/billing/creditWallet';
import { isFreeVerifyCall } from '@/lib/billing/freeVerify';
import { batchChargeCredits, getMcpToolBillableItems } from '@/lib/billing/metering';
import { normalizePlan, PLANS } from '@/lib/billing/plans';
import {
  getMcpToolCreditCostForCall,
  isEntitlementCoveredMcpTool,
} from '@/lib/billing/productPricing';
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
 * against the cheapest class cost (C1 = 2 credits) — enough to short-circuit
 * an empty wallet. The precise per-tool cost is charged in consumeMcpQuota.
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
  const minCost = 2;
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
 * class (2 credits) because the tool name is unavailable there. Without this
 * per-tool check, a key with e.g. 2 credits could call a C4 tool (40 credits)
 * repeatedly and get it for free — the fire-and-forget consume would fail
 * silently afterwards. Mirrors the REST precheck, which uses the actual
 * endpoint cost.
 */
export async function precheckMcpToolQuota(
  auth: McpAuthContext,
  toolName: string,
  args?: unknown
): Promise<{ allowed: boolean; reason?: string; balance?: number }> {
  if (auth.type !== 'apikey') {
    return { allowed: true };
  }

  const plan = normalizePlan(auth.apiKey.plan);
  // Unlimited (enterprise) plans are never metered.
  if (PLANS[plan].monthlyQuota < 0) {
    return { allowed: true };
  }

  // Product-priced tools: the begin tools charge the full product price, and
  // the in-window tools (0) are covered by that purchase — never re-metered.
  // Offline verification kinds also resolve to 0 and never precheck. Batch
  // tools precheck against the full requested item count.
  const cost = getMcpToolCreditCostForCall(toolName, args);
  if (cost === 0) {
    return { allowed: true };
  }
  const precheck = await precheckCredits(auth.apiKey.keyId, cost);
  if (!precheck.ok) {
    return {
      allowed: false,
      reason: precheck.reason ?? 'Insufficient credits',
      balance: precheck.balance,
    };
  }

  return { allowed: true, balance: precheck.balance };
}

/** How this MCP call was settled. `credits` = wallet debit, `free` = priced
 *  at zero, `entitlement` = covered by a prior product purchase,
 *  `unmetered` = non-API-key caller or unlimited plan. */
export type McpBillingSource = 'credits' | 'free' | 'entitlement' | 'unmetered';

export interface McpConsumeOutcome {
  allowed: boolean;
  reason?: string;
  /** List price for this call, in credits (batch-scaled to successful items). */
  cost: number;
  /** Batch items actually billed; 1 for per-call tools. */
  items: number;
  /** Credits actually deducted. 0 for free, entitlement, replay, or fail-open. */
  charged: number;
  /** Ledger metering key for this logical request (X-Credit-Receipt). */
  receipt?: string;
  balance?: number;
  idempotent?: boolean;
  confirmed?: boolean;
  source: McpBillingSource;
}

/**
 * Authoritatively consume credits for a successful MCP tool call before its
 * data is returned. No-op for session, shared-bearer and unlimited callers.
 *
 * `meteringKey` is the caller's deterministic request key: `consume_credits`
 * is idempotent on it, so a replay is served without a second charge even
 * across serverless instances.
 */
export async function consumeMcpQuota(
  auth: McpAuthContext,
  toolName: string,
  args?: unknown,
  options?: {
    meteringKey?: string;
    billableItems?: number;
    /** Ledger reason override (prices.batch / batch_partial / insufficient_data / upstream_failed / timeout). */
    reason?: string;
    /** Per-charge detail written to `credit_ledger.meta`. */
    meta?: Record<string, unknown>;
  }
): Promise<McpConsumeOutcome> {
  const requestedItems = getMcpToolBillableItems(toolName, args);
  const requestedCost = getMcpToolCreditCostForCall(toolName, args);
  // Batch tools precheck against the requested item count but are billed for
  // the items that actually returned usable data (never more than requested).
  const items =
    options?.billableItems !== undefined
      ? Math.min(requestedItems, Math.max(0, options.billableItems))
      : requestedItems;
  const cost =
    items === requestedItems
      ? requestedCost
      : requestedCost > 0
        ? batchChargeCredits(requestedCost / requestedItems, items)
        : 0;
  if (auth.type !== 'apikey') {
    return {
      allowed: true,
      cost,
      items,
      charged: 0,
      source: 'unmetered',
      receipt: options?.meteringKey,
    };
  }

  const plan = normalizePlan(auth.apiKey.plan);

  if (PLANS[plan].monthlyQuota < 0) {
    // Unlimited (enterprise) — not metered.
    return {
      allowed: true,
      cost,
      items,
      charged: 0,
      source: 'unmetered',
      receipt: options?.meteringKey,
    };
  }

  // Product-priced tools: 0 means covered by the prior purchase. Offline
  // verification kinds are also 0 and stay free.
  if (cost === 0) {
    return {
      allowed: true,
      cost,
      items,
      charged: 0,
      source: isFreeVerifyCall(toolName, args)
        ? 'free'
        : isEntitlementCoveredMcpTool(toolName)
          ? 'entitlement'
          : 'free',
      receipt: options?.meteringKey,
    };
  }

  const meteringKey =
    options?.meteringKey ?? makeMeteringKey(`mcp:${auth.apiKey.keyId}:${toolName}`);
  const charge = await consumeCredits(
    auth.apiKey.keyId,
    cost,
    meteringKey,
    `/mcp/tools/${toolName}`,
    {
      source: 'wallet',
      reason: options?.reason ?? toolName,
      requestId: meteringKey,
      meta: options?.meta,
    }
  );
  if (!charge.ok) {
    logger.warn('MCP authoritative credit consume rejected', {
      apiKeyId: auth.apiKey.keyId,
      cost,
      toolName,
      reason: charge.reason,
    });
    return {
      allowed: false,
      reason: charge.reason ?? 'Insufficient credits',
      cost,
      items,
      charged: 0,
      balance: charge.balance,
      source: 'credits',
      receipt: meteringKey,
    };
  }

  // Fail-open on transient DB errors: the response is still delivered, but
  // the header must not claim a charge that was not confirmed.
  if (charge.confirmed === false) {
    return {
      allowed: true,
      cost,
      items,
      charged: 0,
      balance: charge.balance,
      confirmed: false,
      source: 'credits',
      receipt: meteringKey,
    };
  }

  return {
    allowed: true,
    cost,
    items,
    charged: charge.idempotent ? 0 : cost,
    balance: charge.balance,
    idempotent: charge.idempotent,
    confirmed: true,
    source: 'credits',
    receipt: meteringKey,
  };
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
