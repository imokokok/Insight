import { hashTypedData, isAddress, verifyTypedData } from 'viem';

import type { SafetyVerdict, SignedAttestation } from './types';

export const INTERAI_EXTERNAL_EVIDENCE_REVISION = 'rev6' as const;
export const INTERAI_EXTERNAL_EVIDENCE_NAMESPACE = 'insight.oracle-safety-check' as const;
export const INTERAI_EXTERNAL_EVIDENCE_ASSERTION_VERSION = 'v2' as const;
export const INTERAI_EXTERNAL_EVIDENCE_KEY_ID = 'insight-oracle-safety-v2' as const;
export const INTERAI_EXTERNAL_EVIDENCE_VERDICT_SPACE = 'insight.pre-trade/v2' as const;

export const INTERAI_COMMITTED_FIELDS = [
  'subjectChainId',
  'sourceAssetId',
  'destinationAssetId',
  'action',
  'tradeAmountUsd',
] as const;

export type InterAIUint256 = number | string;

export interface InterAIExternalEvidenceV0 {
  evidence_id: `0x${string}`;
  provider: {
    namespace: typeof INTERAI_EXTERNAL_EVIDENCE_NAMESPACE;
    assertion_version: typeof INTERAI_EXTERNAL_EVIDENCE_ASSERTION_VERSION;
    key_id: typeof INTERAI_EXTERNAL_EVIDENCE_KEY_ID;
  };
  assertion: {
    kind: 'assessment';
    verdict: SafetyVerdict;
    verdict_space: typeof INTERAI_EXTERNAL_EVIDENCE_VERDICT_SPACE;
    observations: {
      coverage_status: string;
      participant_count: InterAIUint256;
      required_participant_count: InterAIUint256;
      cross_provider_deviation_bps: InterAIUint256;
      cross_provider_agreement_bps: InterAIUint256;
      independence_status: string;
      max_data_age_seconds: InterAIUint256;
    };
  };
  validity: {
    evaluated_at: InterAIUint256;
    valid_until: InterAIUint256;
  };
  binding: {
    scope: 'action';
    binding_mode: 'exact_action';
    action_commitment: {
      scheme: 'insight.canonical-pre-trade-request/v1';
      type: 'eip712';
      commitment: `0x${string}`;
      committed_fields: [...typeof INTERAI_COMMITTED_FIELDS];
    };
  };
  verification: {
    mode: 'inline';
    inline_payload: InterAIOracleSafetyCheckV2;
    inline_signature: `0x${string}`;
  };
}

export interface InterAIExternalEvidenceRequestV0 {
  external_evidence: [InterAIExternalEvidenceV0];
}

export interface InterAIOracleSafetyCheckV2 {
  verdict: SafetyVerdict;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: InterAIUint256;
  action: string;
  tradeAmountUsd: InterAIUint256;
  consensusPrice: InterAIUint256;
  maxDeviationBps: InterAIUint256;
  manipulationRiskBps: InterAIUint256;
  participantCount: InterAIUint256;
  requiredParticipantCount: InterAIUint256;
  coverageStatus: string;
  independenceStatus: string;
  sourceGroupCount: InterAIUint256;
  crossProviderAgreementBps: InterAIUint256;
  maxStablecoinDepegBps: InterAIUint256;
  maxDataAgeSeconds: InterAIUint256;
  recommendedMaxPositionUsd: InterAIUint256;
  reasonCodesHash: `0x${string}`;
  requestHash: `0x${string}`;
  evaluationScope: 'SOURCE_ASSET_ONLY';
  evaluatedAssetIdsHash: `0x${string}`;
  providerObservationsHash: `0x${string}`;
  validUntil: InterAIUint256;
  checkedAt: InterAIUint256;
  schemaVersion: 2;
}

const V2_DOMAIN = {
  name: 'Insight Oracle Safety',
  version: '2',
  chainId: 1,
} as const;

const V2_PRIMARY_TYPE = 'OracleSafetyCheck' as const;

