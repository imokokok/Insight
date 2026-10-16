import { encodeAbiParameters, hashTypedData, keccak256, toBytes, verifyTypedData } from 'viem';

import type {
  DecisionInputAssessment,
  DecisionInputPairCommitment,
  DecisionInputPolicy,
  DecisionInputTrust,
  PreTradeRequest,
  PreTradeResult,
} from './types';

export const DECISION_INPUT_PAIR_NAMESPACE = 'insight.decision-input-pair.v1';
export const DECISION_INPUT_DOMAIN = {
  name: 'Insight Decision Input Assessment',
  version: '1',
  chainId: 1,
} as const;
export const DECISION_INPUT_TYPES = {
  DecisionInputAssessment: [
    { name: 'assessmentHash', type: 'bytes32' },
    { name: 'linkedPreTradeUid', type: 'bytes32' },
    { name: 'verifyUrlHash', type: 'bytes32' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;
const VALID_FOR_SECONDS = 300;
const MAX_CANONICAL_BYTES = 256 * 1024;
const ATTESTATION_LABEL = 'Insight Decision Input Assessment attester';
const ORACLE_V3_DOMAIN = { name: 'Insight Oracle Safety', version: '3', chainId: 1 } as const;
const ORACLE_V2_FIELDS = [
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
] as const;
const ORACLE_V3_TYPES = {
  OracleSafetyCheck: [...ORACLE_V2_FIELDS, { name: 'requiredSourceGroupCount', type: 'uint256' }],
} as const;

export type DecisionInputVerification = {
  valid: boolean;
  reason:
    | 'verified'
    | 'missing_attestation'
    | 'malformed'
    | 'digest_mismatch'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'untrusted_attester'
    | 'policy_mismatch'
    | 'quote_stale'
    | 'expired'
    | 'verification_error';
  uid: string | null;
  assessmentHash: string | null;
  linkedPreTradeUid: string | null;
  validUntil: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isHttpUrl(value: string, expectedPath = '/api/v1/safety/decision-input/verify'): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.pathname === expectedPath
    );
  } catch {
    return false;
  }
}

/** Independently verify the exact signed pre-trade object used by the DIT link. */
export async function verifySignedPreTradeAttestation(
  value: unknown,
  trust: DecisionInputTrust,
  now = Math.floor(Date.now() / 1000)
) {
  if (!isRecord(value) || !isRecord(value.data)) return false;
  const proof = value as unknown as PreTradeResult['attestation'];
  const version = proof?.schemaVersion;
  if (
    !proof ||
    version !== 3 ||
    proof.data.schemaVersion !== 3 ||
    !HEX32.test(proof.uid) ||
    !ADDRESS.test(proof.attester) ||
    typeof proof.signature !== 'string' ||
    !SIGNATURE.test(proof.signature)
  )
    return false;
  const fields = [...ORACLE_V2_FIELDS.map((field) => field.name), 'requiredSourceGroupCount'];
  if (
    Object.keys(proof.data).length !== fields.length ||
    fields.some((field) => !(field in proof.data))
  )
    return false;
  for (const item of ORACLE_V3_TYPES.OracleSafetyCheck) {
    const fieldValue = proof.data[item.name];
    if (item.type === 'string' && typeof fieldValue !== 'string') return false;
    if (item.type === 'bytes32' && (typeof fieldValue !== 'string' || !HEX32.test(fieldValue)))
      return false;
    if (item.type === 'uint256' && (!Number.isSafeInteger(fieldValue) || Number(fieldValue) < 0))
      return false;
  }
  const signedAt = Number(proof.data.checkedAt);
  const validUntil = Number(proof.data.validUntil);
  if (
    signedAt > now + 60 ||
    validUntil <= now ||
    validUntil <= signedAt ||
    ![600, 900, 1800].includes(validUntil - signedAt) ||
    proof.validUntil !== validUntil ||
    proof.validForSeconds !== validUntil - signedAt ||
    typeof proof.signedAt !== 'string' ||
    !timestamp(proof.signedAt) ||
    Date.parse(proof.signedAt) / 1000 < signedAt ||
    Date.parse(proof.signedAt) / 1000 > now + 60 ||
    typeof proof.verifyUrl !== 'string' ||
    !isHttpUrl(proof.verifyUrl, '/api/v1/safety/attestation/verify') ||
    !isRecord(proof.eip712) ||
    !isRecord(proof.eip712.domain) ||
    canonicalJson(proof.eip712.domain) !== canonicalJson(ORACLE_V3_DOMAIN) ||
    !isRecord(proof.eip712.types) ||
    canonicalJson(proof.eip712.types.OracleSafetyCheck) !==
      canonicalJson(ORACLE_V3_TYPES.OracleSafetyCheck) ||
    proof.eip712.primaryType !== 'OracleSafetyCheck'
  )
    return false;
  if (Number(proof.data.requiredSourceGroupCount) !== 2 || Number(proof.data.sourceGroupCount) < 2)
    return false;
  if (!trustedKey(trust.keyRegistry, proof.attester, signedAt)) return false;
  const message = {
    verdict: String(proof.data.verdict),
    sourceAssetId: String(proof.data.sourceAssetId),
    destinationAssetId: String(proof.data.destinationAssetId),
    subjectChainId: BigInt(Number(proof.data.subjectChainId)),
    action: String(proof.data.action),
    tradeAmountUsd: BigInt(Number(proof.data.tradeAmountUsd)),
    consensusPrice: BigInt(Number(proof.data.consensusPrice)),
    maxDeviationBps: BigInt(Number(proof.data.maxDeviationBps)),
    manipulationRiskBps: BigInt(Number(proof.data.manipulationRiskBps)),
    participantCount: BigInt(Number(proof.data.participantCount)),
    requiredParticipantCount: BigInt(Number(proof.data.requiredParticipantCount)),
    coverageStatus: String(proof.data.coverageStatus),
    independenceStatus: String(proof.data.independenceStatus),
    sourceGroupCount: BigInt(Number(proof.data.sourceGroupCount)),
    crossProviderAgreementBps: BigInt(Number(proof.data.crossProviderAgreementBps)),
    maxStablecoinDepegBps: BigInt(Number(proof.data.maxStablecoinDepegBps)),
    maxDataAgeSeconds: BigInt(Number(proof.data.maxDataAgeSeconds)),
    recommendedMaxPositionUsd: BigInt(Number(proof.data.recommendedMaxPositionUsd)),
    reasonCodesHash: String(proof.data.reasonCodesHash) as `0x${string}`,
    requestHash: String(proof.data.requestHash) as `0x${string}`,
    evaluationScope: String(proof.data.evaluationScope),
    evaluatedAssetIdsHash: String(proof.data.evaluatedAssetIdsHash) as `0x${string}`,
    providerObservationsHash: String(proof.data.providerObservationsHash) as `0x${string}`,
    validUntil: BigInt(validUntil),
    checkedAt: BigInt(signedAt),
    schemaVersion: 3n,
    requiredSourceGroupCount: BigInt(Number(proof.data.requiredSourceGroupCount)),
  };
  const typedData = {
    domain: ORACLE_V3_DOMAIN,
    types: ORACLE_V3_TYPES,
    primaryType: 'OracleSafetyCheck' as const,
    message,
  };
  if (hashTypedData(typedData).toLowerCase() !== proof.uid.toLowerCase()) return false;
  return verifyTypedData({
    ...typedData,
    address: proof.attester as `0x${string}`,
    signature: proof.signature as `0x${string}`,
  });
}

/** Deterministic key-sorted JSON, shared with the server's canonical hashing. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 64) throw new TypeError('JSON value is too deeply nested');
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length > 20_000) throw new TypeError('JSON value is too large');
    return `[${value.map((entry) => canonicalJson(entry, depth + 1)).join(',')}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    if (
      keys.length > 20_000 ||
      keys.some((key) => ['__proto__', 'prototype', 'constructor'].includes(key))
    ) {
      throw new TypeError('JSON object contains unsafe or excessive keys');
    }
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], depth + 1)}`).join(',')}}`;
  }
  throw new TypeError('Value is not canonical JSON');
}

function assessmentHash(assessment: DecisionInputAssessment): `0x${string}` {
  const { attestation: _attestation, ...unsigned } = assessment;
  const canonical = canonicalJson(unsigned);
  if (new TextEncoder().encode(canonical).byteLength > MAX_CANONICAL_BYTES)
    throw new TypeError('Assessment exceeds the canonical byte limit');
  return keccak256(toBytes(canonical));
}

function policyMatches(assessment: DecisionInputAssessment, policy: DecisionInputPolicy): boolean {
  return (
    assessment.policy.maxReferenceDeviationBps === policy.maxReferenceDeviationBps &&
    assessment.policy.maxSlippageBps === policy.maxSlippageBps &&
    assessment.policy.maxQuoteAgeSeconds === policy.maxQuoteAgeSeconds
  );
}

/** Last whole second at which the caller-supplied quote remains within policy. */
export function decisionInputQuoteValidUntil(
  assessment: DecisionInputAssessment,
  policy: DecisionInputPolicy
): number {
  const observedAt = assessment.prices?.quoteObservedAt;
  if (
    !timestamp(observedAt) ||
    !Number.isSafeInteger(policy.maxQuoteAgeSeconds) ||
    policy.maxQuoteAgeSeconds < 1 ||
    policy.maxQuoteAgeSeconds > 300
  )
    throw new TypeError('Decision Input quote freshness policy is invalid');
  return Math.floor(Date.parse(observedAt) / 1000 + policy.maxQuoteAgeSeconds);
}

function validAssetIds(value: unknown): value is Record<string, string> {
  if (!isRecord(value) || Object.keys(value).length < 2 || Object.keys(value).length > 100)
    return false;
  const normalizedLabels = new Set<string>();
  for (const [label, assetId] of Object.entries(value)) {
    const normalized = label.trim().toUpperCase();
    if (
      !normalized ||
      normalizedLabels.has(normalized) ||
      typeof assetId !== 'string' ||
      !/^eip155:[1-9][0-9]*\/erc20:0x[0-9a-fA-F]{40}$/.test(assetId)
    )
      return false;
    normalizedLabels.add(normalized);
  }
  return true;
}

function validPolicyLimits(policy: Record<string, unknown>): boolean {
  const reference = policy.maxReferenceDeviationBps;
  const slippage = policy.maxSlippageBps;
  const quoteAge = policy.maxQuoteAgeSeconds;
  return (
    Number.isSafeInteger(reference) &&
    Number(reference) >= 0 &&
    Number(reference) <= 10_000 &&
    Number.isSafeInteger(slippage) &&
    Number(slippage) >= 0 &&
    Number(slippage) <= 10_000 &&
    Number.isSafeInteger(quoteAge) &&
    Number(quoteAge) >= 1 &&
    Number(quoteAge) <= 300
  );
}

function validDecisionInputPolicy(value: unknown): value is DecisionInputPolicy {
  if (
    !isRecord(value) ||
    typeof value.policyId !== 'string' ||
    !value.policyId.trim() ||
    typeof value.version !== 'string' ||
    !value.version.trim()
  )
    return false;
  return validAssetIds(value.assetIds) && validPolicyLimits(value);
}

function validTrustedKeys(value: unknown): value is Array<Record<string, unknown>> {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return false;
  const ids = new Set<string>();
  const addresses = new Set<string>();
  for (const key of value) {
    if (
      !isRecord(key) ||
      typeof key.key_id !== 'string' ||
      !key.key_id ||
      typeof key.public_key !== 'string' ||
      !ADDRESS.test(key.public_key) ||
      typeof key.revoked !== 'boolean' ||
      (key.role !== undefined && key.role !== 'attester' && key.role !== 'sample') ||
      typeof key.validFrom !== 'string' ||
      !Number.isFinite(Date.parse(key.validFrom)) ||
      (key.validUntil !== null &&
        (typeof key.validUntil !== 'string' || !Number.isFinite(Date.parse(key.validUntil))))
    )
      return false;
    const id = key.key_id;
    const address = key.public_key.toLowerCase();
    if (ids.has(id) || addresses.has(address)) return false;
    ids.add(id);
    addresses.add(address);
    if (key.validUntil !== null && Date.parse(key.validUntil as string) < Date.parse(key.validFrom))
      return false;
  }
  return true;
}

function validRevokedKeys(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((entry) => isRecord(entry) && typeof entry.key_id === 'string')
  );
}

