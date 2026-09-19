import { PreTradeQuerySchema } from '../querySchema';

const base = {
  asset: 'ETH',
  chainId: '1',
  action: 'swap',
  tradeAmountUsd: '1000',
};

describe('PreTradeQuerySchema targetProviders', () => {
  it('accepts an explicit HTTP schema string and bounded baseline metadata', () => {
    expect(
      PreTradeQuerySchema.parse({
        ...base,
        schemaVersion: '3',
        workflowTag: 'treasury.swap',
        baselineVerdict: 'allow',
        baselineVersion: 'v7',
      })
    ).toMatchObject({ schemaVersion: 3, workflowTag: 'treasury.swap', baselineVerdict: 'allow' });
  });

  it('rejects unsupported schemas and unsafe workflow tags', () => {
    expect(() => PreTradeQuerySchema.parse({ ...base, schemaVersion: '4' })).toThrow();
    expect(() => PreTradeQuerySchema.parse({ ...base, workflowTag: 'account/<script>' })).toThrow();
    expect(() => PreTradeQuerySchema.parse({ ...base, baselineVerdict: 'safe_forever' })).toThrow();
  });

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
