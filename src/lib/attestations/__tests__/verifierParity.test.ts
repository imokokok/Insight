/**
 * @fileoverview Drift guard between the app's attestation schemas and the
 * standalone `verifier/` package.
 *
 * `verifier/` deliberately duplicates the five EIP-712 layouts so the package
 * can build and run with no access to this repo. Duplication is the point;
 * divergence is the failure mode. If someone edits a layout here and not there,
 * every receipt verified by the published package starts failing — or worse,
 * starts verifying against the wrong bytes.
 *
 * Two layers:
 *
 *   1. LAYOUT PARITY — the type descriptors, domains and primary types must be
 *      byte-identical. Cheap, catches the realistic mistake (an edit made in
 *      one place only).
 *   2. VERDICT PARITY — sign a real receipt with a throwaway key, then ask both
 *      verifiers about it and require the same answer. Catches subtler drift
 *      that a structural diff would miss: a widened field, a reordered check, a
 *      changed expiry rule.
 *
 * The receipts here are signed with a throwaway key, NOT the platform attester.
 * Nothing in this file needs ATTESTATION_SIGNER_PRIVATE_KEY.
 */

import { hashTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  ATTESTATION_DOMAIN,
  ATTESTATION_PRIMARY_TYPE,
  ATTESTATION_TYPES,
} from '@/lib/attestations/oracleSafetyAttestation';
import { V2_DOMAIN, V2_PRIMARY_TYPE, V2_TYPES } from '@/lib/attestations/oracleSafetyAttestationV2';
import { V3_DOMAIN, V3_PRIMARY_TYPE, V3_TYPES } from '@/lib/attestations/oracleSafetyAttestationV3';
import {
  RECHECK_DOMAIN,
  RECHECK_PRIMARY_TYPE,
  RECHECK_TYPES,
} from '@/lib/attestations/oracleSafetyRecheck';
import {
  RECHECK_V3_DOMAIN,
  RECHECK_V3_PRIMARY_TYPE,
  RECHECK_V3_TYPES,
} from '@/lib/attestations/oracleSafetyRecheckV3';
import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';

import { verifyReceipt } from '../../../../verifier/src/index';
import * as verifierSchemas from '../../../../verifier/src/schemas';

import type { RoutableAttestation } from '../../../../verifier/src/types';

// Deterministic throwaway key. Never used outside this file.
const TEST_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const OTHER_PRIVATE_KEY =
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' as const;

const H1 = `0x${'11'.repeat(32)}`;
const H2 = `0x${'22'.repeat(32)}`;
const H3 = `0x${'33'.repeat(32)}`;
const H4 = `0x${'44'.repeat(32)}`;
const H_ORIGINAL_UID = `0x${'ab'.repeat(32)}`;

type Field = { readonly name: string; readonly type: string };

/** Widen JSON numbers to bigint for viem, driven by the PRODUCTION layout so a
 *  widened/typo'd field in the verifier copy cannot mask itself here. */
function widen(types: readonly Field[], data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of types) {
    const value = data[field.name];
    out[field.name] = field.type === 'uint256' ? BigInt(value as number) : value;
  }
  return out;
}

