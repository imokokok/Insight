/**
 * Unit tests for the verify endpoint's schema-version routing.
 *
 * The verify route accepts BOTH v1 (11-field) and v2 (26-field) attestations
 * and must route each to its own EIP-712 domain/types — v1 uses domain
 * version '1', v2 uses domain version '2', so a mismatched domain fails
 * signature recovery. These tests exercise {@link verifyAttestationBySchema}
 * directly: sign a real attestation with the test key, route it, and assert
 * the verdict. The JSON round-trip case proves the v2 attestation is
 * wire-compatible (the bigint→number refactor's whole point).
 *
 * The API middleware stack (auth, rate-limit, quota, CORS) is intentionally
 * bypassed by mocking `@/lib/api/handler` — its behavior is orthogonal to the
 * routing logic under test.
 */

// Stub the API handler so importing the route doesn't pull the middleware
// chain (supabase/rate-limit stores) into a unit test. POST/GET become no-ops;
// only the shared `verifyAttestationBySchema` helper is exercised.
jest.mock('@/lib/api/handler', () => ({
  createApiHandler: jest.fn(() => jest.fn()),
  createOptionsHandler: jest.fn(() => jest.fn()),
  ApiResponseBuilder: { success: jest.fn((data: unknown) => ({ success: true, data })) },
}));

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
// Pinned "now" so verify's expiry check sees a non-expired window for both
// v1 (checkedAt + validForSeconds) and v2 (validUntil = checkedAt + 600s).
const NOW_MS = 1700000000000;

const V1_INPUT = {
  verdict: 'PASS',
  asset: 'ETH',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 100000,
  consensusPrice: 3000.5,
  maxDeviationPct: 0.42,
  manipulationRiskScore: 0.13,
  participantCount: 7,
};

const V2_INPUT = {
  verdict: 'PASS',
  sourceAssetId: 'eip155:1/slip44:60',
  destinationAssetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  subjectChainId: 1,
  action: 'swap',
  tradeAmountUsd: 50000,
  consensusPrice: 3000.05,
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
};

