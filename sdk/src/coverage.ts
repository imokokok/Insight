// Copyright (c) 2026 Insight. MIT. Canonical coverage v1 implementation.
import { hashTypedData, keccak256, toBytes, verifyTypedData } from 'viem';

export interface CoveragePolicy {
  schema: 'insight.coverage-policy.v1';
  name: string;
  minProviders: number;
  minIndependentGroups: number;
  maxSourceAgeSeconds: number;
  maxSpreadBps: number;
  reportTtlSeconds: number;
  sources: Record<string, { group: string; derived: boolean }>;
}
export interface CoverageObservation {
  provider: string;
  evidenceChainId: number;
  status: 'success' | 'error' | 'unsupported';
  price: number | null;
  observedAt: number | null;
  retrievedAt: number | null;
  timestampProvenance: 'provider_age' | 'provider_timestamp' | 'unknown';
  excluded: boolean;
}
export interface CoverageEvaluation {
  status: 'PASS' | 'INSUFFICIENT_COVERAGE';
  eligibleProviders: number;
  independentGroups: number;
  spreadBps: number | null;
  reasons: string[];
  providers: {
    provider: string;
    group: string | null;
    ageSeconds: number | null;
    reasons: string[];
  }[];
}
export interface CoverageReport {
  schema: 'insight.coverage-report.v1';
  policyId: string;
  asset: string;
  evidenceChainId: number;
  evaluatedAt: number;
  validUntil: number;
  observations: CoverageObservation[];
  evaluation: CoverageEvaluation;
}
export interface SignedCoverageReport {
  report: CoverageReport;
  digest: string;
  signer: string | null;
  signature: string | null;
}
export interface CoverageTrust {
  policy: CoveragePolicy;
  policyId: string;
  asset: string;
  evidenceChainId: number;
  keys: { address: string; validFrom: number; validUntil: number; revoked: boolean }[];
}

/** Finite, ordinary JSON only. Reject undefined/non-finite values before hashing. */
export function coverageCanonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(coverageCanonicalJson).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${coverageCanonicalJson((value as Record<string, unknown>)[k])}`
      )
      .join(',')}}`;
  throw new TypeError('Coverage values must be finite JSON');
}
const hash = (value: unknown) => keccak256(toBytes(coverageCanonicalJson(value)));
const integer = (value: number, min = 0) => Number.isSafeInteger(value) && value >= min;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const id = (value: string) => /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value);

export function coveragePolicyId(policy: CoveragePolicy): string {
  if (
    !policy ||
    policy.schema !== 'insight.coverage-policy.v1' ||
    !id(policy.name) ||
    !integer(policy.minProviders, 3) ||
    policy.minProviders > 32 ||
    !integer(policy.minIndependentGroups, 2) ||
    policy.minIndependentGroups > policy.minProviders ||
    !integer(policy.maxSourceAgeSeconds, 1) ||
    policy.maxSourceAgeSeconds > 604800 ||
    !integer(policy.maxSpreadBps, 1) ||
    policy.maxSpreadBps > 10000 ||
    !integer(policy.reportTtlSeconds, 1) ||
    policy.reportTtlSeconds > 300 ||
    !policy.sources ||
    Object.keys(policy.sources).length > 32 ||
    Object.entries(policy.sources).some(
      ([p, s]) => !id(p) || !s || !id(s.group) || typeof s.derived !== 'boolean'
    )
  )
    throw new TypeError('Invalid coverage policy');
  return hash(policy);
}

/** Policy classification, not a claim of cryptographically proven upstream independence. */
export const STRICT_COVERAGE_POLICY: CoveragePolicy = {
  schema: 'insight.coverage-policy.v1',
  name: 'strict-300s.v1',
  minProviders: 3,
  minIndependentGroups: 2,
  maxSourceAgeSeconds: 300,
  maxSpreadBps: 100,
  reportTtlSeconds: 60,
  sources: {
    chainlink: { group: 'chainlink', derived: false },
    api3: { group: 'api3', derived: false },
    redstone: { group: 'redstone', derived: false },
    dia: { group: 'dia', derived: false },
    winklink: { group: 'winklink', derived: false },
    supra: { group: 'supra', derived: false },
    twap: { group: 'twap', derived: true },
    reflector: { group: 'reflector', derived: false },
    flare: { group: 'flare', derived: false },
    switchboard: { group: 'switchboard', derived: false },
  },
};
for (const source of Object.values(STRICT_COVERAGE_POLICY.sources)) Object.freeze(source);
Object.freeze(STRICT_COVERAGE_POLICY.sources);
Object.freeze(STRICT_COVERAGE_POLICY);

