/**
 * @fileoverview Single source of truth for per-call credit metering.
 *
 * Reframes the old flat "1 request = 1 quota unit" model into a
 * value-and-cost-weighted credit system. Each endpoint/tool maps to a
 * metering class (C1..C4) with a credit cost per call. Both the REST quota
 * middleware and the MCP middleware read from this file, so the same data is
 * priced identically across surfaces — mirroring how tiers.ts keeps MCP/REST
 * plan gating in sync.
 *
 * Classes (cost = supplier cost + value to the calling agent):
 *   C1 (0.5cr)  — foundational, cached data (prices, listings, reports)
 *   C2 (2cr)    — deep aggregation / analysis
 *   C3 (5cr)    — agent gating (pre-trade, oracle-watch)
 *   C4 (10cr)   — attested proofs & receipts (RPC read + KMS signing)
 */

export type MeteringClass = 'C1' | 'C2' | 'C3' | 'C4';

/** Credits charged per call for each metering class. */
export const CREDIT_COST: Record<MeteringClass, number> = {
  C1: 0.5,
  C2: 2,
  C3: 5,
  C4: 10,
};

/**
 * Ordered [regex, class] rules for REST endpoint paths. First match wins.
 * The default (no match) is C1 — cheap foundational data.
 */
const ENDPOINT_RULES: Array<[RegExp, MeteringClass]> = [
  // C4 — attested proofs / execution receipts: on-chain RPC + KMS signing.
  [/execution\/attestation/, 'C4'],

  // C3 — agent gates.
  [/\/safety\//, 'C3'],
  [/\/oracle-watch/, 'C3'],

  // C2 — deep analysis. Next.js route paths have NO trailing slash
  // (`/api/v1/deviation`), so each rule must match a keyword followed by
  // either another path segment or the end of the path — a bare `\/` would
  // never match and would silently underprice these endpoints as C1.
  [/\/(?:deviation|correlation|latency|anomalies)(?:\/|$)/, 'C2'],
  [/\/(?:risk|consensus|history|batch|coverage|incidents)(?:\/|$)/, 'C2'],
  [
    /\/(?:feed-health|feeds\/freshness|oracles\/health|oracles\/reputation|reputation|stablecoins|wrapped-assets)(?:\/|$)/,
    'C2',
  ],
  [/\/protocol-health(?:\/|$)/, 'C2'],
  [/\/price-snapshots(?:\/|$)/, 'C2'],
  // Protocol-level deep analysis (matches the MCP C2 tool pricing for the
  // same data): risk params, oracle exposure, cross-chain spreads.
  [/(?:risk-params|oracle-exposure|spreads)(?:\/|$)/, 'C2'],
  // Per-feed health (matches MCP get_feed_health, which is C2).
  [/\/feeds\/[^/]+\/health(?:\/|$)/, 'C2'],
];

/**
 * Ordered [predicate, class] rules for MCP tool names. The MCP surface from
 * tiers.ts covers most Tier 2/3 tools with regex-safe names like
 * `pre_trade_safety_check` and `get_risk_summary`. Default is C1.
 */
const TOOL_RULES: Array<[RegExp, MeteringClass]> = [
  // C4 — receipts / verification.
  [/execution|receipt|verify_execution|verify_pair/, 'C4'],

  // C3 — agent gates.
  [/pre_trade|oracle_watch|position_safety|liquidation/, 'C3'],

  // C2 — deep analysis tools (non-list).
  [
    /get_(risk|deviation|correlation|latency|anomal[y]?|consensus|history|incident)|compare_oracle_deviation/,
    'C2',
  ],
  [/get_(feed|oracle)_(health|freshness|uptime|prices_batch)/, 'C2'],
  [/check_position_safety|check_liquidation_risk/, 'C2'],
  // `get_protocol_` (underscore) excludes the plain `get_protocols` listing,
  // which is foundational C1 data — mirroring REST `/api/v1/protocols`.
  [/get_protocol_|get_incident|get_coverage|get_stablecoin|get_wrapped|exposure|spread/, 'C2'],
];

/**
 * Resolve the credit cost for a REST endpoint path.
 * @param path Request pathname, e.g. `/api/v1/safety/pre-trade`.
 */
export function getCreditCost(path: string): number {
  for (const [re, cls] of ENDPOINT_RULES) {
    if (re.test(path)) return CREDIT_COST[cls];
  }
  return CREDIT_COST.C1;
}

/**
 * Resolve the credit cost for an MCP tool name.
 * @param toolName e.g. `pre_trade_safety_check`.
 */
export function getToolCreditCost(toolName: string): number {
  const name = toolName.toLowerCase();
  for (const [re, cls] of TOOL_RULES) {
    if (re.test(name)) return CREDIT_COST[cls];
  }
  return CREDIT_COST.C1;
}
