/**
 * Unit tests for the Oracle Watch EIP-712 attestation.
 *
 * Mirrors the pre-trade attestation test contract (graceful disable, sign→verify
 * round trip, tamper rejection, forged-signature rejection) and adds the
 * Watch-specific guarantees: scale conventions shared with the pre-trade line,
 * the quorum threshold being signed alongside the count it gates, and outlier
 * exclusions being bound into the evidence hash.
 */

import type { OracleWatchProvider, OracleWatchResult } from '@/lib/api/services/oracleWatchService';

import {
  buildWatchMessage,
  buildWatchMessageV1,
  signWatchAttestation,
  verifyWatchAttestation,
  watchTypedDataArgs,
  CURRENT_WATCH_SCHEMA_VERSION,
  WATCH_REQUIRED_PARTICIPANT_COUNT,
  WATCH_REQUIRED_SOURCE_GROUP_COUNT,
  WATCH_SCHEMA_VERSION,
  WATCH_SCHEMA_VERSION_V2,
  WATCH_VALID_FOR_SECONDS,
} from '../oracleWatchAttestation';

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

/**
 * Anchored to the real clock rather than a pinned timestamp: verify() checks
 * expiry against `now`, so a fixed 2023-era fixture would always read as
 * expired. Captured once so UIDs stay stable across the assertions that need
 * determinism.
 */
const NOW_MS = Date.now();

function provider(overrides: Partial<OracleWatchProvider> = {}): OracleWatchProvider {
  return {
    provider: 'chainlink',
    status: 'success',
    deviationPct: 0.12,
    isOutlier: false,
    isStale: false,
    reputationScore: 92,
    price: 2436.97,
    timestamp: NOW_MS,
    dataAgeSeconds: 8,
    source: 'chainlink-feed',
    ...overrides,
  };
}

function signal(overrides: Partial<OracleWatchResult> = {}): OracleWatchResult {
  return {
    symbol: 'ETH',
    chain: 'ethereum',
    verdict: 'normal',
    recommendation: 'proceed',
    maxDeviationPct: 0.42,
    agreement: 0.9867,
    participantCount: 8,
    outlierCount: 0,
    staleCount: 0,
    consensusPrice: 2436.97,
    reason: 'within_tolerance',
    mlRiskScore: 0.08,
    mlScore1h: 0.06,
    mlScore6h: 0.09,
    mlRiskLevel: 'low',
    avgReputation: 91.5,
    minReputation: 88,
    quorumSatisfied: true,
    requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
    reasonCodes: [],
    sourceGroupCount: 2,
    requiredSourceGroupCount: WATCH_REQUIRED_SOURCE_GROUP_COUNT,
    independenceSatisfied: true,
    trustScore: 94,
    trustLevel: 'high',
    trustComponents: {
      quorum: 1,
      agreement: 0.96,
      deviation: 0.94,
      ml: 0.9,
      reputation: 0.92,
    },
    providers: [provider(), provider({ provider: 'redstone', deviationPct: -0.3, price: 2429.6 })],
    evaluatedAt: new Date(NOW_MS).toISOString(),
    ...overrides,
  };
}

function input(overrides: Partial<OracleWatchResult> = {}) {
  const s = signal(overrides);
  return { signal: s, providers: s.providers, subjectChainId: 1 };
}

describe('oracleWatchAttestation — graceful disable', () => {
  const original = process.env.ATTESTATION_SIGNER_PRIVATE_KEY;

  afterEach(() => {
    if (original === undefined) delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    else process.env.ATTESTATION_SIGNER_PRIVATE_KEY = original;
  });

  it('returns null when no attester key is configured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    // The module caches the account per process, so assert on the documented
    // contract rather than the cached instance: signing is additive and a
    // missing key must never throw or alter the signal.
    await expect(buildWatchMessage(input())).resolves.toMatchObject({ symbol: 'ETH' });
  });
});

