import { keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  bindMonadPerpExactOrder,
  monadPerpCanonicalPayload,
  monadPerpOrderPayloadHash,
  MonadPerpExactOrderPayloadSchema,
  type MonadPerpExactOrderPayload,
} from '../monadPerpAction';
import { assessMonadPerpGuard, type MonadPerpGuardResult } from '../monadPerpGuard';
import {
  createMonadPerpGuardDecision,
  monadPerpGuardDecisionHash,
  verifyMonadPerpGuardDecision,
} from '../monadPerpGuardAttestation';

const NOW = new Date('2026-11-05T00:00:00.000Z');

const BASE_INPUT = {
  protocolId: 'perpl-perps-monad-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'AUSD' as const,
  sizeUsd: 10_000,
  marginValueUsd: 2_000,
};

const ORDER: MonadPerpExactOrderPayload = {
  protocolId: 'perpl-perps-monad-mainnet',
  marketId: 1,
  symbol: 'BTC',
  marginAssetSymbol: 'AUSD',
  side: 'long',
  orderType: 'market',
  sizeUsd: 10_000,
  marginUsd: 2_000,
  leverage: 5,
  limitPrice: null,
  priceBoundBps: 100,
  reduceOnly: false,
  account: 'perpl-account-123',
  clientOrderId: 'client-order-1',
  createdAtMs: NOW.getTime(),
};

function oracleMock() {
  return jest.fn(async (input: { asset: string }) => ({
    verdict: 'PASS' as const,
    consensusPrice: input.asset.trim().toUpperCase() === 'AUSD' ? 1 : 78_139,
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 3,
    attestation: { uid: 'uid-1', attester: '0xattester' },
  })) as never;
}

function venueState() {
  return {
    symbol: 'BTC' as const,
    marketId: 1,
    marketStatus: 'TRADING',
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: 1,
    markPrice: 78_117.5,
    indexPrice: 78_139.0,
    fundingRatePerInterval: -0.00001,
    nextFundingTimeMs: NOW.getTime() + 2_580_000,
    openInterestBase: 6.63842,
    dayNotionalVolume: 12_187_710.65,
    liveMaxLeverage: 6,
  };
}

function guardDeps() {
  return {
    checkOracle: oracleMock(),
    fetchVenueState: jest.fn(async () => venueState()),
    now: () => NOW,
  } as never;
}

async function passingGuard(): Promise<MonadPerpGuardResult> {
  const guard = await assessMonadPerpGuard(BASE_INPUT, guardDeps());
  expect(guard.verdict).toBe('ALLOW');
  return guard;
}

function expectedScope(guard: MonadPerpGuardResult) {
  return {
    protocolId: guard.protocolId,
    action: guard.action,
    assetSymbol: guard.market.assetSymbol,
    sizeUsd: guard.projected.sizeUsd,
    marginValueUsd: guard.projected.marginValueUsd,
  };
}

const signer = privateKeyToAccount(`0x${'11'.repeat(32)}` as `0x${string}`);
const signerDeps = {
  signer,
  now: () => 1_792_252_800,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/monad-perp-guard/verify',
  trustAttester: async (value: string) => value.toLowerCase() === signer.address.toLowerCase(),
};

describe('P1-2 Monad exact-order binding (centralized payload)', () => {
  it('binds the exact centralized order payload consistently', async () => {
    const guard = await passingGuard();
    const action = bindMonadPerpExactOrder(ORDER, expectedScope(guard));
    expect(action.action).toBe('open_long');
    expect(action.marketId).toBe(1);
    expect(action.side).toBe('long');
    expect(action.payloadHash).toBe(monadPerpOrderPayloadHash(ORDER));
    expect(action.bindingSurface).toBe('centralized-order-payload-canonical-serialization');
    expect(action.provesOnchainExecution).toBe(false);
    // Canonical serialization is deterministic regardless of key insertion order.
    expect(monadPerpCanonicalPayload({ ...ORDER })).toBe(monadPerpCanonicalPayload(ORDER));
  });

  it('changes the payload hash for every bound field', () => {
    const baseline = monadPerpOrderPayloadHash(ORDER);
    const variants: Partial<MonadPerpExactOrderPayload>[] = [
      { marketId: 20 },
      { symbol: 'ETH' },
      { side: 'short' },
      { orderType: 'limit' },
      { sizeUsd: 11_000 },
      { marginUsd: 2_100 },
      { leverage: 6 },
      { limitPrice: 78_000 },
      { priceBoundBps: 200 },
      { account: 'different-account' },
      { clientOrderId: 'different-id' },
      { createdAtMs: NOW.getTime() + 1 },
    ];
    for (const variant of variants) {
      expect(monadPerpOrderPayloadHash({ ...ORDER, ...variant })).not.toBe(baseline);
    }
  });

  it('rejects tampered fields that leave the reviewed open-position profile', async () => {
    const guard = await passingGuard();
    const scope = expectedScope(guard);
    expect(() => bindMonadPerpExactOrder({ ...ORDER, marketId: 999 }, scope)).toThrow(
      /does not match the reviewed market/
    );
    expect(() => bindMonadPerpExactOrder({ ...ORDER, side: 'short' }, scope)).toThrow(
      /side does not match/
    );
    expect(() => bindMonadPerpExactOrder({ ...ORDER, sizeUsd: 11_000 }, scope)).toThrow(
      /notional or margin does not match/
    );
    expect(() => bindMonadPerpExactOrder({ ...ORDER, leverage: 6 }, scope)).toThrow(
      /leverage does not match/
    );
    expect(() => bindMonadPerpExactOrder({ ...ORDER, reduceOnly: true }, scope)).toThrow(
      /Reduce-only orders are outside/
    );
    expect(() =>
      bindMonadPerpExactOrder({ ...ORDER, orderType: 'market', limitPrice: 78_000 }, scope)
    ).toThrow(/must not carry a limit price/);
    expect(() =>
      bindMonadPerpExactOrder({ ...ORDER, symbol: 'HYPE' }, scope)
    ).toThrow(/does not match the reviewed market/);
  });

  it('rejects unbound extra fields (.strict)', () => {
    expect(() =>
      MonadPerpExactOrderPayloadSchema.parse({ ...ORDER, hiddenExtra: 'smuggled' })
    ).toThrow();
  });
});

