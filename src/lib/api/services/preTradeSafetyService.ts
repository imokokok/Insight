/**
 * @fileoverview Pre-trade oracle safety check service.
 *
 * The "AI agent immune system" core. Before an AI agent (or human) executes an
 * on-chain swap/borrow/lend, this service aggregates cross-oracle consensus
 * prices, data freshness, stablecoin peg status, and reputation signals, then
 * applies a rule engine to produce a single verdict: PASS / CAUTION / DANGER /
 * BLOCK.
 *
 * Phase 1: pure rule-based (no ML). Thresholds are constants below so the hot
 * path has zero DB reads. The audit row is written fire-and-forget via the
 * service-role client to build the data flywheel for a future ML model.
 *
 * This orchestrates existing services rather than re-fetching data:
 *   - consensusPriceService.getConsensusPrice  (cross-provider prices + agreement)
 *   - stablecoins/monitor                      (depeg warnings)
 *   - reputation                               (already embedded in consensus response)
 */

import type { ConsensusMethod } from '@/lib/analytics/consensusPrice';
import { computeAnomalyScore, type AnomalyScoreResult } from '@/lib/anomaly/oracleAnomalyDetection';
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
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';
import { nonDerivedGroupCount } from '@/lib/attestations/sourceGroups';
import { UnsupportedSymbolError } from '@/lib/errors';
import {
  getModelStatus,
  scorePreTradeMultiHorizon,
  type MultiHorizonScore,
} from '@/lib/ml/inference';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import {
  getFeedStalenessBaselineMap,
  isCadenceStale,
  CAUTION_STALE_MULTIPLIER,
  STALE_FLOOR_SECONDS,
  HARD_STALE_BLOCK_SECONDS,
} from '@/lib/oracles/feedCadence';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

import { getConsensusPrice, type ConsensusPriceResponse } from './consensusPriceService';
import {
  EMPTY_HISTORY,
  fetchHistoricalOracleState,
  median,
  type HistoricalOracleState,
} from './oracleWatchHistory';

const logger = createLogger('pre-trade-safety');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TradeAction = 'swap' | 'borrow' | 'lend' | 'liquidate' | 'repay';
export type SafetyVerdict = 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK';

export interface PreTradeSafetyInput {
  asset: string;
  chainId: number;
  action: TradeAction;
  tradeAmountUsd: number;
  targetProviders?: string[];
  /**
   * Optional lending protocol id (e.g. 'aave-v3-ethereum'). When provided, the
   * check adds a protocol-safety dimension: it derives the oracle deviation
   * that would liquidate a max-LTV position on this asset from the protocol's
   * own published risk params, and escalates the verdict when the current
   * cross-oracle deviation consumes a large share of that buffer.
   */
  protocolId?: string;
  /**
   * Attestation schema version to issue. v1 (default) preserves the existing
   * 11-field EIP-712 attestation + the loose (no-quorum-gate) verdict policy.
   * v2 issues the 26-field attestation (CAIP-19 pair binding, requestHash,
   * providerObservationsHash, reasonCodesHash, quorum gate) per the locked v2
   * spec. v3 issues the same evidence plus the independence threshold
   * (`requiredSourceGroupCount`, 27 fields) so the independence gate is
   * self-verifying instead of requiring the issuer's source code.
   *
   * v2 and v3 share the same verdict policy (quorum + independence gates).
   * The verdict itself differs only in that v2/v3 escalate <3 independent
   * providers to BLOCK (INSUFFICIENT_COVERAGE).
   */
  schemaVersion?: 1 | 2 | 3;
  /**
   * Optional destination asset symbol (the other leg of a swap). v2 binds it as
   * destinationAssetId (CAIP-19) but does NOT evaluate it (evaluationScope =
   * SOURCE_ASSET_ONLY in v2.0). When omitted, destinationAssetId falls back to
   * the source asset id (degenerate self-pair) so the binding is still valid.
   */
  destinationAsset?: string;
}

/**
 * Position-free protocol safety context, derived purely from a protocol's own
 * published risk parameters (no user position required).
 *
 * `criticalDeviationPct` is the collateral-price drop that would push a
 * max-LTV position into liquidation. At max LTV the collateral ratio is
 * 1/maxLtv; liquidation triggers when it falls to `liquidationThreshold`, so
 * the bridging deviation is 1 − liquidationThreshold × maxLtv.
 *
 * `bufferConsumedPct` is how much of that buffer the current cross-oracle
 * deviation already eats — the bridge between "is the oracle healthy?" and
 * "is THIS trade safe on THIS protocol?".
 */
export interface ProtocolSafetyContext {
  protocolId: string;
  protocolName: string;
  criticalDeviationPct: number;
  bufferConsumedPct: number;
  liquidationThreshold: number;
  maxLtv: number;
}

export interface ProviderPriceDetail {
  price: number;
  deviationPct: number | null;
  isOutlier: boolean;
  dataAgeSeconds: number | null;
  isStale: boolean;
  confidence: number | null;
  reputationScore: number | null;
  status: 'success' | 'unsupported' | 'error';
}

