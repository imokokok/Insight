import {
  V2_REQUIRED_NON_DERIVED_GROUPS,
  V2_REQUIRED_PARTICIPANT_COUNT,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import {
  DERIVED_SOURCE_GROUPS,
  nonDerivedGroupCount,
  resolveSourceGroup,
} from '@/lib/attestations/sourceGroups';
import { ValidationError } from '@/lib/errors';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { isUsdDenominatedFeedSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import type { OracleFeed } from '@/lib/supabase/queries';

import { getConsensusPrice, resolveProvidersForSymbol } from './consensusPriceService';

/** Unsigned diagnostics. Registry membership and a successful price response do
 * not establish fresh quorum, trade safety, or coverage of a settlement chain. */
export async function getCoverageDiagnostic(
  input: { asset: string; chainId: number; probe: boolean; maxSourceAgeSeconds?: number },
  feeds: Map<string, OracleFeed[]>
) {
  const chain = getBlockchainByChainId(input.chainId);
  if (!chain || input.chainId <= 0) {
    throw new ValidationError(
      'A supported, explicit evidence chainId is required for coverage diagnostics.'
    );
  }
  const candidates = await resolveProvidersForSymbol(input.asset, chain);
  const consensus = input.probe
    ? await getConsensusPrice(input.asset, chain, undefined, candidates, { allowUnavailable: true })
    : null;
  const providers = candidates.map((provider) => {
    const observation = consensus?.providers.find((p) => p.provider === provider);
    const registered = (feeds.get(provider) ?? []).some(
      (feed) =>
        feed.chain_id === input.chainId &&
        feed.symbol.split('/')[0].toUpperCase() === input.asset &&
        isUsdDenominatedFeedSymbol(feed.symbol)
    );
    const responding = observation
      ? observation.status === 'success' && observation.price > 0
      : null;
    const age = observation?.dataAgeSeconds ?? null;
    const fresh =
      responding && input.maxSourceAgeSeconds !== undefined && age !== null
        ? age <= input.maxSourceAgeSeconds
        : null;
    const included = observation ? responding === true && !observation.isOutlier : null;
    return {
      provider,
      sourceGroup: resolveSourceGroup(provider),
      derived: DERIVED_SOURCE_GROUPS.has(resolveSourceGroup(provider)),
      registered,
      registrationScope: registered ? 'exact_chain' : 'adapter_or_chain_agnostic',
      responding,
      fresh,
      included,
      dataAgeSeconds: age,
      sourceTimestamp: responding ? (observation?.timestamp ?? null) : null,
      retrievedAt: observation?.retrievedAt ?? null,
      timestampProvenance: observation?.timestampProvenance ?? 'unknown',
      status: observation?.status ?? 'not_probed',
      reason: !observation
        ? 'LIVE_PROBE_REQUIRED'
        : observation.status === 'unsupported'
          ? 'UNSUPPORTED'
          : !responding
            ? 'FETCH_FAILED'
            : observation.isOutlier
              ? 'CONSENSUS_EXCLUDED'
              : age === null
                ? 'SOURCE_AGE_UNKNOWN'
                : fresh === false
                  ? 'SOURCE_TOO_OLD'
                  : null,
    };
  });
  const included = providers.filter((p) => p.included);
  const fresh = included.filter((p) => p.fresh);
  const groups = nonDerivedGroupCount(included.map((p) => p.provider));
  const freshGroups = nonDerivedGroupCount(fresh.map((p) => p.provider));
  const sufficient =
    included.length >= V2_REQUIRED_PARTICIPANT_COUNT && groups >= V2_REQUIRED_NON_DERIVED_GROUPS;
  const freshSufficient =
    fresh.length >= V2_REQUIRED_PARTICIPANT_COUNT && freshGroups >= V2_REQUIRED_NON_DERIVED_GROUPS;
  return {
    asset: input.asset,
    evidenceChainId: input.chainId,
    evidenceChain: chain,
    settlementChainEvaluated: false,
    sampledAt: new Date().toISOString(),
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
