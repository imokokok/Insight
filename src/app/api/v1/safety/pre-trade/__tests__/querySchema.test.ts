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

  it('accepts the complete opt-in decision-input check with explicit policy bounds', () => {
    const parsed = PreTradeQuerySchema.parse({
      ...base,
      decisionInputCheck: '1',
      decisionPriceUsd: '2500',
      quotePriceUsd: '2501',
      quoteObservedAt: '2026-10-13T06:00:00.000Z',
      maxReferenceDeviationBps: '50',
      maxSlippageBps: '75',
      maxQuoteAgeSeconds: '30',
    });

    expect(parsed).toMatchObject({
      decisionInputCheck: '1',
      decisionPriceUsd: 2500,
      quotePriceUsd: 2501,
      maxReferenceDeviationBps: 50,
      maxSlippageBps: 75,
      maxQuoteAgeSeconds: 30,
    });
  });

  it('accepts a hash-only quote provenance envelope but rejects malformed JSON', () => {
    const parsed = PreTradeQuerySchema.parse({
      ...base,
      decisionInputCheck: '1',
      decisionPriceUsd: '2500',
      quotePriceUsd: '2501',
      quoteObservedAt: '2026-10-13T06:00:00.000Z',
      maxReferenceDeviationBps: '50',
      maxSlippageBps: '75',
      maxQuoteAgeSeconds: '30',
      requireQuoteProvenance: '1',
      quoteProvenance: JSON.stringify({
        schemaVersion: 1,
        sourceId: 'customer-broker',
        rightsScope: 'customer-authorized',
        captureMethod: 'client-held',
        asset: 'ETH',
        chainId: 1,
        quotePriceUsd: 2501,
        observedAt: '2026-10-13T06:00:00.000Z',
        requestHash: `0x${'11'.repeat(32)}`,
        responseHash: `0x${'22'.repeat(32)}`,
      }),
    });

    expect(parsed.requireQuoteProvenance).toBe(true);
    expect(parsed.quoteProvenance?.sourceId).toBe('customer-broker');
    expect(() =>
      PreTradeQuerySchema.parse({ ...base, decisionInputCheck: '1', quoteProvenance: '{invalid' })
    ).toThrow();
  });

  it('rejects partial input checks, orphaned parameters, and timestamps without a timezone', () => {
    expect(() => PreTradeQuerySchema.parse({ ...base, decisionInputCheck: '1' })).toThrow();
    expect(() => PreTradeQuerySchema.parse({ ...base, decisionPriceUsd: '2500' })).toThrow();
    expect(() =>
      PreTradeQuerySchema.parse({
        ...base,
        decisionInputCheck: '1',
        decisionPriceUsd: '2500',
        quotePriceUsd: '2501',
        quoteObservedAt: '2026-10-13T06:00:00',
        maxReferenceDeviationBps: '50',
        maxSlippageBps: '75',
        maxQuoteAgeSeconds: '30',
      })
    ).toThrow();
    expect(() =>
      PreTradeQuerySchema.parse({
        ...base,
        decisionInputCheck: '1',
        decisionPriceUsd: '2500',
        quotePriceUsd: '2501',
        quoteObservedAt: '2026-02-30T06:00:00Z',
        maxReferenceDeviationBps: '50',
        maxSlippageBps: '75',
        maxQuoteAgeSeconds: '30',
      })
    ).toThrow();
  });
});
