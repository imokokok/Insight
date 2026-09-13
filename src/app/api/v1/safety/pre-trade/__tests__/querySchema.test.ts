import { PreTradeQuerySchema } from '../querySchema';

const base = {
  asset: 'ETH',
  chainId: '1',
  action: 'swap',
  tradeAmountUsd: '1000',
};

describe('PreTradeQuerySchema targetProviders', () => {
  it('normalizes and validates every comma-separated provider', () => {
    const parsed = PreTradeQuerySchema.parse({
      ...base,
      targetProviders: 'chainlink, API3',
    });
    expect(parsed.targetProviders).toEqual(['chainlink', 'api3']);
  });

  it.each(['unknown-provider', 'chainlink,unknown-provider', ''])('%s fails closed', (value) => {
    expect(() => PreTradeQuerySchema.parse({ ...base, targetProviders: value })).toThrow();
  });
});
