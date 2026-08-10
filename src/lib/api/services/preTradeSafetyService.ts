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
  type OracleSafetyAttestationV2,
  V2_REQUIRED_PARTICIPANT_COUNT,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';
import { UnsupportedSymbolError } from '@/lib/errors';
import {
  getModelStatus,
  scorePreTradeMultiHorizon,
  type MultiHorizonScore,
} from '@/lib/ml/inference';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { createLogger } from '@/lib/utils/logger';

import { getConsensusPrice, type ConsensusPriceResponse } from './consensusPriceService';

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
   * spec. The verdict itself differs only in that v2 escalates <3 independent
   * providers to BLOCK (INSUFFICIENT_COVERAGE).
   */
  schemaVersion?: 1 | 2;
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
  attestation: OracleSafetyAttestation | OracleSafetyAttestationV2 | null;
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
  dataStaleSeconds: { caution: 60, danger: 180, block: 600 } as ThresholdSet,
  // agreement is low-is-bad: below the threshold triggers the verdict
  crossProviderAgreement: { caution: 0.95, danger: 0.85, block: 0.7 } as ThresholdSet,
  stablecoinDepegPct: { caution: 0.3, danger: 1.0, block: 3.0 } as ThresholdSet,
} as const;

/**
 * Protocol-buffer rule thresholds (high-is-bad, % of max-LTV safety buffer
 * consumed by the current cross-oracle deviation). Only applied to lending
 * actions — a swap doesn't open a liquidatable position, so the protocol
 * context stays informational for swaps.
 */
