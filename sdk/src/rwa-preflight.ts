// Copyright (c) 2026 Insight. MIT. RWA action preflight orchestration.
import { keccak256 } from 'viem';

import {
  buildRwaReport,
  rwaInstrumentId,
  rwaPolicyId,
  rwaRequestHash,
  type RwaCall,
  type RwaEvidence,
  type RwaInput,
  type RwaMarketState,
  type RwaPolicy,
  type RwaPrice,
  type RwaRequest,
} from './rwa';
import { decodeRwaCall, type RwaCallProfile, type RwaTransaction } from './rwa-call';
import {
  buildRwaReportV2,
  type RwaInstrumentAdmissionCommitment,
  type RwaReportV2,
} from './rwa-v2';

export type RwaActionEvidenceContribution = {
  prices?: RwaPrice[];
  market?: RwaMarketState | null;
  evidence?: RwaEvidence[];
  receiverEvidence?: RwaEvidence;
};

export type RwaActionPreflightContext = {
  instrument: RwaInput['instrument'];
  request: RwaRequest;
  policy: RwaPolicy;
  transaction: RwaTransaction;
  callProfile: RwaCallProfile;
  nowSeconds: number;
  signal?: AbortSignal;
};

/**
 * One adapter represents one policy-pinned source ID. Its output is runtime-validated;
 * the adapter's own claim that a response is authentic is not independently attested here.
 */
export type RwaActionEvidenceProvider = {
  sourceId: string;
  collect(context: Readonly<RwaActionPreflightContext>): Promise<unknown>;
};

export type RwaActionPreflightRequest = {
  instrument: RwaInput['instrument'];
  action: 'buy' | 'sell';
  amount: string;
  transaction: RwaTransaction;
  callProfile: RwaCallProfile;
  policy: RwaPolicy;
  providers: RwaActionEvidenceProvider[];
  sequence: string;
  previousDigest: string | null;
  instrumentAdmission?: RwaInstrumentAdmissionCommitment;
  nowSeconds?: number;
  signal?: AbortSignal;
};

export type RwaActionPreflightSourceStatus = {
  sourceId: string;
  status: 'COLLECTED' | 'EMPTY' | 'UNAVAILABLE' | 'INVALID' | 'NOT_CONFIGURED';
  priceCount: number;
  marketStateCount: number;
  evidenceCount: number;
  reasonCode?: 'SOURCE_UNAVAILABLE' | 'SOURCE_OUTPUT_INVALID' | 'SOURCE_NOT_CONFIGURED';
};

export type RwaActionPreflightResult = {
  schema: 'insight.rwa-action-preflight.v1';
  mode: 'diagnostic';
  mayAuthorizeExecution: false;
  evidenceProvenance: 'adapter-asserted-unverified';
  decision: 'ALLOW' | 'BLOCK' | 'UNKNOWN';
  reasons: string[];
  report: RwaReportV2;
  sources: RwaActionPreflightSourceStatus[];
  issues: string[];
};

export class RwaActionPreflightError extends TypeError {
  readonly retryable = false;

  constructor(readonly code: string) {
    super(code);
    this.name = 'RwaActionPreflightError';
  }
}

type NormalizedContribution = {
  prices: RwaPrice[];
  market: RwaMarketState | null;
  evidence: RwaEvidence[];
  receiverEvidence?: RwaEvidence;
};

type ProviderCollection = {
  sourceId: string;
  status: RwaActionPreflightSourceStatus['status'];
  contribution?: NormalizedContribution;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  );
}

function isLabel(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(value);
}

