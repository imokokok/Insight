import { assessBasePerpGuard, BasePerpGuardInputSchema } from '../basePerpGuard';

const oracle = (verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK') =>
  ({ verdict, maxDeviationPct: 0.2, staleDataRisk: false, participantCount: 4 }) as never;

const perpInput = {
  protocolId: 'synthetix-perps-v3-base' as const,
  action: 'open_long' as const,
  assetSymbol: 'ETH',
  marginAssetSymbol: 'USDC' as const,
  sizeUsd: 25_000,
  marginValueUsd: 5_000,
};

describe('Base Perp Guard', () => {
  it('rejects a margin asset other than the reviewed USDC deployment', () => {
    expect(
      BasePerpGuardInputSchema.safeParse({ ...perpInput, marginAssetSymbol: 'USDT' }).success
    ).toBe(false);
  });

  it('requires positive declared size and margin values', () => {
    expect(BasePerpGuardInputSchema.safeParse({ ...perpInput, sizeUsd: 0 }).success).toBe(false);
    expect(BasePerpGuardInputSchema.safeParse({ ...perpInput, marginValueUsd: -1 }).success).toBe(
      false
    );
  });

  it('allows a buffered position only when both oracle checks pass', async () => {
    const result = await assessBasePerpGuard(perpInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      now: () => new Date('2026-11-02T00:00:00.000Z'),
    });

    expect(result.verdict).toBe('ALLOW');
    expect(result.projected.effectiveLeverage).toBe(5);
    expect(result.projected.conservativeMaxSizeUsd).toBe(112_500);
    expect(result.market.maxLeverage).toBe(25);
    expect(result.market.parameterSource).toBe('reviewed-profile');
    expect(result.next.execution).toBe('not_performed');
    expect(result.scope.transactionAuthority).toBe('none');
    expect(result.reasons.join(' ')).toContain('static reviewed profile');
  });

  it('blocks at or above the reviewed market cap even if oracle checks pass', async () => {
    const result = await assessBasePerpGuard(
      { ...perpInput, sizeUsd: 125_000, marginValueUsd: 5_000 },
      { checkOracle: jest.fn().mockResolvedValue(oracle('PASS')) }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('at or above the reviewed market cap');
  });

  it('cautions when declared leverage consumes at least 90% of the reviewed cap', async () => {
    const result = await assessBasePerpGuard(
      { ...perpInput, sizeUsd: 115_000, marginValueUsd: 5_000 },
      { checkOracle: jest.fn().mockResolvedValue(oracle('PASS')) }
    );

    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons.join(' ')).toContain('90% of the reviewed market cap');
  });

  it('blocks when either the underlying or margin oracle assessment is unsafe', async () => {
    const checkOracle = jest
      .fn()
      .mockResolvedValueOnce(oracle('DANGER'))
      .mockResolvedValueOnce(oracle('PASS'));
    const result = await assessBasePerpGuard(perpInput, { checkOracle });

    expect(result.verdict).toBe('BLOCK');
    expect(checkOracle).toHaveBeenCalledTimes(2);
  });

  it('cautions when an oracle assessment requires review', async () => {
    const result = await assessBasePerpGuard(perpInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('CAUTION')),
    });

    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons.join(' ')).toContain('requires review');
  });

  it('fails closed for markets outside the reviewed set', async () => {
    await expect(
      assessBasePerpGuard(
        { ...perpInput, assetSymbol: 'FARTCOIN' },
        { checkOracle: jest.fn().mockResolvedValue(oracle('PASS')) }
      )
    ).rejects.toThrow('not in the reviewed Synthetix Perps V3 Base market set');
  });

  it('captures attestation references from the underlying oracle checks', async () => {
    const checkOracle = jest.fn().mockResolvedValue({
      ...oracle('PASS'),
      attestation: { uid: '0xabc', attester: '0xdef' },
    });
    const result = await assessBasePerpGuard(perpInput, { checkOracle });

    expect(result.oracleChecks.underlying.attestationUid).toBe('0xabc');
    expect(result.oracleChecks.margin.attester).toBe('0xdef');
  });
});
