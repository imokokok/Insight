/**
 * @fileoverview Deterministic oracle scenario replay engine.
 *
 * Replays an {@link OracleScenario} step-by-step against a detection policy
 * and reports, per step, which detection codes a policy implementing
 * staleness / deviation / quorum / anomaly checks would fire. This is the
 * policy-relative core of the Oracle Scenario Testing harness: the same
 * incident replayed against two policies shows exactly which one catches the
 * failure and which one sails through.
 *
 * Detection codes deliberately mirror the composable reason codes already used
 * by Oracle Watch (STALE_DATA, MAX_DEVIATION, INSUFFICIENT_QUORUM, ...) plus
 * ANOMALY_ELEVATED, which reuses the unsupervised anomaly detector from
 * src/lib/anomaly so a novel spike trips the same signal the live monitor
 * would fire.
 *
 * Pure TypeScript, zero network, zero clock dependence: identical input bytes
 * produce an identical run, which is what makes the signed test attestation
 * meaningful.
 */

import {
  computeAnomalyScore,
  type HourlyDeviationPoint,
} from '@/lib/anomaly/oracleAnomalyDetection';

import type { OracleScenario, ScenarioKind, ScenarioStep } from './schema';

export const HARNESS_VERSION = '1.0.0';

/** Codes a CORRECT policy is expected to fire during the attack phase of each
 *  scenario kind. The intersection of these with the actually-fired codes
 *  decides per-step `caught`. */
export const EXPECTED_DETECTION: Record<ScenarioKind, readonly string[]> = {
  stale_price: ['STALE_DATA'],
  deviation_spike: ['MAX_DEVIATION', 'ANOMALY_ELEVATED'],
  flash_manipulation: ['MAX_DEVIATION', 'ANOMALY_ELEVATED'],
  multi_source_divergence: ['MAX_DEVIATION'],
  precision_error: ['PRECISION_DRIFT'],
  feed_failure: ['INSUFFICIENT_QUORUM', 'STALE_DATA'],
  correlated_sources: ['INSUFFICIENT_INDEPENDENCE'],
};

/** Detection codes the engine can emit per step. */
export type DetectionCode =
  | 'STALE_DATA'
  | 'MAX_DEVIATION'
  | 'INSUFFICIENT_QUORUM'
  | 'INSUFFICIENT_INDEPENDENCE'
  | 'ANOMALY_ELEVATED'
  | 'PRECISION_DRIFT';

export interface StepEvaluation {
  /** Step offset (seconds since startedAt). */
  t: number;
  phase: 'baseline' | 'attack';
  /** Codes a policy with the scenario's thresholds would fire at this step. */
  detected: DetectionCode[];
  /** attack-phase step where at least one expected code fired. */
  caught: boolean;
  /** baseline-phase step where any code fired (a healthy market tripping the
   *  policy — the harness flags these as false positives). */
  falsePositive: boolean;
  /** Diagnostics: max cross-source deviation in percent, median of usable
   *  sources, and the count of usable sources. */
  maxDeviationPct: number;
  medianPrice: number;
  okSourceCount: number;
}

