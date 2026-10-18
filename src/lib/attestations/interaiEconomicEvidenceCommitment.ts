/**
 * D8's separate, experimental economic-evidence companion.  This module only
 * publishes the EIP-712 contract admitted by the registry; it deliberately
 * does not add a signing path or alter the OracleSafetyCheck v3 payload.
 */

export const INTERAI_ECONOMIC_EVIDENCE_COMMITMENT_SCHEMA =
  'insight.interai-economic-commitment/v1-proposed' as const;

export const INTERAI_ECONOMIC_EVIDENCE_COMMITMENT_DOMAIN = {
  name: 'InterAI Insight Economic Evidence',
  version: '1',
  chainId: 84532,
} as const;

export const INTERAI_ECONOMIC_EVIDENCE_COMMITMENT_PRIMARY_TYPE =
  'EconomicEvidenceCommitment' as const;

/** Field order is part of the EIP-712 type hash. */
export const INTERAI_ECONOMIC_EVIDENCE_COMMITMENT_TYPES = {
  EconomicEvidenceCommitment: [
    { name: 'experimentId', type: 'string' },
    { name: 'caseId', type: 'string' },
    { name: 'executionIntentHash', type: 'bytes32' },
    { name: 'commonInputHash', type: 'bytes32' },
    { name: 'factsHash', type: 'bytes32' },
    { name: 'sourceEvidenceUid', type: 'bytes32' },
    { name: 'destinationEvidenceUid', type: 'bytes32' },
    { name: 'checkedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

export const INTERAI_ECONOMIC_EVIDENCE_COMMITMENT_ADMISSION = {
  partnerId: 'interai',
  lifecycle: 'd8-experimental-only',
  signingAdmission: 'registry-admitted-but-not-enabled-for-issuance',
  allowedAttesterRole: 'attester',
  requires: [
    'bilateral-domain-acceptance',
    'positive-companion-validity-window',
    'source-and-destination-v3-evidence-valid-at-evaluation-time',
    'quote-valid-at-evaluation-time',
    'experiment-and-input-uid-replay-protection',
  ],
  excludes: [
    'oracle-safety-check-v3-payload-change',
    'stage-2-policy-change',
    'production-decision-authority',
    'automatic-signing',
  ],
} as const;
