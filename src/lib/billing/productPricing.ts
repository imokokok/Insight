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

import { getCreditCost } from './metering';
import {
  ORACLE_WATCH_WINDOW_BEGIN_PATH,
  ORACLE_WATCH_WINDOW_CREDIT_COST,
} from './oracleWatchWindow';
import { POSITION_LIFECYCLE_BEGIN_PATH, POSITION_LIFECYCLE_CREDIT_COST } from './positionLifecycle';

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
