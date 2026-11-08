/**
 * @fileoverview Oracle Config Snapshot plan.
 *
 * One settlement buys ONE self-contained, signed historical record of a
 * configuration and its independent-source state. Unlike a per-call C3 gate,
 * the deliverable is meant to be kept by the buyer and verified offline later,
 * so it is priced as a record rather than as a $0.02 signal.
 *
 * This uses the repository's existing plan + credit dual rail (see ./plans.ts).
 * A true monthly subscription does not exist in this codebase; introducing one
 * is a separate billing-system change and is deliberately NOT faked here.
 */

import { usdToCredits } from './plans';

export const ORACLE_CONFIG_SNAPSHOT_PLAN = {
  /** Stable product id used in receipts and catalog copy. */
  id: 'oracle-config-snapshot-v1',
  name: 'Oracle Config Snapshot (signed record)',
  /** x402 list price in USD for one signed snapshot. */
  priceUsd: 0.5,
  /** Idempotency window for an identical (config, bucket) request. */
  idempotencyWindowSeconds: 3600,
} as const;

/** Credit cost for API-key (wallet) buyers. */
export const ORACLE_CONFIG_SNAPSHOT_CREDIT_COST: number = usdToCredits(
  ORACLE_CONFIG_SNAPSHOT_PLAN.priceUsd
);

/** Exact x402 route that sells the signed record (POST). */
export const ORACLE_CONFIG_SNAPSHOT_PATH = '/api/v1/oracle-config/snapshot';
