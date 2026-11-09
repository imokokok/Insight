import {
  assessHyperEvmLendingGuard,
  HyperEvmLendingGuardInputSchema,
} from '../hyperEvmLendingGuard';
import { canonicalHyperLendSymbol, hyperLendOracleSymbol } from '../hyperEvmLendingProtocols';

const oracle = (verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK') =>
  ({ verdict, maxDeviationPct: 0.2, staleDataRisk: false, participantCount: 4 }) as never;
const guardInput = {
  protocolId: 'hyperlend-core-hyperevm' as const,
  action: 'borrow' as const,
  collateralSymbol: 'WHYPE',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 4_000,
};

describe('HyperEVM Lending Guard', () => {
  it('rejects unknown protocol ids and long-tail assets', () => {
    expect(
      HyperEvmLendingGuardInputSchema.safeParse({
        ...guardInput,
        protocolId: 'morpho-blue-hyperevm',
      }).success
    ).toBe(false);
    expect(canonicalHyperLendSymbol('USOL')).toBeNull();
    expect(canonicalHyperLendSymbol('PT-kHYPE-24SEP2026')).toBeNull();
  });

  it('allows a buffered live HyperLend proposal only when both oracle legs pass', async () => {
    const result = await assessHyperEvmLendingGuard(guardInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveHyperLendRisk: jest.fn().mockResolvedValue({
        maxLtv: 0.65,
        liquidationLtv: 0.8147,
        source: 'hyperlend-live',
        oracleAddress: '0x0000000000000000000000000000000000000001',
      }),
      now: () => new Date('2026-11-10T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      schema: 'insight.hyperevm-lending-guard.v1',
      verdict: 'ALLOW',
      scope: { chainId: 999, transactionAuthority: 'none' },
      market: {
        parameterSource: 'hyperlend-live',
        oracleAddress: '0x0000000000000000000000000000000000000001',
      },
      projected: { ltv: 0.4, conservativeMaxDebtUsd: 5850 },
    });
  });

  it('fails closed if live risk parameters cannot be read', async () => {
    const result = await assessHyperEvmLendingGuard(guardInput, {
      checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
      resolveHyperLendRisk: jest.fn().mockRejectedValue(new Error('RPC unavailable')),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.market.parameterSource).toBe('unavailable');
    expect(result.reasons.join(' ')).toContain('fails closed');
  });

  it('blocks when an oracle leg is DANGER or BLOCK', async () => {
    const result = await assessHyperEvmLendingGuard(guardInput, {
      checkOracle: jest
        .fn()
        .mockResolvedValueOnce(oracle('PASS'))
        .mockResolvedValueOnce(oracle('DANGER')),
      resolveHyperLendRisk: jest.fn().mockResolvedValue({
        maxLtv: 0.65,
        liquidationLtv: 0.8147,
        source: 'hyperlend-live',
      }),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('DANGER or BLOCK');
  });

  it('maps wrapped assets to the standard USD oracle symbols on chain 999', async () => {
    const checkOracle = jest.fn().mockResolvedValue(oracle('PASS'));
    await assessHyperEvmLendingGuard(
      { ...guardInput, collateralSymbol: 'HYPE', loanSymbol: 'USDT' },
      {
        checkOracle,
        resolveHyperLendRisk: jest.fn().mockResolvedValue({
          maxLtv: 0.65,
          liquidationLtv: 0.8147,
          source: 'hyperlend-live',
        }),
      }
    );
    expect(checkOracle).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ asset: 'HYPE', chainId: 999 })
    );
    expect(checkOracle).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ asset: 'USDT', chainId: 999 })
    );
    expect(hyperLendOracleSymbol('UBTC')).toBe('UBTC');
    expect(hyperLendOracleSymbol('UETH')).toBe('UETH');
  });

  it('warns before the reviewed liquidation threshold is crossed', async () => {
    const result = await assessHyperEvmLendingGuard(
      { ...guardInput, debtValueUsd: 7_000 },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
        resolveHyperLendRisk: jest.fn().mockResolvedValue({
          maxLtv: 0.65,
          liquidationLtv: 0.8147,
          source: 'hyperlend-live',
        }),
      }
    );
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons.join(' ')).toContain('90% of the protocol maximum LTV');
  });
});
