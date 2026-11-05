import { createHash } from 'node:crypto';

import { DRIFT_V2_MAINNET_PROGRAM_ID } from '../driftPerpMarket';
import { assessSolanaPerpGuardExact, type SolanaPerpGuardAccountCheck } from '../solanaPerpGuard';
import {
  createSolanaPerpGuardDecision,
  SOLANA_PERP_GUARD_ATTESTATION_SCHEMA,
  verifySolanaPerpGuardDecision,
} from '../solanaPerpGuardAttestation';

import type { DriftPerpTransaction } from '../solanaPerpAction';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let output = '';
  while (value > 0n) {
    output = ALPHABET[Number(value % 58n)] + output;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    output = `1${output}`;
  }
  return output || '1';
}
function key(seed: number): string {
  return base58(Uint8Array.from({ length: 32 }, (_, index) => ((seed + index) % 255) + 1));
}
function littleEndian(value: bigint | number, size: number): number[] {
  let current = BigInt(value);
  const bytes: number[] = [];
  for (let index = 0; index < size; index += 1) {
    bytes.push(Number(current & 0xffn));
    current >>= 8n;
  }
  return bytes;
}

/** 0.367647058 BTC at the mocked 68,000 oracle price ≈ the declared 25,000 USD. */
const REVIEWED_BASE_AMOUNT = 367_647_058n;

function orderParamsData(options: {
  direction?: number;
  marketIndex?: number;
  baseAssetAmount?: bigint;
  orderType?: number;
  reduceOnly?: boolean;
}): string {
  const bytes = [
    ...createHash('sha256').update('global:place_perp_order').digest().subarray(0, 8),
    options.orderType ?? 0,
    1, // marketType Perp
    options.direction ?? 0,
    0, // userOrderId
    ...littleEndian(options.baseAssetAmount ?? REVIEWED_BASE_AMOUNT, 8),
    ...littleEndian(0n, 8), // price
    ...littleEndian(options.marketIndex ?? 1, 2),
    options.reduceOnly === true ? 1 : 0,
    0, // postOnly
    0, // bitFlags
    0, // maxTs None
    0, // triggerPrice None
    0, // triggerCondition Above
    0, // oraclePriceOffset None
    1,
    0, // auctionDuration Some(0)
    1,
    ...littleEndian(0n, 8), // auctionStartPrice Some(0)
    1,
    ...littleEndian(0n, 8), // auctionEndPrice Some(0)
  ];
  return base58(Uint8Array.from(bytes));
}

function transaction(data = orderParamsData({})): DriftPerpTransaction {
  const accountKeys = [
    key(1),
    key(2),
    key(3),
    key(4),
    key(5),
    key(6),
    key(7),
    key(8),
    DRIFT_V2_MAINNET_PROGRAM_ID,
  ];
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: accountKeys[0],
    recentBlockhash: key(12),
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [{ programIdIndex: 8, accountIndexes: [0, 1, 2, 3, 4, 5, 6, 7], data }],
  };
}

const BASE_GUARD = {
  protocolId: 'drift-v2-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'USDC',
  sizeUsd: 25_000,
  marginValueUsd: 2_500,
};

function oracleMock(verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK') {
  return jest.fn(async () => ({
    verdict,
    consensusPrice: 68_000,
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 3,
    attestation: { uid: 'uid-1', attester: '0xattester' },
  })) as never;
}

function venueState(oraclePrice: number | null = 68_000) {
  const mark = oraclePrice ?? null;
  return {
    status: 'observed' as const,
    observedAt: '2026-11-04T00:00:00.000Z',
    sourceFreshnessSeconds: 2,
    markPrice: mark,
    oraclePrice,
    markOracleDeviationBps: 0,
    displayedTopDepthNotionalUsd: null,
    fundingRate: 0.000_012_5,
    openInterestCoin: 1_234.5,
    dayNotionalVolume: null,
    liveMaxLeverage: 20,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: 1,
      marketAccountAddress: 'DriftBtcPerpMarketPdaOnSolanaMainnet0000000',
      oracleSource: 'pythLazer',
      oracleSourceSupported: true,
      oracleConfidence: 12.3,
      markPriceTwap: 68_001,
      last24hAvgFundingRatePerHourPercent: 0.001_25,
      fundingPeriodSeconds: 3_600,
      openInterestNotionalUsd: 83_946_000,
      maxOpenInterestBase: 1_000_000,
      openInterestUtilizationPct: 12.35,
      netBaseAssetAmount: 111.1,
      marginRatioMaintenance: 0.025,
      contractTier: 'A',
      marketStatus: 'active',
      pausedOperationsMask: 0,
      ammLastUpdateSlot: 123_456_789,
      unavailableReason: null,
    },
  };
}