export interface DepegWarning {
  stablecoin: string;
  deviationPct: number;
  riskLevel: string;
}

export interface ContributingFactor {
  rule: string;
  value: number;
  threshold: number;
  triggeredVerdict: 'CAUTION' | 'DANGER' | 'BLOCK';
  message: string;
}

export interface LendingSafetyAction {
  type: 'freeze_borrow' | 'reduce_position' | 'wait_convergence' | 'add_collateral';
  severity: 'info' | 'caution' | 'danger' | 'block';
  title: string;
  detail: string;
  /** Wait until cross-oracle deviation falls below this % before borrowing. */
  targetDeviationPct?: number;
  /** Target buffer consumption (%) the position should stay under. */
  targetBufferPct?: number;
}

export interface PreTradeSafetyResult {
  verdict: SafetyVerdict;
  consensusPrice: number;
  maxDeviationPct: number;
  /**
   * Effective manipulation risk score [0,1]. ML-driven (equals the model's
   * predicted probability of an abnormal oracle event in the next 6h) when a
   * verified model is active; falls back to the rule-based weighted formula
   * otherwise. Feeds the displayed risk level and recommended position sizing —
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
   * model drives the risk score and position sizing). null when no verified
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
  /**
   * Unsupervised anomaly score ∈ [0,1] — model-free statistical outlier
   * detection (z-score + EWMA residual vs the 24h baseline). Catches novel
   * manipulation the supervised ML model has never seen. Informational + feeds
   * the displayed risk level; does not itself drive the verdict.
   */
  anomalyScore: number;
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
    | null;
  evaluatedAt: string;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Phase 1 rule thresholds (high-is-bad unless noted)
// ---------------------------------------------------------------------------

interface ThresholdSet {
  caution: number;
  danger: number;
  block: number;
}

const THRESHOLDS = {
  maxProviderDeviationPct: { caution: 1.0, danger: 3.0, block: 8.0 } as ThresholdSet,
  crossProviderSpreadPct: { caution: 0.5, danger: 2.0, block: 5.0 } as ThresholdSet,
  // Staleness is now cadence-relative (see feedCadence.isCadenceStale): a feed
  // is stale only vs ITS OWN observed cadence, surfaced as a soft CAUTION that
  // never blocks. The `block` value here is the ABSOLUTE hard backstop (7 days)
  // for feeds that are genuinely stuck regardless of cadence. `caution`/`danger`
  // are retained for reference only — the cadence gate does not escalate to them.
  dataStaleSeconds: { caution: 60, danger: 180, block: HARD_STALE_BLOCK_SECONDS } as ThresholdSet,
  // agreement is low-is-bad: below the threshold triggers the verdict
  crossProviderAgreement: { caution: 0.95, danger: 0.85, block: 0.7 } as ThresholdSet,
  stablecoinDepegPct: { caution: 0.3, danger: 1.0, block: 3.0 } as ThresholdSet,
} as const;

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
const STALE_DIVERGENCE_BLOCK_PCT = 2.0;

/**
 * Protocol-buffer rule thresholds (high-is-bad, % of max-LTV safety buffer
 * consumed by the current cross-oracle deviation). Only applied to lending
 * actions — a swap doesn't open a liquidatable position, so the protocol
 * context stays informational for swaps.
 */
const PROTOCOL_BUFFER_THRESHOLDS = { caution: 50, danger: 80 } as const;
/**
 * Borrow is hard-frozen when cross-oracle dispersion consumes this % of the
 * protocol's max-LTV liquidation buffer. Chosen from the threshold simulation
 * (scripts/insight_lending_safety/sim_threshold.mjs): at 95% the real hourly
 * deviation data showed ~0% false-freeze even with the sustained-only gate.
 */
const LENDING_FREEZE_BUFFER_PCT = 95;
/**
 * Sustained-only gate for the freeze: the high buffer consumption must also be
 * statistically significant (24h z-score elevated) or still rising (3h deviation
 * velocity > 0). A one-tick spike that happens to cross 95% on otherwise-normal
 * volatility is NOT frozen — this is the anti-false-positive guard.
 */
const LENDING_FREEZE_ZSCORE_MIN = 1.0;
const LENDING_ACTIONS: readonly TradeAction[] = ['borrow', 'lend', 'repay', 'liquidate'];

const VERDICT_RANK: Record<SafetyVerdict, number> = {
  PASS: 0,
  CAUTION: 1,
  DANGER: 2,
  BLOCK: 3,
};

function pickWorst(current: SafetyVerdict, candidate: SafetyVerdict): SafetyVerdict {
  return VERDICT_RANK[candidate] > VERDICT_RANK[current] ? candidate : current;
}

/** A non-PASS verdict produced by a rule. PASS is never returned by a rule —
 *  its absence (null) is what keeps the overall verdict at PASS. */
type RuleVerdict = 'CAUTION' | 'DANGER' | 'BLOCK';

/** For metrics where a HIGH value is bad (deviation, spread, staleness, depeg). */
function evaluateHighIsBad(value: number, t: ThresholdSet, abs = false): RuleVerdict | null {
  const v = abs ? Math.abs(value) : value;
  if (v >= t.block) return 'BLOCK';
  if (v >= t.danger) return 'DANGER';
  if (v >= t.caution) return 'CAUTION';
  return null;
}

/** For metrics where a LOW value is bad (agreement). */
function evaluateLowIsBad(value: number, t: ThresholdSet): RuleVerdict | null {
  if (value <= t.block) return 'BLOCK';
  if (value <= t.danger) return 'DANGER';
  if (value <= t.caution) return 'CAUTION';
  return null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return clamp01(value / max);
}

// ---------------------------------------------------------------------------
// Audit logging (fire-and-forget, non-blocking)
// ---------------------------------------------------------------------------

export interface AuditMeta {
  apiKeyId?: string;
}

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

