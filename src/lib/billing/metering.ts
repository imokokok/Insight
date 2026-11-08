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
 *   C1 (2cr)    — foundational, cached data (prices, listings, reports)
 *   C2 (4cr)    — deep aggregation / analysis
 *   C3 (20cr)   — agent gating (pre-trade, oracle-watch)
 *   C4 (40cr)   — attested proofs & receipts (RPC read + KMS signing)
 *
 * One credit is $0.001 after the 2026-11 rebase. The USD list prices are
 * unchanged: C1 $0.002, C2 $0.004, C3 $0.02, C4 $0.04.
 */

export type MeteringClass = 'C1' | 'C2' | 'C3' | 'C4';

/** Credits charged per call for each metering class. */
export const CREDIT_COST: Record<MeteringClass, number> = {
  C1: 2,
  C2: 4,
  C3: 20,
  C4: 40,
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
 * "≈25,000 deep-analysis calls or ≈5,000 pre-trade checks".
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
  // Approved price-tier alignment: every member of a unified tool must share
  // one class, otherwise the tools could not be merged. Legacy names map to
  // the same class as the unified tool that now covers them.
  [/^get_price_history$/, 'C2'],
  [/^get_daily_report$/, 'C2'],
  [/^get_metrics$/, 'C2'],
  [/^get_reputation_rankings$/, 'C2'],
  [/^get_provider_reputation$/, 'C2'],
  [/^get_protocol_risk_params$/, 'C1'],
  [/^get_stablecoin_list$/, 'C1'],
  // Attested proof / receipt (C4): only the hyperliquid_perp verification
  // needs a live upstream read. The three offline kinds are zero-priced by
  // design (see freeVerify.ts) and never reach this class price.
  [/^verify_evidence$/, 'C4'],
  [/^verify_hyperliquid_perp_execution$/, 'C4'],

  // Consolidated 16-tool surface. Explicit rules keep each unified tool at its
  // documented class regardless of later broad-regex changes.
  [/^get_price_analytics$/, 'C2'],
  [/^search_oracle_registry$/, 'C1'],
  [/^check_trade_safety$/, 'C3'],
  [/^prepare_swap$/, 'C3'],
  [/^prepare_perp_order$/, 'C3'],
  [/^begin_trade_evidence$/, 'C4'],
  [/^get_robinhood_rwa_context$/, 'C1'],
  [/^get_robinhood_rwa_instrument$/, 'C1'],
  // Block-pinned, single-market evidence — foundational data, not a safety gate.
  [/^get_monad_dex_market$/, 'C1'],
  [/^get_hanji_monad_market$/, 'C1'],
  [/^get_base_dex_market$/, 'C1'],
  [/^get_base_dex_venue_integrations$/, 'C1'],
  [/^get_aerodrome_slipstream_market$/, 'C1'],
  [/^prepare_aerodrome_slipstream_swap$/, 'C3'],
  [/^prepare_base_agent_swap_guard$/, 'C3'],
  [/^solana_swap_guard$/, 'C3'],
  // Post-settlement guard closure / verification — C4 evidence artifacts.
  [/^settle_base_agent_swap_guard$/, 'C4'],
  [/^verify_base_agent_swap_guard_settlement$/, 'C4'],
  [/^settle_solana_swap_guard$/, 'C4'],
  [/^verify_solana_swap_guard_settlement$/, 'C4'],
  [/^get_pancakeswap_v3_market$/, 'C1'],
  [/^prepare_pancakeswap_v3_swap$/, 'C3'],
  [/^get_quickswap_v2_market$/, 'C1'],
  [/^get_solana_dex_route$/, 'C1'],
  [/^get_hyperliquid_perp_market$/, 'C1'],
  // A locally signed order gate: it reads fresh venue state and refuses unsafe
  // or non-executable intents, but never signs/submits an order itself.
  [/^prepare_hyperliquid_perp_order$/, 'C3'],
  // Hyperliquid perp decision gates: assessment plus exact-envelope binding.
  [/^hyperliquid_perp_guard(_exact_call)?$/, 'C3'],
  // BNB/Solana perp decision gates: venue and on-chain evidence assessment.
  [/^(?:bnb|solana)_perp_guard$/, 'C3'],
  // A decision gate, not an execution receipt: must precede the broad C4
  // `execution` matcher below.
  [/^execution_preflight$/, 'C3'],
  // C4 — receipts / verification.
  [/agent_begin_trade|execution|receipt|verify_execution|verify_pair/, 'C4'],

  // C3 — agent gates.
  [
    /pre_trade|oracle_watch|position_safety|liquidation|(?:base|monad|solana|multichain_evm)_lending_guard|base_perp_guard|loopscale_vault_deposit/,
    'C3',
  ],

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

/**
 * Maximum items a single batch call may bill. The public request schemas are
 * the contract and cap a batch at 20 queries (`BatchPriceJsonSchema`,
 * `batchPriceService`, the MCP batch tool); billing uses the same number so a
 * caller can never be charged for more items than the API accepts.
 */
const MAX_BILLABLE_ITEMS = 20;

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function clampItems(count: number): number {
  return Math.min(MAX_BILLABLE_ITEMS, Math.max(1, count));
}

/**
 * Billable item count for one MCP tool call. Batch tools charge per requested
 * item instead of a flat per-call price; every other tool is one item. A
 * structurally invalid request still prechecks as one item — the tool handler
 * rejects it before any charge is applied.
 */
function isPriceAnalyticsBatch(toolName: string, record: Record<string, unknown>): boolean {
  return (
    toolName === 'get_price_analytics' ||
    (toolName === 'trade_guard' && record.op === 'price_analytics')
  );
}

export function getMcpToolBillableItems(toolName: string, args?: unknown): number {
  if (args === null || typeof args !== 'object') return 1;
  const record = args as Record<string, unknown>;

  if (isPriceAnalyticsBatch(toolName, record) && record.mode === 'batch') {
    const count = arrayLength(record.assets);
    return count > 0 ? clampItems(count) : 1;
  }

  if (toolName === 'get_oracle_prices_batch') {
    const count = arrayLength(record.queries);
    return count > 0 ? clampItems(count) : 1;
  }

  return 1;
}

/** REST paths billed per requested item rather than per call. */
export const REST_BATCH_METERED_PATHS: ReadonlySet<string> = new Set(['/api/v1/prices/batch']);

/**
 * Billable item count for a REST request. Only batch paths scale; all other
 * endpoints are one item, matching their per-call class price.
 */
export function getRestBillableItems(path: string, body?: unknown): number {
  if (!REST_BATCH_METERED_PATHS.has(path)) return 1;
  if (body === null || typeof body !== 'object') return 1;
  const queries = (body as Record<string, unknown>).queries;
  return Array.isArray(queries) && queries.length > 0 ? clampItems(queries.length) : 1;
}

/** True when this tool call is a batch call priced per requested item. */
export function isMcpBatchCall(toolName: string, args?: unknown): boolean {
  if (toolName === 'get_oracle_prices_batch') return true;
  if (args !== null && typeof args === 'object') {
    if (isPriceAnalyticsBatch(toolName, args as Record<string, unknown>)) {
      return (args as Record<string, unknown>).mode === 'batch';
    }
  }
  return false;
}

/**
 * Count the successful items a batch tool actually returned. Both batch tools
 * render one `- ` line per successful item under `**Successful:**` and put
 * failures under `**Failures:**`. Returns null for non-batch calls or an
 * unrecognized payload, in which case the caller keeps the requested count.
 */
export function countMcpBatchSuccessItems(
  toolName: string,
  args: unknown,
  resultText: string
): number | null {
  if (!isMcpBatchCall(toolName, args)) return null;
  const marker = '**Successful:**';
  const markerIndex = resultText.indexOf(marker);
  if (markerIndex === -1) return null;
  const successSection = resultText.slice(markerIndex + marker.length).split('**Failures:**')[0];
  const successes = successSection.split('\n').filter((line) => /^-\s/.test(line.trim())).length;
  // Unlike clampItems, 0 is meaningful here: every item failed → bill nothing.
  return Math.min(MAX_BILLABLE_ITEMS, successes);
}

/**
 * Batch billing unit: the C1 price (2 credits) per successful item. The old
 * flat C2 charge made a 500-item batch cost the same as one call; the review
 * fixed that arbitrage at the C1 per-item rate.
 */
export const BATCH_UNIT_CREDITS = 2;

/**
 * Credits for a batch call: per successful item, with the batch class price
 * (one item) as the per-request floor. A partial success bills only the items
 * that returned usable data; zero successful items bills nothing. Because the
 * batch class price is never below the single-call C1 price, forcing callers
 * to split a batch into one-item requests cannot undercut the floor.
 */
export function batchChargeCredits(unitCost: number, successfulItems: number): number {
  if (successfulItems <= 0) return 0;
  return unitCost * Math.max(1, successfulItems);
}
