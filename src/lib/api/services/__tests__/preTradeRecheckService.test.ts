/**
 * Unit tests for the pre-trade re-check service.
 *
 * Mocks preTradeSafetyCheck (the re-run) so we can assert the recheck service's
 * PLUMBING: it re-runs with schemaVersion=2, builds a recheck attestation from
 * the fresh v2 data + original references, computes drift, and derives
 * stillValid. signRecheck runs real (test attester key) so the recheck
 * attestation is a genuine signed object, not a stub.
 */

import { buildMessage } from '@/lib/attestations/oracleSafetyAttestationV2';
import type {
  AttestationDataV2,
  OracleSafetyAttestationV2,
} from '@/lib/attestations/oracleSafetyAttestationV2';

import { preTradeRecheck, DEFAULT_MAX_DRIFT_PCT } from '../preTradeRecheckService';
import { preTradeSafetyCheck, type PreTradeSafetyResult } from '../preTradeSafetyService';

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const NOW_MS = 1700000000000;

jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
  // Re-export the constant the service under test imports.
  // (Not strictly needed — the mock replaces the module, but the service imports
  // AuditMeta as a type, which is erased at runtime.)
}));

// Mock the heavy dependencies that preTradeSafetyCheck's real implementation
// pulls in — these are never called (preTradeSafetyCheck is mocked), but jest
// still resolves the module graph for the service under test.
jest.mock('@/lib/stablecoins/monitor', () => ({ calculateAllStablecoinSnapshots: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('@/lib/ml/inference', () => ({
  getModelStatus: jest.fn(() => ({ active: false, trainedAt: null, metrics: {} })),
  scorePreTradeMultiHorizon: jest.fn(() => null),
}));

const mockedPreTradeSafetyCheck = preTradeSafetyCheck as jest.MockedFunction<
  typeof preTradeSafetyCheck
>;

const ORIGINAL_UID = '0x6822cdca18d73ed65d0913506bd14db3b183692140924110d06acca703797c4b';
const ORIGINAL_REQUEST_HASH = ('0x' + 'a'.repeat(64)) as `0x${string}`;

/** Build a real AttestationDataV2 (numbers, JSON-safe) for the mocked re-run. */
async function makeV2Data(): Promise<AttestationDataV2> {
  return buildMessage({
    verdict: 'PASS',
    sourceAssetId: 'eip155:1/slip44:60',
    destinationAssetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 50000,
    consensusPrice: 3000,
    maxDeviationPct: 1.5,
    manipulationRiskScore: 0.12,
    participantCount: 4,
    crossProviderAgreement: 0.985,
    maxStablecoinDepegPct: 0,
    maxDataAgeSeconds: 12,
    recommendedMaxPositionUsd: 250000,
    contributingFactors: [{ rule: 'max_provider_deviation_pct' }],
    providerObservations: [
      {
        provider: 'chainlink',
        feedId: '0x...',
        value: 300005000000n,
        timestamp: 1700000000n,
        dataAgeSeconds: 2n,
        included: true,
        exclusionReason: '',
      },
    ],
    checkedAtMs: NOW_MS,
  });
}

/** A minimal PreTradeSafetyResult with the fields the recheck service reads. */
function makeResult(overrides: Partial<PreTradeSafetyResult> = {}): PreTradeSafetyResult {
  return {
    verdict: 'PASS',
    consensusPrice: 3000,
    maxDeviationPct: 1.5,
    manipulationRiskScore: 0.12,
    staleDataRisk: false,
    crossProviderAgreement: 0.985,
    recommendedMaxPositionUsd: 250000,
    participantCount: 4,
    providerPrices: {},
    depegWarnings: [],
    warnings: [],
    contributingFactors: [],
    protocolSafety: null,
    mlScore: null,
    mlModelVersion: null,
    mlScore1h: null,
    mlScore6h: null,
    anomalyScore: 0.1,
    attestation: null,
    evaluatedAt: new Date(NOW_MS).toISOString(),
    latencyMs: 50,
    ...overrides,
  } as PreTradeSafetyResult;
}

describe('preTradeRecheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('re-runs the safety check with schemaVersion=2 and issues a recheck attestation', async () => {
    const v2Data = await makeV2Data();
    const v2Att = { schemaVersion: 2 as const, data: v2Data } as OracleSafetyAttestationV2;
    mockedPreTradeSafetyCheck.mockResolvedValue(makeResult({ attestation: v2Att }));

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });

    // Re-ran with schemaVersion=2.
    expect(mockedPreTradeSafetyCheck).toHaveBeenCalledTimes(1);
    const callInput = mockedPreTradeSafetyCheck.mock.calls[0][0];
    expect(callInput.schemaVersion).toBe(2);
    expect(callInput.asset).toBe('ETH');

    // Issued a recheck attestation referencing the original.
    expect(result.recheck).not.toBeNull();
    expect(result.recheck!.type).toBe('OracleSafetyRecheck');
    expect(result.recheck!.data.originalUid).toBe(ORIGINAL_UID);
    expect(result.recheck!.data.originalRequestHash).toBe(ORIGINAL_REQUEST_HASH);
    expect(result.recheck!.attester).toBe(TEST_ATTESTER);

    // Echoed references.
    expect(result.originalUid).toBe(ORIGINAL_UID);
    expect(result.originalRequestHash).toBe(ORIGINAL_REQUEST_HASH);
  });

  it('computes drift vs the original consensus price', async () => {
    const v2Data = await makeV2Data();
    mockedPreTradeSafetyCheck.mockResolvedValue(
      makeResult({ consensusPrice: 3060, attestation: { schemaVersion: 2, data: v2Data } as never })
    );

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
      originalConsensusPrice: 3000,
    });

    // |3060 − 3000| / 3000 × 100 = 2%
    expect(result.driftSinceOriginalPct).toBeCloseTo(2, 5);
    // 2% is within the default 2% threshold → stillValid true.
    expect(result.stillValid).toBe(true);
    expect(result.stillValidReason).toBe('ok');
  });

  it('flips stillValid=false with verdict_deteriorated when the fresh verdict is BLOCK', async () => {
    const v2Data = await makeV2Data();
    mockedPreTradeSafetyCheck.mockResolvedValue(
      makeResult({ verdict: 'BLOCK', attestation: { schemaVersion: 2, data: v2Data } as never })
    );

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });

    expect(result.stillValid).toBe(false);
    expect(result.stillValidReason).toBe('verdict_deteriorated');
  });

  it('flips stillValid=false with drift_exceeded when drift passes the threshold', async () => {
    const v2Data = await makeV2Data();
    // current 3150 vs original 3000 → 5% drift, above the 2% default.
    mockedPreTradeSafetyCheck.mockResolvedValue(
      makeResult({ consensusPrice: 3150, attestation: { schemaVersion: 2, data: v2Data } as never })
    );

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
      originalConsensusPrice: 3000,
    });

    expect(result.driftSinceOriginalPct).toBeCloseTo(5, 5);
    expect(result.stillValid).toBe(false);
    expect(result.stillValidReason).toBe('drift_exceeded');
  });

  it('honors a custom maxDriftPct threshold', async () => {
    const v2Data = await makeV2Data();
    // 1.5% drift — under the default 2% but above a custom 1% threshold.
    mockedPreTradeSafetyCheck.mockResolvedValue(
      makeResult({ consensusPrice: 3045, attestation: { schemaVersion: 2, data: v2Data } as never })
    );

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
      originalConsensusPrice: 3000,
      maxDriftPct: 1,
    });

    expect(result.driftSinceOriginalPct).toBeCloseTo(1.5, 5);
    expect(result.stillValid).toBe(false);
    expect(result.stillValidReason).toBe('drift_exceeded');
  });

  it('reports driftSinceOriginalPct=null when originalConsensusPrice is omitted', async () => {
    const v2Data = await makeV2Data();
    mockedPreTradeSafetyCheck.mockResolvedValue(
      makeResult({ attestation: { schemaVersion: 2, data: v2Data } as never })
    );

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });

    expect(result.driftSinceOriginalPct).toBeNull();
    expect(result.stillValid).toBe(true);
    expect(result.stillValidReason).toBe('ok');
  });

  it('returns recheck=null + reason no_attester_key when no attester key is configured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    // The mocked re-run still returns a v2 attestation shape, but signRecheck
    // returns null because no key is configured → the re-run's attestation is
    // also null in reality. Simulate the realistic null-attestation case.
    mockedPreTradeSafetyCheck.mockResolvedValue(makeResult({ attestation: null }));

    const result = await preTradeRecheck({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });

    expect(result.recheck).toBeNull();
    expect(result.stillValid).toBe(true);
    expect(result.stillValidReason).toBe('no_attester_key');
  });

  it('passes the audit meta (apiKeyId) through to the re-run', async () => {
    const v2Data = await makeV2Data();
    mockedPreTradeSafetyCheck.mockResolvedValue(
      makeResult({ attestation: { schemaVersion: 2, data: v2Data } as never })
    );

    await preTradeRecheck(
      {
        asset: 'ETH',
        chainId: 1,
        action: 'swap',
        tradeAmountUsd: 50000,
        originalUid: ORIGINAL_UID,
        originalRequestHash: ORIGINAL_REQUEST_HASH,
      },
      { apiKeyId: 'key_123' }
    );

    expect(mockedPreTradeSafetyCheck.mock.calls[0][1]).toEqual({ apiKeyId: 'key_123' });
  });

  it('uses the default drift threshold constant', () => {
    // Sanity: the default threshold is 2%. Tests above rely on this.
    expect(DEFAULT_MAX_DRIFT_PCT).toBe(2);
  });
});
