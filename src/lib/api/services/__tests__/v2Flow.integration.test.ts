/**
 * End-to-end integration test for the documented v2 flow.
 *
 * Unlike the unit tests (which mock preTradeSafetyCheck / signRecheck), this
 * test runs the REAL pre-trade engine + REAL recheck service + REAL verify
 * routing end-to-end, mocking only the leaf data sources (consensus, stablecoin
 * snapshots, ML, supabase audit). It proves the three pieces compose into the
 * flow Raul's spec describes:
 *
 *   1. pre-trade v2  → issues a real OracleSafetyCheck attestation (26 fields)
 *   2. recheck        → re-runs + issues a real OracleSafetyRecheck (28 fields)
 *                       referencing the original by originalUid + originalRequestHash
 *   3. verify         → routes BOTH attestations by schemaVersion/primaryType
 *                       and confirms each is valid
 *
 * Binding invariants asserted:
 *   - recheck.data.originalUid === original v2 attestation's uid
 *   - recheck.data.originalRequestHash === original v2 attestation's requestHash
 *   - recheck.data.requestHash === recheck.data.originalRequestHash (same-trade
 *     continuity — the recheck re-ran with the same params, so its own
 *     requestHash equals the original's)
 */

import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import type {
  ConsensusPriceResponse,
  ConsensusProviderPrice,
} from '@/lib/api/services/consensusPriceService';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Blockchain, OracleProvider } from '@/types/oracle';

// Stub the API handler so importing the verify route (for verifyAttestationBySchema)
// doesn't pull the middleware chain into the test.
jest.mock('@/lib/api/handler', () => ({
  createApiHandler: jest.fn(() => jest.fn()),
  createOptionsHandler: jest.fn(() => jest.fn()),
  ApiResponseBuilder: { success: jest.fn((data: unknown) => ({ success: true, data })) },
}));

jest.mock('@/lib/api/services/consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
}));

jest.mock('@/lib/stablecoins/monitor', () => ({
  calculateAllStablecoinSnapshots: jest.fn(),
}));

jest.mock('@/lib/protocols/dynamicData', () => ({
  getProtocolByIdWithDynamicData: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/ml/inference', () => ({
  scorePreTradeMultiHorizon: jest.fn(),
  getModelStatus: jest.fn(() => ({ active: false, trainedAt: null, metrics: {} })),
}));

const mockedGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;
const mockedSnapshots = calculateAllStablecoinSnapshots as jest.MockedFunction<
  typeof calculateAllStablecoinSnapshots
>;
const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const NOW_MS = 1700000000000;

function makeProvider(overrides: Partial<ConsensusProviderPrice> = {}): ConsensusProviderPrice {
  return {
    provider: 'chainlink' as OracleProvider,
    symbol: 'ETH',
    chain: 'ethereum' as Blockchain,
    price: 1860,
    deviationPct: 0.1,
    isOutlier: false,
    confidence: 0.95,
    timestamp: Date.now(),
    dataAgeSeconds: 5,
    reputationScore: 90,
    status: 'success',
    ...overrides,
  };
}

function makeConsensus(providers: ConsensusProviderPrice[]): ConsensusPriceResponse {
  return {
    symbol: 'ETH',
    consensusPrice: 1860,
    method: 'median',
    recommendedMethod: 'median',
    confidence: 0.95,
    confidenceLevel: 'high',
    agreement: 0.99,
    participantCount: providers.length,
    excludedCount: 0,
    excludedProviders: [],
    priceRange: { min: 1859, max: 1861 },
    methodResults: { median: 1860, trimmed_mean: 1860, weighted_median: 1860, iqr_filtered: 1860 },
    providers,
    recommendedProvider: 'chainlink' as OracleProvider,
  };
}

function stubAuditClient() {
  const insert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ insert });
  mockedCreateServiceRoleClient.mockReturnValue({ from } as never);
}

