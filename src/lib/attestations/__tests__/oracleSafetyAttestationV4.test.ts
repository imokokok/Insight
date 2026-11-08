/**
 * Unit + end-to-end tests for the v4 asset-proxy schema.
 *
 * v4 exists to close one specific gap: v3 signs a CAIP-19 source asset id but
 * carries no field saying WHAT that symbol is a claim on. WBTC is the first real
 * case — the receipt must name BTC and the wrapper relation in the signed bytes,
 * and must NOT silently treat an unknown asset as "no relation" or as 1:1.
 *
 * These tests pin:
 *   - the WBTC relationship is ASSESSED and names Bitcoin + a nominal 1:1 ratio;
 *   - a native asset is NOT_APPLICABLE, and an unknown ERC-20 is a visible
 *     UNKNOWN (ratio 0, never 1:1);
 *   - all four new fields are inside the signed bytes (tampering breaks the UID);
 *   - a signed-but-self-contradicting proxy record is rejected;
 *   - v1/v2/v3 receipts still verify through the SAME router after the bump.
 */

import { privateKeyToAccount } from 'viem/accounts';

import { resolveAssetProxyRelation, BITCOIN_MAINNET_ASSET_ID } from '../assetProxyRelation';
import { signAttestation } from '../oracleSafetyAttestation';
import { signAttestationV2, type AttestationInputV2 } from '../oracleSafetyAttestationV2';
import { signAttestationV3, V3_TYPES } from '../oracleSafetyAttestationV3';
import { v4TypedDataArgs, V4_TYPES } from '../oracleSafetyAttestationV4';
import { verifyAttestationBySchema } from '../verifyAttestationBySchema';

import type { AttestationInputV4 } from '../oracleSafetyAttestationV4';

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const NOW_MS = 1700000000000;

const ETH_NATIVE = 'eip155:1/slip44:60';
const WBTC_ETH = 'eip155:1/erc20:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

function baseInput(overrides: Partial<AttestationInputV2> = {}): AttestationInputV2 {
  return {
    verdict: 'PASS',
    sourceAssetId: WBTC_ETH,
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
    checkedAtMs: NOW_MS,
    ...overrides,
  };
}

describe('assetProxyRelation', () => {
  it('assesses WBTC as a wrapped-BTC claim on Bitcoin with a nominal 1:1 ratio', () => {
    expect(resolveAssetProxyRelation(WBTC_ETH)).toEqual({
      status: 'ASSESSED',
      relation: 'wrapped-btc',
      underlyingAssetId: BITCOIN_MAINNET_ASSET_ID,
      nominalRatioBps: 10_000,
    });
  });

  it('marks a native asset NOT_APPLICABLE instead of inventing a 1:1 relationship', () => {
    expect(resolveAssetProxyRelation(ETH_NATIVE)).toEqual({
      status: 'NOT_APPLICABLE',
      relation: '',
      underlyingAssetId: '',
      nominalRatioBps: 0,
    });
  });

  it('leaves an unlisted ERC-20 as a visible UNKNOWN with ratio 0 (never 1:1)', () => {
    const r = resolveAssetProxyRelation(USDC_ETH);
    expect(r.status).toBe('UNKNOWN');
    expect(r.nominalRatioBps).toBe(0);
    expect(r.relation).toBe('');
    expect(r.underlyingAssetId).toBe('');
  });

  it('never resolves an unresolved marker through the symbol fallback', () => {
    expect(resolveAssetProxyRelation('unresolved:WBTC@1', 'WBTC').status).toBe('UNKNOWN');
  });

  it('uses the reviewed symbol only when the chain deployment is unlisted', () => {
    const wbtcOnBase = 'eip155:8453/erc20:0x1ce808bd1b3c4f4f3b3f1d1f0000000000000000';
    expect(resolveAssetProxyRelation(wbtcOnBase, 'wbtc').status).toBe('ASSESSED');
  });
});

