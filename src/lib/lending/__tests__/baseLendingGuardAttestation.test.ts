import { encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { decodeBaseLendingExactCall, type BaseLendingExactTransaction } from '../baseLendingAction';
import {
  createBaseLendingGuardDecision,
  verifyBaseLendingGuardDecision,
} from '../baseLendingGuardAttestation';

import type { BaseLendingGuardResult } from '../baseLendingGuard';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const AAVE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const;
const WETH = '0x4200000000000000000000000000000000000006' as const;
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const AAVE_POOL_ABI = [
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
const COMPOUND_COMET = '0xb125E6687d4313864e53df431d5425969c15Eb2F' as const;
const COMPOUND_COMET_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
const MOONWELL_USDC = '0xEdc817a28E8B93B03976FBD4A3DDbc9F7d176c22' as const;
const MOONWELL_WETH = '0x628ff693426583D9a7FB391E54366292F509D457' as const;
const MOONWELL_MTOKEN_ABI = [
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'borrowAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const transaction = (): BaseLendingExactTransaction => ({
  chainId: 8453,
  from: ACCOUNT,
  to: AAVE_POOL,
  data: encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: 'borrow',
    args: [USDC, 1_000_000n, 2n, 0, ACCOUNT],
  }),
  nonce: '7',
  value: '0',
});

