/**
 * Product-priced endpoint billing tests.
 *
 * The monitored window is the first non-per-call product: its begin path must
 * charge the converted product price, never a C1..C4 class price, and every
 * other path must keep its class price unchanged.
 */

import { CREDIT_COST, getCreditCost, getToolCreditCost } from '../metering';
import {
  ORACLE_WATCH_WINDOW_BEGIN_PATH,
  ORACLE_WATCH_WINDOW_CREDIT_COST,
  ORACLE_WATCH_WINDOW_PLAN,
} from '../oracleWatchWindow';
import { USD_PER_CREDIT, usdToCredits } from '../plans';
import {
  POSITION_LIFECYCLE_BEGIN_PATH,
  POSITION_LIFECYCLE_CREDIT_COST,
  POSITION_LIFECYCLE_PLAN,
} from '../positionLifecycle';
import {
  getEndpointCreditCost,
  getMcpToolCreditCost,
  isEntitlementCoveredMcpTool,
  PRODUCT_ENDPOINT_CREDIT_COSTS,
  PRODUCT_MCP_TOOL_CREDIT_COSTS,
} from '../productPricing';

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

  it('charges the lifecycle purchase its product price as well', () => {
    expect(getEndpointCreditCost(POSITION_LIFECYCLE_BEGIN_PATH)).toBe(138);
    expect(getCreditCost(POSITION_LIFECYCLE_BEGIN_PATH)).toBe(CREDIT_COST.C3);
    expect(PRODUCT_ENDPOINT_CREDIT_COSTS[POSITION_LIFECYCLE_BEGIN_PATH]).toBeDefined();
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

describe('position lifecycle plan', () => {
  it('converts its USD list price at the canonical credit rate', () => {
    expect(usdToCredits(POSITION_LIFECYCLE_PLAN.priceUsd)).toBe(138);
    expect(POSITION_LIFECYCLE_CREDIT_COST).toBe(138);
  });
});

describe('getMcpToolCreditCost', () => {
  it('charges the begin tools their product price, not a class price', () => {
    expect(getMcpToolCreditCost('oracle_watch_window_begin')).toBe(125);
    expect(getMcpToolCreditCost('position_lifecycle_begin')).toBe(138);
    // Sanity: without the product registry the names would fall through to the
    // oracle_watch / lifecycle-ish class rules — the bug this layer prevents.
    expect(getToolCreditCost('oracle_watch_window_begin')).toBe(CREDIT_COST.C3);
    expect(PRODUCT_MCP_TOOL_CREDIT_COSTS['oracle_watch_window_begin']).toBeDefined();
    expect(PRODUCT_MCP_TOOL_CREDIT_COSTS['position_lifecycle_begin']).toBeDefined();
  });

  it('marks every in-window tool as covered by the purchase (0 credits)', () => {
    for (const tool of [
      'oracle_watch_window_poll',
      'oracle_watch_window_close',
      'position_lifecycle_guard',
      'position_lifecycle_receipt',
      'position_lifecycle_close',
    ]) {
      expect(getMcpToolCreditCost(tool)).toBe(0);
      expect(isEntitlementCoveredMcpTool(tool)).toBe(true);
    }
    // The begin tools themselves are paid purchases, not entitlement-covered.
    expect(isEntitlementCoveredMcpTool('oracle_watch_window_begin')).toBe(false);
    expect(isEntitlementCoveredMcpTool('position_lifecycle_begin')).toBe(false);
  });

  it('leaves every other tool on its per-call class price', () => {
    expect(getMcpToolCreditCost('oracle_watch')).toBe(CREDIT_COST.C3);
    expect(getMcpToolCreditCost('get_symbols')).toBe(CREDIT_COST.C1);
    expect(getMcpToolCreditCost('execution_receipt')).toBe(CREDIT_COST.C4);
    expect(isEntitlementCoveredMcpTool('oracle_watch')).toBe(false);
  });
});