export function evaluateCoverage(
  observations: CoverageObservation[],
  policy: CoveragePolicy,
  evidenceChainId: number,
  now: number
): CoverageEvaluation {
  coveragePolicyId(policy);
  if (
    !integer(now, 1) ||
    !integer(evidenceChainId, 1) ||
    !Array.isArray(observations) ||
    observations.length > 32
  )
    throw new TypeError('Invalid coverage evaluation input');
  const counts = new Map<string, number>();
  for (const o of observations) {
    if (!o || typeof o.provider !== 'string' || !id(o.provider))
      throw new TypeError('Invalid provider');
    counts.set(o.provider, (counts.get(o.provider) ?? 0) + 1);
  }
  const prices: number[] = [],
    groups = new Set<string>();
  const providers = observations.map((o) => {
    const classification = Object.hasOwn(policy.sources, o.provider)
      ? policy.sources[o.provider]
      : undefined;
    const reasons: string[] = [];
    if (counts.get(o.provider)! > 1) reasons.push('DUPLICATE_PROVIDER');
    if (!classification) reasons.push('UNCLASSIFIED_PROVIDER');
    if (o.evidenceChainId !== evidenceChainId) reasons.push('CHAIN_MISMATCH');
    if (o.status !== 'success' || !finite(o.price) || o.price <= 0)
      reasons.push('PROVIDER_UNAVAILABLE');
    if (o.excluded !== false) reasons.push('CONSENSUS_EXCLUDED');
    const known =
      finite(o.observedAt) &&
      integer(o.observedAt) &&
      finite(o.retrievedAt) &&
      integer(o.retrievedAt) &&
      ['provider_age', 'provider_timestamp'].includes(o.timestampProvenance);
    const age = known ? now - o.observedAt! : null;
    if (!known) reasons.push('SOURCE_AGE_UNKNOWN');
    else if (o.observedAt! > o.retrievedAt! || o.retrievedAt! > now)
      reasons.push('SOURCE_TIME_INVALID');
    else if (age! > policy.maxSourceAgeSeconds) reasons.push('SOURCE_TOO_OLD');
    if (!reasons.length) {
      prices.push(o.price!);
      if (!classification!.derived) groups.add(classification!.group);
    }
    return { provider: o.provider, group: classification?.group ?? null, ageSeconds: age, reasons };
  });
  prices.sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
  const rawSpread = median
    ? (prices[prices.length - 1] / median - prices[0] / median) * 10000
    : null;
  const spreadBps = rawSpread === null ? null : Number(rawSpread.toFixed(6));
  const reasons: string[] = [];
  if (prices.length < policy.minProviders) reasons.push('INSUFFICIENT_COVERAGE');
  if (groups.size < policy.minIndependentGroups) reasons.push('INSUFFICIENT_INDEPENDENCE');
  if (rawSpread !== null && rawSpread > policy.maxSpreadBps) reasons.push('PRICE_DISAGREEMENT');
  return {
    status: reasons.length ? 'INSUFFICIENT_COVERAGE' : 'PASS',
    eligibleProviders: prices.length,
    independentGroups: groups.size,
    spreadBps,
    reasons,
    providers,
  };
}

export function buildCoverageReport(
  input: {
    asset: string;
    evidenceChainId: number;
    observations: CoverageObservation[];
    evaluatedAt: number;
  },
  policy: CoveragePolicy
): CoverageReport {
  if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(input.asset))
    throw new TypeError('Invalid coverage asset');
  const observations = input.observations
    .map((o) => ({ ...o }))
    .sort((a, b) => (a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : 0));
  const evaluation = evaluateCoverage(
    observations,
    policy,
    input.evidenceChainId,
    input.evaluatedAt
  );
  const eligible = observations.filter(
    (_, index) => evaluation.providers[index].reasons.length === 0
  );
  const validUntil = Math.min(
    input.evaluatedAt + policy.reportTtlSeconds,
    ...eligible.map((o) => o.observedAt! + policy.maxSourceAgeSeconds)
  );
  return {
    schema: 'insight.coverage-report.v1',
    policyId: coveragePolicyId(policy),
    asset: input.asset,
    evidenceChainId: input.evidenceChainId,
    evaluatedAt: input.evaluatedAt,
    validUntil,
    observations,
    evaluation,
  };
}

