import { nonDerivedGroupCount } from '@/lib/attestations/sourceGroups';
import { watchReasonCodes, type WatchReasonCode } from '@/lib/attestations/watchReasonCodes';
import { UnsupportedSymbolError } from '@/lib/errors';
import { scorePreTradeMultiHorizon } from '@/lib/ml/inference';
import { TTLCache } from '@/lib/utils/cache';
import { roundTo } from '@/lib/utils/format';

import { getConsensusPrice, type ConsensusPriceResponse } from './consensusPriceService';
import { fetchHistoricalOracleState } from './oracleWatchHistory';
import {
  computeOracleWatchTrust,
  type OracleWatchTrust,
  type OracleWatchTrustLevel,
} from './oracleWatchTrust';

/**
 * Oracle Watch — the always-on companion to Pre-Trade.
 *
 * Pre-trade answers "can I trade this price right now?" for a single moment;
 * Oracle Watch answers "can my strategy keep depending on this feed?" with a
 * consolidated, live cross-oracle trust signal any agent can gate on.
 *
 * The verdict thresholds deliberately mirror pre-trade's Phase 1 rule set
 * (maxProviderDeviationPct: caution 1.0 / danger 3.0 / block 8.0; agreement:
 * caution 0.95 / danger 0.85 / block 0.7) so both surfaces speak the same
 * severity language.
 *
 * ML risk score: the present-state verdict is pure threshold rules over live
 * cross-oracle deviation/agreement/outliers/staleness (unchanged). On top of
 * that, a forward-looking ML manipulation-risk score is surfaced as an
 * ADVISORY signal (mlRiskScore + mlRiskLevel) built from the same
 * PreTradeFeatures consumed by pre-trade's ML scorer — it does not override
 * the threshold verdict.
 */

export type OracleWatchSeverity = 'normal' | 'caution' | 'danger';
export type OracleWatchRecommendation = 'proceed' | 'proceed_with_caution' | 'halt';
export type OracleWatchMlRiskLevel = 'low' | 'medium' | 'high';
export type { OracleWatchTrustLevel, OracleWatchTrustComponents } from './oracleWatchTrust';

/** Independent providers required to avoid a DANGER quorum verdict. */
export const QUORUM_MIN = 3;

/**
 * Distinct NON-DERIVED operator groups required to avoid a DANGER independence
 * verdict. Mirrors pre-trade's v2.1 independence gate
 * (V2_REQUIRED_NON_DERIVED_GROUPS): counting providers alone is not enough —
 * three white-labelled wrappers of one operator, or two real sources plus a
 * TWAP, all satisfy `QUORUM_MIN` while describing a single point of failure.
 * Derived sources (TWAP) still feed the consensus and the quorum count, but
 * never the independence count.
 */
export const INDEPENDENCE_MIN = 2;

export interface OracleWatchProvider {
  provider: string;
  status: 'success' | 'unsupported' | 'error';
  deviationPct: number | null;
  isOutlier: boolean;
  isStale: boolean;
  /** Per-provider reputation (0-100 from the reputation service), if known. */
  reputationScore: number | null;
  /** Provider observation metadata needed by signed Watch attestations. */
  price: number;
  timestamp: number;
  dataAgeSeconds: number | null;
  source?: string;
}