describe('oracleSafetyAttestationV4', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('keeps v3’s 27 field names and types as a prefix and appends four fields', () => {
    const v3Names = V3_TYPES.OracleSafetyCheck.map((f) => `${f.name}:${f.type}`);
    const v4Names = V4_TYPES.OracleSafetyCheck.map((f) => `${f.name}:${f.type}`);

    expect(v4Names).toHaveLength(31);
    expect(v4Names.slice(0, 27)).toEqual(v3Names);
    expect(v4Names.slice(27)).toEqual([
      'sourceAssetProxyStatus:string',
      'sourceAssetProxyRelation:string',
      'sourceAssetUnderlyingId:string',
      'sourceAssetProxyNominalRatioBps:uint256',
    ]);
  });

  it('signs a WBTC receipt whose proxy relationship is inside the signed bytes', async () => {
    const mod = await import('../oracleSafetyAttestationV4');
    const att = await mod.signAttestationV4(baseInput() as AttestationInputV4, {});
    expect(att).not.toBeNull();
    expect(att!.schemaVersion).toBe(4);
    expect(att!.attester).toBe(TEST_ATTESTER);
    expect(att!.data.sourceAssetProxyStatus).toBe('ASSESSED');
    expect(att!.data.sourceAssetProxyRelation).toBe('wrapped-btc');
    expect(att!.data.sourceAssetUnderlyingId).toBe(BITCOIN_MAINNET_ASSET_ID);
    expect(att!.data.sourceAssetProxyNominalRatioBps).toBe(10_000);

    const result = await mod.verifyAttestationV4(att!);
    expect(result.valid).toBe(true);
    expect(result.assetProxy).toEqual({
      status: 'ASSESSED',
      relation: 'wrapped-btc',
      underlyingAssetId: BITCOIN_MAINNET_ASSET_ID,
      nominalRatioBps: 10_000,
    });
  });

  it.each([
    ['sourceAssetProxyStatus', 'NOT_APPLICABLE'],
    ['sourceAssetProxyRelation', 'wrapped-eth'],
    ['sourceAssetUnderlyingId', 'bip122:deadbeef/slip44:0'],
    ['sourceAssetProxyNominalRatioBps', 1],
  ] as const)('rejects a tampered %s (the field is signed)', async (field, value) => {
    const mod = await import('../oracleSafetyAttestationV4');
    const att = await mod.signAttestationV4(baseInput() as AttestationInputV4, {});
    const tampered = { ...att!, data: { ...att!.data, [field]: value } };
    const result = await mod.verifyAttestationV4(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('surfaces an UNKNOWN asset instead of defaulting to 1:1', async () => {
    const mod = await import('../oracleSafetyAttestationV4');
    // USDC is a legitimate asset with no reviewed proxy relationship.
    const att = await mod.signAttestationV4(
      baseInput({ sourceAssetId: USDC_ETH }) as AttestationInputV4,
      {}
    );
    const routed = await verifyAttestationBySchema(att! as never);
    expect(routed.valid).toBe(true);
    expect(routed.assetProxy).toEqual({
      status: 'UNKNOWN',
      relation: '',
      underlyingAssetId: '',
      nominalRatioBps: 0,
    });
    expect(routed.warnings).toEqual(['asset_proxy_unknown']);
  });

  it('rejects a correctly-signed but self-contradicting proxy record', async () => {
    const mod = await import('../oracleSafetyAttestationV4');
    const account = privateKeyToAccount(TEST_PRIVATE_KEY);
    const att = await mod.signAttestationV4(baseInput() as AttestationInputV4, {});

    // Sign the corrupted message with the same key: the signature is genuine,
    // but "ASSESSED" with an empty underlying id is semantically impossible.
    const corrupted = {
      ...att!.data,
      sourceAssetProxyStatus: 'ASSESSED' as const,
      sourceAssetProxyRelation: '',
      sourceAssetUnderlyingId: '',
      sourceAssetProxyNominalRatioBps: 10_000,
    };
    const args = v4TypedDataArgs(corrupted);
    const signature = await account.signTypedData(args);
    const { hashTypedData } = await import('viem');

    const forged = {
      ...att!,
      uid: hashTypedData(args),
      attester: account.address,
      signature,
      data: corrupted,
    };
    const result = await mod.verifyAttestationV4(forged as never);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/asset_proxy_inconsistent/);
  });

  it('still verifies historical v1 / v2 / v3 receipts through the same router', async () => {
    const v1 = await signAttestation({
      verdict: 'PASS',
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 1000,
      consensusPrice: 3000,
      maxDeviationPct: 1.5,
      manipulationRiskScore: 0.1,
      participantCount: 4,
    });
    const v2 = await signAttestationV2(baseInput());
    const v3 = await signAttestationV3(baseInput());

    for (const [version, att] of [
      [1, v1],
      [2, v2],
      [3, v3],
    ] as const) {
      const routed = await verifyAttestationBySchema(att as never);
      expect({ version, valid: routed.valid }).toEqual({ version, valid: true });
      expect(routed.schemaVersion).toBe(version);
      // Proxy fields are a v4 concept; older receipts must not grow them.
      expect(routed.assetProxy).toBeUndefined();
    }
  });
});
