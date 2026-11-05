import {
  AUSD_UNVERIFIED_DESCRIPTOR,
  evaluateAusdCoverage,
  type AusdCoverageResult,
  type AusdOracleSource,
} from '@/lib/oracles/ausdCoverage';

import { assessMonadPerpGuard } from '../monadPerpGuard';

const NOW = new Date('2026-11-05T00:00:00.000Z');

const BASE_INPUT = {
  protocolId: 'perpl-perps-monad-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'AUSD' as const,
  sizeUsd: 10_000,
  marginValueUsd: 2_000,
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

function guardDeps(overrides: Record<string, unknown> = {}) {
  return {
    checkOracle: oracleMock(),
    fetchVenueState: jest.fn(async () => venueState()),
    now: () => NOW,
    ...overrides,
  } as never;
}

/** TEST-ONLY synthetic placeholder, NEVER a real feed address. */
const synthetic = (digit: number) => `0x${String(digit).repeat(40)}` as `0x${string}`;

const independentSource: AusdOracleSource = {
  provider: 'Chainlink',
  pair: 'AUSD/USD',
  feedAddress: synthetic(1),
  chainId: 143,
  observedAt: '2026-11-05T00:00:00.000Z',
  heartbeatSeconds: 3_600,
  deviationThresholdBps: 50,
  independence: 'independent-aggregator',
  independenceSource: 'third-party aggregator feed independent of the venue quote',
  sourceRef: 'TEST-ONLY synthetic feed (not a real deployment)',
  verification: 'VERIFIED',
};

describe('ausdCoverage (P1-1 independent oracle coverage)', () => {
  it('default evaluation is UNVERIFIED and fails closed, with no feed address', () => {
    expect(AUSD_UNVERIFIED_DESCRIPTOR.sources).toHaveLength(0);
    expect(AUSD_UNVERIFIED_DESCRIPTOR.note).toMatch(/未找到，需人工 review 后登记/);
    const result = evaluateAusdCoverage(undefined, () => NOW);
    expect(result.covered).toBe(false);
    expect(result.independence).toBe('unverified');
    expect(result.sources).toHaveLength(0);
    expect(result.reasonCode).toBe('AUSD_COVERAGE_UNVERIFIED');
    expect(result.observedAt).toBe(NOW.toISOString());
  });

  it('classifies a venue-only quote as disclosure, not coverage', () => {
    const result = evaluateAusdCoverage(
      {
        sources: [
          {
            ...independentSource,
            feedAddress: null,
            observedAt: null,
            heartbeatSeconds: null,
            deviationThresholdBps: null,
            independence: 'venue-quote',
            independenceSource: null,
            sourceRef: null,
            verification: 'UNVERIFIED',
          },
        ],
        note: 'venue $1 assumption',
      },
      () => NOW
    );
    expect(result.covered).toBe(false);
    expect(result.independence).toBe('venue-only');
    expect(result.reasonCode).toBe('AUSD_COVERAGE_VENUE_ONLY');
  });

  it('marks a fully specified independent feed as covered', () => {
    const result = evaluateAusdCoverage({ sources: [independentSource], note: 'test' }, () => NOW);
    expect(result.covered).toBe(true);
    expect(result.independence).toBe('independent');
    expect(result.reasonCode).toBe('AUSD_COVERAGE_VERIFIED');
    expect(result.sources[0].feedAddress).not.toBeNull();
  });

  it('fails closed when an independent source is missing a required field', () => {
    const result = evaluateAusdCoverage(
      {
        sources: [{ ...independentSource, feedAddress: null, sourceRef: null }],
        note: 'incomplete',
      },
      () => NOW
    );
    expect(result.covered).toBe(false);
    expect(result.independence).toBe('unverified');
    expect(result.reasonCode).toBe('AUSD_COVERAGE_UNVERIFIED');
  });

  it('rejects a malformed injected descriptor', () => {
    const result = evaluateAusdCoverage(
      {
        sources: [{ ...independentSource, heartbeatSeconds: -1 } as unknown as AusdOracleSource],
        note: 'malformed',
      },
      () => NOW
    );
    expect(result.covered).toBe(false);
    expect(result.reasonCode).toBe('AUSD_COVERAGE_MALFORMED');
  });
});

describe('assessMonadPerpGuard AUSD strict mode (P1-1)', () => {
  it('default mode: advisory only, verdict unchanged (zero regression)', async () => {
    const result = await assessMonadPerpGuard(BASE_INPUT, guardDeps());
    expect(result.verdict).toBe('ALLOW');
    expect(result.ausdCoverage).toBeDefined();
    expect(result.ausdCoverage?.covered).toBe(false);
    expect(result.ausdCoverage?.reasonCode).toBe('AUSD_COVERAGE_UNVERIFIED');
    expect(result.oracleChecks.marginConsensusStatus).toBe('verified');
    // Existing advisory text is preserved.
    expect(result.reasons.join(' ')).not.toMatch(/Strict AUSD coverage mode/);
  });

  it('strict mode: insufficient independent coverage BLOCKs', async () => {
    const result = await assessMonadPerpGuard(
      { ...BASE_INPUT, requireIndependentAusdCoverage: true },
      guardDeps()
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.ausdCoverage?.covered).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/Strict AUSD coverage mode/);
    expect(result.reasons.join(' ')).toMatch(/未找到，需人工 review 后登记/);
  });

  it('strict mode with injected independent coverage does NOT block', async () => {
    const covered: AusdCoverageResult = evaluateAusdCoverage(
      { sources: [independentSource], note: 'test-only injected coverage' },
      () => NOW
    );
    const result = await assessMonadPerpGuard(
      { ...BASE_INPUT, requireIndependentAusdCoverage: true },
      guardDeps({ resolveAusdCoverage: () => covered })
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.ausdCoverage?.covered).toBe(true);
    expect(result.ausdCoverage?.reasonCode).toBe('AUSD_COVERAGE_VERIFIED');
  });

  it('default mode ignores injected coverage for the verdict', async () => {
    const covered: AusdCoverageResult = evaluateAusdCoverage(
      { sources: [independentSource], note: 'test-only injected coverage' },
      () => NOW
    );
    const result = await assessMonadPerpGuard(
      BASE_INPUT,
      guardDeps({ resolveAusdCoverage: () => covered })
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.ausdCoverage?.covered).toBe(true);
  });
});
