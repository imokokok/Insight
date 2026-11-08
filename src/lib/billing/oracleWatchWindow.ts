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
 * Pricing rationale: the window is priced at $0.50 and allows 48 polls (one
 * per 30 minutes across 24 h). A per-call C3 x402 list price is $0.02, so the
 * window is cheaper than ~26 call-priced snapshots while keeping upstream cost
 * bounded. A refresh reads at most 6 providers unless the signal jumps.
 * Credit buyers pay the same value converted at {@link usdToCredits}.
 *
 * Scope note: the platform signal snapshot is cached for 35 minutes, longer
 * than the 30-minute minimum poll interval so a boundary poll does not miss.
 * Every response carries `evaluatedAt` so a buyer can tell when the snapshot
 * was computed instead of silently receiving an old value.
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
  /** Maximum signal polls per window (one per 30 minutes across 24 h). */
  pollCap: 48,
  /** Minimum seconds between two polls of the same window (30 minutes). */
  minPollIntervalSeconds: 1800,
} as const;

/** Credit cost of one monitored window for API-key (wallet) buyers. */
export const ORACLE_WATCH_WINDOW_CREDIT_COST: number = usdToCredits(
  ORACLE_WATCH_WINDOW_PLAN.priceUsd
);

/** Exact x402 route that sells the window (POST). */
export const ORACLE_WATCH_WINDOW_BEGIN_PATH = '/api/v1/safety/oracle-watch-window';
