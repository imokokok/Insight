import { encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  decodeBasePerpExactCall,
  PERPS_MARKET_PROXY,
  type BasePerpExactTransaction,
} from '../basePerpAction';
import {
  basePerpGuardDecisionHash,
  createBasePerpGuardDecision,
  verifyBasePerpGuardDecision,
} from '../basePerpGuardAttestation';

import type { BasePerpGuardResult } from '../basePerpGuard';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ETH_MARKET_ID = 100n;
const ACCOUNT_ID = 42n;
const SIZE_DELTA = 25_000_000000000000000000n; // 25,000 ETH units (18dp)
const ACCEPTABLE_PRICE = 2_500_000000000000000000n; // 2,500 USD (18dp)

const COMMIT_ORDER_ABI = [
  {
    type: 'function',
    name: 'commitOrder',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'commitment',
        type: 'tuple',
        components: [
          { name: 'marketId', type: 'uint128' },
          { name: 'accountId', type: 'uint128' },
          { name: 'sizeDelta', type: 'int128' },
          { name: 'settlementStrategyId', type: 'uint128' },
          { name: 'acceptablePrice', type: 'uint256' },
          { name: 'trackingCode', type: 'bytes32' },
          { name: 'referrer', type: 'address' },
        ],
      },
    ],
    outputs: [],
  },
] as const;

const transaction = (
  overrides: Partial<Pick<BasePerpExactTransaction, 'to' | 'data' | 'value'>> = {}
) =>
  ({
    chainId: 8453,
    from: ACCOUNT,
    to: PERPS_MARKET_PROXY,
    data: encodeFunctionData({
      abi: COMMIT_ORDER_ABI,
      functionName: 'commitOrder',
      args: [
        {
          marketId: ETH_MARKET_ID,
          accountId: ACCOUNT_ID,
          sizeDelta: SIZE_DELTA,
          settlementStrategyId: 0n,
          acceptablePrice: ACCEPTABLE_PRICE,
          trackingCode: `0x${'00'.repeat(32)}` as `0x${string}`,
          referrer: ZERO_ADDRESS,
        },
      ],
    }),
    nonce: '7',
    value: '0',
    ...overrides,
  }) as BasePerpExactTransaction;

