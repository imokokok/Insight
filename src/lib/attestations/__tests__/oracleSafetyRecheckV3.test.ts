/**
 * Unit tests for the v3 OracleSafetyRecheck type (29 fields = v3's 27 +
 * originalUid + originalRequestHash).
 *
 * Mirrors the v2 recheck contract (graceful disable, sign→verify round trip,
 * requestHash binding invariant, tamper rejection) and pins the two things v3
 * changes:
 *   - the base is v3's 27 fields, so the independence threshold travels into
 *     the recheck as well;
 *   - `originalUid` is `bytes32`, not `string` — a UID is a 32-byte hash, and
 *     `bytes32` commits to the value instead of to keccak256(ascii).
 */

import { computeRequestHash } from '../canonicalRequestHash';
import { buildMessageV3 } from '../oracleSafetyAttestationV3';
import { RECHECK_TYPES } from '../oracleSafetyRecheck';
import { RECHECK_V3_TYPES } from '../oracleSafetyRecheckV3';

import type { AttestationInputV2 } from '../oracleSafetyAttestationV2';

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
// Pinned "now" so UIDs are deterministic AND verify's expiry check sees a
// non-expired window (validUntil = checkedAt + 600s ≥ now).
const NOW_MS = 1700000000000;

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const ORIGINAL_UID = '0x6822cdca18d73ed65d0913506bd14db3b183692140924110d06acca703797c4b';
const ORIGINAL_REQUEST_HASH = computeRequestHash({
  subjectChainId: 1,
  sourceAssetId: ETH_NATIVE,
  destinationAssetId: USDC_ETH,
  action: 'swap',
  tradeAmountUsd: 50000,
});

function baseInput(overrides: Partial<AttestationInputV2> = {}): AttestationInputV2 {
  return {
    verdict: 'PASS',
    sourceAssetId: ETH_NATIVE,
    destinationAssetId: USDC_ETH,
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
      {
        provider: 'api3',
        feedId: 'ETH/USD',
        value: 299990000000n,
        timestamp: 1700000001n,
        dataAgeSeconds: 1n,
        included: true,
        exclusionReason: '',
      },
    ],
    checkedAtMs: NOW_MS, // pinned for deterministic UIDs
    ...overrides,
  };
}

describe('OracleSafetyRecheckV3', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('returns null when no attester key is configured (graceful disable)', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    const mod = await import('../oracleSafetyRecheckV3');
    const rc = await mod.signRecheckV3({
      v3Data: await buildMessageV3(baseInput()),
      originalUid: ORIGINAL_UID as `0x${string}`,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(rc).toBeNull();
  });

  it('signs a recheck that verifies as valid (round trip)', async () => {
    const mod = await import('../oracleSafetyRecheckV3');
    const rc = await mod.signRecheckV3({
      v3Data: await buildMessageV3(baseInput()),
      originalUid: ORIGINAL_UID as `0x${string}`,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(rc).not.toBeNull();
    expect(rc!.attester).toBe(TEST_ATTESTER);
    expect(rc!.schemaVersion).toBe(3);

    const result = await mod.verifyRecheckV3(rc!);
    expect(result.valid).toBe(true);
    expect(result.expired).toBe(false);
  });

  it('is a 29-field type: v3’s 27 + two reference fields, appended', () => {
    const names = RECHECK_V3_TYPES.OracleSafetyRecheck.map((f) => `${f.name}:${f.type}`);
    expect(names).toHaveLength(29);
    expect(names[27]).toBe('originalUid:bytes32');
    expect(names[28]).toBe('originalRequestHash:bytes32');

    // The v2 recheck types originalUid as `string`; v3 types it as bytes32.
    const v2Names = RECHECK_TYPES.OracleSafetyRecheck.map((f) => `${f.name}:${f.type}`);
    expect(v2Names).toHaveLength(28);
    expect(v2Names[26]).toBe('originalUid:string');
  });

  it('rejects a tampered originalUid (signature no longer matches)', async () => {
    const mod = await import('../oracleSafetyRecheckV3');
    const rc = await mod.signRecheckV3({
      v3Data: await buildMessageV3(baseInput()),
      originalUid: ORIGINAL_UID as `0x${string}`,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    const tampered = {
      ...rc!,
      data: {
        ...rc!.data,
        originalUid: ('0x' + '11'.repeat(32)) as `0x${string}`,
      },
    };
    const result = await mod.verifyRecheckV3(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('rejects a recheck whose requestHash does not match originalRequestHash', async () => {
    const mod = await import('../oracleSafetyRecheckV3');
    const rc = await mod.signRecheckV3({
      v3Data: await buildMessageV3(baseInput()),
      originalUid: ORIGINAL_UID as `0x${string}`,
      originalRequestHash: ('0x' + '22'.repeat(32)) as `0x${string}`,
    });
    expect(rc).not.toBeNull();
    const result = await mod.verifyRecheckV3(rc!);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      'recheck_binding_mismatch: requestHash must equal originalRequestHash'
    );
  });

  it('carries the independence threshold through to the recheck', async () => {
    const { signRecheckV3 } = await import('../oracleSafetyRecheckV3');
    const rc = await signRecheckV3({
      v3Data: await buildMessageV3(baseInput()),
      originalUid: ORIGINAL_UID as `0x${string}`,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    // The recheck must be as self-contained as the check it re-verifies.
    expect(rc!.data.requiredSourceGroupCount).toBe(2);
    expect(rc!.data.sourceGroupCount).toBe(2);
  });
});
