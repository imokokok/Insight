import { encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  decodeHyperEvmLendingExactCall,
  type HyperEvmLendingExactTransaction,
} from '../hyperEvmLendingAction';
import {
  createHyperEvmLendingGuardDecision,
  verifyHyperEvmLendingGuardDecision,
} from '../hyperEvmLendingGuardAttestation';

import type { HyperEvmLendingGuardResult } from '../hyperEvmLendingGuard';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const HYPERLEND_POOL = '0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b' as const;
const USDC = '0xb88339CB7199b77E23DB6E890353E22632Ba630f' as const;
const WHYPE = '0x5555555555555555555555555555555555555555' as const;
const ABI = [
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
      { name: 'referralCode', type: 'uint16' },
      { name: 'onBehalfOf', type: 'address' },
    ],
    outputs: [],
  },
] as const;
const transaction = (): HyperEvmLendingExactTransaction => ({
  chainId: 999,
  from: ACCOUNT,
  to: HYPERLEND_POOL,
  data: encodeFunctionData({
    abi: ABI,
    functionName: 'borrow',
    args: [USDC, 1_000_000n, 2n, 0, ACCOUNT],
  }),
  nonce: '7',
  value: '0',
});
const guard: HyperEvmLendingGuardResult = {
  schema: 'insight.hyperevm-lending-guard.v1',
  verdict: 'ALLOW',
  protocolId: 'hyperlend-core-hyperevm',
  action: 'borrow',
  evaluatedAt: '2026-11-10T00:00:00.000Z',
  scope: {
    chainId: 999,
    transactionAuthority: 'none',
    valuation: 'caller_declared_post_action_usd',
  },
  market: {
    collateralSymbol: 'WHYPE',
    loanSymbol: 'USDC',
    maxLtv: 0.65,
    liquidationLtv: 0.8147,
    parameterSource: 'hyperlend-live',
    oracleAddress: null,
  },
  projected: {
    collateralValueUsd: 10_000,
    debtValueUsd: 4_000,
    ltv: 0.4,
    liquidationBufferPct: 50.9,
    conservativeMaxDebtUsd: 5850,
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
  reasons: ['Test vector.'],
  next: {
    execution: 'not_performed',
    priorSeal: 'Bind this decision to an exact, user-authorized transaction before execution.',
  },
};
const signer = privateKeyToAccount(`0x${'11'.repeat(32)}` as `0x${string}`);
const deps = {
  signer,
  now: () => 1_794_247_200,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/hyperevm-lending-guard/verify',
  trustAttester: async (value: string) => value.toLowerCase() === signer.address.toLowerCase(),
};

describe('HyperEVM Lending Guard attestation', () => {
  it('signs and verifies one direct HyperLend call', async () => {
    const decision = await createHyperEvmLendingGuardDecision(guard, transaction(), deps);
    await expect(verifyHyperEvmLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });
  it('rejects a borrowed asset outside the reviewed symbol binding', () => {
    const raw = transaction();
    raw.data = encodeFunctionData({
      abi: ABI,
      functionName: 'borrow',
      args: [WHYPE, 1n, 2n, 0, ACCOUNT],
    });
    expect(() =>
      decodeHyperEvmLendingExactCall(raw, {
        protocolId: 'hyperlend-core-hyperevm',
        action: 'borrow',
        loanSymbol: 'USDC',
      })
    ).toThrow('does not match the reviewed declared loan');
  });
  it('rejects a stable-rate borrow mode', () => {
    const raw = transaction();
    raw.data = encodeFunctionData({
      abi: ABI,
      functionName: 'borrow',
      args: [USDC, 1n, 1n, 0, ACCOUNT],
    });
    expect(() =>
      decodeHyperEvmLendingExactCall(raw, {
        protocolId: 'hyperlend-core-hyperevm',
        action: 'borrow',
        loanSymbol: 'USDC',
      })
    ).toThrow('interestRateMode=2');
  });
  it('rejects a changed exact calldata after a decision is signed', async () => {
    const decision = await createHyperEvmLendingGuardDecision(guard, transaction(), deps);
    decision.transaction.data = encodeFunctionData({
      abi: ABI,
      functionName: 'borrow',
      args: [USDC, 2_000_000n, 2n, 0, ACCOUNT],
    });
    await expect(verifyHyperEvmLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: false,
    });
  });
  it('rejects a transaction whose chainId is not 999', () => {
    const raw = { ...transaction(), chainId: 143 as never };
    expect(() =>
      decodeHyperEvmLendingExactCall(raw, {
        protocolId: 'hyperlend-core-hyperevm',
        action: 'borrow',
        loanSymbol: 'USDC',
      })
    ).toThrow();
  });
});