describe('v2 flow integration: pre-trade v2 → recheck → verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubAuditClient();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    mockedSnapshots.mockResolvedValue([]);
    // 4 healthy providers → quorum gate passes → PASS verdict → v2 attestation issued.
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus([
        makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 0.05 }),
        makeProvider({ provider: 'redstone' as OracleProvider, price: 1860.5, deviationPct: 0.03 }),
        makeProvider({ provider: 'api3' as OracleProvider, price: 1859.8, deviationPct: 0.02 }),
        makeProvider({ provider: 'pyth' as OracleProvider, price: 1860.1, deviationPct: 0.04 }),
      ])
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('runs the full documented flow end-to-end and all three attestations verify', async () => {
    const { preTradeSafetyCheck } = await import('../preTradeSafetyService');
    const { preTradeRecheck } = await import('../preTradeRecheckService');
    const { verifyAttestationBySchema } =
      await import('@/app/api/v1/safety/attestation/verify/route');

    // ---- Step 1: pre-trade v2 check → real v2 attestation ----
    const tradeInput = {
      asset: 'ETH',
      chainId: 1,
      action: 'swap' as const,
      tradeAmountUsd: 50000,
      schemaVersion: 2 as const,
      destinationAsset: 'USDC',
    };
    const original = await preTradeSafetyCheck(tradeInput);

    // Healthy oracles → PASS, 4 participants (≥3 quorum), v2 attestation issued.
    expect(original.verdict).toBe('PASS');
    expect(original.participantCount).toBe(4);
    expect(original.attestation).not.toBeNull();
    const v2Att = original.attestation!;
    expect(v2Att.schemaVersion).toBe(2);
    expect(v2Att.attester).toBe(TEST_ATTESTER);

    // ---- Step 2: recheck referencing the original ----
    const recheckResult = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      destinationAsset: 'USDC',
      originalUid: v2Att.uid,
      originalRequestHash: v2Att.data.requestHash,
      originalConsensusPrice: original.consensusPrice,
    });

    // Recheck verdict reflects current (still-healthy) state.
    expect(recheckResult.recheck).not.toBeNull();
    const recheckAtt = recheckResult.recheck!;
    expect(recheckAtt.type).toBe('OracleSafetyRecheck');
    expect(recheckAtt.attester).toBe(TEST_ATTESTER);
    expect(recheckResult.stillValid).toBe(true);
    expect(recheckResult.stillValidReason).toBe('ok');
    // Drift is ~0 (same mocked consensus both times).
    expect(recheckResult.driftSinceOriginalPct).toBeLessThan(0.01);

    // ---- Binding invariants (the spec's same-trade continuity contract) ----
    expect(recheckAtt.data.originalUid).toBe(v2Att.uid);
    expect(recheckAtt.data.originalRequestHash).toBe(v2Att.data.requestHash);
    // The recheck re-ran with the same trade params, so its own requestHash
    // (one of the 26 v2 fields) MUST equal originalRequestHash.
    expect(recheckAtt.data.requestHash).toBe(recheckAtt.data.originalRequestHash);
    expect(recheckAtt.data.requestHash).toBe(v2Att.data.requestHash);

    // ---- Step 3: verify routes BOTH attestations correctly ----
    const v2Verification = await verifyAttestationBySchema(v2Att);
    expect(v2Verification.valid).toBe(true);
    expect(v2Verification.schemaVersion).toBe(2);
    expect(v2Verification.uid).toBe(v2Att.uid);

    const recheckVerification = await verifyAttestationBySchema(recheckAtt);
    expect(recheckVerification.valid).toBe(true);
    expect(recheckVerification.schemaVersion).toBe(2);
    expect(recheckVerification.uid).toBe(recheckAtt.uid);

    // The two attestations are DISTINCT (different UIDs, different types) — the
    // recheck did not overwrite or duplicate the original.
    expect(recheckAtt.uid).not.toBe(v2Att.uid);
    expect(recheckAtt.eip712.primaryType).toBe('OracleSafetyRecheck');
    expect(v2Att.eip712.primaryType).toBe('OracleSafetyCheck');
  });

  it('survives a JSON wire round trip across the full flow', async () => {
    // The attestations travel through API responses + verify bodies as JSON.
    // bigint can't be JSON-serialized; this proves the number-valued data
    // round-trips losslessly across the whole flow (v2 + recheck + verify).
    const { preTradeSafetyCheck } = await import('../preTradeSafetyService');
    const { preTradeRecheck } = await import('../preTradeRecheckService');
    const { verifyAttestationBySchema } =
      await import('@/app/api/v1/safety/attestation/verify/route');

    const original = await preTradeSafetyCheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      schemaVersion: 2,
      destinationAsset: 'USDC',
    });
    const recheckResult = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      destinationAsset: 'USDC',
      originalUid: original.attestation!.uid,
      originalRequestHash: original.attestation!.data.requestHash,
    });

    // JSON round-trip both attestations (would throw if any field were bigint).
    const v2Wire = JSON.parse(JSON.stringify(original.attestation));
    const recheckWire = JSON.parse(JSON.stringify(recheckResult.recheck));

    expect(await verifyAttestationBySchema(v2Wire)).toMatchObject({ valid: true });
    expect(await verifyAttestationBySchema(recheckWire)).toMatchObject({ valid: true });
  });

  it('recheck reflects a deteriorated oracle state (verdict flips to BLOCK)', async () => {
    // First check: healthy → PASS.
    const { preTradeSafetyCheck } = await import('../preTradeSafetyService');
    const { preTradeRecheck } = await import('../preTradeRecheckService');

    const original = await preTradeSafetyCheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      schemaVersion: 2,
      destinationAsset: 'USDC',
    });
    expect(original.verdict).toBe('PASS');

    // Recheck: oracle state deteriorates — only 1 provider survives (below the
    // v2 quorum gate of ≥3) → coverageStatus=INSUFFICIENT → verdict=BLOCK.
    mockedGetConsensusPrice.mockResolvedValueOnce(
      makeConsensus([makeProvider({ provider: 'chainlink' as OracleProvider })])
    );

    const recheckResult = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      destinationAsset: 'USDC',
      originalUid: original.attestation!.uid,
      originalRequestHash: original.attestation!.data.requestHash,
      originalConsensusPrice: original.consensusPrice,
    });

    // The recheck verdict reflects the CURRENT (deteriorated) state.
    expect(recheckResult.verdict).toBe('BLOCK');
    expect(recheckResult.stillValid).toBe(false);
    expect(recheckResult.stillValidReason).toBe('verdict_deteriorated');
    // A recheck attestation is STILL issued (it attests to the deteriorated
    // state — that's the point of a recheck: prove the oracle is NOW unsafe).
    expect(recheckResult.recheck).not.toBeNull();
    expect(recheckResult.recheck!.data.verdict).toBe('BLOCK');
    expect(recheckResult.recheck!.data.coverageStatus).toBe('INSUFFICIENT');
  });
});