const V2_TYPES = {
  OracleSafetyCheck: [
    { name: 'verdict', type: 'string' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'tradeAmountUsd', type: 'uint256' },
    { name: 'consensusPrice', type: 'uint256' },
    { name: 'maxDeviationBps', type: 'uint256' },
    { name: 'manipulationRiskBps', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'coverageStatus', type: 'string' },
    { name: 'independenceStatus', type: 'string' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'crossProviderAgreementBps', type: 'uint256' },
    { name: 'maxStablecoinDepegBps', type: 'uint256' },
    { name: 'maxDataAgeSeconds', type: 'uint256' },
    { name: 'recommendedMaxPositionUsd', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'evaluationScope', type: 'string' },
    { name: 'evaluatedAssetIdsHash', type: 'bytes32' },
    { name: 'providerObservationsHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'checkedAt', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const PAYLOAD_FIELDS = V2_TYPES.OracleSafetyCheck.map(({ name }) => name);
const PAYLOAD_FIELD_SET = new Set<string>(PAYLOAD_FIELDS);
const VERDICTS = new Set<SafetyVerdict>(['PASS', 'CAUTION', 'DANGER', 'BLOCK']);
const LOWER_BYTES32 = /^0x[0-9a-f]{64}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;
const CANONICAL_DECIMAL = /^(0|[1-9][0-9]*)$/;
const SAFE_MAX = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Build the frozen external-evidence/v0 rev6 Insight profile in inline mode.
 *
 * Inline mode is deliberate: it needs no InterAI credential, no remote Insight
 * resolver, and no caller-controlled URL. The function verifies the v2 UID and
 * signature before producing the carrier projection. It copies only the 26
 * signed fields and never emits InterAI-computed authority, contribution or
 * decision fields.
 */
export async function buildInterAIExternalEvidenceV0(
  attestation: SignedAttestation
): Promise<InterAIExternalEvidenceV0> {
  if (attestation.schemaVersion !== 2) {
    throw new Error('InterAI external-evidence/v0 rev6 requires an Insight v2 attestation.');
  }
  if (!isAddress(attestation.attester)) {
    throw new Error('The Insight v2 attestation has an invalid attester address.');
  }
  if (typeof attestation.signature !== 'string' || !SIGNATURE.test(attestation.signature)) {
    throw new Error('The Insight v2 attestation must carry a 65-byte EIP-712 signature.');
  }
  if (typeof attestation.uid !== 'string' || !LOWER_BYTES32.test(attestation.uid)) {
    throw new Error('The Insight v2 attestation must carry a lowercase bytes32 UID.');
  }

  const payload = readPayload(attestation.data);
  const typedData = {
    domain: V2_DOMAIN,
    types: V2_TYPES,
    primaryType: V2_PRIMARY_TYPE,
    message: toTypedMessage(payload),
  } as const;
  const expectedUid = hashTypedData(typedData);
  if (expectedUid !== attestation.uid) {
    throw new Error('The Insight v2 attestation UID does not match its signed payload.');
  }
  let signatureValid = false;
  try {
    signatureValid = await verifyTypedData({
      ...typedData,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });
  } catch {
    // Malformed compact signatures and validly encoded signatures from the
    // wrong key share the same fail-closed public result.
  }
  if (!signatureValid) {
    throw new Error('The Insight v2 attestation signature is invalid.');
  }

  return {
    evidence_id: attestation.uid as `0x${string}`,
    provider: {
      namespace: INTERAI_EXTERNAL_EVIDENCE_NAMESPACE,
      assertion_version: INTERAI_EXTERNAL_EVIDENCE_ASSERTION_VERSION,
      key_id: INTERAI_EXTERNAL_EVIDENCE_KEY_ID,
    },
    assertion: {
      kind: 'assessment',
      verdict: payload.verdict,
      verdict_space: INTERAI_EXTERNAL_EVIDENCE_VERDICT_SPACE,
      observations: {
        coverage_status: payload.coverageStatus,
        participant_count: payload.participantCount,
        required_participant_count: payload.requiredParticipantCount,
        cross_provider_deviation_bps: payload.maxDeviationBps,
        cross_provider_agreement_bps: payload.crossProviderAgreementBps,
        independence_status: payload.independenceStatus,
        max_data_age_seconds: payload.maxDataAgeSeconds,
      },
    },
    validity: {
      evaluated_at: payload.checkedAt,
      valid_until: payload.validUntil,
    },
    binding: {
      scope: 'action',
      binding_mode: 'exact_action',
      action_commitment: {
        scheme: 'insight.canonical-pre-trade-request/v1',
        type: 'eip712',
        commitment: payload.requestHash,
        committed_fields: [...INTERAI_COMMITTED_FIELDS],
      },
    },
    verification: {
      mode: 'inline',
      inline_payload: payload,
      inline_signature: attestation.signature as `0x${string}`,
    },
  };
}

function toTypedMessage(payload: InterAIOracleSafetyCheckV2) {
  return {
    ...payload,
    subjectChainId: BigInt(payload.subjectChainId),
    tradeAmountUsd: BigInt(payload.tradeAmountUsd),
    consensusPrice: BigInt(payload.consensusPrice),
    maxDeviationBps: BigInt(payload.maxDeviationBps),
    manipulationRiskBps: BigInt(payload.manipulationRiskBps),
    participantCount: BigInt(payload.participantCount),
    requiredParticipantCount: BigInt(payload.requiredParticipantCount),
    sourceGroupCount: BigInt(payload.sourceGroupCount),
    crossProviderAgreementBps: BigInt(payload.crossProviderAgreementBps),
    maxStablecoinDepegBps: BigInt(payload.maxStablecoinDepegBps),
    maxDataAgeSeconds: BigInt(payload.maxDataAgeSeconds),
    recommendedMaxPositionUsd: BigInt(payload.recommendedMaxPositionUsd),
    validUntil: BigInt(payload.validUntil),
    checkedAt: BigInt(payload.checkedAt),
    schemaVersion: 2n,
  };
}

/** Convenience wrapper for InterAI's optional top-level collection. */
export async function buildInterAIExternalEvidenceRequestV0(
  attestation: SignedAttestation
): Promise<InterAIExternalEvidenceRequestV0> {
  return { external_evidence: [await buildInterAIExternalEvidenceV0(attestation)] };
}

function readPayload(value: Record<string, unknown>): InterAIOracleSafetyCheckV2 {
  if (!isObject(value)) throw new Error('The Insight v2 attestation payload must be an object.');
  const keys = Object.keys(value);
  const unexpected = keys.filter((key) => !PAYLOAD_FIELD_SET.has(key));
  const missing = PAYLOAD_FIELDS.filter((key) => !(key in value));
  if (unexpected.length || missing.length || keys.length !== PAYLOAD_FIELDS.length) {
    throw new Error(
      `The Insight v2 payload must contain exactly the frozen 26 fields; missing=[${missing.join(',')}], unexpected=[${unexpected.join(',')}].`
    );
  }

  const verdict = readString(value, 'verdict') as SafetyVerdict;
  if (!VERDICTS.has(verdict)) throw new Error(`Unsupported Insight verdict: ${verdict}.`);
  const evaluationScope = readString(value, 'evaluationScope');
  if (evaluationScope !== 'SOURCE_ASSET_ONLY') {
    throw new Error('InterAI rev6 pins evaluationScope to SOURCE_ASSET_ONLY.');
  }
  if (value.schemaVersion !== 2) {
    throw new Error('InterAI rev6 pins the signed schemaVersion to 2.');
  }

  return {
    verdict,
    sourceAssetId: readString(value, 'sourceAssetId'),
    destinationAssetId: readString(value, 'destinationAssetId'),
    subjectChainId: readUint256(value, 'subjectChainId'),
    action: readString(value, 'action'),
    tradeAmountUsd: readUint256(value, 'tradeAmountUsd'),
    consensusPrice: readUint256(value, 'consensusPrice'),
    maxDeviationBps: readUint256(value, 'maxDeviationBps'),
    manipulationRiskBps: readUint256(value, 'manipulationRiskBps'),
    participantCount: readUint256(value, 'participantCount'),
    requiredParticipantCount: readUint256(value, 'requiredParticipantCount'),
    coverageStatus: readString(value, 'coverageStatus'),
    independenceStatus: readString(value, 'independenceStatus'),
    sourceGroupCount: readUint256(value, 'sourceGroupCount'),
    crossProviderAgreementBps: readUint256(value, 'crossProviderAgreementBps'),
    maxStablecoinDepegBps: readUint256(value, 'maxStablecoinDepegBps'),
    maxDataAgeSeconds: readUint256(value, 'maxDataAgeSeconds'),
    recommendedMaxPositionUsd: readUint256(value, 'recommendedMaxPositionUsd'),
    reasonCodesHash: readBytes32(value, 'reasonCodesHash'),
    requestHash: readBytes32(value, 'requestHash'),
    evaluationScope,
    evaluatedAssetIdsHash: readBytes32(value, 'evaluatedAssetIdsHash'),
    providerObservationsHash: readBytes32(value, 'providerObservationsHash'),
    validUntil: readUint256(value, 'validUntil'),
    checkedAt: readUint256(value, 'checkedAt'),
    schemaVersion: 2,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, field: string): string {
  const candidate = value[field];
  if (typeof candidate !== 'string') throw new Error(`${field} must be a string.`);
  return candidate;
}

function readBytes32(value: Record<string, unknown>, field: string): `0x${string}` {
  const candidate = readString(value, field);
  if (!LOWER_BYTES32.test(candidate))
    throw new Error(`${field} must be a lowercase bytes32 value.`);
  return candidate as `0x${string}`;
}

function readUint256(value: Record<string, unknown>, field: string): InterAIUint256 {
  const candidate = value[field];
  if (typeof candidate === 'number') {
    if (!Number.isSafeInteger(candidate) || candidate < 0) {
      throw new Error(`${field} must be a non-negative safe integer on the JSON-number track.`);
    }
    return candidate;
  }
  if (typeof candidate === 'string' && CANONICAL_DECIMAL.test(candidate)) {
    if (BigInt(candidate) <= SAFE_MAX) {
      throw new Error(`${field} fits the safe range and must use the JSON-number track.`);
    }
    return candidate;
  }
  throw new Error(`${field} must be a canonical external-evidence/v0 uint256.`);
}
