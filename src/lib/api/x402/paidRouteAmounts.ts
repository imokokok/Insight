/**
 * Per-route paid-REST amount overrides. Single source of truth for the
 * "this route is NOT priced at the configured per-call amount" bindings,
 * shared by the resource-server route configs and the discovery manifest so
 * a plan-price change propagates to both surfaces by construction.
 */
import { POSITION_LIFECYCLE_PLAN } from '@/lib/billing/positionLifecycle';
import { ORACLE_WATCH_WINDOW_PLAN } from '@/lib/billing/oracleWatchWindow';

import { usdToAtomicUnits, X402_ORACLE_WATCH_WINDOW_ROUTE, X402_POSITION_LIFECYCLE_ROUTE } from './config';

/**
 * The atomic-USDC amount override for a paid REST route, or null when the
 * route quotes the configured per-call amount.
 */
export function paidRestRouteAmountOverride(path: string): string | null {
  if (path === X402_ORACLE_WATCH_WINDOW_ROUTE) {
    return usdToAtomicUnits(ORACLE_WATCH_WINDOW_PLAN.priceUsd);
  }
  if (path === X402_POSITION_LIFECYCLE_ROUTE) {
    return usdToAtomicUnits(POSITION_LIFECYCLE_PLAN.priceUsd);
  }
  return null;
}