describe('verify route — verifyAttestationBySchema routing', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('routes a v1 attestation to the v1 verifier and returns valid', async () => {
    const { signAttestation } = await import('@/lib/attestations/oracleSafetyAttestation');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const att = await signAttestation(V1_INPUT);
    expect(att).not.toBeNull();

    const result = await verifyAttestationBySchema(att!);
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(1);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.uid).toBe(att!.uid);
    expect(result.expired).toBe(false);
    // v1 branch fills validUntil (derived) + ageSeconds; v2-only fields are null.
    expect(result.validUntil).toBe(att!.data.checkedAt + att!.validForSeconds);
    expect(result.ageSeconds).not.toBeNull();
  });

  it('routes a v2 attestation to the v2 verifier and returns valid', async () => {
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const att = await signAttestationV2(V2_INPUT);
    expect(att).not.toBeNull();

    const result = await verifyAttestationBySchema(att!);
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(2);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.uid).toBe(att!.uid);
    expect(result.expired).toBe(false);
    // v2 branch fills validUntil (explicit); v1-only ageSeconds is null.
    expect(result.validUntil).toBe(att!.data.validUntil);
    expect(result.ageSeconds).toBeNull();
  });

  it('routes a v3 attestation to the v3 verifier and returns valid', async () => {
    const { signAttestationV3 } = await import('@/lib/attestations/oracleSafetyAttestationV3');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const att = await signAttestationV3(V2_INPUT);
    expect(att).not.toBeNull();

    const result = await verifyAttestationBySchema(att!);
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(3);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.uid).toBe(att!.uid);
    expect(result.expired).toBe(false);
    expect(result.validUntil).toBe(att!.data.validUntil);
    expect(result.ageSeconds).toBeNull();
  });

  it('routes a v3 recheck to the v3 recheck verifier (not plain v3)', async () => {
    const { buildMessageV3 } = await import('@/lib/attestations/oracleSafetyAttestationV3');
    const { signRecheckV3 } = await import('@/lib/attestations/oracleSafetyRecheckV3');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const data = await buildMessageV3(V2_INPUT);
    const rc = await signRecheckV3({
      v3Data: data,
      originalUid: ('0x' + 'ab'.repeat(32)) as `0x${string}`,
      originalRequestHash: data.requestHash,
    });
    expect(rc).not.toBeNull();

    const result = await verifyAttestationBySchema(JSON.parse(JSON.stringify(rc)));
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(3);
  });

  it('verifies a v2 attestation after a JSON wire round trip', async () => {
    // The attestation travels through API responses + the verify body as JSON.
    // bigint can't be JSON-serialized, so v2 data stores numbers. This proves
    // the round trip is lossless end-to-end through the routing helper.
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const att = await signAttestationV2(V2_INPUT);
    // JSON.stringify throws on bigint — if any field were still bigint this
    // would throw and fail the test.
    const wire = JSON.parse(JSON.stringify(att));

    const result = await verifyAttestationBySchema(wire);
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(2);
    expect(result.uid).toBe(att!.uid);
  });

  it('rejects a tampered v2 attestation (uid no longer matches the data)', async () => {
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const att = await signAttestationV2(V2_INPUT);
    const tampered = {
      ...att!,
      data: { ...att!.data, verdict: 'BLOCK' },
    };

    const result = await verifyAttestationBySchema(tampered);
    expect(result.valid).toBe(false);
    expect(result.schemaVersion).toBe(2);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('rejects an unknown schemaVersion with a structured invalid result', async () => {
    const { signAttestation } = await import('@/lib/attestations/oracleSafetyAttestation');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const att = await signAttestation(V1_INPUT);
    // Claim a schema version the endpoint doesn't know how to route.
    const future = { ...att!, schemaVersion: 99 };

    const result = await verifyAttestationBySchema(future);
    expect(result.valid).toBe(false);
    expect(result.schemaVersion).toBe(99);
    expect(result.reason).toMatch(/Unsupported schemaVersion/);
  });

  it('uses different EIP-712 domains for v1 vs v2 (version 1 vs 2)', async () => {
    // Sanity: the v1 and v2 domain version strings differ. If they were the
    // same, a v2 signature could verify under the v1 domain (or vice versa),
    // defeating the purpose of schema-versioned routing.
    const v1Mod = await import('@/lib/attestations/oracleSafetyAttestation');
    const v2Mod = await import('@/lib/attestations/oracleSafetyAttestationV2');
    expect(v1Mod.ATTESTATION_DOMAIN.version).toBe('1');
    expect(v2Mod.V2_DOMAIN.version).toBe('2');
    expect(v1Mod.ATTESTATION_DOMAIN.name).toBe(v2Mod.V2_DOMAIN.name);
  });

  it('marks an expired v2 attestation as expired (but signature still valid)', async () => {
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    // Sign with a pinned old check time, then advance "now" past validUntil.
    const att = await signAttestationV2({ ...V2_INPUT, checkedAtMs: NOW_MS });
    // Advance now to just past validUntil (checkedAt + 600s + 1s).
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS + (600 + 1) * 1000);

    const result = await verifyAttestationBySchema(att!);
    expect(result.expired).toBe(true);
    expect(result.valid).toBe(false); // expired → not valid
    expect(result.reason).toBe('expired');
    expect(result.schemaVersion).toBe(2);
  });

  it('routes a recheck attestation to the recheck verifier (not plain v2) and returns valid', async () => {
    // A recheck carries schemaVersion=2 BUT a distinct primaryType
    // 'OracleSafetyRecheck'. The verify route must route it to the 28-field
    // recheck verifier — NOT the 26-field v2 verifier (which would ignore
    // originalUid + originalRequestHash and always mismatch the UID).
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { signRecheck } = await import('@/lib/attestations/oracleSafetyRecheck');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    // 1. Sign the original v2 attestation (the one being re-verified).
    const original = await signAttestationV2(V2_INPUT);
    expect(original).not.toBeNull();

    // 2. Sign a recheck referencing it (same trade params → requestHash matches).
    const recheck = await signRecheck({
      v2Data: original!.data,
      originalUid: original!.uid,
      originalRequestHash: original!.data.requestHash,
    });
    expect(recheck).not.toBeNull();
    expect(recheck!.type).toBe('OracleSafetyRecheck');

    // 3. The verify route routes the recheck to the recheck verifier → valid.
    const result = await verifyAttestationBySchema(recheck!);
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(2);
    expect(result.uid).toBe(recheck!.uid);
  });

  it('a recheck stripped of its recheck discriminator fails under v2 routing', async () => {
    // Proves the recheck branch is load-bearing: if a recheck were misrouted to
    // the plain-v2 verifier (26-field type), the 2 reference fields would be
    // ignored and the recomputed UID would NOT match → uid_mismatch. We simulate
    // the misroute by stripping the recheck's type + primaryType discriminators
    // so the router falls through to the schemaVersion===2 (v2) branch.
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { signRecheck } = await import('@/lib/attestations/oracleSafetyRecheck');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const original = await signAttestationV2(V2_INPUT);
    const recheck = await signRecheck({
      v2Data: original!.data,
      originalUid: original!.uid,
      originalRequestHash: original!.data.requestHash,
    });

    // Strip the recheck discriminators so the router treats it as a plain v2
    // attestation (schemaVersion=2, no recheck type/primaryType).
    const misrouted = {
      ...recheck!,
      type: undefined,
      eip712: { ...recheck!.eip712, primaryType: 'OracleSafetyCheck' },
    };

    const result = await verifyAttestationBySchema(misrouted);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch/);
  });

  it('verifies a recheck after a JSON wire round trip', async () => {
    const { signAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');
    const { signRecheck } = await import('@/lib/attestations/oracleSafetyRecheck');
    const { verifyAttestationBySchema } =
      await import('@/lib/attestations/verifyAttestationBySchema');

    const original = await signAttestationV2(V2_INPUT);
    const recheck = await signRecheck({
      v2Data: original!.data,
      originalUid: original!.uid,
      originalRequestHash: original!.data.requestHash,
    });
    const wire = JSON.parse(JSON.stringify(recheck));

    const result = await verifyAttestationBySchema(wire);
    expect(result.valid).toBe(true);
    expect(result.uid).toBe(recheck!.uid);
  });
});
