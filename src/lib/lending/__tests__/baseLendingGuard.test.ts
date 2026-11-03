import { assessBaseLendingGuard, BaseLendingGuardInputSchema } from '../baseLendingGuard';

const oracle = (verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK') =>
  ({ verdict, maxDeviationPct: 0.2, staleDataRisk: false, participantCount: 4 }) as never;

const aaveInput = {
  protocolId: 'aave-v3-base' as const,
  action: 'borrow' as const,
  collateralSymbol: 'WETH',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 4_000,
};

describe('Base Lending Guard', () => {
  it('requires an exact Morpho market id instead of guessing risk parameters', () => {
    expect(
      BaseLendingGuardInputSchema.safeParse({ ...aaveInput, protocolId: 'morpho-blue-base' })
        .success
    ).toBe(false);
  });

  it('allows a buffered Aave position only when both oracle checks pass', async () => {
    const result = await assessBaseLendingGuard(aaveInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveAaveRisk: jest.fn().mockResolvedValue({
        maxLtv: 0.8,
        liquidationLtv: 0.83,
        source: 'on-chain',
      }),
      now: () => new Date('2026-10-25T00:00:00.000Z'),
    });

    expect(result.verdict).toBe('ALLOW');
    expect(result.projected.ltv).toBe(0.4);
    expect(result.projected.conservativeMaxDebtUsd).toBe(7200);
    expect(result.next.execution).toBe('not_performed');
    expect(result.scope.transactionAuthority).toBe('none');
  });

  it('blocks a position at the liquidation threshold even if oracle checks pass', async () => {
    const result = await assessBaseLendingGuard(
      { ...aaveInput, debtValueUsd: 8_300 },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
        resolveAaveRisk: jest.fn().mockResolvedValue({
          maxLtv: 0.8,
          liquidationLtv: 0.83,
          source: 'on-chain',
        }),
      }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('liquidation threshold');
  });

  it('fails closed when live Aave risk parameters fall back to static registry values', async () => {
    const result = await assessBaseLendingGuard(aaveInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveAaveRisk: jest.fn().mockResolvedValue({
        maxLtv: 0.8,
        liquidationLtv: 0.83,
        source: 'fallback',
      }),
    });

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('fails closed');
  });

  it('blocks when either priced leg has an unsafe oracle assessment', async () => {
    const checkOracle = jest
      .fn()
      .mockResolvedValueOnce(oracle('DANGER'))
      .mockResolvedValueOnce(oracle('PASS'));
    const result = await assessBaseLendingGuard(aaveInput, {
      checkOracle,
      resolveAaveRisk: jest.fn().mockResolvedValue({
        maxLtv: 0.8,
        liquidationLtv: 0.83,
        source: 'on-chain',
      }),
    });

    expect(result.verdict).toBe('BLOCK');
    expect(checkOracle).toHaveBeenCalledTimes(2);
  });

  it('uses the immutable Morpho market parameters and rejects mismatched caller symbols', async () => {
    await expect(
      assessBaseLendingGuard(
        { ...aaveInput, protocolId: 'morpho-blue-base', marketId: `0x${'1'.repeat(64)}` },
        {
          resolveMorphoMarket: jest.fn().mockResolvedValue({
            collateralSymbol: 'WETH',
            loanSymbol: 'USDC',
            lltv: 0.86,
            oracle: '0x0000000000000000000000000000000000000001',
          }),
          checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
        }
      )
    ).resolves.toMatchObject({ market: { parameterSource: 'morpho-market', maxLtv: 0.86 } });

    await expect(
      assessBaseLendingGuard(
        { ...aaveInput, protocolId: 'morpho-blue-base', marketId: `0x${'2'.repeat(64)}` },
        {
          resolveMorphoMarket: jest.fn().mockResolvedValue({
            collateralSymbol: 'WETH',
            loanSymbol: 'DAI',
            lltv: 0.86,
            oracle: '0x0000000000000000000000000000000000000001',
          }),
        }
      )
    ).rejects.toThrow('do not match');
  });

  it('uses live Compound V3 Comet factors rather than a registry default', async () => {
    const result = await assessBaseLendingGuard(
      { ...aaveInput, protocolId: 'compound-v3-base' },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
        resolveCompoundV3Risk: jest.fn().mockResolvedValue({
          maxLtv: 0.8,
          liquidationLtv: 0.9,
          source: 'compound-comet',
          oracleAddress: '0x0000000000000000000000000000000000000001',
        }),
      }
    );

    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: { parameterSource: 'compound-comet', maxLtv: 0.8, liquidationLtv: 0.9 },
    });
  });

  it('uses the live reviewed Moonwell market factor and protocol oracle identity', async () => {
    const result = await assessBaseLendingGuard(
      { ...aaveInput, protocolId: 'moonwell-base', collateralSymbol: 'cbETH' },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
        resolveMoonwellRisk: jest.fn().mockResolvedValue({
          maxLtv: 0.81,
          liquidationLtv: 0.81,
          source: 'moonwell-market',
          oracleAddress: '0x0000000000000000000000000000000000000002',
        }),
      }
    );

    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: {
        parameterSource: 'moonwell-market',
        maxLtv: 0.81,
        oracleAddress: '0x0000000000000000000000000000000000000002',
      },
    });
  });
});
