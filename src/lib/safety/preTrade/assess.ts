/**
 * @fileoverview Pre-trade oracle safety check service.
 *
 * The oracle risk assessment engine. Before an AI agent (or human) executes an
 * on-chain swap/borrow/lend, this service aggregates cross-oracle consensus
 * prices, data freshness, stablecoin peg status, and reputation signals, then
 * applies a rule engine to produce a single verdict: PASS / CAUTION / DANGER /
 * BLOCK.
 *
 * Phase 1: pure rule-based (no ML). Thresholds are constants below so the hot
 * path has zero DB reads. The audit row is committed before the verdict is
 * returned, so every issued judgment can be accounted for later.
 *
 * This orchestrates existing services rather than re-fetching data:
 *   - consensusPriceService.getConsensusPrice  (cross-provider prices + agreement)
 *   - stablecoins/monitor                      (depeg warnings)
 *   - reputation                               (already embedded in consensus response)
 */

import type { ConsensusMethod } from '@/lib/analytics/consensusPrice';
import { computeAnomalyScore, type AnomalyScoreResult } from '@/lib/anomaly/oracleAnomalyDetection';
import {
  getConsensusPrice,
  type ConsensusPriceResponse,
} from '@/lib/api/services/consensusPriceService';
import {
  EMPTY_HISTORY,
  fetchHistoricalOracleState,
  type HistoricalOracleState,
} from '@/lib/api/services/oracleWatchHistory';
import { resolveCaip19 } from '@/lib/attestations/caip19';
import {
  signAttestation,
  type OracleSafetyAttestation,
} from '@/lib/attestations/oracleSafetyAttestation';
import {
  signAttestationV2,
  type AttestationInputV2,
  type OracleSafetyAttestationV2,
  V2_REQUIRED_PARTICIPANT_COUNT,
  V2_REQUIRED_NON_DERIVED_GROUPS,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import {
  signAttestationV3,
  type OracleSafetyAttestationV3,
} from '@/lib/attestations/oracleSafetyAttestationV3';
import {
  signAttestationV4,
  type OracleSafetyAttestationV4,
} from '@/lib/attestations/oracleSafetyAttestationV4';
import { selectPreTradeValidity } from '@/lib/attestations/preTradeValidityPolicy';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';
import { nonDerivedGroupCount } from '@/lib/attestations/sourceGroups';
import { assertVeritasJointRun1800Admission } from '@/lib/attestations/veritasJointRunValidity';
import {
  assessDecisionInput,
  type DecisionInputAssessment,
} from '@/lib/decisionInputTrust/assessment';
import { signDecisionInputAssessment } from '@/lib/decisionInputTrust/attestation';
import {
  getReviewedAerodromeSlipstreamPreTradeEvidence,
  type ReviewedAerodromeSlipstreamPreTradeEvidence,
} from '@/lib/dex/preTradeAerodromeSlipstream';
import {
  getReviewedUniswapV3PreTradeEvidence,
  type ReviewedUniswapV3PreTradeEvidence,
} from '@/lib/dex/preTradeUniswapV3';
import { UnsupportedSymbolError, ValidationError } from '@/lib/errors';
import {
  getManipCostAdvisory,
  isManipCostCoveredSymbol,
  type ManipCostAdvisory,
} from '@/lib/manipCost/baseline';
import {
  fetchChainlinkMarketReference,
  type ChainlinkMarketReference,
} from '@/lib/marketReference/chainlink';
import {
  computeMarketReferenceContext,
  getMarketReference,
  type MarketReferenceContext,
  type MarketReference,
} from '@/lib/marketReference/client';
import {
  fetchRedStoneMarketReference,
  type RedStoneMarketReference,
} from '@/lib/marketReference/redstone';
import {
  classifyMlRisk,
  featuresFromPreTrade,
  getModelStatus,
  ML_FEATURE_SCHEMA_VERSION,
  ML_LABEL_SPEC_VERSION,
  scorePreTradeMultiHorizon,
  type FeatureMap,
  type MlRiskLevel,
  type MultiHorizonScore,
  type PreTradeFeatures,
} from '@/lib/ml/inference';
import { readIssuanceHalt } from '@/lib/ops/issuanceControl';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getFeedStalenessBaselineMap, isCadenceStale } from '@/lib/oracles/feedCadence';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import { getStablecoinConfig } from '@/lib/stablecoins/config';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import {
  normalizeTokenSecurityView,
  rawBodySha256,
  signContextAttestation,
  tokenSecurityViewSha256,
  type ContextAttestation,
  type TokenSecurityView,
} from '@/lib/tokenSecurity/contextAttestation';
import {
  fetchGoPlusTokenSecurity,
  parseTokenSecurityViewFields,
  type GoPlusLaneOutcome,
  type GoPlusRawResult,
} from '@/lib/tokenSecurity/goplus';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';
import { throwIfAborted } from '@/lib/utils/requestDeadline';
import { Blockchain, type OracleProvider } from '@/types/oracle';

import { buildAssessmentScope, buildSizingBasis } from './diagnostics';
import { evaluateDepegRule } from './marketAlertPolicy';
import { computeMaxDeviation, computeSpread, computeStaleRisk } from './marketMetricsPolicy';
import { evaluateProtocolBufferRule } from './protocolBufferPolicy';
import { evaluateStalenessRules } from './stalenessPolicy';
import {
  clamp01,
  evaluateHighIsBad,
  evaluateLowIsBad,
  normalize,
  pickWorst,
  PRE_TRADE_THRESHOLDS as THRESHOLDS,
} from './verdictPolicy';

import type {
  AuditMeta,
  ContributingFactor,
  DepegWarning,
  LendingSafetyAction,
  PreTradeSafetyInput,
  ProtocolSafetyContext,
  ProviderPriceDetail,
  SafetyVerdict,
} from './contracts';

const logger = createLogger('pre-trade-safety');

/**
 * Evidence-only chain aliases.
 *
 * Base Sepolia assertions retain their real subjectChainId (84532) and
 * CAIP-19 token addresses, while price evidence is sourced from the reviewed
 * Base provider set. This is deliberately local to pre-trade evidence: it does
 * not redefine BASE's canonical production chain (8453) for other services.
 */
const EVIDENCE_CHAIN_ALIASES: Readonly<Record<number, Blockchain>> = {
  84532: Blockchain.BASE,
};