export interface OracleWatchResult {
  symbol: string;
  chain: string | null;
  verdict: OracleWatchSeverity;
  recommendation: OracleWatchRecommendation;
  /** Max |deviation from consensus| across responding providers, or null. */
  maxDeviationPct: number | null;
  /** Cross-provider agreement (0-1, low is bad). */
  agreement: number;
  participantCount: number;
  outlierCount: number;
  staleCount: number;
  consensusPrice: number | null;
  /** Short machine-readable reason for the verdict. */
  reason: string;
  /** Forward-looking ML manipulation-risk score (0-1), advisory. Null if the
   *  model is unavailable or there is no cross-oracle coverage. */
  mlRiskScore: number | null;
  /** Combined score decomposed per horizon; may both be null. */
  mlScore1h: number | null;
  mlScore6h: number | null;
  /** Discrete advisory gate derived from mlRiskScore. */
  mlRiskLevel: OracleWatchMlRiskLevel | null;
  /** Average / worst reputation across responding providers (0-100). */
  avgReputation: number | null;
  minReputation: number | null;
  /** True when at least QUORUM_MIN independent providers are responding. */
  quorumSatisfied: boolean;
  /**
   * Composable reason codes for the verdict (v2 receipts sign their hash).
   * A single `reason` string cannot distinguish a price divergence from a
   * quorum shortfall from an independence failure — three states with
   * different remediations. Empty when the feed is healthy.
   */
  reasonCodes: WatchReasonCode[];
  /** Quorum floor the signal is judged against (QUORUM_MIN), surfaced so a
   *  consumer can read the gate off the payload and not just off a receipt. */
  requiredParticipantCount: number;
  /** Distinct NON-DERIVED operator groups among the responding providers. */
  sourceGroupCount: number;
  /** Independence floor the signal is judged against (INDEPENDENCE_MIN). */
  requiredSourceGroupCount: number;
  /** True when at least INDEPENDENCE_MIN non-derived groups are responding. */
  independenceSatisfied: boolean;
  /** Composite 0-100 credibility rating (higher = more trustworthy). */
  trustScore: number;
  /** Discrete gate built from trustScore. */
  trustLevel: OracleWatchTrustLevel;
  /** Per-component trust breakdown (0-1 each, higher = better). */
  trustComponents: OracleWatchTrust['components'];
  providers: OracleWatchProvider[];
  evaluatedAt: string;
}

/**
 * The no-coverage verdict: nothing to cross-check against, which is the most
 * dangerous state for a dependent agent. Degrades to DANGER/halt rather than
 * erroring (mirrors pre-trade returning BLOCK for unsupported symbols).
 *
 * Shared by the unsupported-symbol path and the "every fetch failed" path so
 * both emit an identical, fully-populated result.
 */
function noCoverageResult(args: {
  symbol: string;
  chain: string | null;
  consensusPrice: number | null;
  avgReputation: number | null;
  minReputation: number | null;
  providers: OracleWatchProvider[];
  evaluatedAt: string;
}): OracleWatchResult {
  const trust = computeOracleWatchTrust({
    participantCount: 0,
    agreement: 0,
    maxDeviationPct: null,
    mlRiskScore: null,
    outlierCount: 0,
    staleCount: 0,
    avgReputation: args.avgReputation,
    minReputation: args.minReputation,
  });
  return {
    symbol: args.symbol,
    chain: args.chain,
    verdict: 'danger',
    recommendation: 'halt',
    maxDeviationPct: null,
    agreement: 0,
    participantCount: 0,
    outlierCount: 0,
    staleCount: 0,
    consensusPrice: args.consensusPrice,
    reason: 'no_cross_oracle_coverage',
    mlRiskScore: null,
    mlScore1h: null,
    mlScore6h: null,
    mlRiskLevel: null,
    avgReputation: args.avgReputation,
    minReputation: args.minReputation,
    quorumSatisfied: false,
    requiredParticipantCount: QUORUM_MIN,
    reasonCodes: ['NO_COVERAGE'],
    sourceGroupCount: 0,
    requiredSourceGroupCount: INDEPENDENCE_MIN,
    independenceSatisfied: false,
    trustScore: trust.score,
    trustLevel: trust.level,
    trustComponents: trust.components,
    providers: args.providers,
    evaluatedAt: args.evaluatedAt,
  };
}

// Mirrors pre-trade's Phase 1 rule thresholds (high-is-bad unless noted).
const DEV_CAUTION_PCT = 1.0;
const DEV_DANGER_PCT = 3.0;
// Agreement is low-is-bad: below the threshold triggers the verdict.
const AGREEMENT_CAUTION = 0.95;
const AGREEMENT_DANGER = 0.85;

// Advisory ML risk-level buckets (low-is-good).
const ML_LEVEL_MEDIUM = 0.3;
const ML_LEVEL_HIGH = 0.6;

