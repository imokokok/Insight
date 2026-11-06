/**
 * Pure spec constants and shape types for the decision-input assessment
 * attestation (EIP-712 commitment metadata).
 *
 * Kept dependency-free so that both `attestation.ts` (signing/verification)
 * and `assessment.ts` (evidence shape) can import from here without forming
 * an import cycle.
 */

export const DECISION_INPUT_ATTESTATION_SCHEMA_VERSION = 1;
export const DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS = 300;
export const DECISION_INPUT_ATTESTATION_PRIMARY_TYPE = 'DecisionInputAssessment';
export const DECISION_INPUT_ATTESTATION_LABEL = 'Insight Decision Input Assessment attester';
export const DECISION_INPUT_ATTESTATION_DOMAIN = {
  name: 'Insight Decision Input Assessment',
  version: '1',
  chainId: 1,
} as const;

export const DECISION_INPUT_ATTESTATION_TYPES = {
  DecisionInputAssessment: [
    { name: 'assessmentHash', type: 'bytes32' },
    { name: 'linkedPreTradeUid', type: 'bytes32' },
    { name: 'verifyUrlHash', type: 'bytes32' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

export interface DecisionInputAssessmentAttestationData {
  assessmentHash: `0x${string}`;
  linkedPreTradeUid: `0x${string}`;
  verifyUrlHash: `0x${string}`;
  issuedAt: number;
  validUntil: number;
  schemaVersion: 1;
}

export interface DecisionInputAssessmentAttestation {
  type: typeof DECISION_INPUT_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: 1;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  signature: `0x${string}`;
  verifyUrl: string;
  data: DecisionInputAssessmentAttestationData;
  /** Informational only. Verification derives these constants locally. */
  eip712: {
    domain: typeof DECISION_INPUT_ATTESTATION_DOMAIN;
    types: typeof DECISION_INPUT_ATTESTATION_TYPES;
    primaryType: typeof DECISION_INPUT_ATTESTATION_PRIMARY_TYPE;
  };
}

export interface DecisionInputAssessmentVerificationResult {
  valid: boolean;
  attester: string | null;
  uid: string | null;
  assessmentHash: string | null;
  linkedPreTradeUid: string | null;
  issuedAt: number | null;
  expired: boolean;
  reason:
    | 'verified'
    | 'missing_attestation'
    | 'malformed'
    | 'assessment_digest_mismatch'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'untrusted_attester'
    | 'expired'
    | 'verification_error';
}
