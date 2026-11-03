/**
 * @fileoverview Oracle Watch monitored-window plan — the first non-per-call
 * product.
 *
 * A monitored window pre-pays continuous Oracle Watch coverage for ONE
 * (symbol, chain) subject for a fixed duration. Within the window the buyer
 * polls the current halt/proceed signal as often as the plan allows at no
 * per-call charge; only the initial purchase is metered (x402 USDC for keyless
 * agents, credits for API-key users). This contrasts with the per-call `C3`
 * cost every standalone oracle-watch call pays (see ./metering.ts).
 *
 * Pricing rationale: a per-call C3 x402 list price is $0.02. A position-holding
 * agent gating a 24 h strategy on 15-minute snapshots issues ~96 calls
 * (~$1.92/call-priced). The window is priced at $0.50 — cheaper than ~26 C3
 * calls — while capping abuse with a poll budget and a minimum poll interval.
 * Credit buyers pay the same value converted at {@link usdToCredits}.
 *
 * Scope note: data freshness is bounded by the platform snapshot cadence
 * (~15 minutes, see ./plans.ts); polling faster than the minimum interval
 * cannot observe a fresher signal.
 */

import { usdToCredits } from './plans';

export const ORACLE_WATCH_WINDOW_PLAN = {
  /** Stable product id used in receipts and catalog copy. */
  id: 'oracle-watch-window-24h',
  name: 'Oracle Watch Monitored Window (24h)',
  /** Coverage duration per purchase. */
  durationHours: 24,
  /** x402 list price in USD for one window. */
  priceUsd: 0.5,
  /** Maximum signal polls per window (≈ one per 5 minutes across 24 h). */
  pollCap: 300,
  /** Minimum seconds between two polls of the same window. */
  minPollIntervalSeconds: 30,
} as const;

/** Credit cost of one monitored window for API-key (wallet) buyers. */
export const ORACLE_WATCH_WINDOW_CREDIT_COST: number = usdToCredits(
  ORACLE_WATCH_WINDOW_PLAN.priceUsd
);

/** Exact x402 route that sells the window (POST). */
export const ORACLE_WATCH_WINDOW_BEGIN_PATH = '/api/v1/safety/oracle-watch-window';
