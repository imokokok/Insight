import { UnsupportedSymbolError } from '@/lib/errors';

import { getConsensusPrice, type ConsensusPriceResponse } from './consensusPriceService';

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
 */

export type OracleWatchSeverity = 'normal' | 'caution' | 'danger';
export type OracleWatchRecommendation = 'proceed' | 'proceed_with_caution' | 'halt';

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
  providers: Array<{
    provider: string;
    status: 'success' | 'unsupported' | 'error';
    deviationPct: number | null;
    isOutlier: boolean;
    isStale: boolean;
  }>;
  evaluatedAt: string;
}

// Mirrors pre-trade's Phase 1 rule thresholds (high-is-bad unless noted).
const DEV_CAUTION_PCT = 1.0;
const DEV_DANGER_PCT = 3.0;
// Agreement is low-is-bad: below the threshold triggers the verdict.
const AGREEMENT_CAUTION = 0.95;
const AGREEMENT_DANGER = 0.85;

export async function getOracleWatchSignal(
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
      return {
        symbol: symbol.toUpperCase(),
        chain: chain ?? null,
        verdict: 'danger',
        recommendation: 'halt',
        maxDeviationPct: null,
        agreement: 0,
        participantCount: 0,
        outlierCount: 0,
        staleCount: 0,
        consensusPrice: null,
        reason: 'no_cross_oracle_coverage',
        providers: [],
        evaluatedAt,
      };
    }
    throw error;
  }

  const successProviders = result.providers.filter((p) => p.status === 'success');
  const maxDeviationPct = successProviders.reduce(
    (m, p) => (p.deviationPct === null ? m : Math.max(m, Math.abs(p.deviationPct))),
    0
  );
  const outlierCount = successProviders.filter((p) => p.isOutlier).length;
  const staleCount = successProviders.filter((p) => p.isStale).length;

  const providers = result.providers.map((p) => ({
    provider: p.provider,
    status: p.status,
    deviationPct: p.deviationPct,
    isOutlier: p.isOutlier,
    isStale: p.isStale,
  }));

  // Consensus computed but zero participants (every fetch failed) — treat as
  // no usable coverage.
  if (result.participantCount === 0) {
    return {
      symbol: result.symbol,
      chain: result.chain ?? null,
      verdict: 'danger',
      recommendation: 'halt',
      maxDeviationPct: null,
      agreement: 0,
      participantCount: 0,
      outlierCount: 0,
      staleCount: 0,
      consensusPrice: result.consensusPrice,
      reason: 'no_cross_oracle_coverage',
      providers,
      evaluatedAt,
    };
  }

  let verdict: OracleWatchSeverity;
  let recommendation: OracleWatchRecommendation;
  let reason: string;

  if (maxDeviationPct >= DEV_DANGER_PCT || result.agreement < AGREEMENT_DANGER) {
    verdict = 'danger';
    recommendation = 'halt';
    reason = 'deviation_or_agreement_breached_danger';
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
    providers,
    evaluatedAt,
  };
}
