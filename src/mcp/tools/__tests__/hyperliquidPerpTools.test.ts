import { getToolCreditCost } from '@/lib/billing/metering';

import {
  prepareHyperliquidPerpOrderTool,
  verifyHyperliquidPerpExecutionTool,
} from '../hyperliquidPerpTools';
import { getToolDefinitions } from '../index';

const preflight = {
  market: 'BTC',
  side: 'buy',
  size: '0.01',
  limitPrice: '100000',
  reduceOnly: false,
  clientOrderId: '0x1234567890abcdef1234567890abcdef',
  maxNotionalUsd: 2000,
  maxPriceImpactBps: 50,
  maxMarkOracleDeviationBps: 50,
};

describe('Hyperliquid order MCP tools', () => {
  it('registers validated user-side preflight and observed execution tools with x402 classes', () => {
    expect(getToolDefinitions().map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'prepare_hyperliquid_perp_order',
        'verify_hyperliquid_perp_execution',
      ])
    );
    expect(prepareHyperliquidPerpOrderTool.parameters.safeParse(preflight).success).toBe(true);
    expect(
      prepareHyperliquidPerpOrderTool.parameters.safeParse({ ...preflight, clientOrderId: 'nope' })
        .success
    ).toBe(false);
    expect(
      verifyHyperliquidPerpExecutionTool.parameters.safeParse({
        user: '0x1111111111111111111111111111111111111111',
        orderId: preflight.clientOrderId,
        submittedAt: '2026-10-25T00:00:00.000Z',
        expectedOrder: {
          market: preflight.market,
          side: preflight.side,
          size: preflight.size,
          limitPrice: preflight.limitPrice,
          reduceOnly: preflight.reduceOnly,
          clientOrderId: preflight.clientOrderId,
        },
      }).success
    ).toBe(true);
    expect(getToolCreditCost('prepare_hyperliquid_perp_order')).toBe(5);
    expect(getToolCreditCost('verify_hyperliquid_perp_execution')).toBe(10);
  });
});
