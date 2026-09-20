// Copyright (c) 2026 Insight. MIT. RWA v1; independent of legacy safety receipts.
import { hashTypedData, keccak256, toBytes, verifyTypedData } from 'viem';

export type RwaAction =
  | 'buy'
  | 'sell'
  | 'borrow'
  | 'collateralize'
  | 'liquidate'
  | 'redeem'
  | 'repay';
export type RwaSession = 'REGULAR' | 'PRE' | 'POST' | 'OVERNIGHT' | 'CLOSED' | 'UNKNOWN';
export type RwaEvidenceKind = 'reserve' | 'eligibility' | 'redemption';
export interface RwaInstrument {
  schema: 'insight.rwa-instrument.v1';
  underlyingId: string;
  issuer: string;
  tokenChainId: number;
  tokenAddress: string;
  venueMic: string;
  kind: 'equity' | 'etf' | 'fund' | 'commodity' | 'credit';
  currency: string;
  priceBasis: 'underlying-spot' | 'token-market' | 'token-nav';
  corporateActionVersion: string;
}
export interface RwaCall {
  chainId: number;
  from: string;
  to: string;
  calldataHash: string;
  value: string;
  nonce: string;
}
export interface RwaRequest {
  instrumentId: string;
  action: RwaAction;
  amount: string;
  call: RwaCall;
}
export interface RwaActionRule {
  priceRequired: boolean;
  allowedSessions: RwaSession[];
  requiredEvidence: RwaEvidenceKind[];
}
export interface RwaPolicy {
  schema: 'insight.rwa-policy.v1';
  name: string;
  instrumentId: string;
  environment: 'production' | 'simulation';
  minProviders: number;
  minIndependentGroups: number;
  maxPriceAgeSeconds: number;
  maxStateAgeSeconds: number;
  maxSpreadBps: number;
  reportTtlSeconds: number;
  feeds: Record<string, { group: string; derived: boolean; evidenceChainId: number }>;
  stateSources: string[];
  evidenceSources: Record<RwaEvidenceKind, string[]>;
  actions: Partial<Record<RwaAction, RwaActionRule>>;
}
/** All prices use integer USD/quote units scaled by 1e8. No floating point consensus. */
export interface RwaPrice {
  feedId: string;
  instrumentId: string;
  evidenceChainId: number;
  currency: string;
  priceBasis: RwaInstrument['priceBasis'];
  corporateActionVersion: string;
  session: RwaSession;
  priceE8: string;
  observedAt: number;
  retrievedAt: number;
}
export interface RwaMarketState {
  instrumentId: string;
  mic: string;
  source: string;
  session: RwaSession;
  halt: 'CLEAR' | 'HALTED' | 'UNKNOWN';
  corporateAction: 'CLEAR' | 'PENDING' | 'UNKNOWN';
  observedAt: number;
  validUntil: number;
}
/** These are assertions of the report signer. They do not themselves prove custody or KYC. */
export interface RwaEvidence {
  kind: RwaEvidenceKind;
  instrumentId: string;
  subject: string;
  source: string;
  status: 'OK' | 'BLOCKED' | 'UNKNOWN';
  observedAt: number;
  validUntil: number;
}
export interface RwaInput {
  instrument: RwaInstrument;
  request: RwaRequest;
  prices: RwaPrice[];
  market: RwaMarketState | null;
  evidence: RwaEvidence[];
}
export interface RwaEvaluation {
  verdict: 'ALLOW' | 'BLOCK' | 'UNKNOWN';
  reasons: string[];
  eligibleFeeds: string[];
  independentGroups: number;
  consensusPriceE8: string | null;
  excluded: { feedId: string; reasons: string[] }[];
}
export interface RwaReport {
  schema: 'insight.rwa-report.v1';
  environment: RwaPolicy['environment'];
  policyId: string;
  evaluatedAt: number;
  validUntil: number;
  input: RwaInput;
  evaluation: RwaEvaluation;
}
export interface SignedRwaReport {
  report: RwaReport;
  digest: string;
  signer: string;
  signature: string;
}
export interface RwaTrust {
  policy: RwaPolicy;
  policyId: string;
  request: RwaRequest;
  environment: RwaPolicy['environment'];
  keys: { address: string; validFrom: number; validUntil: number; revoked: boolean }[];
}

