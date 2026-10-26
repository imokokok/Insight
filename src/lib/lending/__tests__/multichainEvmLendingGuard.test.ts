import {
  MultichainEvmLendingGuardInputSchema,
  assessMultichainEvmLendingGuard,
} from '../multichainEvmLendingGuard';

const vault = '0x6666666666666666666666666666666666666666' as const;
const oracle = {
  verdict: 'PASS',
  maxDeviationPct: 0.2,
  staleDataRisk: false,
  participantCount: 4,
} as never;

describe('Multichain EVM Lending Guard', () => {
  it('requires an explicit EVault address for Euler v2', () => {
    expect(
      MultichainEvmLendingGuardInputSchema.safeParse({
        chainId: 8453,
        protocolId: 'euler-v2-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        collateralValueUsd: 100,
        debtValueUsd: 0,
      }).success
    ).toBe(false);
  });

  it('binds live Euler factory verification to an unlevered direct deposit decision', async () => {
    const result = await assessMultichainEvmLendingGuard(
      {
        chainId: 8453,
        protocolId: 'euler-v2-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        collateralValueUsd: 100,
        debtValueUsd: 0,
        marketAddress: vault,
      },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle),
        resolveEulerV2Risk: jest.fn().mockResolvedValue({
          maxLtv: 1,
          liquidationLtv: 1,
          source: 'euler-evault',
          oracleAddress: null,
          marketId: null,
          marketAddress: vault,
          collateralVaultAddress: null,
          collateralMarketId: null,
          loanMarketId: null,
          accountNumber: null,
        }),
      }
    );

    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: { parameterSource: 'euler-evault', marketAddress: vault },
    });
  });

  it('requires Dolomite market IDs and account number, then preserves its exact position scope', async () => {
    expect(
      MultichainEvmLendingGuardInputSchema.safeParse({
        chainId: 42161,
        protocolId: 'dolomite-arbitrum',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralValueUsd: 1_000,
        debtValueUsd: 500,
      }).success
    ).toBe(false);
    const result = await assessMultichainEvmLendingGuard(
      {
        chainId: 42161,
        protocolId: 'dolomite-arbitrum',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralValueUsd: 1_000,
        debtValueUsd: 500,
        collateralMarketId: '0',
        loanMarketId: '2',
        accountNumber: '7',
      },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle),
        resolveDolomiteRisk: jest.fn().mockResolvedValue({
          maxLtv: 0.8,
          liquidationLtv: 0.8,
          source: 'dolomite-live',
          oracleAddress: vault,
          marketId: null,
          marketAddress: null,
          collateralVaultAddress: null,
          collateralMarketId: '0',
          loanMarketId: '2',
          accountNumber: '7',
        }),
      }
    );
    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: {
        parameterSource: 'dolomite-live',
        collateralMarketId: '0',
        loanMarketId: '2',
        accountNumber: '7',
      },
    });
  });

  it('requires a Fluid T1 vault and accepts only a live-authenticated unlevered supply', async () => {
    expect(
      MultichainEvmLendingGuardInputSchema.safeParse({
        chainId: 8453,
        protocolId: 'fluid-vault-t1-base',
        action: 'borrow',
        collateralSymbol: 'USDC',
        loanSymbol: 'WETH',
        collateralValueUsd: 100,
        debtValueUsd: 0,
      }).success
    ).toBe(false);
    const result = await assessMultichainEvmLendingGuard(
      {
        chainId: 8453,
        protocolId: 'fluid-vault-t1-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'WETH',
        collateralValueUsd: 100,
        debtValueUsd: 0,
        marketAddress: vault,
      },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle),
        resolveFluidVaultT1Risk: jest.fn().mockResolvedValue({
          maxLtv: 1,
          liquidationLtv: 1,
          source: 'fluid-vault-t1',
          oracleAddress: null,
          marketId: null,
          marketAddress: vault,
          collateralVaultAddress: null,
          collateralMarketId: null,
          loanMarketId: null,
          accountNumber: null,
        }),
      }
    );
    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: { parameterSource: 'fluid-vault-t1', marketAddress: vault },
    });
  });
});
