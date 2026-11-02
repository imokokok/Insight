/**
 * Product-priced endpoint billing tests.
 *
 * The monitored window is the first non-per-call product: its begin path must
 * charge the converted product price, never a C1..C4 class price, and every
 * other path must keep its class price unchanged.
 */

import { CREDIT_COST, getCreditCost } from '../metering';
import {
  ORACLE_WATCH_WINDOW_BEGIN_PATH,
  ORACLE_WATCH_WINDOW_CREDIT_COST,
  ORACLE_WATCH_WINDOW_PLAN,
} from '../oracleWatchWindow';
import { USD_PER_CREDIT, usdToCredits } from '../plans';
import { getEndpointCreditCost, PRODUCT_ENDPOINT_CREDIT_COSTS } from '../productPricing';

describe('oracle watch window plan', () => {
  it('converts its USD list price at the canonical credit rate', () => {
    expect(USD_PER_CREDIT).toBe(0.004);
    expect(usdToCredits(ORACLE_WATCH_WINDOW_PLAN.priceUsd)).toBe(125);
    expect(ORACLE_WATCH_WINDOW_CREDIT_COST).toBe(125);
  });
});

describe('getEndpointCreditCost', () => {
  it('charges the window purchase its product price, not a class price', () => {
    expect(getEndpointCreditCost(ORACLE_WATCH_WINDOW_BEGIN_PATH)).toBe(125);
    // Sanity: without the product registry the same path would fall through to
    // the /safety/ C3 rule — the bug this layer exists to prevent.
    expect(getCreditCost(ORACLE_WATCH_WINDOW_BEGIN_PATH)).toBe(CREDIT_COST.C3);
    expect(PRODUCT_ENDPOINT_CREDIT_COSTS[ORACLE_WATCH_WINDOW_BEGIN_PATH]).toBeDefined();
  });

  it('prices the dynamic poll/close paths as ordinary per-call class costs', () => {
    const pollPath = `${ORACLE_WATCH_WINDOW_BEGIN_PATH}/11111111-1111-4111-8111-111111111111`;
    expect(getEndpointCreditCost(pollPath)).toBe(CREDIT_COST.C3);
  });

  it('leaves every other endpoint on its per-call class price', () => {
    expect(getEndpointCreditCost('/api/v1/safety/pre-trade')).toBe(CREDIT_COST.C3);
    expect(getEndpointCreditCost('/api/v1/deviation')).toBe(CREDIT_COST.C2);
    expect(getEndpointCreditCost('/api/v1/protocols')).toBe(CREDIT_COST.C1);
  });
});
