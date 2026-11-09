/**
 * Position Lifecycle Bundle product billing tests.
 *
 * The bundle is the second non-per-call product: its begin path must charge
 * the converted bundle price, never a C1..C4 class price, and the price must
 * stay below the sum of its à-la-carte parts (window + 4 guards + receipt).
 */

import { CREDIT_COST, getCreditCost } from '../metering';
import { ORACLE_WATCH_WINDOW_CREDIT_COST, ORACLE_WATCH_WINDOW_PLAN } from '../oracleWatchWindow';
import { USD_PER_CREDIT, usdToCredits } from '../plans';
import {
  POSITION_LIFECYCLE_BEGIN_PATH,
  POSITION_LIFECYCLE_CREDIT_COST,
  POSITION_LIFECYCLE_GUARD_FAMILIES,
  POSITION_LIFECYCLE_PLAN,
} from '../positionLifecycle';
import { getEndpointCreditCost, PRODUCT_ENDPOINT_CREDIT_COSTS } from '../productPricing';

describe('position lifecycle plan', () => {
  it('converts its USD list price at the canonical credit rate', () => {
    expect(USD_PER_CREDIT).toBe(0.001);
    expect(usdToCredits(POSITION_LIFECYCLE_PLAN.priceUsd)).toBe(550);
    expect(POSITION_LIFECYCLE_CREDIT_COST).toBe(550);
  });

  it('is cheaper than buying the bundled coverage à la carte on both rails', () => {
    // Credits: window (500) + 4 guard assessments (4 × C3) + 1 receipt (C4).
    const aLaCarteCredits = ORACLE_WATCH_WINDOW_CREDIT_COST + 4 * CREDIT_COST.C3 + CREDIT_COST.C4;
    expect(aLaCarteCredits).toBe(620);
    expect(POSITION_LIFECYCLE_CREDIT_COST).toBeLessThan(aLaCarteCredits);

    // x402: the flat per-call REST price applies to the guard/receipt calls;
    // the window is its own product price.
    const flatPerCallUsd = 0.02;
    const aLaCarteUsd = ORACLE_WATCH_WINDOW_PLAN.priceUsd + 4 * flatPerCallUsd + flatPerCallUsd;
    expect(aLaCarteUsd).toBeCloseTo(0.6, 10);
    expect(POSITION_LIFECYCLE_PLAN.priceUsd).toBeLessThan(aLaCarteUsd);
  });

  it('covers the nine position-guard families with a bounded budget', () => {
    expect(POSITION_LIFECYCLE_GUARD_FAMILIES).toEqual([
      'base_perp',
      'hyperliquid_perp',
      'bnb_perp',
      'base_lending',
      'monad_lending',
      'hyperevm_lending',
      'multichain_evm_lending',
      'solana_lending',
      'solana_perp',
    ]);
    expect(POSITION_LIFECYCLE_PLAN.guardBudget).toBe(4);
    expect(POSITION_LIFECYCLE_PLAN.receiptBudget).toBe(1);
    expect(POSITION_LIFECYCLE_PLAN.durationHours).toBe(24);
  });
});

describe('getEndpointCreditCost for the bundle', () => {
  it('charges the bundle purchase its product price, not a class price', () => {
    expect(getEndpointCreditCost(POSITION_LIFECYCLE_BEGIN_PATH)).toBe(550);
    // Sanity: without the product registry the same path would fall through to
    // the /safety/ C3 rule.
    expect(getCreditCost(POSITION_LIFECYCLE_BEGIN_PATH)).toBe(CREDIT_COST.C3);
    expect(PRODUCT_ENDPOINT_CREDIT_COSTS[POSITION_LIFECYCLE_BEGIN_PATH]).toBeDefined();
  });

  it('prices dynamic subresource paths as ordinary per-call class costs', () => {
    const guardPath = `${POSITION_LIFECYCLE_BEGIN_PATH}/22222222-2222-4222-8222-222222222222/guard`;
    expect(getEndpointCreditCost(guardPath)).toBe(CREDIT_COST.C3);
  });
});