function validateTrustProfile(trust: DecisionInputTrust): boolean {
  if (!isRecord(trust) || !validDecisionInputPolicy(trust.policy) || !isRecord(trust.keyRegistry))
    return false;
  const registry = trust.keyRegistry;
  if ((registry.public_keys && registry.keys) || (registry.revoked_keys && registry.revoked))
    return false;
  const keys = registry.public_keys ?? registry.keys;
  const revoked = registry.revoked_keys ?? registry.revoked ?? [];
  return validTrustedKeys(keys) && validRevokedKeys(revoked);
}

function trustedKey(
  registry: DecisionInputTrust['keyRegistry'],
  address: string,
  issuedAt: number
): boolean {
  const keys = registry.public_keys ?? registry.keys ?? [];
  const matches = keys.filter(
    (key) =>
      isRecord(key) &&
      typeof key.public_key === 'string' &&
      key.public_key.toLowerCase() === address.toLowerCase()
  );
  if (matches.length !== 1) return false;
  const key = matches[0];
  if (
    !isRecord(key) ||
    key.revoked !== false ||
    (key.role !== undefined && key.role !== 'attester')
  )
    return false;
  const validFrom = Date.parse(String(key.validFrom)) / 1000;
  const validUntil = key.validUntil === null ? null : Date.parse(String(key.validUntil)) / 1000;
  if (!Number.isFinite(validFrom) || (validUntil !== null && !Number.isFinite(validUntil)))
    return false;
  if (issuedAt < validFrom || (validUntil !== null && issuedAt >= validUntil)) return false;
  const revoked = registry.revoked_keys ?? registry.revoked ?? [];
  return !revoked.some((entry) => isRecord(entry) && entry.key_id === key.key_id);
}