    await client.from('pre_trade_checks').insert({
      asset: input.asset,
      chain_id: input.chainId,
      action: input.action,
      trade_amount_usd: input.tradeAmountUsd,
      target_providers: input.targetProviders ?? null,
      api_key_id: meta.apiKeyId ?? null,
      protocol_id: input.protocolId ?? null,
      protocol_safety: result.protocolSafety,
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
      ml_model_version: result.mlModelVersion,
      latency_ms: result.latencyMs,
      signed,
      attestation_uid: attestationUid,
      attester,
      schema_version: schemaVersion,
      coverage_status: coverageStatus,
      unresolved_asset: unresolvedAsset,
    });
  } catch (error) {
    // Non-blocking: audit failure must never fail the safety check itself.
    logger.warn('Failed to write pre_trade_checks audit row', {
      error: error instanceof Error ? error.message : String(error),
    });
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
      isStale,
      confidence: p.confidence,
      reputationScore: p.reputationScore,
      status: p.status,
    };
  }
  return out;
}

function computeMaxDeviation(
  providerPrices: Record<string, ProviderPriceDetail>,
  targetProviders?: string[]
): number {
  const entries = Object.entries(providerPrices);
  const filtered =
    targetProviders && targetProviders.length > 0
      ? entries.filter(([provider]) => targetProviders.includes(provider))
      : entries;
  const successful = filtered.filter(([, d]) => d.status === 'success' && d.deviationPct !== null);
  if (successful.length === 0) return 0;
  return Math.max(...successful.map(([, d]) => Math.abs(d.deviationPct as number)));
}

function computeSpread(
  providerPrices: Record<string, ProviderPriceDetail>,
  targetProviders?: string[]
): number {
  const entries = Object.entries(providerPrices);
  const filtered =
    targetProviders && targetProviders.length > 0
      ? entries.filter(([provider]) => targetProviders.includes(provider))
      : entries;
  const prices = filtered
    .filter(([, d]) => d.status === 'success' && d.price > 0)
    .map(([, d]) => d.price);
  if (prices.length < 2) return 0;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const ref = (min + max) / 2;
  return ref > 0 ? ((max - min) / ref) * 100 : 0;
}

function computeStaleRisk(
  providerPrices: Record<string, ProviderPriceDetail>,
  stalenessBaselines: Map<string, number | null>
): {
  staleRisk: boolean;
  maxAge: number;
  staleProviders: string[];
} {
  const entries = Object.entries(providerPrices).filter(
    ([, d]) => d.status === 'success' && d.dataAgeSeconds !== null
  );
  if (entries.length === 0) return { staleRisk: false, maxAge: 0, staleProviders: [] };

  let maxAge = 0;
  const staleProviders: string[] = [];
  for (const [provider, d] of entries) {
    const age = d.dataAgeSeconds as number;
    maxAge = Math.max(maxAge, age);
    // Cadence-relative: stale only vs the feed's own observed rhythm. A feed
    // with no baseline (not backfilled) is never flagged here — the 7-day
    // absolute hard-block backstop still catches genuinely dead feeds.
    if (isCadenceStale(age, stalenessBaselines.get(provider) ?? null)) {
      staleProviders.push(provider);
    }
  }
  return { staleRisk: staleProviders.length > 0, maxAge, staleProviders };
}

/**
 * Classify providers whose data age is >= the absolute 7d backstop. Each such
 * provider is a candidate "dead feed" — but a stale timestamp alone must not
 * hard-block, because some oracles (API3 communal dAPIs) report a 7-120d-old
 * `updatedAt` while serving a CURRENT price. We corroborate against the fresh
 * consensus:
 *
 *  - if the stale provider's price diverges from the fresh median by more than
 *    STALE_DIVERGENCE_BLOCK_PCT, the data is genuinely dead -> hard BLOCK;
 *  - if its price still agrees with consensus, it is a timestamp-source anomaly
 *    -> surface as a soft CAUTION, never a block;
 *  - if NO provider is fresh (total oracle outage), we cannot corroborate and
 *    fail closed -> BLOCK on the absolute age.
 */