function isEvidenceStatus(value: unknown): value is RwaEvidence['status'] {
  return value === 'OK' || value === 'BLOCKED' || value === 'UNKNOWN';
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function exactOptionalKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function normalizeContribution(
  value: unknown,
  sourceId: string,
  request: RwaRequest,
  policy: RwaPolicy,
  instrument: RwaInput['instrument'],
  nowSeconds: number,
  receiver: string
): NormalizedContribution {
  if (
    !isRecord(value) ||
    !exactOptionalKeys(value, ['prices', 'market', 'evidence', 'receiverEvidence'])
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const prices = value.prices === undefined ? [] : value.prices;
  const evidence = value.evidence === undefined ? [] : value.evidence;
  const market = value.market === undefined ? null : value.market;
  if (
    !Array.isArray(prices) ||
    prices.length > 32 ||
    !Array.isArray(evidence) ||
    evidence.length > 32
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }
  if (market !== null && !isRecord(market)) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }
  if (prices.some((price) => !isRecord(price) || price.feedId !== sourceId)) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PRICE_SOURCE_MISMATCH');
  }
  if (prices.length > 0 && !Object.hasOwn(policy.feeds, sourceId)) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PRICE_SOURCE_NOT_PINNED');
  }
  if (market && market.source !== sourceId) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_MARKET_SOURCE_MISMATCH');
  }
  if (market && !policy.stateSources.includes(sourceId)) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_MARKET_SOURCE_NOT_PINNED');
  }
  if (evidence.some((item) => !isRecord(item) || item.source !== sourceId)) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_EVIDENCE_SOURCE_MISMATCH');
  }
  if (
    evidence.some(
      (item) =>
        !['reserve', 'eligibility', 'redemption'].includes(String(item.kind)) ||
        !policy.evidenceSources[item.kind as keyof RwaPolicy['evidenceSources']].includes(sourceId)
    )
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_EVIDENCE_SOURCE_NOT_PINNED');
  }

  const receiverEvidence = value.receiverEvidence;
  let normalizedReceiverEvidence: RwaEvidence | undefined;
  if (receiverEvidence !== undefined) {
    if (
      !isRecord(receiverEvidence) ||
      Object.keys(receiverEvidence).sort().join(',') !==
        'instrumentId,kind,observedAt,source,status,subject,validUntil' ||
      receiverEvidence.kind !== 'eligibility' ||
      receiverEvidence.instrumentId !== request.instrumentId ||
      receiverEvidence.subject !== receiver ||
      receiverEvidence.source !== sourceId ||
      !policy.evidenceSources.eligibility.includes(sourceId) ||
      !isEvidenceStatus(receiverEvidence.status) ||
      typeof receiverEvidence.observedAt !== 'number' ||
      !Number.isSafeInteger(receiverEvidence.observedAt) ||
      Number(receiverEvidence.observedAt) <= 0 ||
      Number(receiverEvidence.observedAt) > Number.MAX_SAFE_INTEGER - policy.maxStateAgeSeconds ||
      typeof receiverEvidence.validUntil !== 'number' ||
      !Number.isSafeInteger(receiverEvidence.validUntil) ||
      Number(receiverEvidence.validUntil) <= 0
    ) {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_RECEIVER_EVIDENCE_INVALID');
    }
    normalizedReceiverEvidence = {
      kind: 'eligibility',
      instrumentId: request.instrumentId,
      subject: receiver,
      source: sourceId,
      status: receiverEvidence.status,
      observedAt: receiverEvidence.observedAt,
      validUntil: receiverEvidence.validUntil,
    };
  }

  const normalized: NormalizedContribution = {
    prices: prices as RwaPrice[],
    market: market as RwaMarketState | null,
    evidence: evidence as RwaEvidence[],
    ...(normalizedReceiverEvidence ? { receiverEvidence: normalizedReceiverEvidence } : {}),
  };

  // Reuse the canonical policy evaluator as the runtime validator for every provider payload.
  const candidate: RwaInput = {
    instrument,
    request,
    prices: normalized.prices,
    market: normalized.market,
    evidence: normalized.evidence,
  };
  buildRwaReport(candidate, policy, nowSeconds);
  return normalized;
}

function sourceIds(policy: RwaPolicy): string[] {
  return [
    ...new Set([
      ...Object.keys(policy.feeds),
      ...policy.stateSources,
      ...policy.evidenceSources.reserve,
      ...policy.evidenceSources.eligibility,
      ...policy.evidenceSources.redemption,
    ]),
  ].sort();
}

/**
 * Collect source-specific evidence, decode the exact proposed call, then evaluate the action
 * using the existing RWA v2 report format. This function never signs or authorizes a call.
 */