async function signEnvelope(opts: {
  domain: Record<string, unknown>;
  types: Record<string, unknown>;
  primaryType: string;
  data: Record<string, unknown>;
  schemaVersion: number;
  privateKey?: `0x${string}`;
  attester?: string;
  envelopeType?: string;
}) {
  const account = privateKeyToAccount(opts.privateKey ?? TEST_PRIVATE_KEY);
  const message = widen(
    (opts.types as Record<string, readonly Field[]>)[opts.primaryType],
    opts.data
  );
  const args = {
    domain: opts.domain,
    types: opts.types,
    primaryType: opts.primaryType,
    message,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signature = await account.signTypedData(args as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uid = hashTypedData(args as any);

  const envelope: RoutableAttestation = {
    uid,
    schemaVersion: opts.schemaVersion,
    attester: opts.attester ?? account.address,
    signature,
    validForSeconds: 600,
    data: opts.data,
    eip712: { primaryType: opts.primaryType },
    ...(opts.envelopeType ? { type: opts.envelopeType } : {}),
  };
  return envelope;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function v1Data(checkedAt: number) {
  return {
    verdict: 'PASS',
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1_000_000,
    consensusPrice: 200_000_000_000,
    maxDeviationBps: 15,
    manipulationRiskBps: 100,
    participantCount: 4,
    checkedAt,
    schemaVersion: 1,
  };
}

function v2Data(checkedAt: number) {
  return {
    verdict: 'PASS',
    sourceAssetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    destinationAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 1_000_000,
    consensusPrice: 200_000_000_000,
    maxDeviationBps: 15,
    manipulationRiskBps: 100,
    participantCount: 4,
    requiredParticipantCount: 3,
    coverageStatus: 'SUFFICIENT',
    independenceStatus: 'ASSESSED',
    sourceGroupCount: 3,
    crossProviderAgreementBps: 9_500,
    maxStablecoinDepegBps: 0,
    maxDataAgeSeconds: 30,
    recommendedMaxPositionUsd: 5_000_000,
    reasonCodesHash: H1,
    requestHash: H2,
    evaluationScope: 'SOURCE_ASSET_ONLY',
    evaluatedAssetIdsHash: H3,
    providerObservationsHash: H4,
    validUntil: checkedAt + 600,
    checkedAt,
    schemaVersion: 2,
  };
}

function v3Data(checkedAt: number) {
  return { ...v2Data(checkedAt), requiredSourceGroupCount: 2, schemaVersion: 3 };
}

/** A well-formed recheck: its own requestHash equals the originalRequestHash it
 *  claims to bind, which is the invariant both verifiers enforce. */
function recheckData(checkedAt: number) {
  return { ...v2Data(checkedAt), originalUid: H_ORIGINAL_UID, originalRequestHash: H2 };
}

function recheckV3Data(checkedAt: number) {
  return { ...v3Data(checkedAt), originalUid: H_ORIGINAL_UID, originalRequestHash: H2 };
}

// ---------------------------------------------------------------------------
// 1. Layout parity
// ---------------------------------------------------------------------------

describe('verifier layout parity', () => {
  it.each([
    ['v1', ATTESTATION_TYPES, verifierSchemas.V1_TYPES],
    ['v2', V2_TYPES, verifierSchemas.V2_TYPES],
    ['v3', V3_TYPES, verifierSchemas.V3_TYPES],
    ['recheck', RECHECK_TYPES, verifierSchemas.RECHECK_TYPES],
    ['recheckV3', RECHECK_V3_TYPES, verifierSchemas.RECHECK_V3_TYPES],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as Array<[string, any, any]>)('%s types are identical', (_name, prod, ver) => {
    expect(JSON.stringify(ver)).toBe(JSON.stringify(prod));
  });

  it.each([
    [
      'v1',
      ATTESTATION_DOMAIN,
      verifierSchemas.V1_DOMAIN,
      ATTESTATION_PRIMARY_TYPE,
      verifierSchemas.V1_PRIMARY_TYPE,
    ],
    ['v2', V2_DOMAIN, verifierSchemas.V2_DOMAIN, V2_PRIMARY_TYPE, verifierSchemas.V2_PRIMARY_TYPE],
    ['v3', V3_DOMAIN, verifierSchemas.V3_DOMAIN, V3_PRIMARY_TYPE, verifierSchemas.V3_PRIMARY_TYPE],
    [
      'recheck',
      RECHECK_DOMAIN,
      verifierSchemas.RECHECK_DOMAIN,
      RECHECK_PRIMARY_TYPE,
      verifierSchemas.RECHECK_PRIMARY_TYPE,
    ],
    [
      'recheckV3',
      RECHECK_V3_DOMAIN,
      verifierSchemas.RECHECK_V3_DOMAIN,
      RECHECK_PRIMARY_TYPE,
      verifierSchemas.RECHECK_V3_PRIMARY_TYPE,
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as Array<[string, any, any, string, string]>)(
    '%s domain + primaryType are identical',
    (_name, prodDomain, verDomain, prodPrimary, verPrimary) => {
      expect(JSON.stringify(verDomain)).toBe(JSON.stringify(prodDomain));
      expect(verPrimary).toBe(prodPrimary);
    }
  );
});

// ---------------------------------------------------------------------------
// 2. Verdict parity
// ---------------------------------------------------------------------------

/** The fields both verifiers must agree on for every case. */
async function bothVerdicts(envelope: RoutableAttestation) {
  const prod = await verifyAttestationBySchema(envelope as never);
  const ver = await verifyReceipt(envelope);
  return {
    prod: {
      valid: prod.valid,
      uid: prod.uid,
      schemaVersion: prod.schemaVersion,
      checkedAt: prod.checkedAt,
      validUntil: prod.validUntil,
      expired: prod.expired,
      reason: prod.reason,
    },
    ver: {
      valid: ver.valid,
      code: ver.code,
      uid: ver.uid,
      schemaVersion: ver.schemaVersion,
      checkedAt: ver.checkedAt,
      validUntil: ver.validUntil,
      expired: ver.expired,
      reason: ver.reason,
    },
  };
}

function expectSameVerdict(envelope: RoutableAttestation) {
  return bothVerdicts(envelope).then(({ prod, ver }) => {
    expect(ver.valid).toBe(prod.valid);
    expect(ver.uid).toBe(prod.uid);
    expect(ver.schemaVersion).toBe(prod.schemaVersion);
    expect(ver.checkedAt).toBe(prod.checkedAt);
    expect(ver.validUntil).toBe(prod.validUntil);
    expect(ver.expired).toBe(prod.expired);
    return { prod, ver };
  });
}

describe('verifier verdict parity', () => {
  it('agrees that a valid receipt of every schema is valid', async () => {
    const now = nowSec();
    const cases: Array<[string, () => Promise<RoutableAttestation>]> = [
      [
        'v1',
        () =>
          signEnvelope({
            domain: ATTESTATION_DOMAIN as unknown as Record<string, unknown>,
            types: ATTESTATION_TYPES as unknown as Record<string, unknown>,
            primaryType: ATTESTATION_PRIMARY_TYPE,
            data: v1Data(now),
            schemaVersion: 1,
          }),
      ],
      [
        'v2',
        () =>
          signEnvelope({
            domain: V2_DOMAIN as unknown as Record<string, unknown>,
            types: V2_TYPES as unknown as Record<string, unknown>,
            primaryType: V2_PRIMARY_TYPE,
            data: v2Data(now),
            schemaVersion: 2,
          }),
      ],
      [
        'v3',
        () =>
          signEnvelope({
            domain: V3_DOMAIN as unknown as Record<string, unknown>,
            types: V3_TYPES as unknown as Record<string, unknown>,
            primaryType: V3_PRIMARY_TYPE,
            data: v3Data(now),
            schemaVersion: 3,
          }),
      ],
      [
        'recheck',
        () =>
          signEnvelope({
            domain: RECHECK_DOMAIN as unknown as Record<string, unknown>,
            types: RECHECK_TYPES as unknown as Record<string, unknown>,
            primaryType: RECHECK_PRIMARY_TYPE,
            data: recheckData(now),
            schemaVersion: 2,
            envelopeType: 'OracleSafetyRecheck',
          }),
      ],
      [
        'recheckV3',
        () =>
          signEnvelope({
            domain: RECHECK_V3_DOMAIN as unknown as Record<string, unknown>,
            types: RECHECK_V3_TYPES as unknown as Record<string, unknown>,
            primaryType: RECHECK_V3_PRIMARY_TYPE,
            data: recheckV3Data(now),
            schemaVersion: 3,
            envelopeType: 'OracleSafetyRecheck',
          }),
      ],
    ];

    for (const [name, build] of cases) {
      const envelope = await build();
      const { prod, ver } = await expectSameVerdict(envelope);
      expect({ name, valid: prod.valid }).toEqual({ name, valid: true });
      expect({ name, code: ver.code }).toEqual({ name, code: 'ok' });
    }
  });

  it('agrees on a tampered payload', async () => {
    const now = nowSec();
    const envelope = await signEnvelope({
      domain: V2_DOMAIN as unknown as Record<string, unknown>,
      types: V2_TYPES as unknown as Record<string, unknown>,
      primaryType: V2_PRIMARY_TYPE,
      data: v2Data(now),
      schemaVersion: 2,
    });
    envelope.data = { ...envelope.data, tradeAmountUsd: 9_999_999 };

    const { prod, ver } = await expectSameVerdict(envelope);
    expect(prod.valid).toBe(false);
    expect(ver.code).toBe('uid_mismatch');
  });

  it('agrees on a signature from a different key', async () => {
    const now = nowSec();
    const envelope = await signEnvelope({
      domain: V2_DOMAIN as unknown as Record<string, unknown>,
      types: V2_TYPES as unknown as Record<string, unknown>,
      primaryType: V2_PRIMARY_TYPE,
      data: v2Data(now),
      schemaVersion: 2,
      privateKey: OTHER_PRIVATE_KEY,
      attester: privateKeyToAccount(TEST_PRIVATE_KEY).address,
    });

    const { prod, ver } = await expectSameVerdict(envelope);
    expect(prod.valid).toBe(false);
    expect(ver.code).toBe('signature_invalid');
  });

  it('agrees on an expired receipt', async () => {
    // checkedAt two hours ago; v2/v3 carry an explicit validUntil that is past.
    const stale = nowSec() - 7200;
    const envelope = await signEnvelope({
      domain: V2_DOMAIN as unknown as Record<string, unknown>,
      types: V2_TYPES as unknown as Record<string, unknown>,
      primaryType: V2_PRIMARY_TYPE,
      data: v2Data(stale),
      schemaVersion: 2,
    });

    const { prod, ver } = await expectSameVerdict(envelope);
    expect(prod.expired).toBe(true);
    expect(prod.valid).toBe(false);
    expect(ver.code).toBe('expired');
  });

  it('reproduces the v1 expired quirk rather than silently diverging', async () => {
    // KNOWN ASYMMETRY: v1 returns valid:true with expired:true; v2/v3 return
    // valid:false. This test pins the divergence so that fixing it in one place
    // without the other fails loudly. If you fix v1 in production, fix it in
    // verifier/src/verify.ts and update this test in the same commit.
    const stale = nowSec() - 7200;
    const envelope = await signEnvelope({
      domain: ATTESTATION_DOMAIN as unknown as Record<string, unknown>,
      types: ATTESTATION_TYPES as unknown as Record<string, unknown>,
      primaryType: ATTESTATION_PRIMARY_TYPE,
      data: v1Data(stale),
      schemaVersion: 1,
    });

    const { prod, ver } = await expectSameVerdict(envelope);
    expect(prod.expired).toBe(true);
    expect(ver.code).toBe('expired');
    expect(ver.valid).toBe(prod.valid);
  });

  it('agrees on a recheck that does not bind its own requestHash', async () => {
    const now = nowSec();
    const data = { ...recheckV3Data(now), originalRequestHash: H3 };
    const envelope = await signEnvelope({
      domain: RECHECK_V3_DOMAIN as unknown as Record<string, unknown>,
      types: RECHECK_V3_TYPES as unknown as Record<string, unknown>,
      primaryType: RECHECK_V3_PRIMARY_TYPE,
      data,
      schemaVersion: 3,
      envelopeType: 'OracleSafetyRecheck',
    });

    const { prod, ver } = await expectSameVerdict(envelope);
    expect(prod.valid).toBe(false);
    expect(prod.reason).toContain('recheck_binding_mismatch');
    expect(ver.code).toBe('recheck_binding_mismatch');
  });

  it('agrees on an unsupported schema version', async () => {
    const envelope: RoutableAttestation = {
      uid: H1,
      schemaVersion: 99,
      attester: privateKeyToAccount(TEST_PRIVATE_KEY).address,
      signature: '0x' + '00'.repeat(65),
      data: {},
    };

    const { prod, ver } = await bothVerdicts(envelope);
    expect(prod.valid).toBe(false);
    expect(ver.valid).toBe(false);
    expect(ver.code).toBe('unsupported_schema');
    expect(ver.reason).toBe(prod.reason);
  });
});