// Short-TTL in-memory cache keyed by symbol|chain. Oracle Watch fetches live
// cross-oracle providers (expensive) on every uncached call, so agents that
// poll frequently are amortized by this bounded cache. Same cost discipline as
// the safety-check live-consensus cache.
const ORACLE_WATCH_CACHE_TTL_MS = 15_000;
const oracleWatchCache = new TTLCache({ maxSize: 500 });

/** Reset the Oracle Watch cache (used by tests). */
export function clearOracleWatchCache(): void {
  oracleWatchCache.clear();
}

function cacheKey(symbol: string, chain?: string): string {
  return `${symbol.toUpperCase()}|${chain ?? ''}`;
}

/** Build the ML advisory fields from a live consensus result + history. */
async function computeMlRisk(
  result: ConsensusPriceResponse,
  maxDeviationPct: number
): Promise<{
  mlRiskScore: number | null;
  mlScore1h: number | null;
  mlScore6h: number | null;
  mlRiskLevel: OracleWatchMlRiskLevel | null;
}> {
  const base = { mlRiskScore: null, mlScore1h: null, mlScore6h: null, mlRiskLevel: null };
  if (result.participantCount === 0 || result.consensusPrice === null) return base;

  const successProviders = result.providers.filter((p) => p.status === 'success');
  const absDevs = successProviders
    .map((p) => p.deviationPct)
    .filter((v): v is number => v !== null && Number.isFinite(v))
    .map((v) => Math.abs(v));
  const meanDeviationPct =
    absDevs.length > 0 ? absDevs.reduce((s, v) => s + v, 0) / absDevs.length : 0;
  const staleCount = successProviders.filter((p) => p.isStale).length;
  const staleRatio = successProviders.length > 0 ? staleCount / successProviders.length : 0;
  const outlierCount = successProviders.filter((p) => p.isOutlier).length;

  // 30-min governance features, normalized for the ML scorer. Reputation is
  // 0-100 from the reputation service → /100 to [0,1]. These feed the v3
  // features (nullable in PreTradeFeatures); the neutral defaults only apply
  // when a caller has no 30-min context (pre-trade safety), not here.
  const reputations = successProviders
    .map((p) => p.reputationScore)
    .filter((s): s is number => s !== null && Number.isFinite(s));
  const avgReputation =
    reputations.length > 0
      ? roundTo(reputations.reduce((s, v) => s + v, 0) / reputations.length / 100, 4)
      : 0.5;
  const minReputation = reputations.length > 0 ? roundTo(Math.min(...reputations) / 100, 4) : 0.5;

  // Cross-provider spread over responding prices (min/max → %), matching
  // pre-trade's computeSpread semantics so training and live agree.
  const prices = successProviders.filter((p) => p.price > 0).map((p) => p.price);
  let spreadPct = 0;
  if (prices.length >= 2) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const ref = (min + max) / 2;
    spreadPct = ref > 0 ? ((max - min) / ref) * 100 : 0;
  }

  const historical = await fetchHistoricalOracleState(result.symbol, {
    maxDeviationPct,
    consensusPrice: result.consensusPrice,
    participantCount: result.participantCount,
  });

  const multi = scorePreTradeMultiHorizon(
    {
      maxDeviationPct,
      spreadPct,
      participantCount: result.participantCount,
      staleDataRisk: staleCount > 0,
      meanDeviationPct: roundTo(meanDeviationPct, 4),
      staleRatio: roundTo(staleRatio, 4),
      deviationVelocity1h: historical.deviationVelocity1h,
      rollingVolatility6h: historical.rollingVolatility6h,
      deviationVelocity3h: historical.deviationVelocity3h,
      participantCountDelta1h: historical.participantCountDelta1h,
      maxDeviationZscore24h: historical.maxDeviationZscore24h,
      // 30-min governance context (real values; not neutral defaults here).
      agreement: result.agreement,
      outlierCount,
      staleCount,
      avgReputation,
      minReputation,
    },
    { assetClass: result.symbol }
  );

  if (multi === null) return base;

  const level =
    multi.combined >= ML_LEVEL_HIGH ? 'high' : multi.combined >= ML_LEVEL_MEDIUM ? 'medium' : 'low';

  return {
    mlRiskScore: multi.combined,
    mlScore1h: multi.score1h,
    mlScore6h: multi.score6h,
    mlRiskLevel: level,
  };
}