export async function preflightRwaAction(
  input: RwaActionPreflightRequest
): Promise<RwaActionPreflightResult> {
  const requestKeys = [
    'action',
    'amount',
    'callProfile',
    'instrument',
    'policy',
    'previousDigest',
    'providers',
    'sequence',
    'transaction',
  ];
  const allowedRequestKeys = [...requestKeys, 'instrumentAdmission', 'nowSeconds', 'signal'];
  if (
    !isRecord(input) ||
    requestKeys.some((key) => !Object.hasOwn(input, key)) ||
    !exactOptionalKeys(input, allowedRequestKeys) ||
    !isRecord(input.transaction) ||
    Object.keys(input.transaction).sort().join(',') !== 'chainId,data,from,nonce,to,value'
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_REQUEST_INVALID');
  }
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const instrumentId = rwaInstrumentId(input.instrument);
  rwaPolicyId(input.policy);
  if (
    instrumentId !== input.policy.instrumentId ||
    (input.policy.environment === 'production' && !input.instrumentAdmission)
  ) {
    throw new RwaActionPreflightError(
      instrumentId !== input.policy.instrumentId
        ? 'RWA_SCOPE_MISMATCH'
        : 'RWA_INSTRUMENT_ADMISSION_REQUIRED'
    );
  }
  if (
    typeof input.transaction.data !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(input.transaction.data)
  ) {
    throw new RwaActionPreflightError('RWA_TRANSACTION_DATA_INVALID');
  }
  const call: RwaCall = {
    chainId: input.transaction.chainId,
    from: input.transaction.from,
    to: input.transaction.to,
    calldataHash: keccak256(input.transaction.data as `0x${string}`),
    value: input.transaction.value,
    nonce: input.transaction.nonce,
  };
  const request: RwaRequest = {
    instrumentId,
    action: input.action,
    amount: input.amount,
    call,
  };
  rwaRequestHash(request);

  // Decode before fetching. A wrong selector, route, amount, receiver, or instrument must not
  // trigger a misleading collection run for an action that cannot be semantically admitted.
  const semantics = decodeRwaCall(
    input.transaction,
    request,
    input.instrument,
    input.callProfile,
    nowSeconds
  );

  if (!Array.isArray(input.providers) || input.providers.length > 96) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_LIMIT');
  }
  const allowedSourceIds = new Set(sourceIds(input.policy));
  const seen = new Set<string>();
  for (const provider of input.providers) {
    if (!provider || !isLabel(provider.sourceId) || typeof provider.collect !== 'function') {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
    }
    if (seen.has(provider.sourceId)) {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_DUPLICATE_PROVIDER');
    }
    if (!allowedSourceIds.has(provider.sourceId)) {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_NOT_PINNED');
    }
    seen.add(provider.sourceId);
  }

  const immutableContext = deepFreeze({
    instrument: JSON.parse(JSON.stringify(input.instrument)) as RwaInput['instrument'],
    request: JSON.parse(JSON.stringify(request)) as RwaRequest,
    policy: JSON.parse(JSON.stringify(input.policy)) as RwaPolicy,
    transaction: JSON.parse(JSON.stringify(input.transaction)) as RwaTransaction,
    callProfile: JSON.parse(JSON.stringify(input.callProfile)) as RwaCallProfile,
    nowSeconds,
  });

  const collected = await Promise.all(
    input.providers.map(async (provider): Promise<ProviderCollection> => {
      let value: unknown;
      try {
        value = await provider.collect(
          Object.freeze({
            ...immutableContext,
            ...(input.signal ? { signal: input.signal } : {}),
          })
        );
      } catch (error) {
        if (error instanceof RwaActionPreflightError) {
          return { sourceId: provider.sourceId, status: 'INVALID' };
        }
        return { sourceId: provider.sourceId, status: 'UNAVAILABLE' };
      }
      try {
        const contribution = normalizeContribution(
          value,
          provider.sourceId,
          request,
          input.policy,
          input.instrument,
          nowSeconds,
          semantics.receiver
        );
        const hasData =
          contribution.prices.length > 0 ||
          contribution.market !== null ||
          contribution.evidence.length > 0 ||
          Boolean(contribution.receiverEvidence);
        return {
          sourceId: provider.sourceId,
          status: hasData ? 'COLLECTED' : 'EMPTY',
          contribution,
        };
      } catch {
        return { sourceId: provider.sourceId, status: 'INVALID' };
      }
    })
  );

  const issues: string[] = [];
  const usable = collected.filter((item) => item.contribution);
  const priceObservations = usable.flatMap((item) => item.contribution!.prices);
  const evidence = usable.flatMap((item) => item.contribution!.evidence);
  const marketStates = usable
    .map((item) => item.contribution!.market)
    .filter((market): market is RwaMarketState => market !== null);
  let market: RwaMarketState | null = marketStates[0] ?? null;
  if (marketStates.length > 1) {
    market = null;
    issues.push('MULTIPLE_MARKET_SOURCES');
  }

  const receiverEvidenceList = usable
    .map((item) => item.contribution!.receiverEvidence)
    .filter((item): item is RwaEvidence => Boolean(item));
  let receiverEvidence: RwaEvidence;
  if (receiverEvidenceList.length === 1) {
    receiverEvidence = receiverEvidenceList[0];
  } else {
    receiverEvidence = {
      kind: 'eligibility',
      instrumentId,
      subject: semantics.receiver,
      source: 'insight-preflight-missing',
      status: 'UNKNOWN',
      observedAt: nowSeconds,
      validUntil: nowSeconds + 1,
    };
    issues.push(
      receiverEvidenceList.length === 0
        ? 'RECEIVER_EVIDENCE_MISSING'
        : 'RECEIVER_EVIDENCE_AMBIGUOUS'
    );
  }

  const allSourceIds = sourceIds(input.policy);
  const statusById = new Map(collected.map((item) => [item.sourceId, item]));
  const sources: RwaActionPreflightSourceStatus[] = allSourceIds.map((sourceId) => {
    const item = statusById.get(sourceId);
    if (!item) {
      return {
        sourceId,
        status: 'NOT_CONFIGURED',
        priceCount: 0,
        marketStateCount: 0,
        evidenceCount: 0,
        reasonCode: 'SOURCE_NOT_CONFIGURED',
      };
    }
    if (!item.contribution) {
      return {
        sourceId,
        status: item.status,
        priceCount: 0,
        marketStateCount: 0,
        evidenceCount: 0,
        reasonCode: item.status === 'UNAVAILABLE' ? 'SOURCE_UNAVAILABLE' : 'SOURCE_OUTPUT_INVALID',
      };
    }
    return {
      sourceId,
      status: item.status,
      priceCount: item.contribution.prices.length,
      marketStateCount: item.contribution.market ? 1 : 0,
      evidenceCount:
        item.contribution.evidence.length + Number(Boolean(item.contribution.receiverEvidence)),
    };
  });
  if (sources.some((source) => source.status === 'UNAVAILABLE')) {
    issues.push('SOURCE_COLLECTION_FAILED');
  }
  if (sources.some((source) => source.status === 'INVALID')) issues.push('SOURCE_OUTPUT_INVALID');
  if (sources.some((source) => source.status === 'NOT_CONFIGURED')) {
    issues.push('SOURCE_NOT_CONFIGURED');
  }

  if (priceObservations.length > 32 || evidence.length > 32) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_INPUT_LIMIT');
  }

  const reportInput: RwaInput = {
    instrument: input.instrument,
    request,
    prices: priceObservations,
    market,
    evidence,
  };
  const contextV2 = {
    sequence: input.sequence,
    previousDigest: input.previousDigest,
    transaction: input.transaction,
    receiverEvidence,
    callProfile: input.callProfile,
    ...(input.instrumentAdmission ? { instrumentAdmission: input.instrumentAdmission } : {}),
  };
  const report: RwaReportV2 = buildRwaReportV2(reportInput, input.policy, nowSeconds, contextV2);

  // The v1 assessment nested in v2 covers market/price/action evidence. Receiver eligibility is
  // a separate v2 assertion and must participate in the caller-facing final decision.
  const reasons = [...report.assessment.evaluation.reasons];
  const actionRule = input.policy.actions[input.action];
  if (!actionRule?.requiredEvidence.includes('eligibility')) {
    reasons.push('RWA_SENDER_ELIGIBILITY_REQUIRED');
  }
  if (
    !input.policy.evidenceSources.eligibility.includes(receiverEvidence.source) ||
    receiverEvidence.observedAt > nowSeconds ||
    nowSeconds - receiverEvidence.observedAt >= input.policy.maxStateAgeSeconds ||
    nowSeconds >= receiverEvidence.validUntil ||
    receiverEvidence.status === 'UNKNOWN'
  ) {
    reasons.push('RWA_RECEIVER_ELIGIBILITY_UNAVAILABLE');
  }
  let decision = report.assessment.evaluation.verdict;
  if (receiverEvidence.status === 'BLOCKED') {
    reasons.push('RWA_RECEIVER_BLOCKED');
    decision = 'BLOCK';
  } else if (reasons.length > 0 && decision === 'ALLOW') {
    decision = 'UNKNOWN';
  }

  // Preserve stable, de-duplicated issue codes for callers and logs.
  const uniqueIssues = [...new Set(issues)].sort();
  const uniqueReasons = [...new Set(reasons)].sort();
  return {
    schema: 'insight.rwa-action-preflight.v1',
    mode: 'diagnostic',
    mayAuthorizeExecution: false,
    evidenceProvenance: 'adapter-asserted-unverified',
    decision,
    reasons: uniqueReasons,
    report,
    sources,
    issues: uniqueIssues,
  };
}