/** Bind the signed assessment back to the exact user input sent to the API. */
export function decisionInputMatchesRequest(
  assessment: DecisionInputAssessment,
  request: PreTradeRequest
): boolean {
  const prices = assessment.prices;
  const input = request.decisionInput;
  return Boolean(
    input &&
    isRecord(prices) &&
    assessment.asset.trim().toUpperCase() === request.asset.trim().toUpperCase() &&
    assessment.chainId === request.chainId &&
    assessment.action === request.action &&
    assessment.tradeAmountUsd === request.tradeAmountUsd &&
    prices.decisionPriceUsd === input.decisionPriceUsd &&
    prices.quotePriceUsd === input.quotePriceUsd &&
    prices.quoteObservedAt === input.quoteObservedAt &&
    assessment.policy.maxReferenceDeviationBps === input.maxReferenceDeviationBps &&
    assessment.policy.maxSlippageBps === input.maxSlippageBps &&
    assessment.policy.maxQuoteAgeSeconds === input.maxQuoteAgeSeconds
  );
}

/** Verify each signed input against the corresponding request and pre-trade proof. */
export async function verifyDecisionInputPair(
  source: PreTradeResult,
  sourceRequest: PreTradeRequest,
  destination: PreTradeResult,
  destinationRequest: PreTradeRequest,
  trust: DecisionInputTrust,
  options: { now?: number } = {}
): Promise<{ commitment: ReturnType<typeof buildDecisionInputPairCommitment> }> {
  const sourceInput = source.decisionInputAssessment;
  const destinationInput = destination.decisionInputAssessment;
  if (
    !sourceInput ||
    !destinationInput ||
    !decisionInputMatchesRequest(sourceInput, sourceRequest) ||
    !decisionInputMatchesRequest(destinationInput, destinationRequest)
  ) {
    throw new TypeError(
      'Decision Input assessments do not match the requested input, policy, or trade scope'
    );
  }
  const sourceData = source.attestation?.data;
  const sourceAssetId = sourceData?.sourceAssetId;
  const destinationAssetId = sourceData?.destinationAssetId;
  const normalized = (value?: string) => value?.trim().toUpperCase();
  const resolve = (asset: string) => {
    const normalizedAsset = asset.trim().toUpperCase();
    const entries = Object.entries(trust.policy.assetIds).filter(
      ([label]) => label.trim().toUpperCase() === normalizedAsset
    );
    return entries.length === 1 ? entries[0][1] : undefined;
  };
  if (
    typeof sourceAssetId !== 'string' ||
    typeof destinationAssetId !== 'string' ||
    normalized(sourceRequest.destinationAsset) !== normalized(destinationRequest.asset) ||
    normalized(destinationRequest.destinationAsset) !== normalized(sourceRequest.asset) ||
    resolve(sourceRequest.asset)?.toLowerCase() !== sourceAssetId.toLowerCase() ||
    resolve(destinationRequest.asset)?.toLowerCase() !== destinationAssetId.toLowerCase()
  )
    throw new TypeError(
      'Decision Input asset labels are not bound to the trusted CAIP-19 asset profile'
    );
  return verifyLinkedDecisionInputPair(source, destination, trust, options);
}

