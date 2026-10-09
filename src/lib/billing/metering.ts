/**
 * @fileoverview Single source of truth for per-call credit metering.
 *
 * Reframes the old flat "1 request = 1 quota unit" model into a
 * value-and-cost-weighted credit system. Each endpoint/tool maps to a
 * metering class (C1..C4) with a credit cost per call. Both the REST quota
 * middleware and the MCP middleware read from this file, so the same data is
 * priced identically across surfaces.
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

/** Display order for the metering ladder, cheapest class first. */
export const METERING_CLASS_ORDER: readonly MeteringClass[] = ['C1', 'C2', 'C3', 'C4'];

/**
 * Human-facing description for each metering class. Co-located with the cost so
 * the pricing page can never describe a class differently from what the
 * middleware actually charges — every surface renders from this record.
 */
export const METERING_CLASS_DESCRIPTION: Record<MeteringClass, string> = {
  C1: 'Foundational data — prices, listings, daily reports',
  C2: 'Deep analysis — deviation, correlation, risk, history',
  C3: 'Agent gates — pre-trade safety and Oracle Watch across REST, MCP, or Guard',
  C4: 'Proofs & receipts — attested execution receipts across every integration surface',
};

/**
 * Render a class cost for display. `unit: 'short'` yields "0.5 cr" for compact
 * ledgers; `unit: 'long'` yields "0.5 credits" for prose. Always derived from
 * {@link CREDIT_COST} so a re-priced class updates every surface at once.
 */
export function formatCreditCost(cls: MeteringClass, unit: 'short' | 'long' = 'short'): string {
  return `${CREDIT_COST[cls]} ${unit === 'long' ? 'credits' : 'cr'}`;
}

/** Lowest and highest per-call credit cost across the metering ladder. */
export function creditCostRange(): { min: number; max: number } {
  const costs = METERING_CLASS_ORDER.map((cls) => CREDIT_COST[cls]);
  return { min: Math.min(...costs), max: Math.max(...costs) };
}

/** Noun used when translating a credit allowance into concrete call counts. */
export const METERING_CLASS_CALL_LABEL: Record<MeteringClass, string> = {
  C1: 'foundational calls',
  C2: 'deep-analysis calls',
  C3: 'pre-trade checks',
  C4: 'attested receipts',
};

/**
 * Translate a credit allowance into "≈N <class label>" examples, e.g.
 * `creditAllowanceExamples(25_000, ['C2', 'C3'])` →
 * "≈12,500 deep-analysis calls or ≈5,000 pre-trade checks".
 */
export function creditAllowanceExamples(
  credits: number,
  classes: readonly MeteringClass[]
): string {
  return classes
    .map(
      (cls) =>
        `≈${Math.floor(credits / CREDIT_COST[cls]).toLocaleString('en-US')} ${METERING_CLASS_CALL_LABEL[cls]}`
    )
    .join(' or ');
}

/**
 * Credit exhaustion is an operator-action condition, not a transient server
 * error. Tell automated consumers to wait until their next normal polling
 * cycle instead of creating a tight 402 retry loop.
 */
export const CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS = 30 * 60;

/**
 * Ordered [regex, class] rules for REST endpoint paths. First match wins.
 * The default (no match) is C1 — cheap foundational data.
 */
const ENDPOINT_RULES: Array<[RegExp, MeteringClass]> = [
  // Pure caller-supplied diagnostic: no feed RPC or signing.
  [/^\/api\/v1\/rwa\/assessment$/, 'C1'],
  // Cached first-party issuer context with optional read-only on-chain check.
  [/^\/api\/v1\/rwa\/robinhood\/context$/, 'C1'],
  // Pinned identity registry plus the same issuer-context cross-check.
  [/^\/api\/v1\/rwa\/robinhood\/instrument$/, 'C1'],
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
  [/\/(?:feed-health|feeds\/freshness|oracles\/health|stablecoins|wrapped-assets)(?:\/|$)/, 'C2'],
  [/\/protocol-health(?:\/|$)/, 'C2'],
  [/\/price-snapshots(?:\/|$)/, 'C2'],
  // Protocol-level deep analysis (matches the MCP C2 tool pricing for the
  // same data): risk params, oracle exposure, cross-chain spreads.
  [/(?:risk-params|oracle-exposure|spreads)(?:\/|$)/, 'C2'],
  // Per-feed health (matches MCP get_feed_health, which is C2).
  [/\/feeds\/[^/]+\/health(?:\/|$)/, 'C2'],
];

/**
 * Ordered [predicate, class] rules for MCP tool names. Uses regex-safe tool
 * names like `pre_trade_safety_check` and `get_risk_summary`. Default is C1.
 */
const TOOL_RULES: Array<[RegExp, MeteringClass]> = [
  [/^assess_rwa_evidence$/, 'C1'],
  [/^get_robinhood_rwa_context$/, 'C1'],
  [/^get_robinhood_rwa_instrument$/, 'C1'],
  // C4 — receipts / verification.
  [/agent_begin_trade|execution|receipt|verify_execution|verify_pair/, 'C4'],

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