function accountChecksMock(): SolanaPerpGuardAccountCheck[] {
  return [
    { address: DRIFT_V2_MAINNET_PROGRAM_ID, role: 'program', owner: null, executable: true },
    { address: key(21), role: 'state', owner: DRIFT_V2_MAINNET_PROGRAM_ID, executable: null },
    { address: key(22), role: 'user', owner: DRIFT_V2_MAINNET_PROGRAM_ID, executable: null },
    { address: key(23), role: 'perp-market', owner: DRIFT_V2_MAINNET_PROGRAM_ID, executable: null },
  ];
}

function passingDependencies(overrides: Record<string, unknown> = {}) {
  return {
    checkOracle: oracleMock('PASS'),
    fetchVenueState: jest.fn(async () => venueState()),
    verifyProtocolAccounts: jest.fn(async () => accountChecksMock()),
    simulate: jest.fn(async (tx: DriftPerpTransaction) => ({
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      messageHash: reviewedMessageHash(tx),
      simulationSlot: 123,
      simulatedAt: '2026-11-04T00:00:00.000Z',
      status: 'SIMULATED',
      unitsConsumed: 12_345,
      feeLamports: '5000',
    })),
    now: () => new Date('2026-11-04T00:00:00.000Z'),
    // P0-2: these cases cover the exact-binding / attestation logic itself, so
    // inject the explicit offline-review / test-only bypass. Production default
    // is 'enforced' (see productionDependencies + the cases below).
    reviewedProfileEnforcement: { mode: 'bypass-for-offline-review' } as const,
    ...overrides,
  } as never;
}

/** Production-shaped deps: NO bypass injection -> guard/attestation default 'enforced'. */
function productionDependencies() {
  const deps = { ...(passingDependencies() as Record<string, unknown>) };
  delete deps.reviewedProfileEnforcement;
  return deps as never;
}

/** Offline-review / test-only bypass for the attestation signing layer. */
const ATTESTATION_BYPASS = {
  reviewedProfileEnforcement: { mode: 'bypass-for-offline-review' } as const,
};

/** Compute the exact message hash the decoder will produce for this transaction. */
function reviewedMessageHash(tx: DriftPerpTransaction): string {
  // Mirrors solanaLendingMessageHash: sha256 over the canonical unsigned message.
  // Recomputing it here keeps the test independent of private helpers.
  const { encodeUnsignedSolanaLendingMessage } = jest.requireActual<{
    encodeUnsignedSolanaLendingMessage: (t: DriftPerpTransaction) => Uint8Array;
  }>('@/lib/lending/solanaLendingAction');
  return `0x${createHash('sha256').update(encodeUnsignedSolanaLendingMessage(tx)).digest('hex')}`;
}

describe('assessSolanaPerpGuardExact', () => {
  it('binds a canonical reviewed market order end to end', async () => {
    const tx = transaction();
    const deps = passingDependencies();
    const result = await assessSolanaPerpGuardExact(BASE_GUARD, tx, deps);
    expect(result.verdict).toBe('ALLOW');
    expect(result.exactAction).not.toBeNull();
    expect(result.exactAction?.marketIndex).toBe(1);
    expect(result.exactAction?.action).toBe('open_long');
    expect(result.exactAction?.account).toBe(tx.feePayer);
    expect(result.protocolChecks.status).toBe('VERIFIED');
    expect(result.protocolChecks.accounts).toHaveLength(4);
    expect(result.simulation?.status).toBe('SIMULATED');
    expect(result.simulation?.messageHash).toBe(result.exactAction?.messageHash);
    expect(deps.verifyProtocolAccounts).toHaveBeenCalledTimes(1);
    expect(deps.simulate).toHaveBeenCalledTimes(1);
  });

  it('blocks a transaction outside the reviewed market-order profile', async () => {
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(orderParamsData({ orderType: 1 })),
      passingDependencies()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.exactAction).toBeNull();
    expect(result.reasons.join(' ')).toMatch(/outside the reviewed Drift market-order profile/);
  });

  it('blocks a market-index mismatch with the assessed market', async () => {
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(orderParamsData({ marketIndex: 0 })),
      passingDependencies()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/does not match the assessed market/);
  });

  it('blocks a direction mismatch with the assessed action', async () => {
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(orderParamsData({ direction: 1 })),
      passingDependencies()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/does not match the assessed open_long action/);
  });

  it('blocks an implied notional beyond the reviewed tolerance', async () => {
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(orderParamsData({ baseAssetAmount: 500_000_000n })),
      passingDependencies()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/implied notional departs/);
  });

  it('blocks when the simulated message hash differs from the reviewed message', async () => {
    const tx = transaction();
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      tx,
      passingDependencies({
        simulate: jest.fn(async () => ({
          network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          messageHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          simulationSlot: 123,
          simulatedAt: '2026-11-04T00:00:00.000Z',
          status: 'SIMULATED',
          unitsConsumed: 12_345,
          feeLamports: '5000',
        })),
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/not for the exact reviewed message/);
  });

  it('blocks when live account verification fails', async () => {
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(),
      passingDependencies({
        verifyProtocolAccounts: jest.fn(async () => {
          throw new Error('program no longer executable');
        }),
      })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.protocolChecks.status).toBe('UNAVAILABLE');
    expect(result.reasons.join(' ')).toMatch(/program no longer executable/);
  });

  it('preserves a CAUTION verdict from the oracle layer', async () => {
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(),
      passingDependencies({ checkOracle: oracleMock('CAUTION') })
    );
    expect(result.verdict).toBe('CAUTION');
    expect(result.exactAction).not.toBeNull();
  });

  it('default production path BLOCKs the frozen Drift profile in the exact-binding guard', async () => {
    // NO bypass injection anywhere -> production default 'enforced'.
    const result = await assessSolanaPerpGuardExact(
      BASE_GUARD,
      transaction(),
      productionDependencies()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/PROFILE_/);
    expect(result.reviewedProfile?.enforced).toBe(true);
  });
});

