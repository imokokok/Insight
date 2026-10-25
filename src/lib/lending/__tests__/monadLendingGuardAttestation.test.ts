import { encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  decodeMonadLendingExactCall,
  type MonadLendingExactTransaction,
} from '../monadLendingAction';
import {
  createMonadLendingGuardDecision,
  verifyMonadLendingGuardDecision,
} from '../monadLendingGuardAttestation';

import type { MonadLendingGuardResult } from '../monadLendingGuard';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const AAVE_POOL = '0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef' as const;
const USDC = '0x754704bc059f8c67012fed69bc8a327a5aafb603' as const;
const WETH = '0xee8c0e9f1bffb4eb878d8f15f368a02a35481242' as const;
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
const transaction = (): MonadLendingExactTransaction => ({
  chainId: 143,
  from: ACCOUNT,
  to: AAVE_POOL,
  data: encodeFunctionData({
    abi: ABI,
    functionName: 'borrow',
    args: [USDC, 1_000_000n, 2n, 0, ACCOUNT],
  }),
  nonce: '7',
  value: '0',
});
const guard: MonadLendingGuardResult = {
  schema: 'insight.monad-lending-guard.v1',
  verdict: 'ALLOW',
  protocolId: 'aave-v3-monad',
  action: 'borrow',
  evaluatedAt: '2026-10-25T00:00:00.000Z',
  scope: {
    chainId: 143,
    transactionAuthority: 'none',
    valuation: 'caller_declared_post_action_usd',
  },
  market: {
    marketId: null,
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    maxLtv: 0.8,
    liquidationLtv: 0.83,
    parameterSource: 'aave-live',
    oracleAddress: null,
  },
  projected: {
    collateralValueUsd: 10_000,
    debtValueUsd: 4_000,
    ltv: 0.4,
    liquidationBufferPct: 51.8,
    conservativeMaxDebtUsd: 7200,
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
  now: () => 1_792_252_800,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/monad-lending-guard/verify',
  trustAttester: async (value: string) => value.toLowerCase() === signer.address.toLowerCase(),
};

describe('Monad Lending Guard attestation', () => {
  it('signs and verifies one direct Monad Aave call', async () => {
    const decision = await createMonadLendingGuardDecision(guard, transaction(), deps);
    await expect(verifyMonadLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });
  it('rejects a borrowed asset outside the reviewed symbol binding', () => {
    const raw = transaction();
    raw.data = encodeFunctionData({
      abi: ABI,
      functionName: 'borrow',
      args: [WETH, 1n, 2n, 0, ACCOUNT],
    });
    expect(() =>
      decodeMonadLendingExactCall(raw, {
        protocolId: 'aave-v3-monad',
        action: 'borrow',
        loanSymbol: 'USDC',
      })
    ).toThrow('does not match the reviewed declared loan');
  });
  it('rejects a changed exact calldata after a decision is signed', async () => {
    const decision = await createMonadLendingGuardDecision(guard, transaction(), deps);
    decision.transaction.data = encodeFunctionData({
      abi: ABI,
      functionName: 'borrow',
      args: [USDC, 2_000_000n, 2n, 0, ACCOUNT],
    });
    await expect(verifyMonadLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: false,
    });
  });
});