export interface ScenarioRunResult {
  scenarioId: string;
  kind: ScenarioKind;
  verdict: 'caught' | 'partial' | 'missed';
  ranAt: string;
  stepCount: number;
  /** attack-phase steps where the policy fired with an expected code. */
  caughtStepCount: number;
  /** baseline steps that fired (healthy behavior tripping the policy). */
  falsePositiveCount: number;
  /** caughtStepCount / total attack steps ∈ [0,1]. */
  detectionRate: number;
  reasonCodes: string[];
  steps: StepEvaluation[];
  harnessVersion: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface StepStats {
  okSources: Array<{
    price: number;
    timestamp: number;
    provider: string;
    operatorGroup?: string;
    derived?: boolean;
  }>;
  maxDeviationPct: number;
  medianPrice: number;
}

function stepStats(step: ScenarioStep): StepStats {
  const okSources = step.sources
    .filter((s) => s.status === 'ok' && s.price > 0)
    .map((s) => ({
      price: s.price,
      timestamp: s.timestamp,
      provider: s.provider,
      operatorGroup: s.operatorGroup,
      derived: s.derived,
    }));
  const medianPrice = median(okSources.map((s) => s.price));
  let maxDeviationPct = 0;
  if (okSources.length > 0 && medianPrice > 0) {
    for (const s of okSources) {
      maxDeviationPct = Math.max(
        maxDeviationPct,
        (Math.abs(s.price - medianPrice) / medianPrice) * 100
      );
    }
  }
  return { okSources, maxDeviationPct, medianPrice };
}

/** Evaluate one step against the scenario's policy. `history` carries the
 *  per-step stats of all PRIOR steps (oldest first) for the anomaly layer. */
function evaluateStep(
  scenario: OracleScenario,
  step: ScenarioStep,
  history: Array<{ maxDeviationPct: number; consensusPrice: number; participantCount: number }>,
  stats: StepStats
): DetectionCode[] {
  const detected: DetectionCode[] = [];
  const refTime = scenario.startedAt + step.t;
  const { policy } = scenario;

  if (stats.okSources.length < policy.minSources) {
    detected.push('INSUFFICIENT_QUORUM');
  }

  // Independence gate. Counts distinct non-derived operator groups among the
  // usable sources, mirroring production's `sourceGroupCount` definition: a
  // derived feed (TWAP and friends) is not an independent observation, and
  // three providers behind two operators are not three sources. Skipped when
  // the policy does not set a threshold, so scenarios that predate this gate
  // keep their prior behaviour.
  if (policy.minIndependentGroups !== undefined) {
    const groups = new Set(
      stats.okSources.filter((s) => s.derived !== true).map((s) => s.operatorGroup ?? s.provider)
    );
    if (groups.size < policy.minIndependentGroups) {
      detected.push('INSUFFICIENT_INDEPENDENCE');
    }
  }

  const stale =
    stats.okSources.length > 0 &&
    stats.okSources.some((s) => refTime - s.timestamp > policy.maxStalenessSeconds);
  if (stale) detected.push('STALE_DATA');

  if (stats.maxDeviationPct > policy.maxDeviationPct) {
    detected.push('MAX_DEVIATION');
  }

  // Cumulative drift vs the scenario's own prior consensus. Catches the
  // precision-accumulation class: many sub-threshold steps whose COMBINED
  // drift crosses the threshold — invisible to per-step cross-source
  // deviation (a single source never deviates from itself).
  const priorConsensus = history.map((h) => h.consensusPrice).filter((p) => p > 0);
  if (priorConsensus.length > 0 && stats.medianPrice > 0) {
    const baseline = median(priorConsensus);
    const driftPct = (Math.abs(stats.medianPrice - baseline) / baseline) * 100;
    if (driftPct > policy.maxDeviationPct) {
      detected.push('PRECISION_DRIFT');
    }
  }

  // Unsupervised anomaly layer — mirrors what Oracle Watch fires live. Only
  // meaningful once enough history exists; the detector itself returns
  // 'insufficient-data' before that.
  const anomaly = computeAnomalyScore(history, stats.maxDeviationPct);
  if (anomaly.elevated) detected.push('ANOMALY_ELEVATED');

  return detected;
}

/**
 * Run the full scenario. Deterministic: same scenario bytes → same result.
 */
export function runScenario(scenario: OracleScenario): ScenarioRunResult {
  // Deterministic run time: the scenario's own end anchor. Wall-clock signing
  // time is captured separately in the attestation envelope (signedAt).
  const lastStep = scenario.steps[scenario.steps.length - 1];
  const ranAt = new Date((scenario.startedAt + lastStep.t) * 1000).toISOString();

  const history: HourlyDeviationPoint[] = [];
  const evaluations: StepEvaluation[] = [];
  const reasonCodes = new Set<string>();

  for (const step of scenario.steps) {
    const stats = stepStats(step);
    const detected = evaluateStep(scenario, step, [...history], stats);

    const expected = EXPECTED_DETECTION[scenario.kind];
    const caught = step.phase === 'attack' && detected.some((c) => expected.includes(c));
    const falsePositive = step.phase === 'baseline' && detected.length > 0;

    for (const code of detected) reasonCodes.add(code);

    evaluations.push({
      t: step.t,
      phase: step.phase,
      detected,
      caught,
      falsePositive,
      maxDeviationPct: round4(stats.maxDeviationPct),
      medianPrice: stats.medianPrice,
      okSourceCount: stats.okSources.length,
    });

    history.push({
      maxDeviationPct: stats.maxDeviationPct,
      consensusPrice: stats.medianPrice,
      participantCount: stats.okSources.length,
    });
  }

  const attackSteps = evaluations.filter((e) => e.phase === 'attack');
  const caughtStepCount = attackSteps.filter((e) => e.caught).length;
  const falsePositiveCount = evaluations.filter((e) => e.falsePositive).length;
  const detectionRate = attackSteps.length === 0 ? 0 : round4(caughtStepCount / attackSteps.length);

  const verdict: ScenarioRunResult['verdict'] =
    caughtStepCount === 0
      ? 'missed'
      : caughtStepCount === attackSteps.length
        ? 'caught'
        : 'partial';

  return {
    scenarioId: scenario.id,
    kind: scenario.kind,
    verdict,
    ranAt,
    stepCount: evaluations.length,
    caughtStepCount,
    falsePositiveCount,
    detectionRate,
    reasonCodes: [...reasonCodes].sort(),
    steps: evaluations,
    harnessVersion: HARNESS_VERSION,
  };
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