const PROTOCOL_BUFFER_THRESHOLDS = { caution: 50, danger: 80 } as const;
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
    });
  } catch (error) {
    // Non-blocking: audit failure must never fail the safety check itself.
    logger.warn('Failed to write pre_trade_checks audit row', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Per-hour cross-oracle state, mined from hourly_price_snapshots. */
interface HourlyPoint {
  hour: string;
  maxDeviationPct: number;
  consensusPrice: number;
  participantCount: number;
}

/** Result of the shared historical fetch — drives BOTH ML features + anomaly. */
interface HistoricalOracleState {
  /** Completed hourly points, OLDEST first. Empty on fetch failure. */
  history: HourlyPoint[];
  /** v2 ML temporal features (0 when history is insufficient). */
  deviationVelocity1h: number;
  deviationVelocity3h: number;
  participantCountDelta1h: number;
  rollingVolatility6h: number;
  maxDeviationZscore24h: number;
}

const EMPTY_HISTORY: HistoricalOracleState = {
  history: [],
  deviationVelocity1h: 0,
  deviationVelocity3h: 0,
  participantCountDelta1h: 0,
  rollingVolatility6h: 0,
  maxDeviationZscore24h: 0,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Fetch the last ~30h of hourly snapshots for `asset` and compute the 5 temporal
 * ML features (deviation_velocity_1h/3h, participant_count_delta_1h,
 * rolling_volatility_6h, max_deviation_zscore_24h) PLUS return the hourly series
 * for the unsupervised anomaly layer. ONE query serves both Step 1 (ML features)
 * and Step 2 (anomaly score), so the pre-trade check adds only a single bounded
 * read regardless of how many features the model grows to.
 *
 * Mirrors build_hourly_frame() in ml/train.py so training and live inference see
 * the SAME feature semantics. Fault-tolerant: any error returns EMPTY_HISTORY so
 * the ML score degrades to "no temporal signal" rather than failing the check.
 *
 * A snapshot <45 min old is the still-forming current hour and is excluded from
 * the COMPLETED history used for velocities, matching training's max_dev(T) -
 * max_dev(T-1). The live check is the "now" point on top of this history.
 */
async function fetchHistoricalOracleState(
  asset: string,
  live: { maxDeviationPct: number; consensusPrice: number; participantCount: number }
): Promise<HistoricalOracleState> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const client = createServiceRoleClient();
    const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('hourly_price_snapshots')
      .select('snapshot_hour,deviation_pct,price')
      .eq('symbol', asset)
      .eq('is_success', true)
      .gte('snapshot_hour', cutoff)
      .order('snapshot_hour', { ascending: true })
      .limit(2000);
    if (error || !data || data.length === 0) return EMPTY_HISTORY;

    // Group by hour -> max |deviation|, median price (consensus), participant count.
    const byHour = new Map<string, { devs: number[]; prices: number[]; count: number }>();
    for (const row of data) {
      const dev = Math.abs(Number(row.deviation_pct));
      const price = Number(row.price);
      if (!Number.isFinite(dev) || !Number.isFinite(price) || price <= 0) continue;
      const h = byHour.get(row.snapshot_hour) ?? { devs: [], prices: [], count: 0 };
      h.devs.push(dev);
      h.prices.push(price);
      h.count += 1;
      byHour.set(row.snapshot_hour, h);
    }
    if (byHour.size === 0) return EMPTY_HISTORY;

    const now = Date.now();
    const allHours = Array.from(byHour.keys()).sort(); // ascending ISO hour
    // Completed hours only (>= 45 min old): exclude the still-forming current hour.
    const completed: HourlyPoint[] = [];
    for (const hour of allHours) {
      const t = Date.parse(hour);
      if (Number.isNaN(t) || now - t < 45 * 60 * 1000) continue;
      const h = byHour.get(hour)!;
      completed.push({
        hour,
        maxDeviationPct: Math.max(...h.devs),
        consensusPrice: median(h.prices),
        participantCount: h.count,
      });
    }
    if (completed.length === 0) return { ...EMPTY_HISTORY, history: [] };

    const n = completed.length;
    const last = completed[n - 1];
    const lastMinus2 = n >= 3 ? completed[n - 3] : null;

    // Rolling 6h volatility of 1h consensus returns (std of pct-change, %).
    const series = completed.slice(-6);
    const returns: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1].consensusPrice;
      if (prev > 0) returns.push((series[i].consensusPrice - prev) / prev);
    }
    const rollingVolatility6h = returns.length >= 2 ? std(returns) * 100 : 0;

    // 24h z-score of max deviation: (live - mean24) / std24 over completed history.
    const devs = completed.map((p) => p.maxDeviationPct);
    const mean = devs.reduce((s, v) => s + v, 0) / devs.length;
    const devStd = std(devs);
    const maxDeviationZscore24h = devStd > 1e-9 ? (live.maxDeviationPct - mean) / devStd : 0;

    return {
      history: completed,
      deviationVelocity1h: round4(live.maxDeviationPct - last.maxDeviationPct),
      deviationVelocity3h: lastMinus2
        ? round4(live.maxDeviationPct - lastMinus2.maxDeviationPct)
        : 0,
      participantCountDelta1h: live.participantCount - last.participantCount,
      rollingVolatility6h: round4(rollingVolatility6h),
      maxDeviationZscore24h: round4(maxDeviationZscore24h),
    };
  } catch (error) {
    logger.warn('Historical oracle state fetch failed; using zeros', {
      asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return EMPTY_HISTORY;
  }
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round4(x: number): number {
  return Number.isFinite(x) ? Number(x.toFixed(4)) : 0;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function buildProviderPrices(
  consensus: ConsensusPriceResponse,
  staleThresholds: ThresholdSet
): Record<string, ProviderPriceDetail> {
  const out: Record<string, ProviderPriceDetail> = {};
  for (const p of consensus.providers) {
    const age = p.dataAgeSeconds;
    const isStale = age !== null && age >= staleThresholds.caution;
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

function computeStaleRisk(providerPrices: Record<string, ProviderPriceDetail>): {
  staleRisk: boolean;
  maxAge: number;
} {
  const ages = Object.values(providerPrices)
    .filter((d) => d.status === 'success' && d.dataAgeSeconds !== null)
    .map((d) => d.dataAgeSeconds as number);
  if (ages.length === 0) return { staleRisk: false, maxAge: 0 };
  const maxAge = Math.max(...ages);
  return { staleRisk: maxAge >= THRESHOLDS.dataStaleSeconds.caution, maxAge };
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
  return Number(clamp01(score).toFixed(4));
}

function computeRecommendedMaxPosition(
  manipulationRiskScore: number,
  maxDeviationPct: number
): number {
  const base = 1_000_000; // USD baseline
  const riskFactor = 1 - manipulationRiskScore;
  const deviationFactor = 1 / (1 + Math.abs(maxDeviationPct) / 2);
  const recommended = Math.round((base * riskFactor * deviationFactor) / 1000) * 1000;
  return Math.max(10_000, recommended);
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
      criticalDeviationPct: Number(criticalDeviationPct.toFixed(2)),
      bufferConsumedPct: Number(bufferConsumedPct.toFixed(2)),
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
): Promise<OracleSafetyAttestation | OracleSafetyAttestationV2 | null> {
  // v1 path (default) — unchanged behavior.
  if (input.schemaVersion !== 2) {
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

  return signAttestationV2({
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
  });
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
  let consensus: ConsensusPriceResponse;
  let consensusFailed = false;
  try {
    consensus = await getConsensusPrice(input.asset, chain);
  } catch (error) {
    if (error instanceof UnsupportedSymbolError) {
      // No oracle coverage for this asset/chain — cannot verify, treat as BLOCK.
      consensusFailed = true;
      consensus = undefined as unknown as ConsensusPriceResponse;
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
      } as unknown as ConsensusPriceResponse;
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
  const providerPrices = buildProviderPrices(consensus, THRESHOLDS.dataStaleSeconds);

  // 4. Compute aggregate metrics (optionally filtered to targetProviders).
  const maxDeviationPct = computeMaxDeviation(providerPrices, input.targetProviders);
  const spreadPct = computeSpread(providerPrices, input.targetProviders);
  const { staleRisk, maxAge } = computeStaleRisk(providerPrices);
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

  // 5. Rule engine.
  let verdict: SafetyVerdict = 'PASS';

  const deviationVerdict = evaluateHighIsBad(maxDeviationPct, THRESHOLDS.maxProviderDeviationPct);
  if (deviationVerdict) {
    verdict = pickWorst(verdict, deviationVerdict);
    contributingFactors.push({
      rule: 'max_provider_deviation_pct',
      value: Number(maxDeviationPct.toFixed(4)),
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
      value: Number(spreadPct.toFixed(4)),
      threshold:
        THRESHOLDS.crossProviderSpreadPct[
          spreadVerdict.toLowerCase() as 'caution' | 'danger' | 'block'
        ],
      triggeredVerdict: spreadVerdict,
      message: `Cross-provider spread ${spreadPct.toFixed(2)}% exceeds ${spreadVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(`Price spread between oracles ${spreadPct.toFixed(2)}% is elevated.`);
  }

  const staleVerdict = evaluateHighIsBad(maxAge, THRESHOLDS.dataStaleSeconds);
  if (staleVerdict && staleRisk) {
    verdict = pickWorst(verdict, staleVerdict);
    contributingFactors.push({
      rule: 'data_stale_seconds',
      value: maxAge,
      threshold:
        THRESHOLDS.dataStaleSeconds[staleVerdict.toLowerCase() as 'caution' | 'danger' | 'block'],
      triggeredVerdict: staleVerdict,
      message: `Stale oracle data (max age ${maxAge}s) exceeds ${staleVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(`Oracle data is stale (max age ${maxAge}s).`);
  }

  const agreementVerdict = evaluateLowIsBad(agreement, THRESHOLDS.crossProviderAgreement);
  if (agreementVerdict) {
    verdict = pickWorst(verdict, agreementVerdict);
    contributingFactors.push({
      rule: 'cross_provider_agreement',
      value: Number(agreement.toFixed(4)),
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
      value: Number(worstDepeg.toFixed(4)),
      threshold:
        THRESHOLDS.stablecoinDepegPct[depegVerdict.toLowerCase() as 'caution' | 'danger' | 'block'],
      triggeredVerdict: depegVerdict,
      message: `Stablecoin ${worstCoin ?? ''} depeg ${worstDepeg.toFixed(2)}% exceeds ${depegVerdict.toLowerCase()} threshold.`,
    });
    warnings.push(`Active stablecoin depeg detected (${worstDepeg.toFixed(2)}%).`);
  }

  // Protocol buffer rule (lending actions only): escalate when the current
  // cross-oracle deviation consumes a large share of the protocol's max-LTV
  // safety buffer. For swaps the context stays informational (no escalation),
  // since a swap doesn't open a liquidatable position.
  if (protocolSafety && LENDING_ACTIONS.includes(input.action)) {
    const bufferVerdict: RuleVerdict | null =
      protocolSafety.bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.danger
        ? 'DANGER'
        : protocolSafety.bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.caution
          ? 'CAUTION'
          : null;
    if (bufferVerdict) {
      verdict = pickWorst(verdict, bufferVerdict);
      contributingFactors.push({
        rule: 'protocol_buffer_consumed',
        value: protocolSafety.bufferConsumedPct,
        threshold: PROTOCOL_BUFFER_THRESHOLDS[bufferVerdict.toLowerCase() as 'caution' | 'danger'],
        triggeredVerdict: bufferVerdict,
        message: `Current oracle deviation consumes ${protocolSafety.bufferConsumedPct.toFixed(1)}% of ${protocolSafety.protocolName}'s max-LTV safety buffer (critical deviation ${protocolSafety.criticalDeviationPct.toFixed(2)}%) for ${input.asset}.`,
      });
      warnings.push(
        `Oracle deviation vs ${protocolSafety.protocolName} liquidation buffer: ${protocolSafety.bufferConsumedPct.toFixed(0)}% consumed.`
      );
    }
  }

  // 6. Manipulation risk score. ML-driven when a verified model is active
  // (replaces the hand-tuned weighted formula below); falls back to that
  // formula only when no model is available, so the check degrades gracefully
  // to rules-only. The verdict itself still comes from the rule engine — this
  // score feeds the displayed risk level and recommended position sizing.
  let mlScore: number | null = null;
  let mlModelVersion: string | null = null;
  let mlScore1h: number | null = null;
  let mlScore6h: number | null = null;
  let anomalyScore = 0;
  try {
    const successfulProviders = Object.values(providerPrices).filter((d) => d.status === 'success');
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

    // ONE bounded historical fetch serves both the 5 temporal ML features and the
    // unsupervised anomaly layer — no extra DB round-trip per feature.
    const hist = await fetchHistoricalOracleState(input.asset, {
      maxDeviationPct,
      consensusPrice: consensus.consensusPrice,
      participantCount: consensus.participantCount,
    });

    // Unsupervised anomaly score (Step 2): model-free outlier detection on the
    // 24h baseline. Catches novel manipulation the supervised ML can't.
    const anomaly: AnomalyScoreResult = computeAnomalyScore(
      hist.history.map((p) => ({
        maxDeviationPct: p.maxDeviationPct,
        consensusPrice: p.consensusPrice,
        participantCount: p.participantCount,
      })),
      maxDeviationPct
    );
    anomalyScore = anomaly.anomalyScore;

    // Supervised ML score (Step 1): dual-horizon (1h + 6h), combined = max so
    // EITHER horizon flagging risk raises manipulationRiskScore.
    const multi: MultiHorizonScore | null = scorePreTradeMultiHorizon({
      maxDeviationPct,
      spreadPct,
      participantCount: consensus.participantCount,
      staleDataRisk: staleRisk,
      meanDeviationPct: Number(meanDeviationPct.toFixed(4)),
      staleRatio: Number(staleRatio.toFixed(4)),
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
          maxDeviationPct,
          crossProviderAgreement: agreement,
          spreadPct,
          staleRisk,
          minReputation,
        });

  // 7. Recommended max position.
  const recommendedMaxPositionUsd = computeRecommendedMaxPosition(
    manipulationRiskScore,
    maxDeviationPct
  );

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

  // 10. v2 quorum gate (v2 only). v1 keeps its looser policy so existing
  // callers/tests are unaffected. v2 escalates <3 independent providers to
  // BLOCK + INSUFFICIENT_COVERAGE — Raul's locked "no single-provider verdicts"
  // stance. This is a verdict-level rule (independent of the attestation).
  if (input.schemaVersion === 2 && consensus.participantCount < V2_REQUIRED_PARTICIPANT_COUNT) {
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

  void startedAtMs; // marker for future per-phase timing

  const result: PreTradeSafetyResult = {
    verdict,
    consensusPrice: consensus.consensusPrice,
    maxDeviationPct: Number(maxDeviationPct.toFixed(4)),
    manipulationRiskScore,
    staleDataRisk: staleRisk,
    crossProviderAgreement: Number(agreement.toFixed(4)),
    recommendedMaxPositionUsd,
    participantCount: consensus.participantCount,
    providerPrices,
    depegWarnings,
    warnings: warnings.length > 0 ? warnings : ['No oracle risk signals detected.'],
    contributingFactors,
    protocolSafety,
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
