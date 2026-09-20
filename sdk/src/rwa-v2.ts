import { hashTypedData, keccak256, toBytes, verifyTypedData } from 'viem';

import {
  buildRwaReport,
  rwaCanonicalJson,
  rwaIsUint256,
  rwaPolicyId,
  rwaRequestHash,
  type RwaInput,
  type RwaPolicy,
  type RwaReport,
  type RwaTrust,
  type RwaEvidence,
  type RwaVerificationDetails,
} from './rwa';
import {
  decodeRwaCall,
  rwaCallProfileId,
  type RwaTransaction,
  type RwaCallProfile,
  type RwaCallSemantics,
} from './rwa-call';

export type RwaReportV2 = {
  schema: 'insight.rwa-report.v2';
  assessment: RwaReport;
  sequence: string;
  previousDigest: string | null;
  transaction: RwaTransaction;
  semantics: RwaCallSemantics;
  receiverEvidence: RwaEvidence;
  validUntil: number;
};
export type SignedRwaReportV2 = {
  report: RwaReportV2;
  digest: string;
  signer: string;
  signature: string;
};
export type RwaTrustV2 = RwaTrust & { callProfile: RwaCallProfile };
export type RwaV2Context = Pick<
  RwaReportV2,
  'sequence' | 'previousDigest' | 'transaction' | 'receiverEvidence'