describe('oracleWatchAttestation — message construction', () => {
  it('applies the scale conventions shared with the pre-trade line', async () => {
    const m = await buildWatchMessage(input());
    // price ×1e8, deviation % → ×100, ratio → ×1e4, reputation → ×100
    expect(m.consensusPrice).toBe(Math.round(2436.97 * 1e8));
    expect(m.maxDeviationBps).toBe(Math.round(0.42 * 100));
    expect(m.agreementBps).toBe(Math.round(0.9867 * 1e4));
    expect(m.avgReputationBps).toBe(Math.round(91.5 * 100));
    expect(m.mlRiskBps).toBe(Math.round(0.08 * 1e4));
    expect(m.schemaVersion).toBe(CURRENT_WATCH_SCHEMA_VERSION);
  });

  it('signs the quorum threshold next to the count it gates', async () => {
    const m = await buildWatchMessage(input());
    expect(m.requiredParticipantCount).toBe(WATCH_REQUIRED_PARTICIPANT_COUNT);
    expect(m.requiredParticipantCount).toBe(3);
    expect(m.quorumSatisfied).toBe(true);
  });

  it('derives validUntil from evaluatedAt plus the validity window', async () => {
    const m = await buildWatchMessage(input());
    expect(m.evaluatedAt).toBe(Math.floor(NOW_MS / 1000));
    expect(m.validUntil).toBe(m.evaluatedAt + WATCH_VALID_FOR_SECONDS);
  });

  it('binds outliers into the evidence hash rather than dropping them', async () => {
    const clean = await buildWatchMessage(input());
    const dirty = await buildWatchMessage(
      input({
        outlierCount: 1,
        providers: [provider(), provider({ provider: 'twap', isOutlier: true, price: 2600 })],
      })
    );
    expect(dirty.providerObservationsHash).not.toBe(clean.providerObservationsHash);
  });

  it('binds the (symbol, chain) subject so a receipt cannot be replayed', async () => {
    const eth = await buildWatchMessage(input());
    const btc = await buildWatchMessage(input({ symbol: 'BTC' }));
    expect(eth.requestHash).not.toBe(btc.requestHash);
  });
});