export function coverageSigningData(report: CoverageReport) {
  return {
    domain: { name: 'Insight Coverage', version: '1' },
    types: { Coverage: [{ name: 'reportHash', type: 'bytes32' }] },
    primaryType: 'Coverage' as const,
    message: { reportHash: hash(report) },
  } as const;
}
export function coverageReportDigest(report: CoverageReport): string {
  return hashTypedData(coverageSigningData(report));
}

/** Pins come from the consumer, never from an untrusted report's own key/policy. */
export async function verifyCoverageReport(
  proof: SignedCoverageReport,
  trust: CoverageTrust,
  now = Math.floor(Date.now() / 1000)
): Promise<{ valid: boolean; reasons: string[]; evaluation: CoverageEvaluation | null }> {
  try {
    if (!integer(now, 1) || !trust || coveragePolicyId(trust.policy) !== trust.policyId)
      throw new Error('INVALID_COVERAGE_TRUST');
    const r = proof.report;
    if (
      r.schema !== 'insight.coverage-report.v1' ||
      r.policyId !== trust.policyId ||
      r.asset !== trust.asset ||
      r.evidenceChainId !== trust.evidenceChainId
    )
      throw new Error('COVERAGE_SCOPE_MISMATCH');
    const expected = buildCoverageReport(r, trust.policy);
    if (coverageCanonicalJson(r) !== coverageCanonicalJson(expected))
      throw new Error('COVERAGE_EVALUATION_MISMATCH');
    if (r.evaluatedAt > now || now >= r.validUntil) throw new Error('COVERAGE_EXPIRED_OR_FUTURE');
    if (coverageReportDigest(r) !== proof.digest) throw new Error('COVERAGE_DIGEST_MISMATCH');
    const keys = trust.keys.filter((k) => k.address.toLowerCase() === proof.signer?.toLowerCase());
    const key = keys[0];
    if (
      keys.length !== 1 ||
      !key ||
      key.revoked !== false ||
      !/^0x[0-9a-fA-F]{40}$/.test(key.address) ||
      !integer(key.validFrom) ||
      !integer(key.validUntil, 1) ||
      key.validUntil <= key.validFrom ||
      r.evaluatedAt < key.validFrom ||
      r.validUntil > key.validUntil ||
      now >= key.validUntil
    )
      throw new Error('COVERAGE_SIGNER_UNTRUSTED');
    if (
      !proof.signature ||
      !/^0x[0-9a-fA-F]{130}$/.test(proof.signature) ||
      !(await verifyTypedData({
        ...coverageSigningData(r),
        address: key.address as `0x${string}`,
        signature: proof.signature as `0x${string}`,
      }))
    )
      throw new Error('COVERAGE_SIGNATURE_INVALID');
    const evaluation = evaluateCoverage(r.observations, trust.policy, trust.evidenceChainId, now);
    return { valid: evaluation.status === 'PASS', reasons: evaluation.reasons, evaluation };
  } catch (error) {
    return {
      valid: false,
      reasons: [error instanceof Error ? error.message : 'INVALID_COVERAGE_REPORT'],
      evaluation: null,
    };
  }
}

/** Invoke immediately before provider entry. This checks data readiness, not trade safety. */
export async function withVerifiedCoverage<T>(
  proof: SignedCoverageReport,
  trust: CoverageTrust,
  action: () => Promise<T>,
  clock: () => number = () => Math.floor(Date.now() / 1000)
): Promise<T> {
  const result = await verifyCoverageReport(proof, trust, clock());
  if (!result.valid) throw new Error(`Coverage blocked: ${result.reasons.join(',')}`);
  if (clock() >= proof.report.validUntil) throw new Error('Coverage expired before provider entry');
  return action();
}