const guard: BasePerpGuardResult = {
  schema: 'insight.base-perp-guard.v1',
  verdict: 'ALLOW',
  protocolId: 'synthetix-perps-v3-base',
  action: 'open_long',
  evaluatedAt: '2026-11-02T00:00:00.000Z',
  scope: {
    chainId: 8453,
    transactionAuthority: 'none',
    valuation: 'caller_declared_post_action_usd',
  },
  market: {
    assetSymbol: 'ETH',
    marginAssetSymbol: 'USDC',
    maxLeverage: 25,
    parameterSource: 'reviewed-profile',
  },
  projected: {
    sizeUsd: 25_000,
    marginValueUsd: 5_000,
    effectiveLeverage: 5,
    liquidationBufferPct: 80,
    conservativeMaxSizeUsd: 112_500,
  },
  oracleChecks: {
    underlying: {
      verdict: 'PASS',
      maxDeviationPct: 0.2,
      staleDataRisk: false,
      participantCount: 4,
      attestationUid: `0x${'1'.repeat(64)}`,
      attester: `0x${'2'.repeat(40)}`,
    },
    margin: {
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
    priorSeal: 'Bind this decision to an exact, user-authorized order before execution.',
  },
};

const signer = privateKeyToAccount(`0x${'11'.repeat(32)}` as `0x${string}`);
const deps = {
  signer,
  now: () => 1_792_252_800,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/base-perp-guard/verify',
  trustAttester: async (address: string) => address.toLowerCase() === signer.address.toLowerCase(),
};

const expected = {
  protocolId: 'synthetix-perps-v3-base' as const,
  action: 'open_long' as const,
  assetSymbol: 'ETH',
};

describe('Base Perp exact-call decoding', () => {
  it('decodes one direct commitOrder call for a reviewed market', () => {
    const action = decodeBasePerpExactCall(transaction(), expected);
    expect(action.target).toBe(PERPS_MARKET_PROXY.toLowerCase());
    expect(action.marketId).toBe('100');
    expect(action.accountId).toBe('42');
    expect(action.sizeDelta).toBe(SIZE_DELTA.toString(10));
    expect(action.acceptablePrice).toBe(ACCEPTABLE_PRICE.toString(10));
    expect(action.account).toBe(ACCOUNT);
    expect(action.trackingCode).toBe(`0x${'00'.repeat(32)}`);
  });

  it('rejects a wrong target, selector, or non-zero value', () => {
    expect(() => decodeBasePerpExactCall(transaction({ to: ACCOUNT }), expected)).toThrow(
      'PerpsMarketProxy'
    );
    expect(() => decodeBasePerpExactCall(transaction({ value: '1' }), expected)).toThrow(
      'zero-value'
    );
  });

  it('rejects a market id outside the reviewed set or mismatching the declared symbol', () => {
    const btcCall = encodeFunctionData({
      abi: COMMIT_ORDER_ABI,
      functionName: 'commitOrder',
      args: [
        {
          marketId: 200n,
          accountId: ACCOUNT_ID,
          sizeDelta: SIZE_DELTA,
          settlementStrategyId: 0n,
          acceptablePrice: ACCEPTABLE_PRICE,
          trackingCode: `0x${'00'.repeat(32)}` as `0x${string}`,
          referrer: ZERO_ADDRESS,
        },
      ],
    });
    expect(() => decodeBasePerpExactCall(transaction({ data: btcCall }), expected)).toThrow(
      'reviewed market'
    );
  });

  it('rejects sizeDelta that contradicts the declared direction', () => {
    const shortCall = encodeFunctionData({
      abi: COMMIT_ORDER_ABI,
      functionName: 'commitOrder',
      args: [
        {
          marketId: ETH_MARKET_ID,
          accountId: ACCOUNT_ID,
          sizeDelta: -SIZE_DELTA,
          settlementStrategyId: 0n,
          acceptablePrice: ACCEPTABLE_PRICE,
          trackingCode: `0x${'00'.repeat(32)}` as `0x${string}`,
          referrer: ZERO_ADDRESS,
        },
      ],
    });
    expect(() => decodeBasePerpExactCall(transaction({ data: shortCall }), expected)).toThrow(
      'open_long'
    );
  });

  it('rejects third-party tracking codes and referrers and non-reviewed settlement strategies', () => {
    const build = (settlementStrategyId: bigint, trackingCode: `0x${string}`, referrer: string) =>
      encodeFunctionData({
        abi: COMMIT_ORDER_ABI,
        functionName: 'commitOrder',
        args: [
          {
            marketId: ETH_MARKET_ID,
            accountId: ACCOUNT_ID,
            sizeDelta: SIZE_DELTA,
            settlementStrategyId,
            acceptablePrice: ACCEPTABLE_PRICE,
            trackingCode,
            referrer,
          },
        ],
      });
    expect(() =>
      decodeBasePerpExactCall(
        transaction({ data: build(1n, `0x${'00'.repeat(32)}` as `0x${string}`, ZERO_ADDRESS) }),
        expected
      )
    ).toThrow('settlement strategy');
    expect(() =>
      decodeBasePerpExactCall(
        transaction({
          data: build(0n, `0x${'11'.repeat(32)}` as `0x${string}`, ZERO_ADDRESS),
        }),
        expected
      )
    ).toThrow('tracking code');
    expect(() =>
      decodeBasePerpExactCall(
        transaction({ data: build(0n, `0x${'00'.repeat(32)}` as `0x${string}`, ACCOUNT) }),
        expected
      )
    ).toThrow('referrer');
  });

  it('rejects non-canonical ABI encoding', () => {
    const padded = `${transaction().data}00`;
    expect(() => decodeBasePerpExactCall(transaction({ data: padded }), expected)).toThrow(
      'canonical ABI encoding'
    );
  });
});

describe('Base Perp Guard attestation', () => {
  it('signs and independently verifies one direct commitOrder call', async () => {
    const decision = await createBasePerpGuardDecision(guard, transaction(), deps);
    expect(decision.attestation).not.toBeNull();
    await expect(verifyBasePerpGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });

  it('rejects a changed exact calldata even if the signed decision hash is retained', async () => {
    const decision = await createBasePerpGuardDecision(guard, transaction(), deps);
    decision.transaction.data = encodeFunctionData({
      abi: COMMIT_ORDER_ABI,
      functionName: 'commitOrder',
      args: [
        {
          marketId: ETH_MARKET_ID,
          accountId: ACCOUNT_ID,
          sizeDelta: SIZE_DELTA * 2n,
          settlementStrategyId: 0n,
          acceptablePrice: ACCEPTABLE_PRICE,
          trackingCode: `0x${'00'.repeat(32)}` as `0x${string}`,
          referrer: ZERO_ADDRESS,
        },
      ],
    });
    await expect(verifyBasePerpGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: false,
      reason: 'decision_hash_mismatch',
    });
  });

  it('rejects an unsupported verifier decision shape', async () => {
    await expect(verifyBasePerpGuardDecision({})).resolves.toMatchObject({
      valid: false,
      reason: 'malformed',
    });
  });

  it('does not sign when no attester is configured', async () => {
    const decision = await createBasePerpGuardDecision(guard, transaction(), {
      ...deps,
      signer: null,
    });
    expect(decision.attestation).toBeNull();
    await expect(verifyBasePerpGuardDecision(decision, deps)).resolves.toMatchObject({
      valid: false,
      reason: 'missing_attestation',
    });
  });

  it('rejects an untrusted attester', async () => {
    const decision = await createBasePerpGuardDecision(guard, transaction(), deps);
    await expect(
      verifyBasePerpGuardDecision(decision, { ...deps, trustAttester: async () => false })
    ).resolves.toMatchObject({ valid: false, reason: 'untrusted_attester' });
  });

  it('rejects an expired attestation', async () => {
    const decision = await createBasePerpGuardDecision(guard, transaction(), deps);
    await expect(
      verifyBasePerpGuardDecision(decision, { ...deps, now: () => deps.now() + 301 })
    ).resolves.toMatchObject({ valid: false, reason: 'expired', expired: true });
  });

  it('changes the decision hash when the declared direction differs', async () => {
    const long = await createBasePerpGuardDecision(guard, transaction(), deps);
    const shortGuard = { ...guard, action: 'open_short' as const };
    const short = await createBasePerpGuardDecision(
      shortGuard,
      transaction({
        data: encodeFunctionData({
          abi: COMMIT_ORDER_ABI,
          functionName: 'commitOrder',
          args: [
            {
              marketId: ETH_MARKET_ID,
              accountId: ACCOUNT_ID,
              sizeDelta: -SIZE_DELTA,
              settlementStrategyId: 0n,
              acceptablePrice: ACCEPTABLE_PRICE,
              trackingCode: `0x${'00'.repeat(32)}` as `0x${string}`,
              referrer: ZERO_ADDRESS,
            },
          ],
        }),
      }),
      deps
    );
    expect(basePerpGuardDecisionHash(short)).not.toBe(basePerpGuardDecisionHash(long));
  });
});