describe('P1-2 Monad perp attestation and independent recompute', () => {
  it('signs a decision and independently recomputes its hashes and signature', async () => {
    const guard = await passingGuard();
    const decision = await createMonadPerpGuardDecision(guard, ORDER, signerDeps);
    expect(decision.attestation).not.toBeNull();
    expect(decision.action.payloadHash).toBe(monadPerpOrderPayloadHash(ORDER));

    // Independent recompute of the payload hash (no helper reuse).
    const independentPayloadHash = keccak256(
      new TextEncoder().encode(
        canonicalJsonString(MonadPerpExactOrderPayloadSchema.parse(ORDER))
      )
    );
    expect(decision.action.payloadHash).toBe(independentPayloadHash);

    // Independent recompute of the decision hash (no helper reuse).
    const independentDecisionHash = keccak256(
      new TextEncoder().encode(
        canonicalJsonString({
          schema: 'insight.monad-perp-guard-decision.v1',
          guard: decision.guard,
          order: decision.order,
          action: decision.action,
        })
      )
    );
    expect(decision.decisionHash).toBe(independentDecisionHash);
    expect(decision.decisionHash).toBe(monadPerpGuardDecisionHash(decision));

    const verification = await verifyMonadPerpGuardDecision(decision, signerDeps);
    expect(verification.valid).toBe(true);
    expect(verification.reason).toBe('verified');
    expect(verification.expired).toBe(false);
  });

  it('rejects a tampered order after signing', async () => {
    const guard = await passingGuard();
    const decision = await createMonadPerpGuardDecision(guard, ORDER, signerDeps);
    const tampered = { ...decision, order: { ...ORDER, sizeUsd: 11_000 } };
    const verification = await verifyMonadPerpGuardDecision(tampered, signerDeps);
    expect(verification.valid).toBe(false);
  });

  it('rejects a tampered bound action after signing', async () => {
    const guard = await passingGuard();
    const decision = await createMonadPerpGuardDecision(guard, ORDER, signerDeps);
    const tampered = {
      ...decision,
      action: { ...decision.action, payloadHash: `0x${'9'.repeat(64)}` as `0x${string}` },
    };
    const verification = await verifyMonadPerpGuardDecision(tampered, signerDeps);
    expect(verification.valid).toBe(false);
  });

  it('rejects an invalid signature', async () => {
    const guard = await passingGuard();
    const decision = await createMonadPerpGuardDecision(guard, ORDER, signerDeps);
    const tampered = {
      ...decision,
      attestation: {
        ...decision.attestation!,
        signature: `0x${'12'.repeat(65)}` as `0x${string}`,
      },
    };
    const verification = await verifyMonadPerpGuardDecision(tampered, signerDeps);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('signature_invalid');
  });

  it('rejects an untrusted attester', async () => {
    const guard = await passingGuard();
    const decision = await createMonadPerpGuardDecision(guard, ORDER, signerDeps);
    const verification = await verifyMonadPerpGuardDecision(decision, {
      now: signerDeps.now,
      trustAttester: async () => false,
    });
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('untrusted_attester');
  });

  it('emits no attestation when no signer is configured', async () => {
    const guard = await passingGuard();
    const decision = await createMonadPerpGuardDecision(guard, ORDER, { signer: null });
    expect(decision.attestation).toBeNull();
    const verification = await verifyMonadPerpGuardDecision(decision, signerDeps);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('missing_attestation');
  });
});