describe('Solana perp guard decision attestation', () => {
  const previousSeed = process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
  beforeAll(() => {
    process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = '11'.repeat(32);
  });
  afterAll(() => {
    if (previousSeed === undefined) delete process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
    else process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = previousSeed;
  });

  it('round-trips an ALLOW decision through sign and verify', async () => {
    const tx = transaction();
    const guard = await assessSolanaPerpGuardExact(BASE_GUARD, tx, passingDependencies());
    const decision = createSolanaPerpGuardDecision(guard, tx, ATTESTATION_BYPASS);
    expect(decision.schema).toBe(SOLANA_PERP_GUARD_ATTESTATION_SCHEMA);
    expect(decision.attestation).not.toBeNull();
    expect(decision.action?.messageHash).toBe(guard.exactAction?.messageHash);
    const verification = verifySolanaPerpGuardDecision(decision);
    expect(verification.valid).toBe(true);
    expect(verification.reason).toBe('OK');
    expect(verification.expired).toBe(false);
  });

  it('refuses to attest a BLOCK decision', async () => {
    const tx = transaction(orderParamsData({ orderType: 1 }));
    const guard = await assessSolanaPerpGuardExact(BASE_GUARD, tx, passingDependencies());
    const decision = createSolanaPerpGuardDecision(guard, tx, ATTESTATION_BYPASS);
    expect(guard.verdict).toBe('BLOCK');
    expect(decision.attestation).toBeNull();
    const verification = verifySolanaPerpGuardDecision(decision);
    expect(verification.valid).toBe(false);
  });

  it('rejects a tampered transaction binding', async () => {
    const tx = transaction();
    const guard = await assessSolanaPerpGuardExact(BASE_GUARD, tx, passingDependencies());
    const decision = createSolanaPerpGuardDecision(guard, tx, ATTESTATION_BYPASS);
    const tampered = {
      ...decision,
      transaction: transaction(orderParamsData({ baseAssetAmount: 1n })),
    };
    const verification = verifySolanaPerpGuardDecision(tampered);
    expect(verification.valid).toBe(false);
    expect(['EXACT_ACTION_MISMATCH', 'DECISION_HASH_MISMATCH', 'MALFORMED']).toContain(
      verification.reason
    );
  });

  it('rejects an untrusted attester', async () => {
    const tx = transaction();
    const guard = await assessSolanaPerpGuardExact(BASE_GUARD, tx, passingDependencies());
    const decision = createSolanaPerpGuardDecision(guard, tx, ATTESTATION_BYPASS);
    const verification = verifySolanaPerpGuardDecision(decision, {
      trustedPublicKey: 'DifferentTrustedKey1111111111111111111111111',
    });
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('UNTRUSTED_ATTESTER');
  });

  it('refuses to SIGN a decision for the frozen Drift profile by default', async () => {
    const tx = transaction();
    // Bypass only the guard assessment so an ALLOW verdict exists; do NOT bypass
    // the attestation's own enforcement -> production default must refuse to sign.
    const guard = await assessSolanaPerpGuardExact(BASE_GUARD, tx, passingDependencies());
    expect(guard.verdict).toBe('ALLOW');
    expect(guard.exactAction).not.toBeNull();
    const decision = createSolanaPerpGuardDecision(guard, tx); // no deps -> default enforced
    expect(decision.attestation).toBeNull();
    expect(verifySolanaPerpGuardDecision(decision).valid).toBe(false);
  });
});
