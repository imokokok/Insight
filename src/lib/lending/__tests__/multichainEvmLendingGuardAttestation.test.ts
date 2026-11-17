import { encodeAbiParameters, encodeFunctionData, keccak256 } from 'viem';

import {
  createMultichainEvmLendingGuardDecision,
  verifyMultichainEvmLendingGuardDecision,
} from '../multichainEvmLendingGuardAttestation';
import { MORPHO_BLUE_EVM_MARKETS } from '../multichainEvmLendingProtocols';

import type { MultichainEvmLendingGuardResult } from '../multichainEvmLendingGuard';

const sender = '0x1111111111111111111111111111111111111111' as const;
const market = {
  loanToken: '0x2222222222222222222222222222222222222222' as const,
  collateralToken: '0x3333333333333333333333333333333333333333' as const,
  oracle: '0x4444444444444444444444444444444444444444' as const,
  irm: '0x5555555555555555555555555555555555555555' as const,
  lltv: 860_000_000_000_000_000n,
};
const marketId = keccak256(
  encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'address' },
      { type: 'address' },
      { type: 'address' },
      { type: 'uint256' },
    ],
    [market.loanToken, market.collateralToken, market.oracle, market.irm, market.lltv]
  )
);

const MORPHO_ABI = [
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },
] as const;

describe('Multichain EVM Lending Guard Attestation', () => {
  it('accepts HyperEVM Morpho Blue decisions through the attestation schema', async () => {
    const transaction = {
      chainId: 999 as const,
      from: sender,
      to: MORPHO_BLUE_EVM_MARKETS['morpho-blue-hyperevm'].morpho,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: 'borrow',
        args: [market, 1_000_000n, 0n, sender, sender],
      }),
      nonce: '1',
      value: '0',
    };
    const guard: MultichainEvmLendingGuardResult = {
      schema: 'insight.multichain-evm-lending-guard.v1',
      verdict: 'ALLOW',
      chainId: 999,
      protocolId: 'morpho-blue-hyperevm',
      action: 'borrow',
      evaluatedAt: '2026-11-18T00:00:00.000Z',
      scope: {
        chainId: 999,
        transactionAuthority: 'none',
        valuation: 'caller_declared_post_action_usd',
      },
      market: {
        marketId,
        marketAddress: null,
        collateralVaultAddress: null,
        collateralMarketId: null,
        loanMarketId: null,
        accountNumber: null,
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        maxLtv: 0.86,
        liquidationLtv: 0.86,
        parameterSource: 'morpho-market',
        oracleAddress: market.oracle,
      },
      projected: {
        collateralValueUsd: 1_000,
        debtValueUsd: 500,
        ltv: 0.5,
        liquidationBufferPct: 41.86,
        conservativeMaxDebtUsd: 774,
      },
      oracleChecks: {
        collateral: {
          verdict: 'PASS',
          maxDeviationPct: 0.2,
          staleDataRisk: false,
          participantCount: 4,
          attestationUid: null,
          attester: null,
        },
        loan: {
          verdict: 'PASS',
          maxDeviationPct: 0.2,
          staleDataRisk: false,
          participantCount: 4,
          attestationUid: null,
          attester: null,
        },
      },
      reasons: [
        'Oracle checks passed and declared post-action LTV remains below the conservative guard band.',
      ],
      next: { execution: 'not_performed', priorSeal: 'required' },
    };

    const decision = await createMultichainEvmLendingGuardDecision(guard, transaction, {
      signer: null,
    });

    expect(decision).toMatchObject({
      guard: { chainId: 999, protocolId: 'morpho-blue-hyperevm' },
      action: { protocolId: 'morpho-blue-hyperevm', account: sender },
      attestation: null,
    });
    await expect(verifyMultichainEvmLendingGuardDecision(decision)).resolves.toMatchObject({
      valid: false,
      reason: 'missing_attestation',
    });
  });
});