function classifyStalenessHardBlock(providerPrices: Record<string, ProviderPriceDetail>): {
  hardBlock: boolean;
  hardStaleProviders: string[];
  timestampAnomalyProviders: string[];
} {
  const successful = Object.entries(providerPrices).filter(
    ([, d]) => d.status === 'success' && d.dataAgeSeconds !== null && d.price > 0
  );
  const absolutelyStale = successful.filter(
    ([, d]) => (d.dataAgeSeconds as number) >= HARD_STALE_BLOCK_SECONDS
  );
  if (absolutelyStale.length === 0) {
    return { hardBlock: false, hardStaleProviders: [], timestampAnomalyProviders: [] };
  }

  // Fresh reference = median price of providers that are NOT absolutely stale.
  const freshPrices = successful
    .filter(([, d]) => (d.dataAgeSeconds as number) < HARD_STALE_BLOCK_SECONDS)
    .map(([, d]) => d.price);
  const hasFreshReference = freshPrices.length > 0;
  const ref = median(freshPrices.length > 0 ? freshPrices : successful.map(([, d]) => d.price));

  if (!hasFreshReference) {
    // Every successful provider is >= the backstop old; cannot corroborate
    // freshness, so treat all as genuinely dead (fail-closed).
    return {
      hardBlock: true,
      hardStaleProviders: absolutelyStale.map(([p]) => p),
      timestampAnomalyProviders: [],
    };
  }

  const hardStaleProviders: string[] = [];
  const timestampAnomalyProviders: string[] = [];
  for (const [provider, d] of absolutelyStale) {
    const deviation = ref > 0 ? (Math.abs(d.price - ref) / ref) * 100 : 0;
    if (deviation > STALE_DIVERGENCE_BLOCK_PCT) {
      hardStaleProviders.push(provider);
    } else {
      timestampAnomalyProviders.push(provider);
    }
  }
  return {
    hardBlock: hardStaleProviders.length > 0,
    hardStaleProviders,
    timestampAnomalyProviders,
  };
}