const actions = ['buy', 'sell', 'borrow', 'collateralize', 'liquidate', 'redeem', 'repay'];
const sessions = ['REGULAR', 'PRE', 'POST', 'OVERNIGHT', 'CLOSED', 'UNKNOWN'];
const kinds = ['reserve', 'eligibility', 'redemption'];
// Shared runtime + JSON Schema bound, including the exact 78-digit uint256 ceiling.
const maxUint256 = (2n ** 256n - 1n).toString();
export const RWA_UINT256_PATTERN =
  '^(?:0|[1-9][0-9]{0,76}|' +
  Array.from(maxUint256, (digit, index) => {
    const low = index === 0 ? 1 : 0,
      high = Number(digit) - 1;
    return high < low
      ? null
      : maxUint256.slice(0, index) +
          (low === high ? String(low) : '[' + low + '-' + high + ']') +
          (index === 77 ? '' : '[0-9]{' + (77 - index) + '}');
  })
    .filter(Boolean)
    .concat(maxUint256)
    .join('|') +
  ')$';
const uintPattern = new RegExp(RWA_UINT256_PATTERN);
export const rwaIsUint256 = (v: unknown): v is string =>
  typeof v === 'string' && uintPattern.test(v);
const uint = rwaIsUint256;
export class RwaValidationError extends TypeError {
  readonly retryable = false;
  constructor(
    readonly code: string,
    readonly fieldPath: string
  ) {
    super(code);
    this.name = 'RwaValidationError';
  }
}
const address = (v: unknown): v is string => typeof v === 'string' && /^0x[0-9a-f]{40}$/.test(v);
const digest = (v: unknown): v is string => typeof v === 'string' && /^0x[0-9a-f]{64}$/.test(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const label = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(v);
function assert(ok: unknown, reason: string): asserts ok {
  if (!ok) throw new TypeError(reason);
}
function shape(value: object, keys: string) {
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).sort().join(',') === keys.split(' ').sort().join(','),
    'RWA_INVALID_SHAPE'
  );
}
function list(value: string[], permitted?: string[]) {
  assert(
    Array.isArray(value) &&
      value.length <= 32 &&
      new Set(value).size === value.length &&
      value.every((v) => label(v) && (!permitted || permitted.includes(v))),
    'RWA_INVALID_LIST'
  );
}
export function rwaCanonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, rwaCanonicalJson).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${rwaCanonicalJson((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  throw new TypeError('RWA_INVALID_JSON');
}
const hash = (value: unknown) => keccak256(toBytes(rwaCanonicalJson(value)));

export function rwaInstrumentId(i: RwaInstrument): string {
  shape(
    i,
    'schema underlyingId issuer tokenChainId tokenAddress venueMic kind currency priceBasis corporateActionVersion'
  );
  assert(
    i.schema === 'insight.rwa-instrument.v1' &&
      label(i.underlyingId) &&
      label(i.issuer) &&
      integer(i.tokenChainId, 1) &&
      address(i.tokenAddress) &&
      /^[A-Z0-9]{4}$/.test(i.venueMic) &&
      ['equity', 'etf', 'fund', 'commodity', 'credit'].includes(i.kind) &&
      /^[A-Z]{3}$/.test(i.currency) &&
      ['underlying-spot', 'token-market', 'token-nav'].includes(i.priceBasis) &&
      label(i.corporateActionVersion),
    'RWA_INVALID_INSTRUMENT'
  );
  return hash(i);
}
export function rwaPolicyId(p: RwaPolicy): string {
  shape(
    p,
    'schema name instrumentId environment minProviders minIndependentGroups maxPriceAgeSeconds maxStateAgeSeconds maxSpreadBps reportTtlSeconds feeds stateSources evidenceSources actions'
  );
  assert(
    p.schema === 'insight.rwa-policy.v1' &&
      label(p.name) &&
      digest(p.instrumentId) &&
      ['production', 'simulation'].includes(p.environment) &&
      integer(p.minProviders, 2, 32) &&
      integer(p.minIndependentGroups, 2, p.minProviders) &&
      integer(p.maxPriceAgeSeconds, 1, 86400) &&
      integer(p.maxStateAgeSeconds, 1, 86400) &&
      integer(p.maxSpreadBps, 0, 10000) &&
      integer(p.reportTtlSeconds, 1, 300),
    'RWA_INVALID_POLICY'
  );
  assert(
    p.feeds &&
      Object.getPrototypeOf(p.feeds) === Object.prototype &&
      Object.keys(p.feeds).length <= 32,
    'RWA_INVALID_FEEDS'
  );
  for (const [id, f] of Object.entries(p.feeds)) {
    shape(f, 'group derived evidenceChainId');
    assert(
      label(id) && label(f.group) && typeof f.derived === 'boolean' && integer(f.evidenceChainId),
      'RWA_INVALID_FEED'
    );
  }
  list(p.stateSources);
  shape(p.evidenceSources, 'reserve eligibility redemption');
  for (const values of Object.values(p.evidenceSources)) list(values);
  assert(
    p.actions &&
      Object.getPrototypeOf(p.actions) === Object.prototype &&
      Object.keys(p.actions).length > 0,
    'RWA_INVALID_ACTIONS'
  );
  for (const [action, rule] of Object.entries(p.actions)) {
    assert(actions.includes(action), 'RWA_UNKNOWN_ACTION');
    shape(rule!, 'priceRequired allowedSessions requiredEvidence');
    assert(
      typeof rule!.priceRequired === 'boolean' && (rule!.priceRequired || action === 'repay'),
      'RWA_PRICE_REQUIRED'
    );
    list(
      rule!.allowedSessions,
      sessions.filter((s) => s !== 'UNKNOWN')
    );
    list(rule!.requiredEvidence, kinds);
    // Closed-market valuation requires an actual token-market quote, checked at evaluation.
    assert(!rule!.priceRequired || rule!.allowedSessions.length > 0, 'RWA_SESSION_POLICY_EMPTY');
  }
  return hash(p);
}
export function rwaRequestHash(r: RwaRequest): string {
  shape(r, 'instrumentId action amount call');
  shape(r.call, 'chainId from to calldataHash value nonce');
  for (const [field, value] of Object.entries({
    amount: r.amount,
    'call.value': r.call.value,
    'call.nonce': r.call.nonce,
  })) {
    if (!uint(value))
      throw new RwaValidationError('RWA_UINT256_OUT_OF_RANGE', 'input.request.' + field);
  }
  assert(
    digest(r.instrumentId) &&
      actions.includes(r.action) &&
      uint(r.amount) &&
      BigInt(r.amount) > 0n &&
      integer(r.call.chainId, 1) &&
      address(r.call.from) &&
      address(r.call.to) &&
      digest(r.call.calldataHash) &&
      uint(r.call.value) &&
      uint(r.call.nonce),
    'RWA_INVALID_REQUEST'
  );
  return hash(r);
}
function fresh(observedAt: number, validUntil: number, now: number, age: number) {
  return (
    integer(observedAt, 1) &&
    integer(validUntil, 1) &&
    observedAt <= now &&
    now < validUntil &&
    observedAt <= validUntil &&
    now - observedAt < age
  );
}

function evaluateMarket(
  input: RwaInput,
  policy: RwaPolicy,
  now: number,
  rule: RwaActionRule | undefined,
  instrumentId: string,
  deadlines: number[],
  reasons: string[],
  blocked: string[]
) {
  if (rule?.priceRequired) {
    const m = input.market;
    if (
      !m ||
      m.instrumentId !== instrumentId ||
      m.mic !== input.instrument.venueMic ||
      !policy.stateSources.includes(m.source) ||
      !fresh(m.observedAt, m.validUntil, now, policy.maxStateAgeSeconds)
    )
      reasons.push('MARKET_EVIDENCE_UNAVAILABLE');
    else {
      deadlines.push(m.validUntil, m.observedAt + policy.maxStateAgeSeconds);
      if (m.session === 'UNKNOWN') reasons.push('MARKET_SESSION_UNKNOWN');
      else if (!rule.allowedSessions.includes(m.session)) blocked.push('SESSION_NOT_ALLOWED');
      if (m.session === 'CLOSED' && input.instrument.priceBasis !== 'token-market')
        blocked.push('CLOSED_REQUIRES_TOKEN_MARKET_PRICE');
      if (m.halt === 'HALTED') blocked.push('INSTRUMENT_HALTED');
      if (m.halt === 'UNKNOWN') reasons.push('HALT_STATUS_UNKNOWN');
      if (m.corporateAction === 'PENDING') blocked.push('CORPORATE_ACTION_PENDING');
      if (m.corporateAction === 'UNKNOWN') reasons.push('CORPORATE_ACTION_UNKNOWN');
    }
  }
}

function priceFailures(
  o: RwaPrice,
  input: RwaInput,
  policy: RwaPolicy,
  now: number,
  instrumentId: string,
  f: RwaPolicy['feeds'][string] | undefined
): string[] {
  const failures: string[] = [];
  if (!f) failures.push('FEED_NOT_ADMITTED');
  if (input.prices.filter((p) => p.feedId === o.feedId).length !== 1)
    failures.push('DUPLICATE_FEED');
  if (
    o.instrumentId !== instrumentId ||
    o.currency !== input.instrument.currency ||
    o.priceBasis !== input.instrument.priceBasis ||
    o.corporateActionVersion !== input.instrument.corporateActionVersion ||
    o.evidenceChainId !== f?.evidenceChainId
  )
    failures.push('PRICE_SEMANTICS_MISMATCH');
  if (o.session !== input.market?.session || o.session === 'UNKNOWN')
    failures.push('PRICE_SESSION_MISMATCH');
  if (
    !integer(o.observedAt, 1) ||
    !integer(o.retrievedAt, 1) ||
    o.observedAt > o.retrievedAt ||
    o.retrievedAt > now ||
    now - o.observedAt >= policy.maxPriceAgeSeconds
  )
    failures.push('PRICE_STALE_OR_FUTURE');
  if (BigInt(o.priceE8) <= 0n) failures.push('PRICE_INVALID');
  return failures;
}

export function buildRwaReport(input: RwaInput, policy: RwaPolicy, now: number): RwaReport {
  const policyId = rwaPolicyId(policy),
    instrumentId = rwaInstrumentId(input.instrument);
  rwaRequestHash(input.request);
  shape(input, 'instrument request prices market evidence');
  assert(
    integer(now, 1) &&
      now <= Number.MAX_SAFE_INTEGER - 86400 &&
      instrumentId === policy.instrumentId &&
      instrumentId === input.request.instrumentId &&
      input.instrument.tokenChainId === input.request.call.chainId,
    'RWA_SCOPE_MISMATCH'
  );
  assert(
    Array.isArray(input.prices) &&
      input.prices.length <= 32 &&
      Array.isArray(input.evidence) &&
      input.evidence.length <= 32,
    'RWA_INPUT_LIMIT'
  );
  const reasons: string[] = [],
    blocked: string[] = [],
    deadlines = [now + policy.reportTtlSeconds];
  const eligible: RwaPrice[] = [],
    groups = new Set<string>(),
    excluded: RwaEvaluation['excluded'] = [];
  const rule = policy.actions[input.request.action];
  if (!rule) blocked.push('ACTION_NOT_ALLOWED');
  if (input.market !== null) {
    shape(
      input.market,
      'instrumentId mic source session halt corporateAction observedAt validUntil'
    );
    assert(
      label(input.market.source) &&
        sessions.includes(input.market.session) &&
        ['CLEAR', 'HALTED', 'UNKNOWN'].includes(input.market.halt) &&
        ['CLEAR', 'PENDING', 'UNKNOWN'].includes(input.market.corporateAction),
      'RWA_INVALID_MARKET'
    );
  }
  evaluateMarket(input, policy, now, rule, instrumentId, deadlines, reasons, blocked);
  for (const o of input.prices) {
    shape(
      o,
      'feedId instrumentId evidenceChainId currency priceBasis corporateActionVersion session priceE8 observedAt retrievedAt'
    );
    assert(label(o.feedId) && uint(o.priceE8) && sessions.includes(o.session), 'RWA_INVALID_PRICE');
    const f = Object.hasOwn(policy.feeds, o.feedId) ? policy.feeds[o.feedId] : undefined;
    const failures = priceFailures(o, input, policy, now, instrumentId, f);
    if (failures.length) excluded.push({ feedId: o.feedId, reasons: failures });
    else if (rule?.priceRequired) {
      eligible.push(o);
      if (!f!.derived) groups.add(f!.group);
      deadlines.push(o.observedAt + policy.maxPriceAgeSeconds);
    }
  }
  eligible.sort((a, b) =>
    BigInt(a.priceE8) < BigInt(b.priceE8)
      ? -1
      : BigInt(a.priceE8) > BigInt(b.priceE8)
        ? 1
        : a.feedId < b.feedId
          ? -1
          : a.feedId > b.feedId
            ? 1
            : 0
  );
  const median = eligible.length ? BigInt(eligible[Math.floor(eligible.length / 2)].priceE8) : null;
  if (rule?.priceRequired) {
    if (eligible.length < policy.minProviders) reasons.push('INSUFFICIENT_PRICE_COVERAGE');
    if (groups.size < policy.minIndependentGroups) reasons.push('INSUFFICIENT_INDEPENDENCE');
    if (
      median &&
      (BigInt(eligible[eligible.length - 1].priceE8) - BigInt(eligible[0].priceE8)) * 10000n >
        median * BigInt(policy.maxSpreadBps)
    )
      blocked.push('PRICE_DISAGREEMENT');
  }
  for (const e of input.evidence) {
    shape(e, 'kind instrumentId subject source status observedAt validUntil');
    assert(
      kinds.includes(e.kind) && label(e.source) && ['OK', 'BLOCKED', 'UNKNOWN'].includes(e.status),
      'RWA_INVALID_EVIDENCE'
    );
  }
  for (const kind of rule?.requiredEvidence ?? []) {
    const matches = input.evidence.filter((e) => e.kind === kind);
    const e = matches[0];
    if (
      matches.length !== 1 ||
      !e ||
      e.instrumentId !== instrumentId ||
      e.subject !== (kind === 'eligibility' ? input.request.call.from : instrumentId) ||
      !policy.evidenceSources[kind].includes(e.source) ||
      !fresh(e.observedAt, e.validUntil, now, policy.maxStateAgeSeconds) ||
      e.status === 'UNKNOWN'
    )
      reasons.push(`${kind.toUpperCase()}_EVIDENCE_UNAVAILABLE`);
    else {
      deadlines.push(e.validUntil, e.observedAt + policy.maxStateAgeSeconds);
      if (e.status === 'BLOCKED') blocked.push(`${kind.toUpperCase()}_BLOCKED`);
    }
  }
  const evaluation: RwaEvaluation = {
    verdict: blocked.length ? 'BLOCK' : reasons.length ? 'UNKNOWN' : 'ALLOW',
    reasons: [...blocked, ...reasons].sort(),
    eligibleFeeds: eligible.map((o) => o.feedId).sort(),
    independentGroups: groups.size,
    consensusPriceE8: median?.toString() ?? null,
    excluded: excluded.sort((a, b) => (a.feedId < b.feedId ? -1 : a.feedId > b.feedId ? 1 : 0)),
  };
  return {
    schema: 'insight.rwa-report.v1',
    environment: policy.environment,
    policyId,
    evaluatedAt: now,
    validUntil: Math.min(...deadlines),
    input: JSON.parse(rwaCanonicalJson(input)) as RwaInput,
    evaluation,
  };
}

export function rwaSigningData(report: RwaReport) {
  return {
    domain: { name: 'Insight RWA', version: '1' },
    types: { RwaAssessment: [{ name: 'reportHash', type: 'bytes32' }] },
    primaryType: 'RwaAssessment' as const,
    message: { reportHash: hash(report) },
  } as const;
}
export function rwaReportDigest(report: RwaReport): string {
  return hashTypedData(rwaSigningData(report));
}
export async function verifyRwaReport(
  proof: SignedRwaReport,
  trust: RwaTrust,
  now = Math.floor(Date.now() / 1000)
): Promise<{ valid: boolean; reasons: string[] }> {
  try {
    // Do not allow caller mutation while signature verification is awaiting.
    proof = JSON.parse(rwaCanonicalJson(proof)) as SignedRwaReport;
    trust = JSON.parse(rwaCanonicalJson(trust)) as RwaTrust;
    assert(integer(now, 1) && rwaPolicyId(trust.policy) === trust.policyId, 'RWA_INVALID_TRUST');
    const r = proof.report;
    assert(
      r.schema === 'insight.rwa-report.v1' &&
        r.policyId === trust.policyId &&
        r.environment === trust.environment &&
        trust.environment === trust.policy.environment &&
        rwaRequestHash(r.input.request) === rwaRequestHash(trust.request),
      'RWA_SCOPE_MISMATCH'
    );
    assert(
      rwaCanonicalJson(r) ===
        rwaCanonicalJson(buildRwaReport(r.input, trust.policy, r.evaluatedAt)),
      'RWA_EVALUATION_MISMATCH'
    );
    assert(r.evaluatedAt <= now && now < r.validUntil, 'RWA_EXPIRED_OR_FUTURE');
    assert(rwaReportDigest(r) === proof.digest, 'RWA_DIGEST_MISMATCH');
    const keys = trust.keys.filter((k) => k.address.toLowerCase() === proof.signer?.toLowerCase()),
      key = keys[0];
    assert(
      keys.length === 1 &&
        key &&
        address(key.address.toLowerCase()) &&
        key.revoked === false &&
        integer(key.validFrom) &&
        integer(key.validUntil, 1) &&
        key.validFrom <= r.evaluatedAt &&
        r.validUntil <= key.validUntil &&
        now < key.validUntil,
      'RWA_SIGNER_UNTRUSTED'
    );
    assert(
      /^0x[0-9a-fA-F]{130}$/.test(proof.signature) &&
        (await verifyTypedData({
          ...rwaSigningData(r),
          address: key.address as `0x${string}`,
          signature: proof.signature as `0x${string}`,
        })),
      'RWA_SIGNATURE_INVALID'
    );
    const current = buildRwaReport(r.input, trust.policy, now);
    return { valid: current.evaluation.verdict === 'ALLOW', reasons: current.evaluation.reasons };
  } catch (error) {
    return {
      valid: false,
      reasons: [error instanceof Error ? error.message : 'RWA_INVALID_REPORT'],
    };
  }
}

function scalePriceE8(price: string, decimals: number): string {
  assert(uint(price) && BigInt(price) > 0n && integer(decimals, 0, 36), 'RWA_INVALID_PRICE');
  const value = BigInt(price),
    factor = 10n ** BigInt(Math.abs(8 - decimals));
  assert(decimals <= 8 || value % factor === 0n, 'RWA_PRICE_PRECISION_LOSS');
  const scaled = (decimals <= 8 ? value * factor : value / factor).toString();
  assert(uint(scaled) && BigInt(scaled) > 0n, 'RWA_PRICE_OUT_OF_RANGE');
  return scaled;
}

export type RwaVerificationDetails = {
  integrity: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  trust: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  time: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  decision: RwaEvaluation['verdict'] | null;
  admissible: boolean;
  reasons: string[];
};
/** Authentic BLOCK/UNKNOWN and expired evidence are not mislabeled as forged.
 * Existing verifyRwaReport remains the strict authorization gate.
 */
export async function inspectRwaReport(
  proof: SignedRwaReport,
  trust: RwaTrust,
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
    const r = proof.report;
    result.integrity = 'FAIL';
    assert(
      r.schema === 'insight.rwa-report.v1' &&
        rwaReportDigest(r) === proof.digest &&
        address(proof.signer.toLowerCase()) &&
        /^0x[0-9a-fA-F]{130}$/.test(proof.signature),
      'RWA_INTEGRITY_INVALID'
    );
    assert(
      await verifyTypedData({
        ...rwaSigningData(r),
        address: proof.signer as `0x${string}`,
        signature: proof.signature as `0x${string}`,
      }),
      'RWA_SIGNATURE_INVALID'
    );
    result.integrity = 'PASS';
    result.trust = 'FAIL';
    assert(
      rwaPolicyId(trust.policy) === trust.policyId &&
        r.policyId === trust.policyId &&
        r.environment === trust.environment &&
        trust.environment === trust.policy.environment &&
        rwaRequestHash(r.input.request) === rwaRequestHash(trust.request),
      'RWA_SCOPE_MISMATCH'
    );
    const keys = trust.keys.filter((k) => k.address.toLowerCase() === proof.signer.toLowerCase()),
      key = keys[0];
    assert(
      keys.length === 1 &&
        key.revoked === false &&
        integer(key.validFrom) &&
        integer(key.validUntil, 1) &&
        key.validFrom <= r.evaluatedAt &&
        key.validUntil >= r.validUntil,
      'RWA_SIGNER_UNTRUSTED'
    );
    assert(
      rwaCanonicalJson(r) ===
        rwaCanonicalJson(buildRwaReport(r.input, trust.policy, r.evaluatedAt)),
      'RWA_EVALUATION_MISMATCH'
    );
    result.trust = 'PASS';
    result.decision = r.evaluation.verdict;
    result.time = 'FAIL';
    assert(integer(now, 1) && r.evaluatedAt <= now && now < r.validUntil, 'RWA_EXPIRED_OR_FUTURE');
    result.time = 'PASS';
    const current = buildRwaReport(r.input, trust.policy, now);
    result.decision = current.evaluation.verdict;
    result.reasons = current.evaluation.reasons;
    result.admissible = current.evaluation.verdict === 'ALLOW';
  } catch (error) {
    result.reasons = [error instanceof Error ? error.message : 'RWA_INVALID_REPORT'];
  }
  return result;
}

/** For an admitted Chainlink proxy read on the expected evidence chain.
 * No market phase or instrument halt may be inferred from latestRoundData.
 * Caller must authenticate the RPC/deployment and obtain the actual feed decimals.
 */
export function normalizeRwaChainlinkRound(
  raw: {
    roundId: string;
    answer: string;
    decimals: number;
    updatedAt: string;
    answeredInRound: string;
  },
  identity: Omit<RwaPrice, 'priceE8' | 'observedAt'>
): RwaPrice {
  assert(
    uint(raw.roundId) &&
      uint(raw.answeredInRound) &&
      uint(raw.updatedAt) &&
      BigInt(raw.roundId) > 0n &&
      BigInt(raw.answeredInRound) >= BigInt(raw.roundId) &&
      BigInt(raw.updatedAt) > 0n &&
      BigInt(raw.updatedAt) <= BigInt(Number.MAX_SAFE_INTEGER),
    'RWA_INVALID_CHAINLINK_ROUND'
  );
  return {
    ...identity,
    priceE8: scalePriceE8(raw.answer, raw.decimals),
    observedAt: Number(raw.updatedAt),
  };
}

/** Pure adapter for ALREADY authenticated and decoded v11 data. This does not authenticate it. */
export function normalizeRwaChainlinkV11(
  raw: { mid: string; decimals: number; lastSeenTimestampNs: string; marketStatus: number },
  identity: Omit<RwaPrice, 'priceE8' | 'observedAt' | 'session'>
): RwaPrice {
  assert(
    uint(raw.mid) &&
      uint(raw.lastSeenTimestampNs) &&
      integer(raw.decimals, 0, 36) &&
      integer(raw.marketStatus, 0, 5),
    'RWA_INVALID_CHAINLINK_REPORT'
  );
  const observed = BigInt(raw.lastSeenTimestampNs) / 1000000000n;
  assert(observed <= BigInt(Number.MAX_SAFE_INTEGER), 'RWA_INVALID_CHAINLINK_TIME');
  return {
    ...identity,
    priceE8: scalePriceE8(raw.mid, raw.decimals),
    observedAt: Number(observed),
    session: (['UNKNOWN', 'PRE', 'REGULAR', 'POST', 'OVERNIGHT', 'CLOSED'] as const)[
      raw.marketStatus
    ],
  };
}
