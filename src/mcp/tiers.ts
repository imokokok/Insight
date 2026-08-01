/**
 * @fileoverview Shared MCP tool tier definitions
 *
 * Each MCP tool is mapped to a minimum required plan that mirrors the access
 * tier of its REST API counterpart — so the same data is gated identically
 * whether a client calls the REST endpoint or the MCP tool. This closes the
 * previous loophole where MCP tools exposed Tier 2/3 data to Free API keys
 * while the REST API required a paid plan.
 *
 * Tier ladder (mirrors REST planGuard):
 *   - 'free'      : Tier 1 — public data (current prices, listings, rankings, reports)
 *   - 'pro'       : Tier 2 — deep analysis (REST `planGuard: true`, minPlan 'pro').
 *                   Free keys with an active Pro trial also pass.
 *   - 'protocol'  : Tier 3 — protocol-level intelligence (REST
 *                   `planGuard: { minPlan: 'protocol' }`). Hard gate, no trial.
 *
 * This file is imported by BOTH the server-side MCP middleware
 * (`src/mcp/middleware.ts`) and the client-side MCP page UI
 * (`src/app/mcp/components/McpPlayground.tsx`), so the playground can badge
 * gated tools without duplicating the list. Keep this file free of any
 * server-only imports.
 */

type McpToolTier = 'free' | 'pro' | 'protocol';

/**
 * Maps each non-free MCP tool to its minimum required plan. Tools not listed
 * here default to 'free' (see {@link getToolTier}). Aligns 1:1 with the REST
 * API's planGuard tiers — see the Data Access Tier Matrix on the /api page.
 */
const MCP_TOOL_TIERS: Record<string, McpToolTier> = {
  // ----- Tier 3 — protocol-level intelligence (REST minPlan: 'protocol') -----
  get_protocol_oracle_exposure: 'protocol',
  get_cross_chain_spreads: 'protocol',
  get_incidents: 'protocol',
  get_coverage: 'protocol',

  // ----- Tier 2 — deep analysis (REST planGuard: true, minPlan: 'pro') -----
  get_consensus_price: 'pro',
  get_oracle_health: 'pro',
  check_liquidation_risk: 'pro',
  get_stablecoin_peg: 'pro',
  get_wrapped_asset_peg: 'pro',
  get_protocol_risk_params: 'pro',
  get_feed_freshness: 'pro',
  get_feed_health: 'pro',
  get_feed_uptime: 'pro',
  get_latency: 'pro',
  get_anomalies: 'pro',
  get_risk_summary: 'pro',
  get_correlation: 'pro',
  compare_oracle_deviation: 'pro',
  get_oracle_prices_batch: 'pro',
  get_price_history: 'pro',
  check_position_safety: 'pro',
  pre_trade_safety_check: 'pro',
};

/** Minimum plan required to call a tool via an API key. Defaults to 'free'. */
export function getToolTier(name: string): McpToolTier {
  return MCP_TOOL_TIERS[name] ?? 'free';
}

const TIER_LABELS: Record<McpToolTier, string> = {
  free: '',
  pro: 'Pro',
  protocol: 'Protocol',
};

/** Human-readable badge suffix, e.g. `get_risk_summary` → ' (Pro)'. Empty for free. */
export function getToolTierLabel(name: string): string {
  const label = TIER_LABELS[getToolTier(name)];
  return label ? ` (${label})` : '';
}