type DecisionInputAttestation = NonNullable<DecisionInputAssessment['attestation']>;

function validAssessmentCore(value: DecisionInputAssessment): boolean {
  return (
    value.schemaVersion === 1 &&
    ['SUFFICIENT', 'BLOCK', 'INSUFFICIENT_EVIDENCE'].includes(value.status) &&
    value.eligibleToProceed === (value.status === 'SUFFICIENT') &&
    typeof value.asset === 'string' &&
    Boolean(value.asset.trim()) &&
    Number.isSafeInteger(value.chainId) &&
    value.chainId >= 0 &&
    ['swap', 'borrow', 'lend', 'liquidate', 'repay'].includes(value.action) &&
    Number.isFinite(value.tradeAmountUsd) &&
    value.tradeAmountUsd > 0 &&
    timestamp(value.evaluatedAt) &&
    HEX32.test(value.quoteInputHash)
  );
}

function validAssessmentPrices(prices: Record<string, unknown>): boolean {
  const age = prices.quoteAgeSeconds;
  const deviation = prices.quoteDeviationBps;
  return (
    typeof prices.decisionPriceUsd === 'number' &&
    Number.isFinite(prices.decisionPriceUsd) &&
    prices.decisionPriceUsd > 0 &&
    typeof prices.quotePriceUsd === 'number' &&
    Number.isFinite(prices.quotePriceUsd) &&
    prices.quotePriceUsd > 0 &&
    timestamp(prices.quoteObservedAt) &&
    (age === null || (typeof age === 'number' && Number.isFinite(age) && age >= 0)) &&
    (deviation === null ||
      (typeof deviation === 'number' && Number.isFinite(deviation) && deviation >= 0))
  );
}

