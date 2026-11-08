/**
 * @fileoverview Position Lifecycle Bundle (24h) — the second non-per-call
 * product, and the first that bundles multiple capability classes.
 *
 * One purchase covers 24 h of lifecycle coverage for ONE (symbol, chain)
 * position subject: an embedded Oracle Watch monitored window (the C1 product
 * machinery, reused verbatim), 4 bundled guard assessments across any of the
 * six position-guard families, and one bundled attested execution receipt.
 * This is the roadmap C2 answer to "four separate calls per position".
 *
 * Pricing rationale: buying the pieces separately costs 620 credits on the
 * API-key rail (500 window + 4 × 20 guard + 40 receipt) or $0.60 across x402
 * settlements ($0.50 window + 4 × $0.02 + $0.02). The bundle is priced at
 * $0.55 (550 credits at the canonical {@link usdToCredits} rate) — ~11% below
 * à la carte on both rails, and only $0.05 above the window alone.
 *
 * Scope note: bundled guard calls are assessment-only. Exact-call decision
 * binding (e.g. the Hyperliquid perp exact-order envelope) stays on the native
 * guard routes; the bundle sells the verdicts that gate entry/exit/management,
 * the watch that runs while the position is held, and the receipt that records
 * the exit.
 */

import { usdToCredits } from './plans';

/** The guard families a bundled assessment may target, chosen per call. */
export const POSITION_LIFECYCLE_GUARD_FAMILIES = [
  'base_perp',
  'hyperliquid_perp',
  'bnb_perp',
  'base_lending',
  'monad_lending',
  'multichain_evm_lending',
  'solana_lending',
  'solana_perp',
] as const;

export type PositionLifecycleGuardFamily = (typeof POSITION_LIFECYCLE_GUARD_FAMILIES)[number];

export const POSITION_LIFECYCLE_PLAN = {
  /** Stable product id used in receipts and catalog copy. */
  id: 'position-lifecycle-24h',
  name: 'Position Lifecycle Bundle (24h)',
  /** Coverage duration per purchase. */
  durationHours: 24,
  /** x402 list price in USD for one lifecycle. */
  priceUsd: 0.55,
  /** Bundled guard assessments across any families (entry, recheck, exit, spare). */
  guardBudget: 4,
  /** Bundled attested execution receipt issuances. */
  receiptBudget: 1,
} as const;

/** Credit cost of one lifecycle for API-key (wallet) buyers. */
export const POSITION_LIFECYCLE_CREDIT_COST: number = usdToCredits(
  POSITION_LIFECYCLE_PLAN.priceUsd
);

/** Exact x402 route that sells the lifecycle (POST). */
export const POSITION_LIFECYCLE_BEGIN_PATH = '/api/v1/safety/position-lifecycle';
