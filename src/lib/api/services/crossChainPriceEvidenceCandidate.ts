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
import {
  BLOCKCHAIN_TO_CHAIN_ID,
  getBlockchainByChainId,
} from '@/lib/oracles/constants/chainMapping';
import { OracleProvider } from '@/types/oracle';

import { getConsensusPrice } from './consensusPriceService';

/**
 * This set is deliberately global price evidence, not evidence that any one
 * provider observes the subject chain. Flare replaces the abandoned RedStone
 * gateway candidate; TWAP remains derived and therefore cannot satisfy the
 * independence gate by itself.
 */
export const CROSS_CHAIN_PRICE_EVIDENCE_PROVIDERS = [
  OracleProvider.DIA,
  OracleProvider.TWAP,
  OracleProvider.FLARE,
] as const;

export const DEFAULT_CROSS_CHAIN_MAX_SOURCE_AGE_SECONDS = 300;

export interface CrossChainPriceEvidenceCandidateInput {
  asset: string;
  subjectChainId: number;
  maxSourceAgeSeconds?: number;
}

/**
 * Evaluate an unsigned, non-authorizing cross-chain price-evidence candidate.
 *
 * The subject chain is metadata only. Provider reads use each provider's own
 * verification surface, so this function must never be used to claim same-chain
 * coverage or to produce a signed pre-trade verdict.
 */
export async function getCrossChainPriceEvidenceCandidate(
  input: CrossChainPriceEvidenceCandidateInput
) {
  const subjectChain = getBlockchainByChainId(input.subjectChainId);
  if (!subjectChain || input.subjectChainId <= 0) {
    throw new ValidationError(
      'A supported, explicit subject chainId is required for cross-chain price evidence.'
    );
  }

  const maxSourceAgeSeconds =
    input.maxSourceAgeSeconds ?? DEFAULT_CROSS_CHAIN_MAX_SOURCE_AGE_SECONDS;
  if (!Number.isInteger(maxSourceAgeSeconds) || maxSourceAgeSeconds <= 0) {
    throw new ValidationError('maxSourceAgeSeconds must be a positive integer.');
  }

  const consensus = await getConsensusPrice(
    input.asset,
    undefined,
    undefined,
    CROSS_CHAIN_PRICE_EVIDENCE_PROVIDERS,
    { allowUnavailable: true }
  );

  const providers = CROSS_CHAIN_PRICE_EVIDENCE_PROVIDERS.map((provider) => {
    const observation = consensus.providers.find((entry) => entry.provider === provider);
    const responding = Boolean(
      observation && observation.status === 'success' && observation.price > 0
    );
    const included = Boolean(responding && !observation?.isOutlier);
    const age = observation?.dataAgeSeconds ?? null;
    const fresh = included && age !== null && age <= maxSourceAgeSeconds;
    const sourceGroup = resolveSourceGroup(provider);
    const verificationChainId =
      observation?.verification?.chainId ??
      (observation?.chain ? (BLOCKCHAIN_TO_CHAIN_ID[observation.chain] ?? null) : null);

    return {
      provider,
      sourceGroup,
      derived: DERIVED_SOURCE_GROUPS.has(sourceGroup),
      responding,
      included,
      fresh,
      price: responding ? observation!.price : null,
      dataAgeSeconds: age,
      sourceTimestamp: responding ? (observation?.timestamp ?? null) : null,
      retrievedAt: observation?.retrievedAt ?? null,
      timestampProvenance: observation?.timestampProvenance ?? 'unknown',
      verificationChain: observation?.chain ?? null,
      verificationChainId,
      verification: observation?.verification ?? null,
      status: observation?.status ?? 'not_configured',
      reason: !observation
        ? 'PROVIDER_NOT_CONFIGURED'
        : !responding
          ? observation.status === 'unsupported'
            ? 'UNSUPPORTED'
            : 'FETCH_FAILED'
          : observation.isOutlier
            ? 'CONSENSUS_EXCLUDED'
            : age === null
              ? 'SOURCE_AGE_UNKNOWN'
              : fresh
                ? null
                : 'SOURCE_TOO_OLD',
    };
  });

  const included = providers.filter((provider) => provider.included);
  const fresh = providers.filter((provider) => provider.fresh);
  const groups = nonDerivedGroupCount(included.map((provider) => provider.provider));
  const freshGroups = nonDerivedGroupCount(fresh.map((provider) => provider.provider));
  const sufficient =
    included.length >= V2_REQUIRED_PARTICIPANT_COUNT && groups >= V2_REQUIRED_NON_DERIVED_GROUPS;
  const freshSufficient =
    fresh.length >= V2_REQUIRED_PARTICIPANT_COUNT && freshGroups >= V2_REQUIRED_NON_DERIVED_GROUPS;

  return {
    mode: 'cross_chain_price_evidence_candidate',
    signed: false,
    activationStatus: 'NOT_PROMOTED',
    partnerPathsAffected: false,
    mayAuthorizeExecution: false,
    asset: input.asset.toUpperCase(),
    subjectChain,
    subjectChainId: input.subjectChainId,
    evidenceScope: 'global_usd_price',
    sameChainCoverageClaimed: false,
    settlementChainEvaluated: false,
    sampledAt: new Date().toISOString(),
    maxSourceAgeSeconds,
    requiredParticipantCount: V2_REQUIRED_PARTICIPANT_COUNT,
    requiredNonDerivedGroupCount: V2_REQUIRED_NON_DERIVED_GROUPS,
    candidateStatus: sufficient ? 'CANDIDATE_SUFFICIENT' : 'CANDIDATE_INSUFFICIENT_EVIDENCE',
    candidateFreshnessStatus: freshSufficient
      ? 'CANDIDATE_SUFFICIENT'
      : 'CANDIDATE_INSUFFICIENT_FRESH_EVIDENCE',
    respondingCount: providers.filter((provider) => provider.responding).length,
    includedCount: included.length,
    nonDerivedGroupCount: groups,
    freshCount: fresh.length,
    freshNonDerivedGroupCount: freshGroups,
    freshnessShortfall: {
      participants: Math.max(0, V2_REQUIRED_PARTICIPANT_COUNT - fresh.length),
      nonDerivedGroups: Math.max(0, V2_REQUIRED_NON_DERIVED_GROUPS - freshGroups),
    },
    providers,
    limitations: [
      'This is cross-chain global USD price evidence, not same-chain oracle coverage.',
      'This unsigned candidate cannot authorize execution or change a signed pre-trade verdict.',
      'Partner activation requires an immutable policy, activation set, compatibility review, and promotion record.',
    ],
    nextAction: freshSufficient
      ? 'Complete partner promotion and compatibility review before any production activation.'
      : 'Restore fresh independent sources; do not lower the freshness or quorum requirements.',
  };
}
