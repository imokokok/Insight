/**
 * @fileoverview Product-priced REST endpoints — the non-per-call billing layer.
 *
 * Every per-call price lives in ./metering.ts (C1..C4 per call). A product
 * purchase inverts that shape: ONE successful call buys a bounded entitlement
 * (e.g. a 24 h monitored window) and subsequent calls within it are covered.
 * This module maps such endpoints to their product credit price — the product's
 * USD list price converted at the canonical {@link USD_PER_CREDIT} rate — and
 * is the lookup the quota middleware consults BEFORE the per-call class rules,
 * so a product endpoint can never silently fall through to C1..C4 pricing.
 *
 * Kept separate from metering.ts because product definitions import plan
 * configuration (./plans.ts) which itself imports metering.ts; flattening the
 * product registry in here keeps the module graph acyclic.
 */

import { isFreeVerifyCall } from './freeVerify';
import { getCreditCost, getToolCreditCost } from './metering';
import {
  ORACLE_WATCH_WINDOW_BEGIN_PATH,
  ORACLE_WATCH_WINDOW_CREDIT_COST,
  ORACLE_WATCH_WINDOW_PLAN,
} from './oracleWatchWindow';
import {
  POSITION_LIFECYCLE_BEGIN_PATH,
  POSITION_LIFECYCLE_CREDIT_COST,
  POSITION_LIFECYCLE_PLAN,
} from './positionLifecycle';

/**
 * Exact-path keyed product prices. One successful request at this path charges
 * the full product price instead of a per-call class cost.
 */
export const PRODUCT_ENDPOINT_CREDIT_COSTS: Readonly<Record<string, number>> = {
  [ORACLE_WATCH_WINDOW_BEGIN_PATH]: ORACLE_WATCH_WINDOW_CREDIT_COST,
  [POSITION_LIFECYCLE_BEGIN_PATH]: POSITION_LIFECYCLE_CREDIT_COST,
};

/**
 * Resolve the credit cost for a REST endpoint path, honouring product-priced
 * endpoints before per-call class rules.
 */
export function getEndpointCreditCost(path: string): number {
  const product = PRODUCT_ENDPOINT_CREDIT_COSTS[path];
  if (product !== undefined) return product;
  return getCreditCost(path);
}

/**
 * MCP tool names that sell the products. The `*_begin` tools charge the full
 * product price on one successful call; the remaining tools are the in-window
 * operations, which are covered by that purchase (0 credits) and authenticate
 * with the one-time token it returned — never re-metered per call.
 */
export const ORACLE_WATCH_WINDOW_BEGIN_MCP_TOOL = 'oracle_watch_window_begin';
export const POSITION_LIFECYCLE_BEGIN_MCP_TOOL = 'position_lifecycle_begin';

/** MCP tool → credit cost, consulted before the per-call class rules. */
export const PRODUCT_MCP_TOOL_CREDIT_COSTS: Readonly<Record<string, number>> = {
  [ORACLE_WATCH_WINDOW_BEGIN_MCP_TOOL]: ORACLE_WATCH_WINDOW_CREDIT_COST,
  // Consolidated control tool: poll and close are both covered by the purchase.
  oracle_watch_window_control: 0,
  oracle_watch_window_poll: 0,
  oracle_watch_window_close: 0,
  [POSITION_LIFECYCLE_BEGIN_MCP_TOOL]: POSITION_LIFECYCLE_CREDIT_COST,
  // Consolidated step tool: guard, receipt and close are all covered.
  position_lifecycle_step: 0,
  position_lifecycle_guard: 0,
  position_lifecycle_receipt: 0,
  position_lifecycle_close: 0,
};

/** MCP tool → x402 USD list price (begin tools only; in-window tools are 0). */
export const PRODUCT_MCP_TOOL_USD_PRICES: Readonly<Record<string, number>> = {
  [ORACLE_WATCH_WINDOW_BEGIN_MCP_TOOL]: ORACLE_WATCH_WINDOW_PLAN.priceUsd,
  [POSITION_LIFECYCLE_BEGIN_MCP_TOOL]: POSITION_LIFECYCLE_PLAN.priceUsd,
};

/**
 * Resolve the credit cost for an MCP tool name, honouring product-priced
 * tools before per-call class rules. A 0 result means the call is covered by
 * a prior purchase, not that the tool is unmetered-by-design.
 */
export function getMcpToolCreditCost(toolName: string): number {
  const product = PRODUCT_MCP_TOOL_CREDIT_COSTS[toolName];
  if (product !== undefined) return product;
  return getToolCreditCost(toolName);
}

/**
 * Per-call cost that knows the tool arguments. Offline verification kinds are
 * free; everything else falls back to the tool's static class price.
 */
export function getMcpToolCreditCostForCall(toolName: string, args?: unknown): number {
  if (isFreeVerifyCall(toolName, args)) return 0;
  return getMcpToolCreditCost(toolName);
}

/** True when a tool's per-call cost is covered by a prior product purchase. */
export function isEntitlementCoveredMcpTool(toolName: string): boolean {
  return PRODUCT_MCP_TOOL_CREDIT_COSTS[toolName] === 0;
}