function validAssessmentPolicy(policy: Record<string, unknown>): boolean {
  const reference = policy.maxReferenceDeviationBps;
  const slippage = policy.maxSlippageBps;
  const quoteAge = policy.maxQuoteAgeSeconds;
  return (
    Number.isSafeInteger(reference) &&
    Number(reference) >= 0 &&
    Number(reference) <= 10_000 &&
    Number.isSafeInteger(slippage) &&
    Number(slippage) >= 0 &&
    Number(slippage) <= 10_000 &&
    Number.isSafeInteger(quoteAge) &&
    Number(quoteAge) >= 1 &&
    Number(quoteAge) <= 300
  );
}

function validAssessmentReasons(value: DecisionInputAssessment): boolean {
  return (
    Array.isArray(value.reasons) &&
    value.reasons.every(
      (reason) =>
        isRecord(reason) &&
        typeof reason.code === 'string' &&
        ['block', 'insufficient_evidence'].includes(String(reason.severity)) &&
        typeof reason.message === 'string'
    )
  );
}

function validAssessmentEnvelope(
  value: DecisionInputAssessment,
  proof: DecisionInputAttestation,
  now: number
): boolean {
  return (
    validAssessmentCore(value) &&
    isRecord(value.policy) &&
    validAssessmentPolicy(value.policy) &&
    isRecord(value.prices) &&
    validAssessmentPrices(value.prices) &&
    isRecord(value.evidence) &&
    validAssessmentReasons(value) &&
    Array.isArray(value.caveats) &&
    value.caveats.every((entry) => typeof entry === 'string') &&
    (value.operationRouteQuote === null || isRecord(value.operationRouteQuote)) &&
    validProofEnvelope(proof, now)
  );
}

function validProofEnvelope(proof: DecisionInputAttestation, now: number): boolean {
  return (
    isRecord(proof.data) &&
    proof.type === 'DecisionInputAssessment' &&
    proof.schemaVersion === 1 &&
    HEX32.test(proof.uid) &&
    ADDRESS.test(proof.attester) &&
    SIGNATURE.test(proof.signature) &&
    proof.attesterLabel === ATTESTATION_LABEL &&
    typeof proof.verifyUrl === 'string' &&
    isHttpUrl(proof.verifyUrl) &&
    validProofData(proof) &&
    validProofTime(proof, now) &&
    validProofTypedData(proof)
  );
}