> & { callProfile: RwaCallProfile };
function need(value: unknown, code: string): asserts value {
  if (!value) throw new TypeError(code);
}
export function buildRwaReportV2(
  input: RwaInput,
  policy: RwaPolicy,
  now: number,
  context: RwaV2Context
): RwaReportV2 {
  const c = JSON.parse(rwaCanonicalJson(context)) as RwaV2Context;
  need(
    Object.keys(c).sort().join(',') ===
      'callProfile,previousDigest,receiverEvidence,sequence,transaction',
    'RWA_V2_CONTEXT_SHAPE'
  );
  need(
    rwaIsUint256(c.sequence) &&
      ((c.sequence === '0' && c.previousDigest === null) ||
        (c.sequence !== '0' && /^0x[0-9a-f]{64}$/.test(c.previousDigest ?? ''))),
    'RWA_SEQUENCE_INVALID'
  );
  const assessment = buildRwaReport(input, policy, now);
  const semantics = decodeRwaCall(
    c.transaction,
    input.request,
    input.instrument,
    c.callProfile,
    now
  );
  const e = c.receiverEvidence;
  need(
    Object.keys(e).sort().join(',') ===
      'instrumentId,kind,observedAt,source,status,subject,validUntil',
    'RWA_RECEIVER_EVIDENCE_SHAPE'
  );
  need(
    e.kind === 'eligibility' &&
      e.instrumentId === input.request.instrumentId &&
      e.subject === semantics.receiver &&
      typeof e.source === 'string' &&
      ['OK', 'BLOCKED', 'UNKNOWN'].includes(e.status) &&
      Number.isSafeInteger(e.observedAt) &&
      e.observedAt > 0 &&
      e.observedAt <= Number.MAX_SAFE_INTEGER - policy.maxStateAgeSeconds &&
      Number.isSafeInteger(e.validUntil) &&
      e.validUntil > 0,
    'RWA_RECEIVER_EVIDENCE_INVALID'
  );
  return {
    schema: 'insight.rwa-report.v2',
    assessment,
    sequence: c.sequence,
    previousDigest: c.previousDigest,
    transaction: c.transaction,
    semantics,
    receiverEvidence: e,
    validUntil: Math.min(
      assessment.validUntil,
      semantics.deadline,
      e.validUntil,
      e.observedAt + policy.maxStateAgeSeconds
    ),
  };
}
export function rwaV2SigningData(report: RwaReportV2) {
  return {
    domain: { name: 'Insight RWA', version: '2' },
    types: { RwaAssessment: [{ name: 'reportHash', type: 'bytes32' }] },
    primaryType: 'RwaAssessment' as const,
    message: { reportHash: keccak256(toBytes(rwaCanonicalJson(report))) },
  } as const;
}
export function rwaV2ReportDigest(report: RwaReportV2): string {
  return hashTypedData(rwaV2SigningData(report));
}
export async function inspectRwaReportV2(
  proof: SignedRwaReportV2,
  trust: RwaTrustV2,
  now = Math.floor(Date.now() / 1000)
): Promise<RwaVerificationDetails> {
  const result: RwaVerificationDetails = {
    integrity: 'NOT_CHECKED',
    trust: 'NOT_CHECKED',
    time: 'NOT_CHECKED',
    decision: null,
    admissible: false,
    reasons: [],
  };
  try {
    proof = JSON.parse(rwaCanonicalJson(proof));
    trust = JSON.parse(rwaCanonicalJson(trust));
    const r = proof.report,
      a = r.assessment;
    result.integrity = 'FAIL';
    need(
      r.schema === 'insight.rwa-report.v2' &&
        rwaV2ReportDigest(r) === proof.digest &&
        /^0x[0-9a-fA-F]{40}$/.test(proof.signer) &&
        /^0x[0-9a-fA-F]{130}$/.test(proof.signature),
      'RWA_INTEGRITY_INVALID'
    );
    need(
      await verifyTypedData({
        ...rwaV2SigningData(r),
        address: proof.signer as `0x${string}`,
        signature: proof.signature as `0x${string}`,
      }),
      'RWA_SIGNATURE_INVALID'
    );
    result.integrity = 'PASS';
    result.trust = 'FAIL';
    need(
      a.policyId === trust.policyId &&
        rwaPolicyId(trust.policy) === trust.policyId &&
        a.environment === trust.environment &&
        trust.environment === trust.policy.environment &&
        rwaRequestHash(a.input.request) === rwaRequestHash(trust.request) &&
        rwaCallProfileId(trust.callProfile) === r.semantics.profileId,
      'RWA_SCOPE_MISMATCH'
    );
    const keys = trust.keys.filter((k) => k.address.toLowerCase() === proof.signer.toLowerCase()),
      key = keys[0];
    need(
      keys.length === 1 &&
        key.revoked === false &&
        Number.isSafeInteger(key.validFrom) &&
        key.validFrom >= 0 &&
        Number.isSafeInteger(key.validUntil) &&
        key.validUntil > 0 &&
        key.validFrom <= a.evaluatedAt &&
        key.validUntil >= r.validUntil,
      'RWA_SIGNER_UNTRUSTED'
    );
    const expected = buildRwaReportV2(a.input, trust.policy, a.evaluatedAt, {
      sequence: r.sequence,
      previousDigest: r.previousDigest,
      transaction: r.transaction,
      receiverEvidence: r.receiverEvidence,
      callProfile: trust.callProfile,
    });
    need(rwaCanonicalJson(expected) === rwaCanonicalJson(r), 'RWA_EVALUATION_MISMATCH');
    result.trust = 'PASS';
    result.time = 'FAIL';
    result.decision = a.evaluation.verdict;
    need(
      Number.isSafeInteger(now) && now > 0 && a.evaluatedAt <= now && now < r.validUntil,
      'RWA_EXPIRED_OR_FUTURE'
    );
    result.time = 'PASS';
    const current = buildRwaReport(a.input, trust.policy, now),
      e = r.receiverEvidence,
      rule = trust.policy.actions[a.input.request.action];
    result.reasons = [...current.evaluation.reasons];
    result.decision = current.evaluation.verdict;
    if (!rule?.requiredEvidence.includes('eligibility'))
      result.reasons.push('RWA_SENDER_ELIGIBILITY_REQUIRED');
    if (
      !trust.policy.evidenceSources.eligibility.includes(e.source) ||
      e.observedAt > now ||
      now - e.observedAt >= trust.policy.maxStateAgeSeconds ||
      e.status === 'UNKNOWN'
    )
      result.reasons.push('RWA_RECEIVER_ELIGIBILITY_UNAVAILABLE');
    if (e.status === 'BLOCKED') {
      result.reasons.push('RWA_RECEIVER_BLOCKED');
      result.decision = 'BLOCK';
    } else if (result.reasons.length && result.decision === 'ALLOW') result.decision = 'UNKNOWN';
    result.admissible = result.decision === 'ALLOW' && result.reasons.length === 0;
  } catch (error) {
    result.reasons = [error instanceof Error ? error.message : 'RWA_V2_INVALID'];
  }
  return result;
}
export async function verifyRwaReportV2(
  proof: SignedRwaReportV2,
  trust: RwaTrustV2,
  now = Math.floor(Date.now() / 1000)
) {
  const result = await inspectRwaReportV2(proof, trust, now);
  return { valid: result.admissible, reasons: result.reasons };
}