async function fetchDepegWarnings(): Promise<DepegWarning[]> {
  try {
    const snapshots = await calculateAllStablecoinSnapshots();
    return snapshots
      .filter((s) => Math.abs(s.maxDeviationPercent) >= THRESHOLDS.stablecoinDepegPct.caution)
      .map((s) => ({
        stablecoin: s.symbol,
        deviationPct: s.maxDeviationPercent,
        riskLevel: s.riskLevel,
      }));
  } catch {
    // Non-blocking: depeg data unavailable should not fail the safety check.
    return [];
  }
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
 * Build the concrete, user-executable lending-safety actions from the protocol
 * buffer context. This is the "actionable" half of the cross-oracle dispersion
 * signal: rather than only flagging risk, it tells the borrower exactly what to
 * do (freeze / wait for convergence / add collateral / borrow less).
 */
function buildLendingActions(args: {
  protocolSafety: ProtocolSafetyContext;
  maxDeviationPct: number;
  frozen: boolean;
}): LendingSafetyAction[] {
  const { protocolSafety, maxDeviationPct, frozen } = args;
  const { bufferConsumedPct, criticalDeviationPct, protocolName } = protocolSafety;
  // Deviation that brings the buffer back down to the CAUTION line (50%).
  const targetDeviationPct = roundTo(
    criticalDeviationPct * (PROTOCOL_BUFFER_THRESHOLDS.caution / 100),
    2
  );
  const actions: LendingSafetyAction[] = [];

  if (frozen) {
    actions.push({
      type: 'freeze_borrow',
      severity: 'block',
      title: 'New borrowing is frozen',
      detail: `Cross-oracle dispersion currently consumes ${bufferConsumedPct.toFixed(0)}% of ${protocolName}'s max-LTV liquidation buffer. Borrowing now risks forced liquidation on a single provider tick. Wait for oracle consensus to converge.`,
    });
  }

  if (frozen || bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.danger) {
    actions.push({
      type: 'wait_convergence',
      severity: frozen ? 'danger' : 'caution',
      title: 'Wait for oracle consensus to converge',
      detail: `Do not borrow until cross-oracle deviation falls to ≤ ${targetDeviationPct}% (currently ${maxDeviationPct.toFixed(2)}%). This re-widens the liquidation buffer before you take on debt.`,
      targetDeviationPct,
    });
  }

  if (bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.caution) {
    actions.push({
      type: 'add_collateral',
      severity: bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.danger ? 'danger' : 'caution',
      title: 'Add collateral or borrow less',
      detail: `Oracle dispersion already consumes ${bufferConsumedPct.toFixed(0)}% of the liquidation buffer. Add collateral to re-widen it, or keep the new borrow small.`,
      targetBufferPct: PROTOCOL_BUFFER_THRESHOLDS.caution,
    });
  }

  return actions;
}

/**
 * Evaluate the cross-oracle dispersion rule for lending actions in isolation,
 * so the (large) preTradeSafetyCheck function stays within its line budget and
 * the rule stays readable. Returns the verdict contribution, contributing
 * factors, warnings, and concrete lending actions — the caller merges them in.
 *
 * Decisive & actionable: when dispersion already consumes a share of the
 * protocol's max-LTV liquidation buffer it (a) escalates the verdict and
 * (b) freezes NEW borrowing once consumption reaches LENDING_FREEZE_BUFFER_PCT
 * AND is sustained (24h z-score elevated OR 3h deviation velocity still
 * rising). Swaps are excluded — a swap opens no liquidatable position, so the
 * context stays informational only. The freeze is deterministic (oracle
 * dispersion + historical sustainedness); the ML manipulation score is
 * intentionally NOT consulted here, since it is unvalidated for
 * manipulation-specific accuracy.
 */
type ProtocolBufferRuleResult = {
  verdict: RuleVerdict | null;
  factors: ContributingFactor[];
  warnings: string[];
  actions: LendingSafetyAction[];
};

function evaluateProtocolBufferRule(args: {
  protocolSafety: ProtocolSafetyContext | null;
  action: TradeAction;
  asset: string;
  maxDeviationPct: number;
  historicalState: HistoricalOracleState;
}): ProtocolBufferRuleResult {
  const empty: ProtocolBufferRuleResult = { verdict: null, factors: [], warnings: [], actions: [] };
  // Lending actions only; swaps stay informational (no liquidatable position).
  if (!args.protocolSafety || !LENDING_ACTIONS.includes(args.action)) return empty;
  const ps = args.protocolSafety;
  const b = ps.bufferConsumedPct;
  const result: ProtocolBufferRuleResult = { ...empty };

  const bufferVerdict: RuleVerdict | null =
    b >= PROTOCOL_BUFFER_THRESHOLDS.danger
      ? 'DANGER'
      : b >= PROTOCOL_BUFFER_THRESHOLDS.caution
        ? 'CAUTION'
        : null;
  if (bufferVerdict) {
    result.verdict = bufferVerdict;
    result.factors.push({
      rule: 'protocol_buffer_consumed',
      value: b,
      threshold: PROTOCOL_BUFFER_THRESHOLDS[bufferVerdict.toLowerCase() as 'caution' | 'danger'],
      triggeredVerdict: bufferVerdict,
      message: `Current oracle deviation consumes ${b.toFixed(1)}% of ${ps.protocolName}'s max-LTV safety buffer (critical deviation ${ps.criticalDeviationPct.toFixed(2)}%) for ${args.asset}.`,
    });
    result.warnings.push(
      `Oracle deviation vs ${ps.protocolName} liquidation buffer: ${b.toFixed(0)}% consumed.`
    );
  }

  // Decisive freeze (lending only): block NEW borrowing once dispersion
  // consumes >= LENDING_FREEZE_BUFFER_PCT of the buffer, but only when it is
  // sustained — a one-tick spike on otherwise-normal volatility is NOT frozen
  // (anti-false-positive), matching the threshold-simulation result (~0%
  // false-freeze at 95%).
  const isSustained =
    args.historicalState.maxDeviationZscore24h >= LENDING_FREEZE_ZSCORE_MIN ||
    args.historicalState.deviationVelocity3h > 0;
  const frozen = b >= LENDING_FREEZE_BUFFER_PCT && isSustained;
  if (frozen) {
    result.verdict = 'BLOCK';
    result.factors.push({
      rule: 'protocol_buffer_frozen',
      value: b,
      threshold: LENDING_FREEZE_BUFFER_PCT,
      triggeredVerdict: 'BLOCK',
      message: `Borrow frozen: cross-oracle dispersion consumes ${b.toFixed(1)}% of ${ps.protocolName}'s max-LTV liquidation buffer and is sustained (z=${args.historicalState.maxDeviationZscore24h.toFixed(2)}, v3h=${args.historicalState.deviationVelocity3h.toFixed(2)}).`,
    });
    result.warnings.push(
      `Borrowing frozen: oracle dispersion consumes ${b.toFixed(0)}% of ${ps.protocolName}'s liquidation buffer and is not converging.`
    );
  }

  result.actions = buildLendingActions({
    protocolSafety: ps,
    maxDeviationPct: args.maxDeviationPct,
    frozen,
  });
  return result;
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
}): ManipulationRiskResult {
  let mlScore: number | null = null;
  let mlModelVersion: string | null = null;
  let mlScore1h: number | null = null;
  let mlScore6h: number | null = null;
  let anomalyScore = 0;
  try {
    const successfulProviders = Object.values(args.providerPrices).filter(
      (d) => d.status === 'success'
    );
    const absDevs = successfulProviders
      .map((d) => d.deviationPct)
      .filter((v): v is number => v !== null)
      .map((v) => Math.abs(v));
    const meanDeviationPct =
      absDevs.length > 0 ? absDevs.reduce((s, v) => s + v, 0) / absDevs.length : 0;
    const staleRatio =
      successfulProviders.length > 0
        ? successfulProviders.filter((d) => d.isStale).length / successfulProviders.length
        : 0;
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
    const multi: MultiHorizonScore | null = scorePreTradeMultiHorizon({
      maxDeviationPct: args.maxDeviationPct,
      spreadPct: args.spreadPct,
      participantCount: args.consensus.participantCount,
      staleDataRisk: args.staleRisk,
      meanDeviationPct: roundTo(meanDeviationPct, 4),
      staleRatio: roundTo(staleRatio, 4),
      deviationVelocity1h: hist.deviationVelocity1h,
      rollingVolatility6h: hist.rollingVolatility6h,
      deviationVelocity3h: hist.deviationVelocity3h,
      participantCountDelta1h: hist.participantCountDelta1h,
      maxDeviationZscore24h: hist.maxDeviationZscore24h,
    });
    if (multi !== null) {
      mlScore = multi.combined;
      mlScore1h = multi.score1h;
      mlScore6h = multi.score6h;
      mlModelVersion = getModelStatus().trainedAt;
    }
  } catch (error) {
    logger.warn('ML scoring failed; falling back to rule-based risk score', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
  return { mlScore, mlModelVersion, mlScore1h, mlScore6h, anomalyScore, manipulationRiskScore };
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
  maxDeviationPct: number
): Promise<ProtocolSafetyContext | null> {
  try {
    const protocol = await getProtocolByIdWithDynamicData(protocolId);
    if (!protocol) return null;

    // Match by symbol or priceSymbol (derivative tokens track an underlying).
    const assetConfig = protocol.assets.find((a) => a.symbol === asset || a.priceSymbol === asset);
    if (!assetConfig) return null;

    const { liquidationThreshold, maxLtv } = assetConfig;
    if (liquidationThreshold <= 0 || maxLtv <= 0) return null;

    // At max LTV, collateral ratio = 1/maxLtv. Liquidation triggers when the
    // ratio falls to liquidationThreshold. The collateral-drop deviation that
    // bridges the two is: 1 − liquidationThreshold × maxLtv.
    const criticalDeviationPct = Math.max(0, (1 - liquidationThreshold * maxLtv) * 100);
    if (criticalDeviationPct <= 0) return null;

    const bufferConsumedPct = Math.min(
      100,
      (Math.abs(maxDeviationPct) / criticalDeviationPct) * 100
    );

    return {
      protocolId: protocol.id,
      protocolName: protocol.name,
      criticalDeviationPct: roundTo(criticalDeviationPct, 2),
      bufferConsumedPct: roundTo(bufferConsumedPct, 2),
      liquidationThreshold,
      maxLtv,
    };
  } catch (error) {
    // Non-blocking: protocol context unavailable must never fail the check.
    logger.warn('Failed to compute protocol safety context', {
      protocolId,
      asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
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
 * status. `feedId` is left empty in v2.0 — feed-level granularity would require
 * an oracle_feeds lookup (a hot-path DB read this service deliberately avoids);
 * the provider namespace is the primary evidence key and is sufficient for the
 * v2.0 binding. Outlier providers remain `included` (they contributed to the
 * consensus); only unsupported/error providers are marked excluded.
 */
function buildProviderObservations(consensus: ConsensusPriceResponse): ProviderObservationEntry[] {
  return consensus.providers.map((p) => {
    const included = p.status === 'success';
    let exclusionReason = '';
    if (!included) {
      exclusionReason = p.status === 'unsupported' ? 'UNSUPPORTED' : 'ERROR';
    }
    return {
      provider: p.provider,
      feedId: '',
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
  aggregates: { maxAge: number; worstDepegPct: number }
): Promise<OracleSafetyAttestation | OracleSafetyAttestationV2 | OracleSafetyAttestationV3 | null> {
  // v1 path (default) — unchanged behavior.
  if (input.schemaVersion !== 2 && input.schemaVersion !== 3) {
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

  // v2 and v3 take the same evidence and the same gates. v3 additionally signs
  // the independence threshold, so a holder of the receipt can check the gate
  // without access to this codebase.
  return input.schemaVersion === 3
    ? signAttestationV3(attestationInput)
    : signAttestationV2(attestationInput);
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
    .filter((p) => p.status === 'success')
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
 * Run a pre-trade oracle safety check.
 *
 * @param input Trade intent (asset, chain, action, amount).
 * @param meta  Optional audit metadata (api key id for attribution).
 */
export async function preTradeSafetyCheck(
  input: PreTradeSafetyInput,
  meta: AuditMeta = {}
): Promise<PreTradeSafetyResult> {
  const startedAt = Date.now();
  const warnings: string[] = [];
  const contributingFactors: ContributingFactor[] = [];

  // Resolve chain name (Blockchain string) from numeric chainId.
  const chain = getBlockchainByChainId(input.chainId);

  // 1. Cross-oracle consensus price (also embeds reputation + agreement).
  let consensus: ConsensusPriceResponse | undefined;
  let consensusFailed = false;
  try {
    consensus = await getConsensusPrice(input.asset, chain);
  } catch (error) {
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

  // 2. Stablecoin depeg warnings (non-blocking).
  const depegWarnings = await fetchDepegWarnings();

  const startedAtMs = Date.now();

  // If consensus failed, short-circuit to BLOCK.
  if (consensusFailed || !consensus) {
    const result: PreTradeSafetyResult = {
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
      anomalyScore: 0,
      attestation: null,
      evaluatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    };

    // Even for zero-coverage BLOCKs, sign the attestation. The signed
    // attestation proves Insight issued the BLOCK, making it provable
    // downstream. An empty consensus (no providers) is used since no
    // oracle data was available — the CAIP-19 resolution and remaining
    // fields still produce a valid, verifiable attestation.
    try {
      const emptyConsensus = {
        symbol: input.asset,
        chain: chain,
        consensusPrice: 0,
        method: 'reference' as ConsensusMethod,
        recommendedMethod: 'reference' as ConsensusMethod,
        confidence: 0,
        confidenceLevel: 'very_low' as const,
        agreement: 0,
        participantCount: 0,
        excludedCount: 0,
        excludedProviders: [],
        priceRange: { min: 0, max: 0 },
        methodResults: {} as Record<ConsensusMethod, number>,
        providers: [],
        recommendedProvider: null,
      };
      result.attestation = await issueAttestation(input, result, emptyConsensus, {
        maxAge: 0,
        worstDepegPct: 0,
      });
    } catch (error) {
      logger.warn('Failed to issue attestation for zero-coverage BLOCK', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    void logAudit(input, result, meta);
    return result;
  }

  // 3. Build per-provider detail map.
  // Fetch observed-cadence baselines for this symbol (single indexed query).
  // NON-BLOCKING: on any failure we fall back to an empty map → no cadence
  // CAUTION, but the 7-day absolute hard-block backstop still applies.
  let stalenessBaselines: Map<string, number | null> = new Map();
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const supabase = createServiceRoleClient();
    const fetched = await getFeedStalenessBaselineMap(supabase, input.asset);
    if (fetched instanceof Map) stalenessBaselines = fetched;
  } catch (e) {
    logger.warn('Failed to load staleness baselines; staleness will use absolute backstop only', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

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
    .map((d) => d.reputationScore)
    .filter((s): s is number => s !== null);
  const minReputation = reputationScores.length > 0 ? Math.min(...reputationScores) : 75;

  // 4b. Protocol safety context (optional — only when protocolId is provided).
  // Derives a position-free safety buffer from the protocol's own published,
  // scheduled-fetched risk params. Non-blocking: null when unavailable.
  const protocolSafety = input.protocolId
    ? await computeProtocolSafety(input.protocolId, input.asset, maxDeviationPct)
    : null;

  // 4c. One bounded historical fetch — also reused by the ML/anomaly layer below
  // (step 6) so we pay a single DB round-trip. The lending freeze rule uses it to
  // distinguish a sustained buffer erosion from a one-tick volatility spike.
  let historicalState: HistoricalOracleState = EMPTY_HISTORY;
  try {
    historicalState = await fetchHistoricalOracleState(input.asset, {
      maxDeviationPct,
      consensusPrice: consensus.consensusPrice,
      participantCount: consensus.participantCount,
    });
  } catch (error) {
    logger.warn('Historical oracle state fetch failed; lending freeze uses snapshot only', {
      asset: input.asset,
      error: error instanceof Error ? error.message : String(error),
    });
  }

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

  // Cadence-relative staleness: a SOFT CAUTION only — never blocks. A feed is
  // stale only vs its own observed cadence (feedCadence.isCadenceStale), so
  // naturally-slow sources are never falsely flagged and never blocked. The
  // absolute 7-day threshold (THRESHOLDS.dataStaleSeconds.block) is the only
  // hard-block backstop, for feeds that are genuinely stuck.
  if (staleRisk) {
    verdict = pickWorst(verdict, 'CAUTION');
    // Representative effective threshold: K × the tightest stale baseline.
    const staleBaselines = staleProviders
      .map((p) => stalenessBaselines.get(p) ?? 0)
      .filter((b) => b > 0);
    const effectiveThreshold =
      staleBaselines.length > 0
        ? CAUTION_STALE_MULTIPLIER * Math.min(...staleBaselines)
        : STALE_FLOOR_SECONDS;
    contributingFactors.push({
      rule: 'data_stale_seconds',
      value: maxAge,
      threshold: effectiveThreshold,
      triggeredVerdict: 'CAUTION',
      message: `Stale oracle data: ${staleProviders.join(', ')} exceed their observed update cadence (max age ${maxAge}s).`,
    });
    warnings.push(`Oracle data is stale vs its own cadence (max age ${maxAge}s).`);
  }
  // Hard backstop (consensus-aware): a feed is only BLOCKED as "extremely stale"
  // when it is BOTH >= the absolute backstop age AND its price diverges from the
  // fresh consensus (proving the data is genuinely dead, not just a stale
  // timestamp). A stale timestamp whose price still agrees with consensus is a
  // timestamp-source anomaly (e.g. API3 communal dAPIs report 7-120d-old
  // `updatedAt` while serving current prices) and must NOT hard-block — it
  // surfaces as a soft CAUTION instead. When NO provider is fresh (total oracle
  // outage) we cannot corroborate and fall back to the absolute age -> BLOCK.
  const hardStale = classifyStalenessHardBlock(providerPrices);
  if (hardStale.hardBlock) {
    verdict = pickWorst(verdict, 'BLOCK');
    contributingFactors.push({
      rule: 'data_stale_seconds',
      value: maxAge,
      threshold: THRESHOLDS.dataStaleSeconds.block,
      triggeredVerdict: 'BLOCK',
      message: `Oracle data extremely stale AND diverges from consensus: ${hardStale.hardStaleProviders.join(', ')} (max age ${maxAge}s >= ${THRESHOLDS.dataStaleSeconds.block}s absolute backstop).`,
    });
    warnings.push(`Oracle data is extremely stale (max age ${maxAge}s).`);
  }
  if (hardStale.timestampAnomalyProviders.length > 0) {
    verdict = pickWorst(verdict, 'CAUTION');
    contributingFactors.push({
      rule: 'data_stale_timestamp_anomaly',
      value: maxAge,
      threshold: THRESHOLDS.dataStaleSeconds.block,
      triggeredVerdict: 'CAUTION',
      message: `Stale timestamp but price in consensus: ${hardStale.timestampAnomalyProviders.join(', ')} (max age ${maxAge}s) — likely a timestamp-source anomaly, not dead data.`,
    });
    warnings.push(
      `Stale timestamp reported by ${hardStale.timestampAnomalyProviders.join(', ')} but price agrees with consensus (possible timestamp-source anomaly).`
    );
  }

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

  // Depeg: take the worst active depeg warning.
  const worstDepeg = depegWarnings.reduce<number>(
    (max, w) => (Math.abs(w.deviationPct) > max ? Math.abs(w.deviationPct) : max),
    0
  );
  const depegVerdict = evaluateHighIsBad(worstDepeg, THRESHOLDS.stablecoinDepegPct);
  if (depegVerdict) {
    verdict = pickWorst(verdict, depegVerdict);
    const worstCoin = depegWarnings.reduce<string | null>(
      (pick, w) => (Math.abs(w.deviationPct) >= worstDepeg ? w.stablecoin : pick),
      null
    );
    contributingFactors.push({
      rule: 'stablecoin_depeg_pct',
      value: roundTo(worstDepeg, 4),
      threshold:
        THRESHOLDS.stablecoinDepegPct[depegVerdict.toLowerCase() as 'caution' | 'danger' | 'block'],
      triggeredVerdict: depegVerdict,
      message: `Stablecoin ${worstCoin ?? ''} depeg ${worstDepeg.toFixed(2)}% exceeds ${depegVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(`Active stablecoin depeg detected (${worstDepeg.toFixed(2)}%).`);
  }

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
  const risk = computeManipulationRisk({
    providerPrices,
    historicalState,
    maxDeviationPct,
    spreadPct,
    consensus,
    staleRisk,
    agreement,
    minReputation,
  });
  const mlScore = risk.mlScore;
  const mlModelVersion = risk.mlModelVersion;
  const mlScore1h = risk.mlScore1h;
  const mlScore6h = risk.mlScore6h;
  const anomalyScore = risk.anomalyScore;
  const manipulationRiskScore = risk.manipulationRiskScore;

  // 7. Recommended max position.
  const recommendedMaxPositionUsd = computeRecommendedMaxPosition(maxDeviationPct, protocolSafety);

  // 8. Amount vs recommended position sanity.
  if (input.tradeAmountUsd > recommendedMaxPositionUsd * 3) {
    verdict = pickWorst(verdict, 'DANGER');
    contributingFactors.push({
      rule: 'position_to_liquidity_ratio',
      value: input.tradeAmountUsd,
      threshold: recommendedMaxPositionUsd * 3,
      triggeredVerdict: 'DANGER',
      message: `Trade size $${input.tradeAmountUsd.toLocaleString()} far exceeds recommended max $${recommendedMaxPositionUsd.toLocaleString()}.`,
    });
    warnings.push(
      `Trade size far exceeds recommended maximum ($${recommendedMaxPositionUsd.toLocaleString()}).`
    );
  } else if (input.tradeAmountUsd > recommendedMaxPositionUsd * 1.5) {
    verdict = pickWorst(verdict, 'CAUTION');
    contributingFactors.push({
      rule: 'position_to_liquidity_ratio',
      value: input.tradeAmountUsd,
      threshold: recommendedMaxPositionUsd * 1.5,
      triggeredVerdict: 'CAUTION',
      message: `Trade size $${input.tradeAmountUsd.toLocaleString()} exceeds recommended max $${recommendedMaxPositionUsd.toLocaleString()}.`,
    });
    warnings.push(
      `Trade size exceeds recommended maximum ($${recommendedMaxPositionUsd.toLocaleString()}).`
    );
  }

  // 9. Outlier provider warning (informational).
  const outliers = Object.entries(providerPrices)
    .filter(([, d]) => d.isOutlier)
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

  void startedAtMs; // marker for future per-phase timing

  const result: PreTradeSafetyResult = {
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
    anomalyScore,
    // Non-blocking: sign the verdict as an EIP-712 offchain attestation. null
    // when no attester key is configured — never affects the verdict itself.
    attestation: null,
    evaluatedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };

  try {
    result.attestation = await issueAttestation(input, result, consensus, {
      maxAge,
      worstDepegPct,
    });
  } catch (error) {
    logger.warn('Failed to issue attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fire-and-forget audit log (builds the data flywheel for future ML).
  void logAudit(input, result, meta);

  return result;
}