function validProofData(proof: DecisionInputAttestation): boolean {
  return (
    Number.isSafeInteger(proof.data.issuedAt) &&
    Number.isSafeInteger(proof.data.validUntil) &&
    proof.data.schemaVersion === 1 &&
    HEX32.test(proof.data.assessmentHash) &&
    HEX32.test(proof.data.linkedPreTradeUid) &&
    HEX32.test(proof.data.verifyUrlHash)
  );
}

function validProofTime(proof: DecisionInputAttestation, now: number): boolean {
  return (
    proof.validForSeconds === VALID_FOR_SECONDS &&
    proof.data.validUntil - proof.data.issuedAt === VALID_FOR_SECONDS &&
    proof.data.issuedAt <= now + 60 &&
    keccak256(toBytes(proof.verifyUrl)).toLowerCase() === proof.data.verifyUrlHash.toLowerCase() &&
    proof.signedAt === new Date(proof.data.issuedAt * 1000).toISOString()
  );
}

function validProofTypedData(proof: DecisionInputAttestation): boolean {
  return (
    isRecord(proof.eip712) &&
    canonicalJson(proof.eip712) ===
      canonicalJson({
        domain: DECISION_INPUT_DOMAIN,
        types: DECISION_INPUT_TYPES,
        primaryType: 'DecisionInputAssessment',
      })
  );
}

function validAssessmentPriceMath(assessment: DecisionInputAssessment): boolean {
  const prices = assessment.prices;
  const ageAtEvaluation =
    (Date.parse(assessment.evaluatedAt) - Date.parse(prices.quoteObservedAt)) / 1000;
  const expectedDeviation =
    (Math.abs(prices.quotePriceUsd - prices.decisionPriceUsd) / prices.decisionPriceUsd) * 10_000;
  const ageMatches =
    prices.quoteAgeSeconds === null ||
    (ageAtEvaluation >= 0 && Math.abs(prices.quoteAgeSeconds - ageAtEvaluation) <= 0.001);
  const deviationMatches =
    prices.quoteDeviationBps === null ||
    Math.abs(prices.quoteDeviationBps - expectedDeviation) <= 0.001;
  const sufficientWithinPolicy =
    assessment.status !== 'SUFFICIENT' ||
    (prices.quoteAgeSeconds !== null &&
      prices.quoteDeviationBps !== null &&
      ageAtEvaluation >= 0 &&
      ageAtEvaluation <= assessment.policy.maxQuoteAgeSeconds &&
      expectedDeviation <= assessment.policy.maxSlippageBps);
  return ageMatches && deviationMatches && sufficientWithinPolicy;
}

function typedDataForProof(proof: DecisionInputAttestation) {
  return {
    domain: DECISION_INPUT_DOMAIN,
    types: DECISION_INPUT_TYPES,
    primaryType: 'DecisionInputAssessment' as const,
    message: {
      assessmentHash: proof.data.assessmentHash as `0x${string}`,
      linkedPreTradeUid: proof.data.linkedPreTradeUid as `0x${string}`,
      verifyUrlHash: proof.data.verifyUrlHash as `0x${string}`,
      issuedAt: BigInt(proof.data.issuedAt),
      validUntil: BigInt(proof.data.validUntil),
      schemaVersion: BigInt(proof.data.schemaVersion),
    },
  };
}

function verificationResult(
  empty: Omit<DecisionInputVerification, 'reason'>,
  proof: DecisionInputAttestation,
  reason: DecisionInputVerification['reason'],
  values: Partial<DecisionInputVerification> = {}
): DecisionInputVerification {
  return {
    ...empty,
    reason,
    uid: proof.uid,
    linkedPreTradeUid: proof.data.linkedPreTradeUid,
    validUntil: proof.data.validUntil,
    ...values,
  };
}