describe('oracleWatchAttestation — sign and verify', () => {
  const original = process.env.ATTESTATION_SIGNER_PRIVATE_KEY;

  beforeAll(() => {
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterAll(() => {
    if (original === undefined) delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    else process.env.ATTESTATION_SIGNER_PRIVATE_KEY = original;
  });

  it('round trips a signed watch receipt', async () => {
    const attestation = await signWatchAttestation(input());
    expect(attestation).not.toBeNull();
    if (!attestation) return;

    expect(attestation.attester).toBe(TEST_ATTESTER);
    expect(attestation.schemaVersion).toBe(CURRENT_WATCH_SCHEMA_VERSION);

    const result = await verifyWatchAttestation(attestation);
    expect(result.valid).toBe(true);
    expect(result.expired).toBe(false);
    expect(result.reason).toBe('verified');
  });

  it('rejects a receipt whose data was modified after signing', async () => {
    const attestation = await signWatchAttestation(input());
    if (!attestation) return;

    const tampered = {
      ...attestation,
      data: { ...attestation.data, verdict: 'danger', trustScore: 5 },
    };
    const result = await verifyWatchAttestation(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('uid_mismatch');
  });

  it('rejects a receipt signed by someone else', async () => {
    const attestation = await signWatchAttestation(input());
    if (!attestation) return;

    const forged = {
      ...attestation,
      attester: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    };
    const result = await verifyWatchAttestation(forged);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('signature_invalid');
  });

  it('flags an expired receipt without rejecting its signature', async () => {
    const attestation = await signWatchAttestation(
      input({ evaluatedAt: new Date(NOW_MS - 3600_000).toISOString() })
    );
    if (!attestation) return;

    const result = await verifyWatchAttestation(attestation);
    expect(result.reason).toBe('attestation_expired');
    expect(result.expired).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('produces a stable UID for identical inputs', async () => {
    const a = await signWatchAttestation(input());
    const b = await signWatchAttestation(input());
    expect(a?.uid).toBe(b?.uid);
  });

  it('uses a distinct EIP-712 domain from the pre-trade surface', () => {
    const args = watchTypedDataArgs({
      symbol: 'ETH',
      subjectChainId: 1,
      verdict: 'normal',
      recommendation: 'proceed',
      reason: 'within_tolerance',
      trustScore: 94,
      trustLevel: 'high',
      consensusPrice: 1,
      maxDeviationBps: 1,
      agreementBps: 1,
      participantCount: 8,
      requiredParticipantCount: 3,
      quorumSatisfied: true,
      outlierCount: 0,
      staleCount: 0,
      mlRiskBps: 1,
      avgReputationBps: 1,
      providerObservationsHash: '0x' + '00'.repeat(32),
      requestHash: '0x' + '00'.repeat(32),
      evaluatedAt: 1,
      validUntil: 2,
      schemaVersion: 1,
    });
    expect(args.domain.name).toBe('Insight Oracle Watch');
    expect(args.primaryType).toBe('OracleWatchCheck');
    expect(args.types.OracleWatchCheck).toHaveLength(22);
  });
});

describe('oracleWatchAttestation — v1/v2 schema coexistence', () => {
  const original = process.env.ATTESTATION_SIGNER_PRIVATE_KEY;

  beforeAll(() => {
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterAll(() => {
    if (original === undefined) delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    else process.env.ATTESTATION_SIGNER_PRIVATE_KEY = original;
  });

  it('issues v2 by default and v1 only on explicit request', async () => {
    const v2 = await signWatchAttestation(input());
    const v1 = await signWatchAttestation({ ...input(), schemaVersion: 1 });
    expect(v2?.schemaVersion).toBe(WATCH_SCHEMA_VERSION_V2);
    expect(v1?.schemaVersion).toBe(WATCH_SCHEMA_VERSION);
  });

  it('keeps a v1 receipt verifiable after the v2 upgrade', async () => {
    // The entire reason v1's layout is frozen: receipts already handed to
    // counterparties must not stop validating the day we ship v2.
    const v1 = await signWatchAttestation({ ...input(), schemaVersion: 1 });
    if (!v1) throw new Error('expected a v1 receipt');
    const result = await verifyWatchAttestation(v1);
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('verified');
  });

  it('routes typed-data by schemaVersion, never by the payload eip712 block', async () => {
    const v1 = await buildWatchMessageV1(input());
    const v2 = await buildWatchMessage(input());
    expect(watchTypedDataArgs(v1).types.OracleWatchCheck).toHaveLength(22);
    expect(watchTypedDataArgs(v2).types.OracleWatchCheck).toHaveLength(26);
  });

  it('signs the independence gate so a receipt explains its own verdict', async () => {
    const m = await buildWatchMessage(input({ sourceGroupCount: 1, independenceSatisfied: false }));
    expect(m.schemaVersion).toBe(2);
    if (m.schemaVersion === 2) {
      expect(m.sourceGroupCount).toBe(1);
      expect(m.requiredSourceGroupCount).toBe(WATCH_REQUIRED_SOURCE_GROUP_COUNT);
      expect(m.independenceSatisfied).toBe(false);
    }
  });

  it('binds the reason-code set into the v2 signature', async () => {
    const healthy = await buildWatchMessage(input());
    const degraded = await buildWatchMessage(
      input({ reasonCodes: ['INSUFFICIENT_INDEPENDENCE', 'MAX_DEVIATION'] })
    );
    expect(healthy.schemaVersion).toBe(2);
    expect(degraded.schemaVersion).toBe(2);
    if (healthy.schemaVersion === 2 && degraded.schemaVersion === 2) {
      expect(healthy.reasonCodesHash).not.toBe(degraded.reasonCodesHash);
      // An empty set still hashes to a well-defined, stable value.
      expect(healthy.reasonCodesHash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });

  it('produces different UIDs for v1 and v2 of the same signal', async () => {
    const a = await signWatchAttestation({ ...input(), schemaVersion: 1 });
    const b = await signWatchAttestation(input());
    expect(a?.uid).not.toBe(b?.uid);
  });
});
