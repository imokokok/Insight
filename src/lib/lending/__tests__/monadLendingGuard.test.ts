import { assessMonadLendingGuard, MonadLendingGuardInputSchema } from '../monadLendingGuard';

const oracle = (verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK') =>
  ({ verdict, maxDeviationPct: 0.2, staleDataRisk: false, participantCount: 4 }) as never;
const aaveInput = {
  protocolId: 'aave-v3-monad' as const,
  action: 'borrow' as const,
  collateralSymbol: 'WETH',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 4_000,
};

describe('Monad Lending Guard', () => {
  it('requires an immutable Morpho market id', () => {
    expect(
      MonadLendingGuardInputSchema.safeParse({ ...aaveInput, protocolId: 'morpho-blue-monad' })
        .success
    ).toBe(false);
  });

  it('allows a buffered live Aave Monad proposal only when both oracle legs pass', async () => {
    const result = await assessMonadLendingGuard(aaveInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveAaveRisk: jest.fn().mockResolvedValue({
        maxLtv: 0.8,
        liquidationLtv: 0.83,
        source: 'aave-live',
        oracleAddress: '0x0000000000000000000000000000000000000001',
      }),
      now: () => new Date('2026-10-25T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      schema: 'insight.monad-lending-guard.v1',
      verdict: 'ALLOW',
      scope: { chainId: 143, transactionAuthority: 'none' },
      market: {
        parameterSource: 'aave-live',
        oracleAddress: '0x0000000000000000000000000000000000000001',
      },
      projected: { ltv: 0.4, conservativeMaxDebtUsd: 7200 },
    });
  });

  it('fails closed if live risk parameters cannot be read or agree with the declared market', async () => {
    const result = await assessMonadLendingGuard(aaveInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveAaveRisk: jest.fn().mockRejectedValue(new Error('RPC unavailable')),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.market.parameterSource).toBe('unavailable');
    expect(result.reasons.join(' ')).toContain('fails closed');
  });

  it('maps the reviewed Aave USDT0 deployment to the USDT oracle symbol', async () => {
    const checkOracle = jest.fn().mockResolvedValue(oracle('PASS'));
    await assessMonadLendingGuard(
      { ...aaveInput, loanSymbol: 'USDT0' },
      {
        checkOracle,
        resolveAaveRisk: jest.fn().mockResolvedValue({
          maxLtv: 0.8,
          liquidationLtv: 0.83,
          source: 'aave-live',
        }),
      }
    );
    expect(checkOracle).toHaveBeenLastCalledWith(
      expect.objectContaining({ asset: 'USDT', chainId: 143 })
    );
  });

  it('reads immutable Morpho parameters and blocks mismatched caller symbols', async () => {
    const deps = {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveMorphoMarket: jest.fn().mockResolvedValue({
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        lltv: 0.86,
        oracle: '0x0000000000000000000000000000000000000002',
      }),
    };
    await expect(
      assessMonadLendingGuard(
        { ...aaveInput, protocolId: 'morpho-blue-monad', marketId: `0x${'1'.repeat(64)}` },
        deps
      )
    ).resolves.toMatchObject({
      verdict: 'ALLOW',
      market: { parameterSource: 'morpho-market', maxLtv: 0.86 },
    });
    await expect(
      assessMonadLendingGuard(
        {
          ...aaveInput,
          protocolId: 'morpho-blue-monad',
          loanSymbol: 'USDT0',
          marketId: `0x${'2'.repeat(64)}`,
        },
        deps
      )
    ).resolves.toMatchObject({ verdict: 'BLOCK', market: { parameterSource: 'unavailable' } });
  });
});