/** Verify the signed assessment, exact JSON digest, signer registry, policy and five-minute lifetime. */
export async function verifyDecisionInputAssessment(
  value: unknown,
  trust: DecisionInputTrust,
  options: { now?: number; allowHistorical?: boolean } = {}
): Promise<DecisionInputVerification> {
  const empty = {
    valid: false,
    uid: null,
    assessmentHash: null,
    linkedPreTradeUid: null,
    validUntil: null,
  } as const;
  try {
    if (!isRecord(value)) return { ...empty, reason: 'malformed' };
    const assessment = value as unknown as DecisionInputAssessment;
    const proof = assessment.attestation;
    if (!proof) return { ...empty, reason: 'missing_attestation' };
    const verificationNow = options.now ?? Math.floor(Date.now() / 1000);
    if (
      !validAssessmentEnvelope(assessment, proof, verificationNow) ||
      !validAssessmentPriceMath(assessment)
    ) {
      return { ...empty, reason: 'malformed' };
    }
    if (!validateTrustProfile(trust)) return { ...empty, reason: 'untrusted_attester' };
    if (!policyMatches(assessment, trust.policy)) return { ...empty, reason: 'policy_mismatch' };
    const digest = assessmentHash(assessment);
    if (digest.toLowerCase() !== proof.data.assessmentHash.toLowerCase()) {
      return verificationResult(empty, proof, 'digest_mismatch', { assessmentHash: digest });
    }
    const typedData = typedDataForProof(proof);
    const uid = hashTypedData(typedData);
    if (uid.toLowerCase() !== proof.uid.toLowerCase()) {
      return verificationResult(empty, proof, 'uid_mismatch', { uid, assessmentHash: digest });
    }
    const signatureValid = await verifyTypedData({
      ...typedData,
      address: proof.attester as `0x${string}`,
      signature: proof.signature as `0x${string}`,
    });
    if (!signatureValid)
      return verificationResult(empty, proof, 'signature_invalid', { uid, assessmentHash: digest });
    if (!trustedKey(trust.keyRegistry, proof.attester, proof.data.issuedAt)) {
      return verificationResult(empty, proof, 'untrusted_attester', {
        uid,
        assessmentHash: digest,
      });
    }
    const now = options.now ?? Math.ceil(Date.now() / 1000);
    const valid = options.allowHistorical
      ? proof.data.validUntil > proof.data.issuedAt
      : proof.data.validUntil > now;
    const quoteAgeNow = (now * 1000 - Date.parse(assessment.prices.quoteObservedAt)) / 1000;
    if (
      !options.allowHistorical &&
      (quoteAgeNow < -5 || quoteAgeNow > trust.policy.maxQuoteAgeSeconds)
    ) {
      return verificationResult(empty, proof, 'quote_stale', { uid, assessmentHash: digest });
    }
    return verificationResult(empty, proof, valid ? 'verified' : 'expired', {
      valid,
      uid,
      assessmentHash: digest,
    });
  } catch {
    return { ...empty, reason: 'verification_error' };
  }
}

