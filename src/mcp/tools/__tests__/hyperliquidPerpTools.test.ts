import { getToolCreditCost } from '@/lib/billing/metering';
import { verifyHyperliquidPerpExecution } from '@/lib/dex/hyperliquidPerpExecution';

import {
  prepareHyperliquidPerpOrderTool,
  verifyHyperliquidPerpExecutionTool,
} from '../hyperliquidPerpTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/dex/hyperliquidPerpExecution', () => ({
  verifyHyperliquidPerpExecution: jest.fn(),
}));

const mockedVerify = verifyHyperliquidPerpExecution as jest.MockedFunction<
  typeof verifyHyperliquidPerpExecution
>;

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
  beforeEach(() => jest.clearAllMocks());

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

  it('routes venue observation through the common adapter and keeps its native evidence', async () => {
    mockedVerify.mockResolvedValue({
      schema: 'insight.hyperliquid-perp-execution-observation.v1',
      observedAt: '2026-10-31T00:00:00.000Z',
      order: { known: false },
      caveats: [],
    } as never);
    const request = {
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
    } as const;

    const output = JSON.parse(await verifyHyperliquidPerpExecutionTool.handler(request));

    expect(mockedVerify).toHaveBeenCalledWith(request);
    expect(output).toMatchObject({
      schema: 'insight.hyperliquid-perp-execution-observation.v1',
      order: { known: false },
    });
  });
});
