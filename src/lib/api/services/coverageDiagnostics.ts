import {
  V2_REQUIRED_NON_DERIVED_GROUPS,
  V2_REQUIRED_PARTICIPANT_COUNT,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import { toCoverageObservation } from '@/lib/coverage/observations';
import { ValidationError } from '@/lib/errors';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { isUsdDenominatedFeedSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import type { OracleFeed } from '@/lib/supabase/queries';

import {
  coveragePolicyId,
  evaluateCoverage,
  STRICT_COVERAGE_POLICY,
} from '../../../../sdk/src/coverage';

import { getConsensusPrice, resolveProvidersForSymbol } from './consensusPriceService';

/** Unsigned diagnostics. Registry membership and a successful price response do
 * not establish fresh quorum, trade safety, or coverage of a settlement chain. */
export async function getCoverageDiagnostic(
  input: { asset: string; chainId: number; probe: boolean; maxSourceAgeSeconds?: number },
  feeds: Map<string, OracleFeed[]>
) {
  if (
    !/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(input.asset) ||
    typeof input.probe !== 'boolean' ||
    (input.maxSourceAgeSeconds !== undefined &&
      (!Number.isSafeInteger(input.maxSourceAgeSeconds) ||
        input.maxSourceAgeSeconds < 1 ||
        input.maxSourceAgeSeconds > 604800))
  ) {
    throw new ValidationError('Invalid coverage diagnostic input.');
  }
  const chain = getBlockchainByChainId(input.chainId);
  if (!chain || !Number.isSafeInteger(input.chainId) || input.chainId <= 0) {
    throw new ValidationError(
      'A supported, explicit evidence chainId is required for coverage diagnostics.'
    );
  }
  const candidates = await resolveProvidersForSymbol(input.asset, chain);
  const consensus = input.probe
    ? await getConsensusPrice(input.asset, chain, undefined, candidates, { allowUnavailable: true })
    : null;
  const now = Math.floor(Date.now() / 1000);
  const policy = {
    ...STRICT_COVERAGE_POLICY,
    name: 'diagnostic-freshness.v1',
    maxSourceAgeSeconds: input.maxSourceAgeSeconds ?? STRICT_COVERAGE_POLICY.maxSourceAgeSeconds,
  };
  const observations = consensus?.providers.map((p) => toCoverageObservation(p, input, chain));
  const evaluation = observations
    ? evaluateCoverage(observations, policy, input.chainId, now)
    : null;
  const candidateCounts = new Map<string, number>();
  for (const provider of candidates)
    candidateCounts.set(provider, (candidateCounts.get(provider) ?? 0) + 1);
  const providers = candidates.map((provider) => {
    const observation = consensus?.providers.find((p) => p.provider === provider);
    const classified = Object.hasOwn(STRICT_COVERAGE_POLICY.sources, provider)
      ? STRICT_COVERAGE_POLICY.sources[provider]
      : null;
    const assessed = evaluation?.providers.find((p) => p.provider === provider);
    const normalized = observations?.find((p) => p.provider === provider);
    const registered = (feeds.get(provider) ?? []).some(
      (feed) =>
        feed.chain_id === input.chainId &&
        feed.symbol.split('/')[0].toUpperCase() === input.asset &&
        isUsdDenominatedFeedSymbol(feed.symbol)
    );
    const responding = observation
      ? observation.status === 'success' &&
        Number.isFinite(observation.price) &&
        observation.price > 0
      : null;
    const age = assessed?.ageSeconds ?? null;
    const eligibilityReasons =
      assessed?.reasons.filter(
        (r) => !['SOURCE_AGE_UNKNOWN', 'SOURCE_TIME_INVALID', 'SOURCE_TOO_OLD'].includes(r)
      ) ?? [];
    if (candidateCounts.get(provider)! > 1 && !eligibilityReasons.includes('DUPLICATE_PROVIDER'))
      eligibilityReasons.push('DUPLICATE_PROVIDER');
    const included = observation
      ? classified !== null &&
        assessed !== undefined &&
        responding === true &&
        eligibilityReasons.length === 0
      : null;
    const fresh =
      observation && input.maxSourceAgeSeconds !== undefined
        ? included === true && assessed !== undefined && assessed.reasons.length === 0
        : null;
    return {
      provider,
      sourceGroup: classified?.group ?? null,
      classified: classified !== null,
      derived: classified?.derived ?? null,
      registered,
      registrationScope: registered ? 'exact_chain' : 'adapter_or_chain_agnostic',
      responding,
      fresh,
      included,
      dataAgeSeconds: age,
      sourceTimestamp:
        responding && normalized?.observedAt != null ? normalized.observedAt * 1000 : null,
      retrievedAt: observation?.retrievedAt ?? null,
      fetchDurationMs: observation?.fetchDurationMs ?? null,
      timestampProvenance: observation?.timestampProvenance ?? 'unknown',
      status: observation?.status ?? 'not_probed',
      reason: !observation
        ? 'LIVE_PROBE_REQUIRED'
        : !classified
          ? 'UNCLASSIFIED_PROVIDER'
          : observation.status === 'unsupported'
            ? 'UNSUPPORTED'
            : !responding
              ? 'FETCH_FAILED'
              : observation.isOutlier
                ? 'CONSENSUS_EXCLUDED'
                : eligibilityReasons.length > 0
                  ? eligibilityReasons[0]
                  : assessed?.reasons.includes('SOURCE_TIME_INVALID')
                    ? 'SOURCE_TIME_INVALID'
                    : age === null
                      ? 'SOURCE_AGE_UNKNOWN'
                      : assessed?.reasons.includes('SOURCE_TOO_OLD')
                        ? 'SOURCE_TOO_OLD'
                        : null,
    };
  });
  const included = providers.filter((p) => p.included);
  const fresh = included.filter((p) => p.fresh);
  const groupCount = (rows: typeof providers) =>
    new Set(rows.filter((p) => p.derived === false).map((p) => p.sourceGroup)).size;
  const groups = groupCount(included);
  const freshGroups = groupCount(fresh);
  const sufficient =
    included.length >= V2_REQUIRED_PARTICIPANT_COUNT && groups >= V2_REQUIRED_NON_DERIVED_GROUPS;
  const freshSufficient =
    fresh.length >= V2_REQUIRED_PARTICIPANT_COUNT && freshGroups >= V2_REQUIRED_NON_DERIVED_GROUPS;
  const freshParticipantShortfall = Math.max(0, V2_REQUIRED_PARTICIPANT_COUNT - fresh.length);
  const freshGroupShortfall = Math.max(0, V2_REQUIRED_NON_DERIVED_GROUPS - freshGroups);
  return {
    schema: 'insight.coverage-diagnostic.v2',
    classificationPolicyId: coveragePolicyId(STRICT_COVERAGE_POLICY),
    freshnessPolicyId: input.maxSourceAgeSeconds !== undefined ? coveragePolicyId(policy) : null,
    asset: input.asset,
    evidenceChainId: input.chainId,
    evidenceChain: chain,
    settlementChainEvaluated: false,
    sampledAt: new Date(now * 1000).toISOString(),
    mode: input.probe ? 'live_probe' : 'registry',
    signed: false,
    status: !input.probe ? 'NOT_PROBED' : sufficient ? 'SUFFICIENT' : 'INSUFFICIENT_EVIDENCE',
    freshnessStatus:
      !input.probe || input.maxSourceAgeSeconds === undefined
        ? 'NOT_EVALUATED'
        : freshSufficient
          ? 'SUFFICIENT'
          : 'INSUFFICIENT_FRESH_EVIDENCE',
    maxSourceAgeSeconds: input.maxSourceAgeSeconds ?? null,
    requiredParticipantCount: V2_REQUIRED_PARTICIPANT_COUNT,
    requiredNonDerivedGroupCount: V2_REQUIRED_NON_DERIVED_GROUPS,
    registeredCount: providers.filter((p) => p.registered).length,
    respondingCount: input.probe ? providers.filter((p) => p.responding).length : null,
    includedCount: input.probe ? included.length : null,
    nonDerivedGroupCount: input.probe ? groups : null,
    freshCount: input.probe && input.maxSourceAgeSeconds !== undefined ? fresh.length : null,
    freshNonDerivedGroupCount:
      input.probe && input.maxSourceAgeSeconds !== undefined ? freshGroups : null,
    freshnessShortfall:
      input.probe && input.maxSourceAgeSeconds !== undefined
        ? { participants: freshParticipantShortfall, nonDerivedGroups: freshGroupShortfall }
        : null,
    providers,
    nextAction: !input.probe
      ? 'Run an explicit live probe to evaluate availability.'
      : !sufficient
        ? 'Inspect unavailable or excluded providers; do not lower quorum.'
        : input.maxSourceAgeSeconds !== undefined && !freshSufficient
          ? 'Refresh sources or select a supported workflow; unknown age is not fresh.'
          : 'Run a signed pre-trade assessment; coverage alone is not a safety verdict.',
  };
}