const guard: BaseLendingGuardResult = {
  schema: 'insight.base-lending-guard.v1',
  verdict: 'ALLOW',
  protocolId: 'aave-v3-base',
  action: 'borrow',
  evaluatedAt: '2026-10-25T00:00:00.000Z',
  scope: {
    chainId: 8453,
    transactionAuthority: 'none',
    valuation: 'caller_declared_post_action_usd',
  },
  market: {
    marketId: null,
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    maxLtv: 0.8,
    liquidationLtv: 0.83,
    parameterSource: 'on-chain',
    oracleAddress: null,
  },
  projected: {
    collateralValueUsd: 10_000,
    debtValueUsd: 4_000,
    ltv: 0.4,
    liquidationBufferPct: 51.807,
    conservativeMaxDebtUsd: 7200,
  },
  oracleChecks: {
    collateral: {
      verdict: 'PASS',
      maxDeviationPct: 0.2,
      staleDataRisk: false,
      participantCount: 4,
      attestationUid: `0x${'1'.repeat(64)}`,
      attester: `0x${'2'.repeat(40)}`,
    },
    loan: {
      verdict: 'PASS',
      maxDeviationPct: 0.2,
      staleDataRisk: false,
      participantCount: 4,
      attestationUid: `0x${'3'.repeat(64)}`,
      attester: `0x${'2'.repeat(40)}`,
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
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/base-lending-guard/verify',
  trustAttester: async (address: string) => address.toLowerCase() === signer.address.toLowerCase(),
};

describe('Base Lending Guard attestation', () => {
  it('signs and independently verifies one direct Base Aave call', async () => {
    const decision = await createBaseLendingGuardDecision(guard, transaction(), deps);
    expect(decision.attestation).not.toBeNull();
    await expect(verifyBaseLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });

  it('rejects a changed exact calldata even if the signed decision hash is retained', async () => {
    const decision = await createBaseLendingGuardDecision(guard, transaction(), deps);
    decision.transaction.data = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: 'borrow',
      args: [USDC, 2_000_000n, 2n, 0, ACCOUNT],
    });
    await expect(verifyBaseLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: false,
      reason: expect.stringMatching(/decision_hash_mismatch|call_binding_mismatch/),
    });
  });

  it('refuses delegated Aave positions instead of attaching a sender authority to another account', () => {
    const delegated = transaction();
    delegated.data = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: 'borrow',
      args: [WETH, 1n, 2n, 0, '0x2222222222222222222222222222222222222222'],
    });
    expect(() =>
      decodeBaseLendingExactCall(delegated, { protocolId: 'aave-v3-base', action: 'borrow' })
    ).toThrow('only for the transaction sender');
  });

  it('refuses an Aave call whose borrowed asset differs from the declared loan asset', () => {
    const mismatched = transaction();
    mismatched.data = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: 'borrow',
      args: [WETH, 1n, 2n, 0, ACCOUNT],
    });
    expect(() =>
      decodeBaseLendingExactCall(mismatched, {
        protocolId: 'aave-v3-base',
        action: 'borrow',
        loanSymbol: 'USDC',
      })
    ).toThrow('does not match the declared loan symbol');
  });

  it('signs and independently verifies the direct Compound V3 Base borrow form', async () => {
    const compoundTransaction: BaseLendingExactTransaction = {
      chainId: 8453,
      from: ACCOUNT,
      to: COMPOUND_COMET,
      data: encodeFunctionData({
        abi: COMPOUND_COMET_ABI,
        functionName: 'withdraw',
        args: [USDC, 1_000_000n],
      }),
      nonce: '8',
      value: '0',
    };
    const compoundGuard: BaseLendingGuardResult = {
      ...guard,
      protocolId: 'compound-v3-base',
    };
    const decision = await createBaseLendingGuardDecision(compoundGuard, compoundTransaction, deps);
    expect(decision.action).toMatchObject({
      protocolId: 'compound-v3-base',
      action: 'borrow',
      target: COMPOUND_COMET.toLowerCase(),
      asset: USDC.toLowerCase(),
    });
    await expect(verifyBaseLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });

  it('binds an unlevered Compound USDC supply to its exact Comet call', () => {
    const compoundSupply: BaseLendingExactTransaction = {
      chainId: 8453,
      from: ACCOUNT,
      to: COMPOUND_COMET,
      data: encodeFunctionData({
        abi: COMPOUND_COMET_ABI,
        functionName: 'supply',
        args: [USDC, 1_000_000n],
      }),
      nonce: '9',
      value: '0',
    };
    expect(
      decodeBaseLendingExactCall(compoundSupply, {
        protocolId: 'compound-v3-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
      })
    ).toMatchObject({
      protocolId: 'compound-v3-base',
      action: 'supply',
      target: COMPOUND_COMET.toLowerCase(),
      asset: USDC.toLowerCase(),
    });
  });

  it('signs and independently verifies a direct reviewed Moonwell borrow', async () => {
    const moonwellTransaction: BaseLendingExactTransaction = {
      chainId: 8453,
      from: ACCOUNT,
      to: MOONWELL_USDC,
      data: encodeFunctionData({
        abi: MOONWELL_MTOKEN_ABI,
        functionName: 'borrow',
        args: [1_000_000n],
      }),
      nonce: '10',
      value: '0',
    };
    const moonwellGuard: BaseLendingGuardResult = {
      ...guard,
      protocolId: 'moonwell-base',
    };
    const decision = await createBaseLendingGuardDecision(moonwellGuard, moonwellTransaction, deps);
    expect(decision.action).toMatchObject({
      protocolId: 'moonwell-base',
      action: 'borrow',
      target: MOONWELL_USDC.toLowerCase(),
      asset: null,
    });
    await expect(verifyBaseLendingGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });

  it('rejects a Moonwell borrow against a market that does not match the declared loan asset', () => {
    const moonwellTransaction: BaseLendingExactTransaction = {
      chainId: 8453,
      from: ACCOUNT,
      to: MOONWELL_WETH,
      data: encodeFunctionData({
        abi: MOONWELL_MTOKEN_ABI,
        functionName: 'borrow',
        args: [1n],
      }),
      nonce: '11',
      value: '0',
    };
    expect(() =>
      decodeBaseLendingExactCall(moonwellTransaction, {
        protocolId: 'moonwell-base',
        action: 'borrow',
        loanSymbol: 'USDC',
      })
    ).toThrow('reviewed Moonwell Base market');
  });
});