function resolveEvidenceBlockchain(chainId: number): Blockchain | undefined {
  return EVIDENCE_CHAIN_ALIASES[chainId] ?? getBlockchainByChainId(chainId);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Contract types (re-exported from the pre-trade module's public contract).
// ---------------------------------------------------------------------------

export type {
  AuditMeta,
  ContributingFactor,
  DepegWarning,
  LendingSafetyAction,
  PreTradeSafetyInput,
  ProtocolSafetyContext,
  ProviderPriceDetail,
  SafetyVerdict,
  TradeAction,
} from './contracts';

export interface PreTradeSafetyResult {
  /** Unsigned explanatory scope; does not expand the signed attestation. */
  assessmentScope?: ReturnType<typeof buildAssessmentScope>;
  sizingBasis?: ReturnType<typeof buildSizingBasis>;
  verdict: SafetyVerdict;
  consensusPrice: number;
  maxDeviationPct: number;
  /**
   * Effective manipulation risk score [0,1]. ML-driven (equals the model's
   * predicted probability of an abnormal oracle event in the next 6h) when a
   * verified model is active; falls back to the rule-based weighted formula
   * otherwise. Feeds the displayed risk level only —
   * the verdict itself is still produced by the rule engine.
   */
  manipulationRiskScore: number;
  staleDataRisk: boolean;
  crossProviderAgreement: number; // 0..1
  recommendedMaxPositionUsd: number;
  participantCount: number;
  providerPrices: Record<string, ProviderPriceDetail>;
  depegWarnings: DepegWarning[];
  warnings: string[];
  contributingFactors: ContributingFactor[];
  protocolSafety: ProtocolSafetyContext | null;
  /**
   * Concrete, user-executable actions for the lending (borrow) path. Empty for
   * non-lending actions or when cross-oracle dispersion is within safe bounds.
   * Drives the "decisive & actionable" lending-safety layer.
   */
  recommendedActions: LendingSafetyAction[];
  /**
   * Raw ML output: predicted probability [0,1] of an abnormal oracle event in
   * the next 6h. When non-null, `manipulationRiskScore` equals this value (the
   * model drives the displayed risk score, not sizing). null when no verified
   * model is active — then manipulationRiskScore falls back to the rule-based
   * formula. The verdict is still produced by the rule engine either way.
   */
  mlScore: number | null;
  /** trainedAt of the model that produced mlScore; null when no model active. */
  mlModelVersion: string | null;
  /** ML score for the near-term 1h horizon (null when the 1h model is inactive). */
  mlScore1h: number | null;
  /** ML score for the strategic 6h horizon (null when no model active). */
  mlScore6h: number | null;
  /** Model-versioned severity; clients must not hardcode probability cutoffs. */
  mlRiskLevel: MlRiskLevel | null;
  mlMediumThreshold: number | null;
  mlHighThreshold: number | null;
  /** Exact named, present-time-only inputs stored for the training flywheel. */
  mlFeatureVector: FeatureMap;
  /**
   * Unsupervised anomaly score ∈ [0,1] — model-free statistical outlier
   * detection (z-score + EWMA residual vs the 24h baseline). Catches novel
   * manipulation the supervised ML model has never seen. Informational + feeds
   * the displayed risk level; does not itself drive the verdict.
   */
  anomalyScore: number;
  /**
   * Advisory manipulation-cost context (foundation block ②). EVIDENCE ONLY,
   * per the collector's own discipline: how much USD (lower bound for v3
   * pools) it would take to move the Ethereum-mainnet DEX reference price of
   * this asset by 0.5–10%. NEVER a verdict gate and NEVER part of the signed
   * attestation. Omitted when the asset has no covered pool mapping, the chain
   * is not Ethereum, or fresh snapshots are unavailable — absence means "no
   * evidence", not "low risk".
   */
  manipulationCost?: ManipCostAdvisory;
  /** Optional, caller-requested assessment of price + quote evidence. */
  decisionInputAssessment?: DecisionInputAssessment;
  /**
   * Signed third-party input evidence (decision-input expansion, lane 1):
   * signs the source-response digest and the digest of the normalized view
   * returned alongside it. This is an Insight capture statement, not proof
   * that the source was correct or an agent consumed the view. The independent
   * EIP-712 domain deliberately leaves the oracle attestation unchanged.
   * Emitted ONLY when raw evidence was captured AND signing succeeded
   * (fail-closed: no unsigned evidence lookalikes). Absence means "no
   * evidence", not "safe".
   */
  contextAttestation?: ContextAttestation;
  /**
   * Advisory parsed view of the third-party token scan linked by `rawHash` and
   * `normalizedResultSha256` to the signed capture above. Flag passthrough only — Insight makes no
   * honeypot/tax judgment and never adjusts the verdict for these values.
   * Omitted together with contextAttestation (an unsigned view would read as
   * an Insight endorsement of the third party's conclusion).
   */
  tokenSecurity?: TokenSecurityView;
  /**
   * Opt-in diagnostic (query `debugTokenSec=1`): terminal outcome of the
   * token-security advisory lane. Explicitly requested, so this is an honest
   * probe result rather than a synthesized safety signal.
   */
  tokenSecurityDebug?: {
    requested: boolean;
    outcome: GoPlusLaneOutcome;
    latencyMs?: number;
    keyed: boolean;
  };
  /**
   * EIP-712 offchain attestation proving "Insight verified oracle state for this
   * trade at time T". Portable, tamper-evident proof agents can relay in tx
   * memo / logs so users & protocols recognize the agent ran the oracle immune-
   * system check. null when no attester key is configured (feature disabled) or
   * signing fails — never affects the verdict itself.
   */
  attestation:
    | OracleSafetyAttestation
    | OracleSafetyAttestationV2
    | OracleSafetyAttestationV3
    | OracleSafetyAttestationV4
    | null;
  evaluatedAt: string;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Phase 1 rule thresholds (high-is-bad unless noted)
// ---------------------------------------------------------------------------

/**
 * A provider whose data is >= the 7d hard-backstop is only escalated to BLOCK
 * when its price ALSO diverges from the fresh consensus by more than this %,
 * proving the data is genuinely dead (not just a stale timestamp). Within this
 * band (stale timestamp but current price) it is a timestamp-source anomaly and
 * is surfaced as a soft CAUTION instead of a hard block.
 *
 * Why this exists: some oracles (notably API3 communal dAPIs) report a
 * `timestamp` 7-120 days old while serving a CURRENT price — the price tracks
 * the live market within <1% of other fresh providers. Trusting that timestamp
 * as the data age would falsely hard-block BTC/ETH/USDC/SOL on every chain API3
 * covers. A genuine dead feed is typically several % off consensus, so 2.0%
 * cleanly separates the two cases.
 */
// ---------------------------------------------------------------------------
// Audit logging (required before issuance)
// ---------------------------------------------------------------------------

async function logAudit(
  input: PreTradeSafetyInput,
  result: PreTradeSafetyResult,
  meta: AuditMeta
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const client = createServiceRoleClient();

    // Signature provenance — the trust-critical signal Raul's canary depends on
    // (verdict=BLOCK AND signed AND uid AND http 200). Previously unrecorded, so
    // a signing regression was only observable downstream via his probe. Derive
    // it from the issued attestation so the signing-integrity dashboard can read
    // it straight off the audit log.
    const attestation = result.attestation;
    const signed = attestation !== null;
    const attestationUid = attestation?.uid ?? null;
    const attester = attestation?.attester ?? null;
    const schemaVersion = attestation?.schemaVersion ?? input.schemaVersion ?? 1;
    let coverageStatus: string | null = null;
    let unresolvedAsset: string | null = null;
    // v2 carries coverageStatus + CAIP-19 sourceAssetId on its signed data; v1
    // does not. Narrow via the field's presence (v1's schemaVersion is `number`,
    // so a literal `=== 2` check alone cannot discriminate the union).
    if (attestation && 'coverageStatus' in attestation.data) {
      coverageStatus = attestation.data.coverageStatus ?? null;
      const srcId = attestation.data.sourceAssetId;
      if (typeof srcId === 'string' && srcId.startsWith('unresolved:')) {
        unresolvedAsset = srcId;
      }
    }

    const { error } = await client.from('pre_trade_checks').insert({
      request_id: meta.requestId ?? null,
      journey_id: meta.journeyId ?? null,
      workflow_tag: meta.workflowTag ?? null,
      baseline_verdict: meta.baselineVerdict ?? null,
      baseline_version: meta.baselineVersion ?? null,
      assessment_scope: result.assessmentScope ?? null,
      sizing_basis: result.sizingBasis ?? null,
      asset: input.asset,
      chain_id: input.chainId,
      action: input.action,
      trade_amount_usd: input.tradeAmountUsd,
      target_providers: input.targetProviders ?? null,
      api_key_id: meta.apiKeyId ?? null,
      protocol_id: input.protocolId ?? null,
      protocol_safety: result.protocolSafety,
      decision_input_assessment: result.decisionInputAssessment ?? null,
      verdict: result.verdict,
      consensus_price: result.consensusPrice,
      max_deviation_pct: result.maxDeviationPct,
      manipulation_risk_score: result.manipulationRiskScore,
      stale_data_risk: result.staleDataRisk,
      cross_provider_agreement: result.crossProviderAgreement,
      recommended_max_position_usd: result.recommendedMaxPositionUsd,
      participant_count: result.participantCount,
      provider_prices: result.providerPrices,
      depeg_warnings: result.depegWarnings,
      warnings: result.warnings,
      contributing_factors: result.contributingFactors,
      ml_score: result.mlScore,
      ml_score_1h: result.mlScore1h,
      ml_score_6h: result.mlScore6h,
      ml_risk_level: result.mlRiskLevel,
      ml_medium_threshold: result.mlMediumThreshold,
      ml_high_threshold: result.mlHighThreshold,
      ml_feature_vector: result.mlFeatureVector,
      feature_schema_version: ML_FEATURE_SCHEMA_VERSION,
      label_spec_version: ML_LABEL_SPEC_VERSION,
      ml_model_version: result.mlModelVersion,
      latency_ms: result.latencyMs,
      signed,
      attestation_uid: attestationUid,
      attester,
      schema_version: schemaVersion,
      coverage_status: coverageStatus,
      unresolved_asset: unresolvedAsset,
    });
    if (error) throw error;
  } catch (error) {
    logger.warn('Failed to write pre_trade_checks audit row', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Pre-trade audit persistence failed', { cause: error });
  }
}

/* Historical cross-oracle feature mining is extracted to ./oracleWatchHistory
 * and shared with the Oracle Watch signal. See that module for docs. */

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function buildProviderPrices(
  consensus: ConsensusPriceResponse,
  stalenessBaselines: Map<string, number | null>
): Record<string, ProviderPriceDetail> {
  const out: Record<string, ProviderPriceDetail> = {};
  for (const p of consensus.providers) {
    const age = p.dataAgeSeconds;
    // Cadence-relative: "stale" means behind THIS feed's own observed rhythm,
    // not behind an absolute wall-clock threshold. Slow sources are never
    // flagged. When no baseline exists (not backfilled yet) we don't flag.
    const isStale = age !== null && isCadenceStale(age, stalenessBaselines.get(p.provider) ?? null);
    out[p.provider] = {
      price: p.price,
      deviationPct: p.deviationPct,
      isOutlier: p.isOutlier,
      dataAgeSeconds: age,
      mlIsStale: p.isStale,
      isStale,
      confidence: p.confidence,
      reputationScore: p.reputationScore,
      status: p.status,
      // Older persisted/fixture responses predate the explicit field. They
      // remain strict participants unless a source explicitly opts into the
      // shadow-only state.
      countsTowardOracleQuorum: p.countsTowardOracleQuorum !== false,
      timestamp: p.status === 'success' ? p.timestamp : null,
      source: p.source,
      retrievedAt: p.retrievedAt,
      timestampProvenance: p.timestampProvenance,
      errorMessage:
        p.status === 'error'
          ? 'Provider fetch failed; retry or inspect the provider health with the request ID.'
          : p.status === 'unsupported'
            ? 'Asset is unsupported by this provider.'
            : undefined,
      freshnessKnown: age !== null,
      timestampAnomaly: false, // Assigned from the final hard-staleness classification below.
    };
  }
  return out;
}

async function fetchDepegWarnings(
  asset: string,
  destinationAsset: string | undefined,
  signal?: AbortSignal
): Promise<{ warnings: DepegWarning[]; available: boolean }> {
  try {
    // A pre-trade check only needs peg evidence for the assets it evaluates.
    // Collecting every supported stablecoin on a cold instance fans a single
    // check into dozens of Oracle/RPC calls and is not evidence about this
    // trade's source or destination asset.
    const evaluatedStablecoins = [asset, destinationAsset]
      .filter((symbol): symbol is string => typeof symbol === 'string')
      .map((symbol) => symbol.toUpperCase())
      .filter((symbol, index, values) => values.indexOf(symbol) === index)
      .filter((symbol) => Boolean(getStablecoinConfig(symbol)));
    if (evaluatedStablecoins.length === 0) return { warnings: [], available: true };

    const snapshots = await calculateAllStablecoinSnapshots({
      symbols: evaluatedStablecoins,
      signal,
    });
    throwIfAborted(signal);
    // The monitor deliberately resolves partial results after per-coin failures.
    const validSnapshots = snapshots.filter((s) => Number.isFinite(s.maxDeviationPercent));
    return {
      available: evaluatedStablecoins.every((symbol) =>
        validSnapshots.some((snapshot) => snapshot.symbol === symbol)
      ),
      warnings: validSnapshots
        .filter((snapshot) => evaluatedStablecoins.includes(snapshot.symbol))
        .filter((s) => Math.abs(s.maxDeviationPercent) >= THRESHOLDS.stablecoinDepegPct.caution)
        .map((s) => ({
          stablecoin: s.symbol,
          deviationPct: s.maxDeviationPercent,
          riskLevel: s.riskLevel,
        })),
    };
  } catch {
    // Non-blocking: depeg data unavailable should not fail the safety check.
    return { warnings: [], available: false };
  }
}

function fetchConsensusForPreTrade(
  input: PreTradeSafetyInput,
  chain: Blockchain | undefined,
  signal?: AbortSignal
) {
  const targetProviders = input.targetProviders as OracleProvider[] | undefined;
  return signal
    ? getConsensusPrice(input.asset, chain, undefined, targetProviders, { signal })
    : getConsensusPrice(input.asset, chain, undefined, targetProviders);
}

/**
 * Rule-based manipulation risk score — the FALLBACK used only when no verified
 * ML model is active. When the model is available, `manipulationRiskScore`
 * equals the ML probability instead (see step 6 in preTradeSafetyCheck). Kept as
 * a graceful-degradation path so a missing/unverified model never breaks the
 * check.
 */
function computeManipulationRiskScore(args: {
  maxDeviationPct: number;
  crossProviderAgreement: number;
  spreadPct: number;
  staleRisk: boolean;
  minReputation: number;
}): number {
  const { maxDeviationPct, crossProviderAgreement, spreadPct, staleRisk, minReputation } = args;
  const score =
    0.3 * normalize(maxDeviationPct, THRESHOLDS.maxProviderDeviationPct.block) +
    0.25 * (1 - clamp01(crossProviderAgreement)) +
    0.2 * normalize(spreadPct, THRESHOLDS.crossProviderSpreadPct.block) +
    0.15 * (staleRisk ? 0.8 : 0.1) +
    0.1 * (1 - clamp01(minReputation / 100));
  return roundTo(clamp01(score), 4);
}

function computeRecommendedMaxPosition(
  maxDeviationPct: number,
  protocolSafety: ProtocolSafetyContext | null
): number {
  const base = 1_000_000; // USD baseline
  const deviationFactor = 1 / (1 + Math.abs(maxDeviationPct) / 2);
  // Decisive, deterministic coupling: when cross-oracle dispersion already
  // consumes a share of the protocol's max-LTV liquidation buffer, shrink the
  // recommended borrow size in step with it. A 2% deviation on a thick buffer
  // is harmless; the same 2% on a nearly-consumed buffer is a real, imminent
  // liquidation risk. Sizing is driven ONLY by observable oracle dispersion —
  // the ML manipulation score is NOT used here (it is unvalidated for
  // manipulation-specific accuracy and would otherwise soft-false-positive on
  // normal high-volatility days).
  const bufferFactor = protocolSafety
    ? Math.max(0.1, 1 - protocolSafety.bufferConsumedPct / 100)
    : 1;
  const recommended = Math.round((base * deviationFactor * bufferFactor) / 1000) * 1000;
  return Math.max(10_000, recommended);
}

/**
 * Derive a conservative venue-liquidity cap from one exact reviewed-pool quote
 * and the pool's live balances. The quote's own price impact implies the pool's
 * effective depth (impact ≈ size / depth for concentrated liquidity), and the
 * input-token pool balance bounds what the pool can absorb at all; the cap is
 * 1% of the smaller of the two, so executing the recommended maximum keeps the
 * modeled price impact near ~1% and never assumes out-of-range depth. Null
 * means the evidence cannot support a venue cap and the oracle-only cap stands.
 */
function computeVenueLiquidityCapUsd(
  evidence: ReviewedUniswapV3PreTradeEvidence | ReviewedAerodromeSlipstreamPreTradeEvidence,
  sourceConsensusPriceUsd: number
): number | null {
  const forward = evidence.quote.direction !== 'token1-to-token0';
  const poolInputHuman = forward ? evidence.poolBalances.token0 : evidence.poolBalances.token1;
  if (
    !Number.isFinite(poolInputHuman) ||
    poolInputHuman <= 0 ||
    !Number.isFinite(sourceConsensusPriceUsd) ||
    sourceConsensusPriceUsd <= 0 ||
    !Number.isFinite(evidence.quote.amountIn) ||
    evidence.quote.amountIn <= 0 ||
    !Number.isFinite(evidence.quote.priceImpactBps) ||
    evidence.quote.priceImpactBps < 0
  ) {
    return null;
  }
  const amountInUsd = evidence.quote.amountIn * sourceConsensusPriceUsd;
  // Floor the impact at 1bp: stable pairs can quote 0 impact, which would
  // otherwise imply infinite depth.
  const impliedDepthUsd = (amountInUsd * 10_000) / Math.max(evidence.quote.priceImpactBps, 1);
  const depthUsd = Math.min(poolInputHuman * sourceConsensusPriceUsd, impliedDepthUsd);
  const cap = depthUsd * 0.01;
  return Number.isFinite(cap) && cap > 0 ? Math.round(cap) : null;
}

/**
 * Step 7 of the pre-trade check: resolve the reviewed DEX evidence lane (the
 * lane promises were started before consensus so the calibration lands inside
 * the signed attestation; the same promises are consumed again by the
 * decision-input assessment below), then combine the oracle-dispersion advisory
 * cap with the lane's real venue depth. Returns the effective recommended
 * maximum position, the lane evidence for downstream reuse, and the human
 * basis string used by the amount sanity warnings.
 */
async function resolveRecommendedPositionCap(
  maxDeviationPct: number,
  protocolSafety: ProtocolSafetyContext | null,
  consensusPriceUsd: number,
  uniswapV3Lane: Promise<ReviewedUniswapV3PreTradeEvidence | null> | undefined,
  aerodromeLane: Promise<ReviewedAerodromeSlipstreamPreTradeEvidence | null> | undefined,
  warnings: string[]
): Promise<{
  reviewedLaneEvidence:
    | ReviewedUniswapV3PreTradeEvidence
    | ReviewedAerodromeSlipstreamPreTradeEvidence
    | null;
  recommendedMaxPositionUsd: number;
  liquidityBasis: string;
}> {
  const oracleRecommendedMaxPositionUsd = computeRecommendedMaxPosition(
    maxDeviationPct,
    protocolSafety
  );
  const reviewedLaneEvidence =
    (
      await Promise.all([
        uniswapV3Lane ?? Promise.resolve(null),
        aerodromeLane ?? Promise.resolve(null),
      ])
    ).find((evidence): evidence is NonNullable<typeof evidence> => evidence !== null) ?? null;
  const venueLiquidityCapUsd = reviewedLaneEvidence
    ? computeVenueLiquidityCapUsd(reviewedLaneEvidence, consensusPriceUsd)
    : null;
  let recommendedMaxPositionUsd = oracleRecommendedMaxPositionUsd;
  if (
    reviewedLaneEvidence &&
    venueLiquidityCapUsd !== null &&
    venueLiquidityCapUsd < oracleRecommendedMaxPositionUsd
  ) {
    recommendedMaxPositionUsd = Math.max(1, venueLiquidityCapUsd);
    warnings.push(
      `Reviewed venue liquidity cap applied: recommended max position limited to $${recommendedMaxPositionUsd.toLocaleString()} by reviewed pool depth at block ${reviewedLaneEvidence.block.number}.`
    );
  }
  const liquidityBasis = reviewedLaneEvidence
    ? `oracle-condition and reviewed-venue-liquidity cap $${recommendedMaxPositionUsd.toLocaleString()}`
    : `oracle-condition advisory cap (not venue liquidity) $${recommendedMaxPositionUsd.toLocaleString()}`;
  return { reviewedLaneEvidence, recommendedMaxPositionUsd, liquidityBasis };
}

/**
 * Compute the manipulation / anomaly risk score block (ML when a verified
 * model is active, rule-based fallback otherwise) in isolation, so the large
 * preTradeSafetyCheck function stays within its line budget. The returned
 * score feeds the displayed risk level and audit log ONLY — it is intentionally
 * NOT used to escalate the verdict or size the recommended position, since the
 * model is unvalidated for manipulation-specific accuracy.
 */
interface ManipulationRiskResult {
  mlScore: number | null;
  mlModelVersion: string | null;
  mlScore1h: number | null;
  mlScore6h: number | null;
  mlRiskLevel: MlRiskLevel | null;
  mlMediumThreshold: number | null;
  mlHighThreshold: number | null;
  mlFeatureVector: FeatureMap;
  anomalyScore: number;
  manipulationRiskScore: number;
}

function computeManipulationRisk(args: {
  providerPrices: Record<string, ProviderPriceDetail>;
  historicalState: HistoricalOracleState;
  maxDeviationPct: number;
  spreadPct: number;
  consensus: { participantCount: number };
  staleRisk: boolean;
  agreement: number;
  minReputation: number;
  /** Raw asset symbol — routes the score through per-asset-class calibration. */
  asset: string;
  /** Oracle-vs-market divergence (%) from the external truth layer; null when
   *  unavailable (the feature neutral-fills 0). */
  marketContext: MarketReferenceContext | null;
}): ManipulationRiskResult {
  let mlScore: number | null = null;
  let mlModelVersion: string | null = null;
  let mlScore1h: number | null = null;
  let mlScore6h: number | null = null;
  let mlRiskLevel: MlRiskLevel | null = null;
  let mlMediumThreshold: number | null = null;
  let mlHighThreshold: number | null = null;
  let anomalyScore = 0;
  try {
    const successfulProviders = Object.values(args.providerPrices).filter(
      (d) => d.status === 'success' && d.countsTowardOracleQuorum
    );
    const absDevs = successfulProviders
      .map((d) => d.deviationPct)
      .filter((v): v is number => v !== null)
      .map((v) => Math.abs(v));
    const meanDeviationPct =
      absDevs.length > 0 ? absDevs.reduce((s, v) => s + v, 0) / absDevs.length : 0;
    const mlStale = (detail: ProviderPriceDetail) => detail.mlIsStale ?? detail.isStale;
    const staleRatio =
      successfulProviders.length > 0
        ? successfulProviders.filter(mlStale).length / successfulProviders.length
        : 0;
    // v3 governance features (the 30-min Oracle Watch model was trained on
    // them). Live pre-trade supplies the same real-time semantics Oracle Watch
    // does — agreement from the consensus engine, reputation 0-100 -> 0-1,
    // outlier/stale counts from the successful provider set. Passing the
    // neutral defaults instead would be a train/serve skew: the model learned
    // real values for these, so scoring them at the neutral prior degrades it.
    const outlierCount = successfulProviders.filter((d) => d.isOutlier).length;
    const staleCount = successfulProviders.filter(mlStale).length;
    const reputations = successfulProviders
      .map((d) => d.reputationScore)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const avgReputation =
      reputations.length > 0
        ? reputations.reduce((s, v) => s + v, 0) / reputations.length / 100
        : undefined;
    const hist = args.historicalState;
    const anomaly: AnomalyScoreResult = computeAnomalyScore(
      hist.history.map((p) => ({
        maxDeviationPct: p.maxDeviationPct,
        consensusPrice: p.consensusPrice,
        participantCount: p.participantCount,
      })),
      args.maxDeviationPct
    );
    anomalyScore = anomaly.anomalyScore;
    const mlFeatures: PreTradeFeatures = {
      maxDeviationPct: args.maxDeviationPct,
      spreadPct: args.spreadPct,
      participantCount: args.consensus.participantCount,
      staleDataRisk: staleCount > 0,
      meanDeviationPct: roundTo(meanDeviationPct, 4),
      staleRatio: roundTo(staleRatio, 4),
      deviationVelocity1h: hist.deviationVelocity1h,
      rollingVolatility6h: hist.rollingVolatility6h,
      deviationVelocity3h: hist.deviationVelocity3h,
      participantCountDelta1h: hist.participantCountDelta1h,
      maxDeviationZscore24h: hist.maxDeviationZscore24h,
      // --- v3 governance features: REAL values (neutral defaults only for
      // reputation when no successful provider reported one) ---
      agreement: args.agreement,
      outlierCount,
      staleCount,
      avgReputation,
      minReputation: args.minReputation / 100,
      // --- v4 external-truth feature: oracle-vs-market divergence. Null
      // (neutral 0 at featuresFromPreTrade) when the reference layer is
      // absent — fail-closed, never a fabricated divergence. ---
      oracleVsMarketDeviationPct: args.marketContext?.divergencePct,
      marketReferenceAvailable: args.marketContext ? 1 : 0,
      marketExchangeCount: args.marketContext?.exchangeCount,
      marketCrossExchangeSpreadPct: args.marketContext?.crossExchangeSpreadPct,
      marketBidAskSpreadPct: args.marketContext?.medianBidAskSpreadPct,
      marketLogVolume: args.marketContext?.logVolume,
    };
    const multi: MultiHorizonScore | null = scorePreTradeMultiHorizon(mlFeatures, {
      assetClass: args.asset,
    });
    if (multi !== null) {
      mlScore = multi.combined;
      mlScore1h = multi.score1h;
      mlScore6h = multi.score6h;
      mlMediumThreshold = multi.mediumThreshold ?? null;
      mlHighThreshold = multi.highThreshold ?? null;
      if (mlMediumThreshold !== null && mlHighThreshold !== null) {
        mlRiskLevel =
          multi.riskLevel ?? classifyMlRisk(multi.combined, mlMediumThreshold, mlHighThreshold);
      }
      mlModelVersion = getModelStatus().trainedAt;
    }
    const mlFeatureVector = featuresFromPreTrade(mlFeatures);
    const manipulationRiskScore =
      mlScore !== null
        ? mlScore
        : computeManipulationRiskScore({
            maxDeviationPct: args.maxDeviationPct,
            crossProviderAgreement: args.agreement,
            spreadPct: args.spreadPct,
            staleRisk: args.staleRisk,
            minReputation: args.minReputation,
          });
    return {
      mlScore,
      mlModelVersion,
      mlScore1h,
      mlScore6h,
      mlRiskLevel,
      mlMediumThreshold,
      mlHighThreshold,
      mlFeatureVector,
      anomalyScore,
      manipulationRiskScore,
    };
  } catch (error) {
    logger.warn('ML scoring failed; falling back to rule-based risk score', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const manipulationRiskScore = computeManipulationRiskScore({
    maxDeviationPct: args.maxDeviationPct,
    crossProviderAgreement: args.agreement,
    spreadPct: args.spreadPct,
    staleRisk: args.staleRisk,
    minReputation: args.minReputation,
  });
  return {
    mlScore,
    mlModelVersion,
    mlScore1h,
    mlScore6h,
    mlRiskLevel,
    mlMediumThreshold,
    mlHighThreshold,
    mlFeatureVector: {},
    anomalyScore,
    manipulationRiskScore,
  };
}

/**
 * Derive a position-free protocol safety context from the protocol's own
 * published risk parameters (fetched on schedule via the dynamic-data layer).
 *
 * Uses the scheduled-fetched liquidationThreshold + maxLtv — the same values
 * the position safety check uses — so the pre-trade verdict reflects the
 * protocol's real, current risk parameters rather than a static guess.
 *
 * Returns null (non-blocking) if the protocol or asset is unknown, so a bad
 * protocolId never fails the safety check itself.
 */
async function computeProtocolSafety(
  protocolId: string,
  asset: string,
  maxDeviationPct: number,
  chainId: number
): Promise<{ context: ProtocolSafetyContext | null; unavailableReason: string | null }> {
  try {
    const protocol = await getProtocolByIdWithDynamicData(protocolId);
    if (!protocol) return { context: null, unavailableReason: 'UNKNOWN_PROTOCOL' };

    if (getBlockchainByChainId(chainId) !== protocol.chain)
      return { context: null, unavailableReason: 'PROTOCOL_CHAIN_MISMATCH' };

    // Match by symbol or priceSymbol (derivative tokens track an underlying).
    const assetConfig = protocol.assets.find((a) => a.symbol === asset || a.priceSymbol === asset);
    if (!assetConfig) return { context: null, unavailableReason: 'ASSET_NOT_IN_PROTOCOL' };

    const { liquidationThreshold, maxLtv } = assetConfig;
    if (
      !Number.isFinite(liquidationThreshold) ||
      !Number.isFinite(maxLtv) ||
      liquidationThreshold <= 0 ||
      maxLtv <= 0
    )
      return { context: null, unavailableReason: 'INVALID_PROTOCOL_PARAMETERS' };

    // At max LTV, collateral ratio = 1/maxLtv. Liquidation triggers when the
    // ratio falls to liquidationThreshold. The collateral-drop deviation that
    // bridges the two is: 1 − liquidationThreshold × maxLtv.
    const criticalDeviationPct = Math.max(0, (1 - liquidationThreshold * maxLtv) * 100);
    if (criticalDeviationPct <= 0)
      return { context: null, unavailableReason: 'INVALID_PROTOCOL_BUFFER' };

    const bufferConsumedPct = Math.min(
      100,
      (Math.abs(maxDeviationPct) / criticalDeviationPct) * 100
    );

    return {
      unavailableReason: null,
      context: {
        protocolId: protocol.id,
        protocolName: protocol.name,
        criticalDeviationPct: roundTo(criticalDeviationPct, 2),
        bufferConsumedPct: roundTo(bufferConsumedPct, 2),
        liquidationThreshold,
        maxLtv,
        parameterSource: protocol.dynamicData?.riskParamsFetchedAt
          ? 'scheduled_dynamic'
          : 'static_config',
        parametersFetchedAt: protocol.dynamicData?.riskParamsFetchedAt ?? null,
      },
    };
  } catch (error) {
    // Non-blocking: protocol context unavailable must never fail the check.
    logger.warn('Failed to compute protocol safety context', {
      protocolId,
      asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return { context: null, unavailableReason: 'PROTOCOL_PARAMETERS_UNAVAILABLE' };
  }
}

// ---------------------------------------------------------------------------
// Attestation issuance (v1 / v2 routing)
// ---------------------------------------------------------------------------

const OBS_PRICE_SCALE = 1e8; // provider observation prices → uint256 (matches v2)

/**
 * Build the canonical provider-observation entries for the v2
 * providerObservationsHash from the consensus response. Each entry binds the
 * evidence source (provider), the observed value, freshness, and inclusion
 * status. Feed IDs travel with the already-fetched provider reading, avoiding
 * an extra hot-path registry lookup. Only observations that participated in
 * strict consensus are included; shadow-only, outlier, unsupported, and error
 * observations remain committed as explicit exclusions.
 */
function buildProviderObservations(consensus: ConsensusPriceResponse): ProviderObservationEntry[] {
  return consensus.providers.map((p) => {
    const included = p.status === 'success' && p.countsTowardOracleQuorum !== false && !p.isOutlier;
    let exclusionReason = '';
    if (!included) {
      exclusionReason =
        p.status !== 'success'
          ? p.status === 'unsupported'
            ? 'UNSUPPORTED'
            : 'ERROR'
          : p.countsTowardOracleQuorum === false
            ? 'SHADOW_ONLY'
            : 'OUTLIER';
    }
    return {
      provider: p.provider,
      feedId: p.feedId ?? '',
      value: BigInt(Math.max(0, Math.round(p.price * OBS_PRICE_SCALE))),
      timestamp: BigInt(Math.floor((p.timestamp ?? Date.now()) / 1000)),
      dataAgeSeconds: BigInt(Math.max(0, Math.floor(p.dataAgeSeconds ?? 0))),
      included,
      exclusionReason,
    };
  });
}

/**
 * Issue the attestation for the check, routing by schemaVersion. v1 preserves
 * the existing 11-field attestation + caller contract exactly. v2 issues the
 * 26-field attestation (CAIP-19 pair binding + the three hash commitments).
 *
 * v2 CAIP-19 resolution is best-effort: if an asset can't be resolved to a
 * canonical CAIP-19 id (e.g. an exotic symbol absent from the token registry),
 * it is signed with an explicit `unresolved:<symbol>@<chain>` marker rather
 * than skipped. Raul's rule #10 requires EVERY BLOCK to be signed — an unsigned
 * BLOCK is untrusted and must not enter composed receipts, so we surface the
 * binding gap INSIDE the signed artifact instead of dropping the signature
 * (which would make it fail-open downstream). This removes the recurring
 * unsigned-BLOCK residual (STG/ICP/TAO/HYPE et al.) at the structural level
 * instead of via registry whack-a-mole.
 */
async function issueAttestation(
  input: PreTradeSafetyInput,
  result: PreTradeSafetyResult,
  consensus: ConsensusPriceResponse,
  aggregates: { maxAge: number; worstDepegPct: number; meta?: AuditMeta }
): Promise<
  | OracleSafetyAttestation
  | OracleSafetyAttestationV2
  | OracleSafetyAttestationV3
  | OracleSafetyAttestationV4
  | null
> {
  // v1 path (default) — unchanged behavior.
  if (input.schemaVersion !== 2 && input.schemaVersion !== 3 && input.schemaVersion !== 4) {
    return signAttestation({
      verdict: result.verdict,
      asset: input.asset,
      chainId: input.chainId,
      action: input.action,
      tradeAmountUsd: input.tradeAmountUsd,
      consensusPrice: result.consensusPrice,
      maxDeviationPct: result.maxDeviationPct,
      manipulationRiskScore: result.manipulationRiskScore,
      participantCount: result.participantCount,
    });
  }

  // v2 path — resolve CAIP-19 pair, then sign the 26-field attestation.
  // Raul's rule #10: every BLOCK must be signed (unsigned = untrusted, must
  // not enter composed receipts). We therefore NEVER skip signing when an asset
  // can't be resolved to a canonical CAIP-19 id — instead we sign with an
  // EXPLICIT `unresolved:<symbol>@<chain>` marker so the gap is visible in the
  // signed artifact rather than silently dropping the signature. This removes
  // the recurring unsigned-BLOCK residual (STG/ICP/TAO/HYPE et al.) structurally
  // instead of via registry whack-a-mole.
  const sourceAsset = resolveCaip19(input.asset, input.chainId);
  const sourceAssetId = sourceAsset?.id ?? `unresolved:${input.asset}@${input.chainId}`;
  if (!sourceAsset) {
    logger.warn(
      'v2 source asset unresolvable to canonical CAIP-19; signing with explicit unresolved marker',
      {
        asset: input.asset,
        chainId: input.chainId,
        sourceAssetId,
      }
    );
  }

  const destSymbol = input.destinationAsset ?? input.asset;
  const destinationAsset = resolveCaip19(destSymbol, input.chainId);
  const destinationAssetId = destinationAsset?.id ?? `unresolved:${destSymbol}@${input.chainId}`;

  const attestationInput: AttestationInputV2 = {
    verdict: result.verdict,
    sourceAssetId: sourceAssetId,
    destinationAssetId,
    subjectChainId: input.chainId,
    action: input.action,
    tradeAmountUsd: input.tradeAmountUsd,
    consensusPrice: result.consensusPrice,
    maxDeviationPct: result.maxDeviationPct,
    manipulationRiskScore: result.manipulationRiskScore,
    participantCount: result.participantCount,
    crossProviderAgreement: result.crossProviderAgreement,
    maxStablecoinDepegPct: aggregates.worstDepegPct,
    maxDataAgeSeconds: aggregates.maxAge,
    recommendedMaxPositionUsd: result.recommendedMaxPositionUsd,
    contributingFactors: result.contributingFactors,
    providerObservations: buildProviderObservations(consensus),
  };

  // v4 = the same evidence and gates as v3, plus the signed asset-proxy
  // relationship of the evaluated (source) asset. The relationship is derived
  // inside buildMessageV4 from the already-signed CAIP-19 id (with the raw
  // symbol only as a fallback for `unresolved:` markers), so a caller cannot
  // inject a "1:1" claim that the signed evidence does not support. No joint-run
  // 1800s exception here: that window is bound to the v3 contract and v4 keeps
  // the standard 600s validity.
  if (input.schemaVersion === 4) {
    return signAttestationV4({
      ...attestationInput,
      sourceAssetSymbol: input.asset,
    });
  }

  // v2 and v3 take the same evidence and the same gates. v3 additionally signs
  // the independence threshold, so a holder of the receipt can check the gate
  // without access to this codebase.
  if (input.schemaVersion !== 3) return signAttestationV2(attestationInput);
  if (aggregates.meta?.veritasJointRunPolicyId) {
    assertVeritasJointRun1800Admission(
      {
        partnerId: 'veritas',
        policyId: aggregates.meta.veritasJointRunPolicyId,
        apiKeyId: aggregates.meta.apiKeyId,
        asset: input.asset,
        destinationAsset: input.destinationAsset,
        chainId: input.chainId,
        action: input.action,
        tradeAmountUsd: input.tradeAmountUsd,
        schemaVersion: input.schemaVersion,
      },
      'sign'
    );
    return signAttestationV3(attestationInput, { validForSeconds: 1800 });
  }
  const validity = selectPreTradeValidity({
    schemaVersion: input.schemaVersion,
    subjectChainId: input.chainId,
    sourceAssetId,
    destinationAssetId,
    action: input.action,
    tradeAmountUsd: input.tradeAmountUsd,
    workflowTag: aggregates.meta?.workflowTag,
    apiKeyId: aggregates.meta?.apiKeyId,
  });
  return validity !== 600
    ? signAttestationV3(attestationInput, { validForSeconds: validity })
    : signAttestationV3(attestationInput);
}

/**
 * v2.1 independence gate (v2 and v3). Orthogonal to the quorum gate: the quorum
 * counts PARTICIPANTS, this counts distinct OPERATOR groups. A fake quorum
 * (>=3 participants that are all the same operator) clears the quorum but must
 * still BLOCK here. TWAP is derived (on-chain) and does NOT count toward the
 * group count (Raul 16:09). Independent of the attestation's independenceStatus
 * field, which buildMessage derives from the same included provider set.
 *
 * Pushes the `oracle_independence` contributing factor + warning and returns
 * 'BLOCK' when the distinct non-derived group count is below the floor; null
 * otherwise (caller folds the verdict in via pickWorst).
 */
function applyV2IndependenceGate(
  input: PreTradeSafetyInput,
  consensus: ConsensusPriceResponse,
  contributingFactors: ContributingFactor[],
  warnings: string[]
): SafetyVerdict | null {
  const includedProviders = consensus.providers
    .filter((p) => p.status === 'success' && p.countsTowardOracleQuorum !== false && !p.isOutlier)
    .map((p) => p.provider);
  const nonDerivedGroups = nonDerivedGroupCount(includedProviders);
  if (nonDerivedGroups >= V2_REQUIRED_NON_DERIVED_GROUPS) return null;

  contributingFactors.push({
    rule: 'oracle_independence',
    value: nonDerivedGroups,
    threshold: V2_REQUIRED_NON_DERIVED_GROUPS,
    triggeredVerdict: 'BLOCK',
    message: `Only ${nonDerivedGroups} distinct non-derived oracle operator group(s) feed ${input.asset} on chain ${input.chainId}; v2 independence gate requires ≥${V2_REQUIRED_NON_DERIVED_GROUPS} (INSUFFICIENT_INDEPENDENCE).`,
  });
  warnings.push(
    `v2 independence gate: ${nonDerivedGroups} distinct non-derived operator group(s) < required ${V2_REQUIRED_NON_DERIVED_GROUPS}.`
  );
  return 'BLOCK';
}

/**
 * A well-formed, empty consensus response. Used when no oracle data is available
 * (zero coverage) and when issuance is halted: CAIP-19 resolution and the
 * remaining fields still produce a valid, verifiable attestation, so the BLOCK
 * is provable downstream instead of being dropped.
 */
function emptyConsensusResponse(
  symbol: string,
  chain: Blockchain | undefined
): ConsensusPriceResponse {
  return {
    symbol,
    chain,
    consensusPrice: 0,
    // 'reference' is deliberately outside the ConsensusMethod union: it marks a
    // response that carries no consensus at all, so it can never be mistaken for
    // a real aggregation method.
    method: 'reference' as ConsensusMethod,
    recommendedMethod: 'reference' as ConsensusMethod,
    confidence: 0,
    confidenceLevel: 'very_low',
    agreement: 0,
    participantCount: 0,
    excludedCount: 0,
    excludedProviders: [],
    priceRange: { min: 0, max: 0 },
    methodResults: {} as Record<ConsensusMethod, number>,
    providers: [],
    recommendedProvider: null,
  };
}

/** Unsigned rule name recorded for a check refused by the operator kill switch. */
const ISSUANCE_HALTED_RULE = 'issuance_halted';

/**
 * The result returned while the operator kill switch is engaged. It is a normal,
 * signed BLOCK: no trade is authorised, the refusal is provable downstream, and
 * the per-request audit row still accounts for the check. The operator's free-text
 * reason is carried in the (unsigned) contributing factor and the audit row — it
 * is deliberately NOT added to the signed field set, whose reason codes stay a
 * fixed enum, so the signature layout is unchanged.
 */
function buildHaltedSafetyResult(
  input: PreTradeSafetyInput,
  reason: string | null,
  startedAt: number
): PreTradeSafetyResult {
  const detail = reason ? ` Reason: ${reason}` : '';
  const message = `Pre-trade issuance is halted by the operator; no verdict is issued while the halt is engaged.${detail}`;
  return {
    assessmentScope: buildAssessmentScope(input, {}, null, null, false),
    sizingBasis: buildSizingBasis(null),
    verdict: 'BLOCK',
    consensusPrice: 0,
    maxDeviationPct: 0,
    manipulationRiskScore: 1,
    staleDataRisk: false,
    crossProviderAgreement: 0,
    recommendedMaxPositionUsd: 0,
    participantCount: 0,
    providerPrices: {},
    depegWarnings: [],
    warnings: [message],
    contributingFactors: [
      {
        rule: ISSUANCE_HALTED_RULE,
        value: 1,
        threshold: 0,
        triggeredVerdict: 'BLOCK',
        message,
      },
    ],
    protocolSafety: null,
    recommendedActions: [],
    mlScore: null,
    mlModelVersion: null,
    mlScore1h: null,
    mlScore6h: null,
    mlRiskLevel: null,
    mlMediumThreshold: null,
    mlHighThreshold: null,
    mlFeatureVector: {},
    anomalyScore: 0,
    attestation: null,
    evaluatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };
}

function buildUnavailableSafetyResult(
  input: PreTradeSafetyInput,
  depegWarnings: DepegWarning[],
  depegAvailable: boolean,
  warnings: string[],
  contributingFactors: ContributingFactor[],
  startedAt: number
): PreTradeSafetyResult {
  return {
    assessmentScope: buildAssessmentScope(input, {}, null, null, depegAvailable),
    sizingBasis: buildSizingBasis(null),
    verdict: 'BLOCK',
    consensusPrice: 0,
    maxDeviationPct: 0,
    manipulationRiskScore: 1,
    staleDataRisk: false,
    crossProviderAgreement: 0,
    recommendedMaxPositionUsd: 0,
    participantCount: 0,
    providerPrices: {},
    depegWarnings,
    warnings,
    contributingFactors,
    protocolSafety: null,
    recommendedActions: [],
    mlScore: null,
    mlModelVersion: null,
    mlScore1h: null,
    mlScore6h: null,
    mlRiskLevel: null,
    mlMediumThreshold: null,
    mlHighThreshold: null,
    mlFeatureVector: {},
    anomalyScore: 0,
    attestation: null,
    evaluatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * Evaluate the operator kill switch and, when it is engaged, produce the signed
 * BLOCK that every surface returns. Returns null while issuance runs normally.
 *
 * Kept out of preTradeSafetyCheck so that (already large) function stays within
 * its line/complexity budget, and so the halt contract has exactly one home. The
 * switch is read before any upstream call, so an incident implicating the oracle
 * sources cannot influence the outcome, and the refusal is signed + accounted
 * for exactly like a normal check.
 */
async function haltedCheckResult(
  input: PreTradeSafetyInput,
  meta: AuditMeta,
  chain: Blockchain | undefined,
  startedAt: number
): Promise<PreTradeSafetyResult | null> {
  const halt = await readIssuanceHalt();
  if (!halt.halted) return null;

  const result = buildHaltedSafetyResult(input, halt.reason, startedAt);
  try {
    result.attestation = await issueAttestation(
      input,
      result,
      emptyConsensusResponse(input.asset, chain),
      { maxAge: 0, worstDepegPct: 0, meta }
    );
  } catch (error) {
    logger.warn('Failed to issue attestation for a halted check', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  // Do not return a refusal that cannot be accounted for later. This write is
  // fail-closed, so an unreadable database still refuses to serve the request.
  await logAudit(input, result, meta);
  return result;
}

/**
 * Advisory manipulation-cost fetch (foundation block ②), extracted to keep
 * preTradeSafetyCheck within its complexity budget. EVIDENCE ONLY per the
 * collector's discipline: the result is attached to the response verbatim and
 * is NEVER a verdict gate or a signed-attestation input. Ethereum mainnet
 * (chainId 1) only in v0 — mainnet pool depth must not be presented as the
 * manipulation cost of another chain's reference market. Returns undefined on
 * any failure, uncovered symbol, or stale data; never throws.
 */
async function fetchManipCostAdvisorySafe(
  asset: string,
  chainId: number
): Promise<ManipCostAdvisory | undefined> {
  // Avoid constructing a database client for an asset that the fixed v0 pool
  // map cannot possibly cover. The helper has the same guard internally, but
  // this hot-path check prevents needless work for every unsupported symbol.
  if (chainId !== 1 || !isManipCostCoveredSymbol(asset)) return undefined;
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const supabase = createServiceRoleClient();
    return (await getManipCostAdvisory(supabase, asset)) ?? undefined;
  } catch (e) {
    logger.warn('Manipulation-cost advisory fetch failed; advisory omitted', {
      asset,
      error: e instanceof Error ? e.message : String(e),
    });
    return undefined;
  }
}

interface DecisionInputReferenceEvidence {
  chainlink: ChainlinkMarketReference | null;
  redstone: RedStoneMarketReference | null;
  cex: MarketReference | null;
}

/**
 * Start the optional reviewed-pool read alongside the independent references.
 * This lane is deliberately opt-in and fail-closed: a requested, unavailable,
 * or unsupported profile becomes signed insufficient evidence rather than an
 * inferred quote from another pool or direction.
 */
function startReviewedUniswapV3Fetch(
  input: PreTradeSafetyInput
): Promise<ReviewedUniswapV3PreTradeEvidence | null> | undefined {
  const requested = input.decisionInput?.reviewedUniswapV3;
  if (!requested) return undefined;
  return getReviewedUniswapV3PreTradeEvidence({
    chainId: input.chainId,
    asset: input.asset,
    destinationAsset: input.destinationAsset,
    amountIn: requested.amountIn,
  }).catch((error: unknown) => {
    logger.warn('Reviewed Uniswap V3 pre-trade evidence unavailable', {
      asset: input.asset,
      destinationAsset: input.destinationAsset ?? null,
      chainId: input.chainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
}

function startReviewedAerodromeSlipstreamFetch(
  input: PreTradeSafetyInput
): Promise<ReviewedAerodromeSlipstreamPreTradeEvidence | null> | undefined {
  const requested = input.decisionInput?.reviewedAerodromeSlipstream;
  if (!requested) return undefined;
  return getReviewedAerodromeSlipstreamPreTradeEvidence({
    chainId: input.chainId,
    asset: input.asset,
    destinationAsset: input.destinationAsset,
    amountIn: requested.amountIn,
  }).catch((error: unknown) => {
    logger.warn('Reviewed Aerodrome Slipstream pre-trade evidence unavailable', {
      asset: input.asset,
      destinationAsset: input.destinationAsset ?? null,
      chainId: input.chainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
}

function assertSingleReviewedDexLane(input: PreTradeSafetyInput): void {
  if (input.decisionInput?.reviewedUniswapV3 && input.decisionInput.reviewedAerodromeSlipstream) {
    throw new ValidationError(
      'Choose only one reviewed DEX evidence lane per decision-input assessment.',
      { field: 'decisionInput' }
    );
  }
}

function startDecisionInputReferenceFetch(
  input: PreTradeSafetyInput
): Promise<DecisionInputReferenceEvidence> | undefined {
  if (!input.decisionInput) return undefined;

  // WETH uses the ETH/USD reference feed and centralized market symbol.
  const symbol = input.asset.trim().toUpperCase() === 'WETH' ? 'ETH' : input.asset;
  const chainlink = fetchChainlinkMarketReference({
    symbol,
    chainId: input.chainId,
    signal: AbortSignal.timeout(10_000),
  }).catch((error: unknown) => {
    logger.warn('Decision-input Chainlink evidence unavailable', {
      asset: input.asset,
      chainId: input.chainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  const cex = getMarketReference(symbol).catch((error: unknown) => {
    logger.warn('Decision-input CEX evidence unavailable', {
      asset: input.asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  const redstone = fetchRedStoneMarketReference({
    symbol,
    // This is an optional cross-check, so keep its added request latency bounded.
    signal: AbortSignal.timeout(3_000),
  }).catch((error: unknown) => {
    logger.warn('Decision-input RedStone evidence unavailable', {
      asset: input.asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  return Promise.all([chainlink, cex, redstone]).then(
    ([chainlinkResult, cexResult, redstoneResult]) => ({
      chainlink: chainlinkResult,
      cex: cexResult,
      redstone: redstoneResult,
    })
  );
}

async function attachDecisionInputAssessment(
  input: PreTradeSafetyInput,
  result: PreTradeSafetyResult,
  referenceEvidencePromise: Promise<DecisionInputReferenceEvidence> | undefined,
  reviewedUniswapV3Promise: Promise<ReviewedUniswapV3PreTradeEvidence | null> | undefined,
  reviewedAerodromeSlipstreamPromise:
    | Promise<ReviewedAerodromeSlipstreamPreTradeEvidence | null>
    | undefined,
  /** undefined means fetch now; null means the normal advisory fetch already found no evidence. */
  knownManipulationCost?: ManipCostAdvisory | null
): Promise<void> {
  if (!input.decisionInput) return;

  const [referenceEvidence, manipulationCost, reviewedUniswapV3, reviewedAerodromeSlipstream] =
    await Promise.all([
      referenceEvidencePromise ?? Promise.resolve({ chainlink: null, cex: null, redstone: null }),
      knownManipulationCost === undefined
        ? fetchManipCostAdvisorySafe(input.asset, input.chainId)
        : Promise.resolve(knownManipulationCost ?? undefined),
      reviewedUniswapV3Promise ?? Promise.resolve(null),
      reviewedAerodromeSlipstreamPromise ?? Promise.resolve(null),
    ]);

  const assessment = assessDecisionInput({
    asset: input.asset,
    destinationAsset: input.destinationAsset,
    chainId: input.chainId,
    action: input.action,
    tradeAmountUsd: input.tradeAmountUsd,
    request: input.decisionInput,
    chainlink: referenceEvidence.chainlink,
    redstone: referenceEvidence.redstone,
    cex: referenceEvidence.cex,
    dex: manipulationCost ?? null,
    reviewedUniswapV3,
    reviewedAerodromeSlipstream,
  });
  const attestation = await signDecisionInputAssessment(assessment, result.attestation?.uid);
  if (attestation) {
    assessment.attestation = attestation;
  } else {
    logger.warn('Decision-input assessment signature unavailable', {
      asset: input.asset,
      chainId: input.chainId,
    });
    assessment.caveats.push(
      'The decision-input integrity signature is unavailable; this assessment cannot be independently verified.'
    );
  }
  result.decisionInputAssessment = assessment;
}

// ---------------------------------------------------------------------------
// Decision-input context evidence (token-security lane, advisory only)
// ---------------------------------------------------------------------------

/**
 * Built-in symbol→address map for the token-security evidence lane (Ethereum
 * mainnet only — address resolution is chain-specific and a mainnet address
 * must never be presented as another chain's token). ETH resolves to its WETH
 * contract because that is the token contract scanners cover.
 */
const TOKEN_ADDRESS_BY_SYMBOL: Record<string, string> = {
  ETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
};

function resolveTokenSecurityAddress(
  input: PreTradeSafetyInput
): { chainId: number; address: string } | null {
  if (input.tokenAddress) {
    const address = input.tokenAddress.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(address)) return null;
    if (!Number.isInteger(input.chainId) || input.chainId <= 0) return null;
    return { chainId: input.chainId, address };
  }
  // Symbol fallback: Ethereum mainnet (chainId 1) covered symbols only.
  if (input.chainId !== 1) return null;
  const address = TOKEN_ADDRESS_BY_SYMBOL[input.asset.toUpperCase()];
  return address ? { chainId: 1, address } : null;
}

/**
 * Kick off the raw third-party token-security fetch without awaiting it, so
 * the ~sub-second GoPlus call overlaps the oracle consensus work instead of
 * extending tail latency. Returns null when no address resolves (fields will
 * be omitted). Any downstream failure also resolves to null.
 */
function startTokenSecurityFetch(
  input: PreTradeSafetyInput,
  onOutcome?: (outcome: GoPlusLaneOutcome) => void
): Promise<GoPlusRawResult | null> {
  const resolved = resolveTokenSecurityAddress(input);
  if (!resolved) {
    // Explicit param that fails resolution is a caller-visible config issue —
    // log it so a silently stripped/invalid tokenAddress is diagnosable.
    if (input.tokenAddress) {
      logger.warn('tokenSecurity lane skipped: tokenAddress failed resolution', {
        tokenAddressHead: input.tokenAddress.slice(0, 12),
        chainId: input.chainId,
      });
    }
    onOutcome?.('unresolved_address');
    return Promise.resolve(null);
  }
  return fetchGoPlusTokenSecurity(resolved.chainId, resolved.address, globalThis.fetch, onOutcome);
}

/**
 * Load per-symbol observed-cadence baselines (single indexed query).
 * NON-BLOCKING by contract: on any failure we fall back to an empty map → no
 * cadence CAUTION, but the 7-day absolute hard-block backstop still applies.
 */
async function loadStalenessBaselines(asset: string): Promise<Map<string, number | null>> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const supabase = createServiceRoleClient();
    const fetched = await getFeedStalenessBaselineMap(supabase, asset);
    return fetched instanceof Map ? fetched : new Map();
  } catch (e) {
    logger.warn('Failed to load staleness baselines; staleness will use absolute backstop only', {
      error: e instanceof Error ? e.message : String(e),
    });
    return new Map();
  }
}

/**
 * Bundle the lane fetch with its outcome capture so the main flow stays flat:
 * `fetch` starts immediately (overlapping consensus work), `getOutcome` reports
 * the terminal lane state for the opt-in debugTokenSec response surface.
 */
function createTokenSecurityLane(input: PreTradeSafetyInput): {
  fetch: Promise<GoPlusRawResult | null>;
  getOutcome: () => GoPlusLaneOutcome;
} {
  let outcome: GoPlusLaneOutcome = 'not_requested';
  const fetchPromise = startTokenSecurityFetch(input, (o) => {
    outcome = o;
  });
  return { fetch: fetchPromise, getOutcome: () => outcome };
}

/**
 * Build and sign the contextAttestation from the fetched raw evidence and the
 * exact normalized view returned alongside it. Transaction context pins the
 * issued verdict attestation uid when one exists. On ANY
 * failure — fetch null, signing unavailable, signing error — both fields stay
 * undefined: we never emit an unsigned evidence lookalike, and never let this
 * lane affect the verdict or throw.
 */
async function attachTokenSecurityEvidence(
  input: PreTradeSafetyInput,
  result: PreTradeSafetyResult,
  fetchPromise: Promise<GoPlusRawResult | null>,
  getOutcome: () => GoPlusLaneOutcome
): Promise<void> {
  const debugOn = Boolean(input.debugTokenSecurity);
  try {
    const raw = await fetchPromise;
    if (debugOn) {
      result.tokenSecurityDebug = {
        requested: true,
        outcome: getOutcome(),
        latencyMs: raw?.latencyMs,
        keyed: Boolean(process.env.GOPLUS_APP_KEY?.trim() && process.env.GOPLUS_APP_SECRET?.trim()),
      };
    }
    if (!raw) return;

    const resolved = resolveTokenSecurityAddress(input);
    if (!resolved) return;

    const capturedAt = new Date().toISOString();
    const rawHash = rawBodySha256(raw.rawBody);
    const tokenSecurity = normalizeTokenSecurityView({
      schema: 'insight.token-security-view.v1',
      sourcedFrom: 'gopluslabs',
      rawHash,
      advisory: true,
      ...parseTokenSecurityViewFields(raw.record),
    });
    if (!tokenSecurity) return;

    const entry = {
      kind: 'third_party_token_scan',
      source: 'gopluslabs',
      request: {
        chainId: resolved.chainId,
        contractAddress: raw.contractAddress,
      },
      rawResponseSha256: rawHash,
      normalizedResultSha256: tokenSecurityViewSha256(tokenSecurity),
      retrievedAt: raw.fetchedAt,
      toolVersion: 'goplus.token_security.v1',
      authorization: 'public-source.advisory-only.v1',
      latencyMs: raw.latencyMs,
      ...(result.attestation?.uid ? { transactionContext: result.attestation.uid } : {}),
    };

    const attestation = await signContextAttestation({
      entries: [entry],
      capturedAt,
      transactionContext: entry.transactionContext,
    });
    if (!attestation) return; // fail-closed: omit both fields, stay advisory

    result.contextAttestation = attestation;
    result.tokenSecurity = tokenSecurity;
  } catch (e) {
    logger.warn('Token-security evidence lane failed; advisory omitted', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Run a pre-trade oracle safety check.
 *
 * @param input Trade intent (asset, chain, action, amount).
 * @param meta  Optional audit metadata (api key id for attribution).
 */
async function buildUnavailablePreTradeResult(
  input: PreTradeSafetyInput,
  meta: AuditMeta,
  chain: Blockchain | undefined,
  depegWarnings: DepegWarning[],
  depegAvailable: boolean,
  warnings: string[],
  contributingFactors: ContributingFactor[],
  startedAt: number,
  decisionInputReferenceEvidence: Promise<DecisionInputReferenceEvidence> | undefined,
  reviewedUniswapV3Promise: Promise<ReviewedUniswapV3PreTradeEvidence | null> | undefined,
  reviewedAerodromeSlipstreamPromise:
    | Promise<ReviewedAerodromeSlipstreamPreTradeEvidence | null>
    | undefined
): Promise<PreTradeSafetyResult> {
  const result = buildUnavailableSafetyResult(
    input,
    depegWarnings,
    depegAvailable,
    warnings,
    contributingFactors,
    startedAt
  );
  try {
    result.attestation = await issueAttestation(
      input,
      result,
      emptyConsensusResponse(input.asset, chain),
      { maxAge: 0, worstDepegPct: 0, meta }
    );
  } catch (error) {
    logger.warn('Failed to issue attestation for zero-coverage BLOCK', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await attachDecisionInputAssessment(
    input,
    result,
    decisionInputReferenceEvidence,
    reviewedUniswapV3Promise,
    reviewedAerodromeSlipstreamPromise
  );
  await logAudit(input, result, meta);
  return result;
}

export async function preTradeSafetyCheck(
  input: PreTradeSafetyInput,
  meta: AuditMeta = {},
  options: { signal?: AbortSignal } = {}
): Promise<PreTradeSafetyResult> {
  throwIfAborted(options.signal);
  const startedAt = Date.now();
  const warnings: string[] = [];
  const contributingFactors: ContributingFactor[] = [];

  // Step-timing instrumentation: production p50 is ~6s but the pipeline had no
  // per-step attribution, so nobody could tell consensus fetches from advisory
  // reads, lane reviews, or serial waits. Wall-clock spans around every awaited
  // step are collected here and logged once per check (see the log call before
  // logAudit) — Vercel logs are the sink; no schema change. Steps overlap by
  // design (prefetches), so steps do NOT sum to latencyMs; they attribute it.
  const stepTimings: Record<string, number> = {};
  const timeStep = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      stepTimings[name] = Date.now() - t0;
    }
  };

  // Resolve chain name (Blockchain string) from numeric chainId.
  const chain = resolveEvidenceBlockchain(input.chainId);
  if (!Number.isInteger(input.chainId) || input.chainId < 0 || (input.chainId > 0 && !chain)) {
    throw new ValidationError(
      'Unsupported evidence chainId; cross-chain fallback is not permitted.',
      { field: 'chainId' }
    );
  }

  // 0. Operator kill switch (see haltedCheckResult). Read before any upstream
  // call: while halted, every surface receives a signed BLOCK and no upstream
  // data is consulted. See src/lib/ops/issuanceControl.ts for the deliberate
  // (and loudly logged) fail-open behaviour when the switch is unreadable.
  const halted = await timeStep('kill_switch', () =>
    haltedCheckResult(input, meta, chain, startedAt)
  );
  throwIfAborted(options.signal);
  if (halted) return halted;

  assertSingleReviewedDexLane(input);
  const decisionInputReferenceEvidence = startDecisionInputReferenceFetch(input);
  const reviewedUniswapV3Evidence = startReviewedUniswapV3Fetch(input);
  const reviewedAerodromeSlipstreamEvidence = startReviewedAerodromeSlipstreamFetch(input);

  // 2a. Stablecoin depeg warnings are advisory and fully independent of the
  // consensus read, so start them here and let them overlap consensus (see
  // step 1). A stablecoin pair fans out into multiple oracle/RPC calls, which
  // previously ran strictly AFTER consensus and paid their whole cost at the
  // tail; fetchDepegWarnings never rejects (internal catch), so a dangling
  // prefetch is safe, and the consensus-failure short-circuit below still
  // awaits it before reading `depeg.available`.
  const depegStartedAt = Date.now();
  const depegPromise = fetchDepegWarnings(input.asset, input.destinationAsset, options.signal);

  // 1. Cross-oracle consensus price (also embeds reputation + agreement).
  let consensus: ConsensusPriceResponse | undefined;
  let consensusFailed = false;
  try {
    consensus = await timeStep('consensus', () =>
      fetchConsensusForPreTrade(input, chain, options.signal)
    );
  } catch (error) {
    throwIfAborted(options.signal);
    if (error instanceof UnsupportedSymbolError) {
      // No oracle coverage for this asset/chain — cannot verify, treat as BLOCK.
      consensusFailed = true;
      consensus = undefined;
      warnings.push(
        `No oracle coverage for ${input.asset} on chain ${input.chainId}. Cannot verify price integrity.`
      );
      contributingFactors.push({
        rule: 'oracle_coverage',
        value: 0,
        threshold: 1,
        triggeredVerdict: 'BLOCK',
        message: `No active oracle feeds found for ${input.asset} on chain ${input.chainId}.`,
      });
    } else {
      throw error;
    }
  }

  // 2. Stablecoin depeg warnings (non-blocking). Elapsed includes the
  // prefetch overlap: on a stablecoin pair this is now the max(depeg, ...)
  // residual rather than a strictly serial addition to consensus.
  const depeg = await depegPromise;
  stepTimings.depeg = Date.now() - depegStartedAt;
  throwIfAborted(options.signal);
  const depegWarnings = depeg.warnings;
  if (!depeg.available)
    warnings.push(
      'Stablecoin peg monitor unavailable; absence of a depeg warning is not a verified healthy peg.'
    );

  // If consensus failed, short-circuit to BLOCK.
  if (consensusFailed || !consensus) {
    return buildUnavailablePreTradeResult(
      input,
      meta,
      chain,
      depegWarnings,
      depeg.available,
      warnings,
      contributingFactors,
      startedAt,
      decisionInputReferenceEvidence,
      reviewedUniswapV3Evidence,
      reviewedAerodromeSlipstreamEvidence
    );
  }

  // 3. Build per-provider detail map.
  // Fetch observed-cadence baselines for this symbol (single indexed query).
  // NON-BLOCKING: on any failure we fall back to an empty map → no cadence
  // CAUTION, but the 7-day absolute hard-block backstop still applies.
  // 3b. These reads are all independent, advisory/context inputs. Start them
  // together so a pre-trade request pays the longest read once rather than
  // serial database latency. None is a verdict gate.
  const manipulationCostPromise = fetchManipCostAdvisorySafe(input.asset, input.chainId);
  const tokenSecurityLane = createTokenSecurityLane(input);
  const stalenessBaselinesPromise = loadStalenessBaselines(input.asset);
  const [manipulationCost, stalenessBaselines] = await timeStep('advisories', () =>
    Promise.all([manipulationCostPromise, stalenessBaselinesPromise])
  );

  const providerPrices = buildProviderPrices(consensus, stalenessBaselines);

  // 4. Compute aggregate metrics (optionally filtered to targetProviders).
  const maxDeviationPct = computeMaxDeviation(providerPrices, input.targetProviders);
  const spreadPct = computeSpread(providerPrices, input.targetProviders);
  const { staleRisk, maxAge, staleProviders } = computeStaleRisk(
    providerPrices,
    stalenessBaselines
  );
  const agreement = consensus.agreement;

  const reputationScores = Object.values(providerPrices)
    .filter((d) => d.countsTowardOracleQuorum)
    .map((d) => d.reputationScore)
    .filter((s): s is number => s !== null);
  const minReputation = reputationScores.length > 0 ? Math.min(...reputationScores) : 75;

  // 4a-prefetch. Needs only maxDeviationPct + consensus (both already
  // resolved), and nothing before the protocol-safety read below depends on
  // it — start it now so it overlaps that read instead of paying two serial
  // DB hops.
  const historicalStatePromise = timeStep('historical_state', () =>
    fetchHistoricalOracleState(input.asset, {
      maxDeviationPct,
      consensusPrice: consensus.consensusPrice,
      participantCount: consensus.participantCount,
    }).catch((error: unknown) => {
      logger.warn('Historical oracle state fetch failed; lending freeze uses snapshot only', {
        asset: input.asset,
        error: error instanceof Error ? error.message : String(error),
      });
      return EMPTY_HISTORY;
    })
  );

  // 4b. Protocol safety context (optional — only when protocolId is provided).
  // Derives a position-free safety buffer from the protocol's own published,
  // scheduled-fetched risk params. Non-blocking: null when unavailable.
  // Runs concurrently with the historical-state prefetch started above.
  const protocolId = input.protocolId;
  const protocolAssessment = protocolId
    ? await timeStep('protocol_safety', () =>
        computeProtocolSafety(protocolId, input.asset, maxDeviationPct, input.chainId)
      )
    : { context: null, unavailableReason: null };
  const protocolSafety = protocolAssessment.context;
  if (protocolAssessment.unavailableReason)
    warnings.push(
      `Requested protocol dimension was not evaluated: ${protocolAssessment.unavailableReason}.`
    );
  if (protocolSafety && input.action !== 'borrow')
    warnings.push(
      `Protocol max-LTV buffer is informational for ${input.action}; only new borrowing uses the borrow-buffer gate. Position, recipient and execution authorization require separate checks.`
    );

  // 4c. One bounded historical fetch, started as a prefetch next to the
  // protocol-safety read (4a) so the two DB hops overlap. Reused by the
  // ML/anomaly layer (step 6) and the lending freeze rule. The prefetch
  // downgrades its own failures to EMPTY_HISTORY, so this cannot throw.
  const historicalState: HistoricalOracleState = await historicalStatePromise;

  // Concrete, user-executable lending actions (decisive & actionable layer).
  // Populated by the protocol_buffer_consumed rule below; empty when dispersion
  // is within safe bounds or the action is not a lending action.
  let lendingActions: LendingSafetyAction[] = [];

  // 5. Rule engine.
  let verdict: SafetyVerdict = 'PASS';

  const deviationVerdict = evaluateHighIsBad(maxDeviationPct, THRESHOLDS.maxProviderDeviationPct);
  if (deviationVerdict) {
    verdict = pickWorst(verdict, deviationVerdict);
    contributingFactors.push({
      rule: 'max_provider_deviation_pct',
      value: roundTo(maxDeviationPct, 4),
      threshold:
        THRESHOLDS.maxProviderDeviationPct[
          deviationVerdict.toLowerCase() as 'caution' | 'danger' | 'block'
        ],
      triggeredVerdict: deviationVerdict,
      message: `Max provider deviation ${maxDeviationPct.toFixed(2)}% exceeds ${deviationVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(
      `Oracle price deviation ${maxDeviationPct.toFixed(2)}% from consensus is abnormal.`
    );
  }

  const spreadVerdict = evaluateHighIsBad(spreadPct, THRESHOLDS.crossProviderSpreadPct);
  if (spreadVerdict) {
    verdict = pickWorst(verdict, spreadVerdict);
    contributingFactors.push({
      rule: 'cross_provider_spread_pct',
      value: roundTo(spreadPct, 4),
      threshold:
        THRESHOLDS.crossProviderSpreadPct[
          spreadVerdict.toLowerCase() as 'caution' | 'danger' | 'block'
        ],
      triggeredVerdict: spreadVerdict,
      message: `Cross-provider spread ${spreadPct.toFixed(2)}% exceeds ${spreadVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(`Price spread between oracles ${spreadPct.toFixed(2)}% is elevated.`);
  }

  // Staleness rules (cadence CAUTION + consensus-aware hard backstop), extracted
  // into evaluateStalenessRules; see that helper for the full semantics.
  const stalenessRules = evaluateStalenessRules({
    providerPrices,
    stalenessBaselines,
    maxAge,
    staleProviders,
    staleRisk,
  });
  if (stalenessRules.verdict) verdict = pickWorst(verdict, stalenessRules.verdict);
  contributingFactors.push(...stalenessRules.factors);
  warnings.push(...stalenessRules.warnings);

  const agreementVerdict = evaluateLowIsBad(agreement, THRESHOLDS.crossProviderAgreement);
  if (agreementVerdict) {
    verdict = pickWorst(verdict, agreementVerdict);
    contributingFactors.push({
      rule: 'cross_provider_agreement',
      value: roundTo(agreement, 4),
      threshold:
        THRESHOLDS.crossProviderAgreement[
          agreementVerdict.toLowerCase() as 'caution' | 'danger' | 'block'
        ],
      triggeredVerdict: agreementVerdict,
      message: `Cross-provider agreement ${(agreement * 100).toFixed(1)}% below ${agreementVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(`Oracle providers disagree (agreement ${(agreement * 100).toFixed(1)}%).`);
  }

  // Depeg rule, extracted into evaluateDepegRule; see that helper.
  const depegRule = evaluateDepegRule({ depegWarnings });
  if (depegRule.verdict) verdict = pickWorst(verdict, depegRule.verdict);
  contributingFactors.push(...depegRule.factors);
  warnings.push(...depegRule.warnings);

  // Protocol buffer rule (lending actions only): escalate + freeze based on
  // how much cross-oracle dispersion consumes the protocol's max-LTV buffer.
  // Extracted into evaluateProtocolBufferRule (below) to keep this function
  // within its line budget; see that helper for the sustained-freeze logic.
  const bufferRule = evaluateProtocolBufferRule({
    protocolSafety,
    action: input.action,
    asset: input.asset,
    maxDeviationPct,
    historicalState,
  });
  if (bufferRule.verdict) verdict = pickWorst(verdict, bufferRule.verdict);
  contributingFactors.push(...bufferRule.factors);
  warnings.push(...bufferRule.warnings);
  lendingActions = bufferRule.actions;

  // 6. Manipulation risk score (extracted into computeManipulationRisk so this
  // function stays within its line budget). ML-driven when a verified model is
  // active, else the hand-tuned rule-based fallback. The verdict still comes
  // from the rule engine — this score feeds display + audit only.
  // The v4 oracle-vs-market divergence feature is only fetched when a model is
  // active (bounded rollup read, 60s cache) so the hot path stays unchanged
  // under the rules-only fallback.
  let marketContext: MarketReferenceContext | null = null;
  // getModelStatus may return a partial/undefined shape under test mocks;
  // treat anything but an explicit active:true as "no model".
  if (getModelStatus()?.active === true) {
    try {
      marketContext = await computeMarketReferenceContext(input.asset, consensus.consensusPrice);
    } catch {
      marketContext = null; // fail-closed: explicit missing-market features
    }
  }
  const risk = computeManipulationRisk({
    providerPrices,
    historicalState,
    maxDeviationPct,
    spreadPct,
    consensus,
    staleRisk,
    agreement,
    minReputation,
    asset: input.asset,
    marketContext,
  });
  const mlScore = risk.mlScore;
  const mlModelVersion = risk.mlModelVersion;
  const mlScore1h = risk.mlScore1h;
  const mlScore6h = risk.mlScore6h;
  const mlRiskLevel = risk.mlRiskLevel;
  const mlMediumThreshold = risk.mlMediumThreshold;
  const mlHighThreshold = risk.mlHighThreshold;
  const mlFeatureVector = risk.mlFeatureVector;
  const anomalyScore = risk.anomalyScore;
  const manipulationRiskScore = risk.manipulationRiskScore;

  // 7. Recommended max position. Oracle dispersion sets the advisory base; when
  // the caller supplied a reviewed DEX evidence lane, that lane's exact quote
  // and live pool balances calibrate the cap with real venue depth (see the
  // helper for promise-timing and cap semantics).
  const { recommendedMaxPositionUsd, liquidityBasis } = await resolveRecommendedPositionCap(
    maxDeviationPct,
    protocolSafety,
    consensus.consensusPrice,
    reviewedUniswapV3Evidence,
    reviewedAerodromeSlipstreamEvidence,
    warnings
  );

  // 8. Amount vs recommended position sanity.
  if (input.tradeAmountUsd > recommendedMaxPositionUsd * 3) {
    verdict = pickWorst(verdict, 'DANGER');
    contributingFactors.push({
      rule: 'position_to_liquidity_ratio',
      value: input.tradeAmountUsd,
      threshold: recommendedMaxPositionUsd * 3,
      triggeredVerdict: 'DANGER',
      message: `Trade size $${input.tradeAmountUsd.toLocaleString()} far exceeds ${liquidityBasis}.`,
    });
    warnings.push(`Trade size far exceeds ${liquidityBasis}.`);
  } else if (input.tradeAmountUsd > recommendedMaxPositionUsd * 1.5) {
    verdict = pickWorst(verdict, 'CAUTION');
    contributingFactors.push({
      rule: 'position_to_liquidity_ratio',
      value: input.tradeAmountUsd,
      threshold: recommendedMaxPositionUsd * 1.5,
      triggeredVerdict: 'CAUTION',
      message: `Trade size $${input.tradeAmountUsd.toLocaleString()} exceeds ${liquidityBasis}.`,
    });
    warnings.push(`Trade size exceeds ${liquidityBasis}.`);
  }

  // 9. Outlier provider warning (informational).
  const outliers = Object.entries(providerPrices)
    .filter(([, d]) => d.countsTowardOracleQuorum && d.isOutlier)
    .map(([provider]) => provider);
  if (outliers.length > 0) {
    warnings.push(`Outlier providers detected: ${outliers.join(', ')}.`);
  }

  // Worst active stablecoin depeg (0 when none) — feeds the v2 signed
  // maxStablecoinDepegBps field.
  const worstDepegPct =
    depegWarnings.length > 0 ? Math.max(...depegWarnings.map((w) => w.deviationPct)) : 0;

  // 10. quorum gate (v2 and v3). v1 keeps its looser policy so existing
  // callers/tests are unaffected. v2/v3 escalate <3 independent providers to
  // BLOCK + INSUFFICIENT_COVERAGE — Raul's locked "no single-provider verdicts"
  // stance. This is a verdict-level rule (independent of the attestation).
  const gatedSchema = input.schemaVersion ?? 1;
  if (gatedSchema >= 2 && consensus.participantCount < V2_REQUIRED_PARTICIPANT_COUNT) {
    verdict = pickWorst(verdict, 'BLOCK');
    contributingFactors.push({
      rule: 'oracle_coverage',
      value: consensus.participantCount,
      threshold: V2_REQUIRED_PARTICIPANT_COUNT,
      triggeredVerdict: 'BLOCK',
      message: `Only ${consensus.participantCount} independent oracle provider(s) for ${input.asset} on chain ${input.chainId}; v2 requires ≥${V2_REQUIRED_PARTICIPANT_COUNT} (INSUFFICIENT_COVERAGE).`,
    });
    warnings.push(
      `v2 quorum gate: ${consensus.participantCount} provider(s) < required ${V2_REQUIRED_PARTICIPANT_COUNT}.`
    );
  }

  // 10b. independence gate (orthogonal to the quorum gate, v2 and v3).
  if (gatedSchema >= 2) {
    const indep = applyV2IndependenceGate(input, consensus, contributingFactors, warnings);
    if (indep) verdict = pickWorst(verdict, indep);
  }

  const result: PreTradeSafetyResult = {
    assessmentScope: buildAssessmentScope(
      input,
      providerPrices,
      protocolSafety,
      protocolAssessment.unavailableReason,
      depeg.available
    ),
    sizingBasis: buildSizingBasis(protocolSafety),
    verdict,
    consensusPrice: consensus.consensusPrice,
    maxDeviationPct: roundTo(maxDeviationPct, 4),
    manipulationRiskScore,
    staleDataRisk: staleRisk,
    crossProviderAgreement: roundTo(agreement, 4),
    recommendedMaxPositionUsd,
    participantCount: consensus.participantCount,
    providerPrices,
    depegWarnings,
    warnings: warnings.length > 0 ? warnings : ['No oracle risk signals detected.'],
    contributingFactors,
    protocolSafety,
    recommendedActions: lendingActions,
    mlScore,
    mlModelVersion,
    mlScore1h,
    mlScore6h,
    mlRiskLevel,
    mlMediumThreshold,
    mlHighThreshold,
    mlFeatureVector,
    anomalyScore,
    // Advisory only (see ManipCostAdvisory). undefined drops out of the JSON
    // response entirely — the field is absent, not null, for uncovered assets.
    manipulationCost,
    // Non-blocking: sign the verdict as an EIP-712 offchain attestation. null
    // when no attester key is configured — never affects the verdict itself.
    attestation: null,
    evaluatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };

  try {
    result.attestation = await timeStep('attestation_sign', () =>
      issueAttestation(input, result, consensus, {
        maxAge,
        worstDepegPct,
        meta,
      })
    );
  } catch (error) {
    logger.warn('Failed to issue attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Both attaches consume only the issued attestation (uid as transaction
  // context) and write disjoint result fields, so they run together. logAudit
  // stays after both: a verdict must be accounted for before it is returned.
  await Promise.all([
    timeStep('decision_input_attach', () =>
      attachDecisionInputAssessment(
        input,
        result,
        decisionInputReferenceEvidence,
        reviewedUniswapV3Evidence,
        reviewedAerodromeSlipstreamEvidence,
        manipulationCost ?? null
      )
    ),
    timeStep('token_security_attach', () =>
      attachTokenSecurityEvidence(
        input,
        result,
        tokenSecurityLane.fetch,
        tokenSecurityLane.getOutcome
      )
    ),
  ]);

  // Single structured timing record per check (the attribution sink). Steps
  // overlap, so they do not sum to totalMs — the point is to expose which
  // step dominates and whether a prefetch actually hid its cost.
  logger.info('pre-trade step timings', {
    asset: input.asset,
    chainId: input.chainId,
    verdict: result.verdict,
    totalMs: result.latencyMs,
    steps: stepTimings,
  });

  // Do not issue a safety verdict that cannot be accounted for later.
  await logAudit(input, result, meta);

  return result;
}