/** Verify both signed assessments and their links to the signed pre-trade proofs. */
export async function verifyLinkedDecisionInputPair(
  source: PreTradeResult,
  destination: PreTradeResult,
  trust: DecisionInputTrust,
  options: { now?: number } = {}
): Promise<{ commitment: ReturnType<typeof buildDecisionInputPairCommitment> }> {
  const inputs = [source, destination] as const;
  const assessments: DecisionInputAssessment[] = [];
  let sourceScope:
    | {
        chain: number;
        action: string;
        amount: number;
        sourceAssetId: string;
        destinationAssetId: string;
      }
    | undefined;
  const verificationNow = Math.max(options.now ?? 0, Math.ceil(Date.now() / 1000));
  for (const [index, result] of inputs.entries()) {
    const assessment = result.decisionInputAssessment;
    const uid = result.attestation?.uid;
    const signed = result.attestation?.data;
    if (
      !assessment ||
      !uid ||
      !HEX32.test(uid) ||
      assessment.status !== 'SUFFICIENT' ||
      assessment.eligibleToProceed !== true
    ) {
      throw new TypeError(
        `${index === 0 ? 'source' : 'destination'} Decision Input assessment is missing or insufficient`
      );
    }
    if (
      !signed ||
      assessment.chainId !== Number(signed.subjectChainId) ||
      assessment.action.toLowerCase() !== String(signed.action).toLowerCase() ||
      assessment.tradeAmountUsd !== Number(signed.tradeAmountUsd) ||
      typeof signed.sourceAssetId !== 'string' ||
      typeof signed.destinationAssetId !== 'string'
    ) {
      throw new TypeError(
        `${index === 0 ? 'source' : 'destination'} Decision Input scope does not match its signed pre-trade proof`
      );
    }
    if (
      !(await verifySignedPreTradeAttestation(result.attestation, trust, verificationNow)) ||
      result.verdict !== String(signed.verdict)
    ) {
      throw new TypeError(
        `${index === 0 ? 'source' : 'destination'} pre-trade signature or attester trust is invalid`
      );
    }
    const scope = {
      chain: Number(signed.subjectChainId),
      action: String(signed.action).toLowerCase(),
      amount: Number(signed.tradeAmountUsd),
      sourceAssetId: String(signed.sourceAssetId),
      destinationAssetId: String(signed.destinationAssetId),
    };
    const sourceAssetChainId = /^eip155:([1-9][0-9]*)\/erc20:0x[0-9a-fA-F]{40}$/.exec(
      scope.sourceAssetId
    )?.[1];
    const destinationAssetChainId = /^eip155:([1-9][0-9]*)\/erc20:0x[0-9a-fA-F]{40}$/.exec(
      scope.destinationAssetId
    )?.[1];
    if (
      sourceAssetChainId !== String(scope.chain) ||
      destinationAssetChainId !== String(scope.chain)
    ) {
      throw new TypeError('Signed pre-trade asset IDs do not match their subject chain');
    }
    if (index === 0) sourceScope = scope;
    else if (
      !sourceScope ||
      scope.chain !== sourceScope.chain ||
      scope.action !== sourceScope.action ||
      scope.action !== 'swap' ||
      sourceScope.action !== 'swap' ||
      scope.amount !== sourceScope.amount ||
      scope.sourceAssetId.toLowerCase() !== sourceScope.destinationAssetId.toLowerCase() ||
      scope.destinationAssetId.toLowerCase() !== sourceScope.sourceAssetId.toLowerCase()
    ) {
      throw new TypeError(
        'Decision Input pair and signed pre-trade asset scopes do not describe the same swap'
      );
    }
    const verified = await verifyDecisionInputAssessment(assessment, trust, {
      ...options,
      now: verificationNow,
    });
    if (!verified.valid)
      throw new TypeError(
        `${index === 0 ? 'source' : 'destination'} Decision Input signature rejected: ${verified.reason}`
      );
    if (verified.linkedPreTradeUid?.toLowerCase() !== uid.toLowerCase())
      throw new TypeError('Decision Input proof links to a different pre-trade attestation');
    assessments.push(assessment);
  }
  return {
    commitment: buildDecisionInputPairCommitment(assessments[0], assessments[1], trust.policy),
  };
}

/** Commitment to the ordered pair of signed assessments and the consumer's policy profile. */
export function buildDecisionInputPairCommitment(
  source: DecisionInputAssessment,
  destination: DecisionInputAssessment,
  policy: DecisionInputPolicy
): DecisionInputPairCommitment {
  if (
    !source.attestation ||
    !destination.attestation ||
    !policyMatches(source, policy) ||
    !policyMatches(destination, policy)
  )
    throw new TypeError('Decision Input pair does not match the trusted policy');
  const policyDigest = decisionInputPolicyDigest(policy);
  const digest = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
      ],
      [
        source.attestation.uid as `0x${string}`,
        destination.attestation.uid as `0x${string}`,
        source.attestation.data.assessmentHash as `0x${string}`,
        destination.attestation.data.assessmentHash as `0x${string}`,
        source.attestation.data.linkedPreTradeUid as `0x${string}`,
        destination.attestation.data.linkedPreTradeUid as `0x${string}`,
        policyDigest,
      ]
    )
  );
  return { namespace: DECISION_INPUT_PAIR_NAMESPACE, algorithm: 'keccak256' as const, digest };
}

export function decisionInputPolicyDigest(policy: DecisionInputPolicy): `0x${string}` {
  return keccak256(
    toBytes(
      canonicalJson({
        policyId: policy.policyId,
        version: policy.version,
        assetIds: policy.assetIds,
        maxReferenceDeviationBps: policy.maxReferenceDeviationBps,
        maxSlippageBps: policy.maxSlippageBps,
        maxQuoteAgeSeconds: policy.maxQuoteAgeSeconds,
      })
    )
  );
}