export async function getOracleWatchSignal(
  symbol: string,
  chain?: string
): Promise<OracleWatchResult> {
  const key = cacheKey(symbol, chain);
  const cached = oracleWatchCache.get<OracleWatchResult>(key);
  if (cached) return cached;

  const result = await computeOracleWatchSignal(symbol, chain);
  oracleWatchCache.set(key, result, ORACLE_WATCH_CACHE_TTL_MS);
  return result;
}

async function computeOracleWatchSignal(
  symbol: string,
  chain?: string
): Promise<OracleWatchResult> {
  const evaluatedAt = new Date().toISOString();

  let result: ConsensusPriceResponse;
  try {
    result = await getConsensusPrice(symbol, chain);
  } catch (error) {
    // No cross-oracle coverage is the most dangerous state for a dependent
    // agent: there is nothing to cross-check against. Gracefully degrade to a
    // DANGER verdict instead of a 4xx/5xx (mirrors pre-trade returning BLOCK
    // for unsupported symbols).
    if (error instanceof UnsupportedSymbolError) {
      return noCoverageResult({
        symbol: symbol.toUpperCase(),
        chain: chain ?? null,
        consensusPrice: null,
        avgReputation: null,
        minReputation: null,
        providers: [],
        evaluatedAt,
      });
    }
    throw error;
  }

  const successProviders = result.providers.filter((p) => p.status === 'success');
  // Sources the consensus engine already rejected as outliers must not drive the
  // deviation gate: they were excluded precisely because they do not describe the
  // asset, so counting their distance from consensus would undo the exclusion and
  // keep a healthy feed pinned at DANGER. Falls back to the full set only when
  // every provider was excluded, so a genuinely divergent market still reports
  // its real deviation instead of collapsing to zero.
  const consensusProviders = successProviders.filter((p) => !p.isOutlier);
  const devProviders = consensusProviders.length > 0 ? consensusProviders : successProviders;
  const maxDeviationPct = devProviders.reduce(
    (m, p) => (p.deviationPct === null ? m : Math.max(m, Math.abs(p.deviationPct))),
    0
  );
  const outlierCount = successProviders.filter((p) => p.isOutlier).length;
  const staleCount = successProviders.filter((p) => p.isStale).length;

  // Surface reputation from the reputation service, already attached to each
  // consensus provider. Aggregated as avg/min for a single gateable number.
  const reputations = successProviders
    .map((p) => p.reputationScore)
    .filter((s): s is number => s !== null && Number.isFinite(s));
  const avgReputation =
    reputations.length > 0
      ? roundTo(reputations.reduce((s, v) => s + v, 0) / reputations.length, 1)
      : null;
  const minReputation = reputations.length > 0 ? Math.min(...reputations) : null;

  const providers: OracleWatchProvider[] = result.providers.map((p) => ({
    provider: p.provider,
    status: p.status,
    deviationPct: p.deviationPct,
    isOutlier: p.isOutlier,
    isStale: p.isStale,
    reputationScore: p.reputationScore,
    price: p.price,
    timestamp: p.timestamp,
    dataAgeSeconds: p.dataAgeSeconds,
    source: p.source,
  }));

  // Consensus computed but zero participants (every fetch failed) — treat as
  // no usable coverage.
  if (result.participantCount === 0) {
    return noCoverageResult({
      symbol: result.symbol,
      chain: result.chain ?? null,
      consensusPrice: result.consensusPrice,
      avgReputation,
      minReputation,
      providers,
      evaluatedAt,
    });
  }

  // Forward-looking ML risk is needed BEFORE the verdict so it can participate
  // in the gate (an advisory score must never be wholly ignored, but also must
  // not override hard rule breaches).
  const ml = await computeMlRisk(result, maxDeviationPct);

  const quorumSatisfied = result.participantCount >= QUORUM_MIN;

  // Independence gate (mirrors pre-trade's v2.1 gate). `quorumSatisfied` only
  // counts heads; three white-labelled wrappers of one operator — or two real
  // sources plus a TWAP — clear QUORUM_MIN while describing a single point of
  // failure. Derived groups (TWAP) still feed the consensus and the quorum
  // count but are excluded here by nonDerivedGroupCount.
  const sourceGroupCount = nonDerivedGroupCount(successProviders.map((p) => p.provider));
  const independenceSatisfied = sourceGroupCount >= INDEPENDENCE_MIN;

  let verdict: OracleWatchSeverity;
  let recommendation: OracleWatchRecommendation;
  let reason: string;

  const devDanger = maxDeviationPct >= DEV_DANGER_PCT;
  const agreeDanger = result.agreement < AGREEMENT_DANGER;
  if (devDanger || agreeDanger || !quorumSatisfied || !independenceSatisfied) {
    verdict = 'danger';
    recommendation = 'halt';
    // Name the dominant cause so an agent can remediate: waiting for more
    // providers, waiting for a second real operator, and halting on a price
    // divergence are three different responses to the same verdict.
    if (devDanger || agreeDanger) {
      reason = 'deviation_or_agreement_breached_danger';
    } else if (!quorumSatisfied) {
      reason = 'insufficient_cross_oracle_quorum';
    } else {
      reason = 'insufficient_oracle_independence';
    }
  } else if (
    maxDeviationPct >= DEV_CAUTION_PCT ||
    result.agreement < AGREEMENT_CAUTION ||
    outlierCount > 0 ||
    staleCount > 0
  ) {
    verdict = 'caution';
    recommendation = 'proceed_with_caution';
    reason = 'deviation_agreement_outlier_or_stale';
  } else {
    verdict = 'normal';
    recommendation = 'proceed';
    reason = 'within_tolerance';
  }

  const mlRiskHigh = ml.mlRiskLevel === 'high';

  // ML forward-risk escalation: a healthy-now feed with high predicted
  // manipulation risk must be throttled to caution (never bluntly blocked on
  // the ML alone), closing the gap where a purely-advisory ML could be ignored.
  if (verdict === 'normal' && mlRiskHigh) {
    verdict = 'caution';
    recommendation = 'proceed_with_caution';
    reason = 'ml_forward_risk_high';
  }

  // `reason` names the DOMINANT cause; `reasonCodes` lists every condition that
  // fired, including advisory ones the dominant reason would otherwise mask.
  // v2 receipts sign the codes' hash so the diagnosis travels with the proof.
  const reasonCodes = watchReasonCodes({
    participantCount: result.participantCount,
    sourceGroupCount,
    requiredParticipantCount: QUORUM_MIN,
    requiredSourceGroupCount: INDEPENDENCE_MIN,
    deviationDanger: devDanger,
    agreementDanger: agreeDanger,
    outlierCount,
    staleCount,
    mlForwardRiskHigh: mlRiskHigh,
  });

  const trust = computeOracleWatchTrust({
    participantCount: result.participantCount,
    agreement: result.agreement,
    maxDeviationPct: maxDeviationPct || null,
    mlRiskScore: ml.mlRiskScore,
    outlierCount,
    staleCount,
    avgReputation,
    minReputation,
    sourceGroupCount,
    requiredSourceGroupCount: INDEPENDENCE_MIN,
  });

  return {
    symbol: result.symbol,
    chain: result.chain ?? null,
    verdict,
    recommendation,
    maxDeviationPct: maxDeviationPct || null,
    agreement: result.agreement,
    participantCount: result.participantCount,
    outlierCount,
    staleCount,
    consensusPrice: result.consensusPrice,
    reason,
    ...ml,
    avgReputation,
    minReputation,
    quorumSatisfied,
    requiredParticipantCount: QUORUM_MIN,
    reasonCodes,
    sourceGroupCount,
    requiredSourceGroupCount: INDEPENDENCE_MIN,
    independenceSatisfied,
    trustScore: trust.score,
    trustLevel: trust.level,
    trustComponents: trust.components,
    providers,
    evaluatedAt,
  };
}
