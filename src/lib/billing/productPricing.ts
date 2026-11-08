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

import { canonicalizeAlias } from '@/mcp/tools/unified/aliases';

import { isFreeVerifyCall } from './freeVerify';
import {
  BATCH_UNIT_CREDITS,
  getCreditCost,
  getMcpToolBillableItems,
  getToolCreditCost,
  isMcpBatchCall,
} from './metering';
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

const C1 = getToolCreditCost('get_symbols');
const C2 = getToolCreditCost('get_price_analytics');
const C3 = getToolCreditCost('check_trade_safety');
const C4 = getToolCreditCost('begin_trade_evidence');

/**
 * Per-op credit cost for the consolidated product tools. The op branch keeps
 * the class each op had before consolidation, except the trade-safety ops,
 * which are priced at C4 (40 credits). Deprecated alias spellings canonicalize
 * onto the same product op, so they charge the same price. Product purchases
 * keep their product credit price; covered in-window ops are 0.
 */
const PRODUCT_MCP_TOOL_OP_CREDIT_COSTS: Readonly<Record<string, Readonly<Record<string, number>>>> =
  {
    trade_guard: {
      oracle_price: C1,
      price_analytics: C2,
      // The original broad rule (`get_(feed|oracle)_(health|freshness|uptime|
      // prices_batch)` → C2) already covered the deprecated spelling. Derive it
      // instead of pinning a literal: no price change is part of a rename.
      oracle_health: getToolCreditCost('get_oracle_health'),
      search_registry: C1,
      market_quote: C1,
      check_safety: C4,
      prepare_swap: C4,
      prepare_perp_order: C4,
    },
    trade_proof: {
      begin_evidence: C4,
      issue_receipt: C4,
      verify_evidence: C4,
    },
    oracle_watch_window: {
      snapshot: C3,
      history: C3,
      begin: ORACLE_WATCH_WINDOW_CREDIT_COST,
      poll: 0,
      close: 0,
    },
    position_lifecycle: {
      begin: POSITION_LIFECYCLE_CREDIT_COST,
      guard: 0,
      receipt: 0,
      close: 0,
    },
  };

/** Representative op when a bare product name is priced without arguments. */
const DEFAULT_PRODUCT_OP: Readonly<Record<string, string>> = {
  trade_guard: 'oracle_price',
  trade_proof: 'begin_evidence',
  oracle_watch_window: 'snapshot',
  position_lifecycle: 'begin',
};

function callOp(args: unknown): string | undefined {
  if (args === null || typeof args !== 'object') return undefined;
  const op = (args as Record<string, unknown>).op;
  return typeof op === 'string' ? op : undefined;
}

/** Product purchases priced in USD, including the canonical product spelling. */
const PRODUCT_MCP_TOOL_OP_USD_PRICES: Readonly<Record<string, number>> = {
  'oracle_watch_window:begin': ORACLE_WATCH_WINDOW_PLAN.priceUsd,
  'position_lifecycle:begin': POSITION_LIFECYCLE_PLAN.priceUsd,
};

/**
 * USD list price for a call, if the tool is product-priced. Deprecated names,
 * canonical product names and raw op arguments all resolve to the same entry.
 */
export function getMcpToolUsdPrice(toolName: string, args?: unknown): number | undefined {
  const direct = PRODUCT_MCP_TOOL_USD_PRICES[toolName];
  if (direct !== undefined) return direct;
  const canonical = canonicalizeAlias(toolName, args);
  const name = canonical?.name ?? toolName;
  const op = callOp(canonical?.args ?? args) ?? DEFAULT_PRODUCT_OP[name];
  return PRODUCT_MCP_TOOL_OP_USD_PRICES[`${name}:${op}`];
}

/**
 * Resolve a product call to its op cost. Deprecated aliases canonicalize onto
 * their product tool and injected op first, so alias and canonical spellings
 * of the same op always charge the same price.
 */
function productOpCreditCost(toolName: string, args?: unknown): number | undefined {
  const canonical = canonicalizeAlias(toolName, args);
  const name = canonical?.name ?? toolName;
  const effectiveArgs = canonical?.args ?? args;
  const op = callOp(effectiveArgs) ?? DEFAULT_PRODUCT_OP[name];
  const opCost = PRODUCT_MCP_TOOL_OP_CREDIT_COSTS[name]?.[op];
  if (opCost !== undefined) return opCost;
  // Control/step aliases may omit an op; their product-level price covers them.
  return PRODUCT_MCP_TOOL_CREDIT_COSTS[toolName];
}

/**
 * Resolve the credit cost for an MCP tool name, honouring product-priced
 * tools before per-call class rules. A 0 result means the call is covered by
 * a prior purchase, not that the tool is unmetered-by-design.
 */
export function getMcpToolCreditCost(toolName: string, args?: unknown): number {
  const opCost = productOpCreditCost(toolName, args);
  if (opCost !== undefined) return opCost;
  const product = PRODUCT_MCP_TOOL_CREDIT_COSTS[toolName];
  if (product !== undefined) return product;
  return getToolCreditCost(toolName);
}

/**
 * Per-call cost that knows the tool arguments. Offline verification kinds are
 * free; batch tools charge per requested item; everything else falls back to
 * the tool's static class price.
 */
export function getMcpToolCreditCostForCall(toolName: string, args?: unknown): number {
  if (isFreeVerifyCall(toolName, args)) return 0;
  // Batch tools are priced at the C1 rate per successful item (2 credits),
  // not the flat C2 class price: see §7.2 of the pricing review.
  if (isMcpBatchCall(toolName, args)) {
    return BATCH_UNIT_CREDITS * getMcpToolBillableItems(toolName, args);
  }
  const unitCost = getMcpToolCreditCost(toolName, args);
  if (unitCost === 0) return 0;
  return unitCost * getMcpToolBillableItems(toolName, args);
}

/** True when a tool's per-call cost is covered by a prior product purchase. */
export function isEntitlementCoveredMcpTool(toolName: string, args?: unknown): boolean {
  const opCost = productOpCreditCost(toolName, args);
  if (opCost !== undefined) return opCost === 0;
  return PRODUCT_MCP_TOOL_CREDIT_COSTS[toolName] === 0;
}
