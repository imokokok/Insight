/**
 * Oracle Watch composite trust score — the machine-gateable credibility rating.
 *
 * The rule `verdict` (normal/caution/danger) is a conservative, human-readable
 * severity. `computeOracleWatchTrust` produces a SECOND, continuous signal that
 * is Oracle Watch's native output: a single 0-100 score folding in every signal
 * the credibility layer cares about — cross-oracle quorum, provider agreement,
 * deviation, forward-looking ML manipulation risk, provider reputation and
 * outlier/staleness cleanliness.
 *
 * It is deliberately EXPLAINABLE (a weighted sum, not a black box) so a
 * dependent agent — or a human — can see WHY a feed scores low. The weights and
 * thresholds below are the product's own policy; they do not mirror pre-trade's
 * per-trade rules. Scoring is pure (no I/O) so the point signal, the 30-min
 * collector and the historical backfill all share identical semantics.
 */

export type OracleWatchTrustLevel = 'low' | 'medium' | 'high';

export interface OracleWatchTrustInput {
  /** Number of independent providers contributing to the consensus (0 = none). */
  participantCount: number;
  /** Cross-provider agreement (0-1, higher is better). */
  agreement: number;
  /** Max |deviation from consensus| across providers (%), or null if unknown. */
  maxDeviationPct: number | null;
  /** Forward-looking ML manipulation-risk score (0-1, higher = riskier), or null. */
  mlRiskScore: number | null;
  outlierCount: number;
  staleCount: number;
  /** Provider reputation on the 0-100 service scale (null = unknown). */
  avgReputation: number | null;
  minReputation: number | null;
  /**
   * Distinct NON-DERIVED operator groups among the participants. Omit for
   * callers that predate the independence gate — it then falls back to
   * `participantCount`, which is the optimistic (pre-gate) assumption.
   */
  sourceGroupCount?: number;
  /** Independence floor. Defaults to INDEPENDENCE_FLOOR. */
  requiredSourceGroupCount?: number;
}

/** Per-component normalized contribution (each 0-1, higher is better). */
export interface OracleWatchTrustComponents {
  quorum: number;
  agreement: number;
  deviation: number;
  ml: number;
  reputation: number;
  cleanliness: number;
}

export interface OracleWatchTrust {
  score: number;
  level: OracleWatchTrustLevel;
  components: OracleWatchTrustComponents;
}

/** Providers required for full quorum credit (rewards deeper coverage). */
const QUORUM_OK = 4;
/**
 * Providers required before the signal can be called trustworthy AT ALL.
 * Mirrors the verdict quorum floor (QUORUM_MIN in oracleWatchService): below
 * this, agreement and deviation are artefacts of a tiny sample — two points
 * always "agree" with a median computed from themselves — so letting them earn
 * full credit produced scores like "trust 86/100 (high)" alongside a
 * "danger / halt" verdict in the same response.
 */
const QUORUM_FLOOR = 3;
/**
 * Distinct non-derived operator groups required before the signal can be
 * called trustworthy. Mirrors the verdict independence gate (INDEPENDENCE_MIN
 * in oracleWatchService): three white-labelled wrappers of one operator earn
 * full quorum credit while describing a single point of failure, so without
 * this the score could read "high" next to a "danger / halt" verdict.
 */
const INDEPENDENCE_FLOOR = 2;
/** Deviation at/above this removes all deviation credit (matches DANGER dev = 3.0). */
const DEV_DANGER_PCT = 3.0;
/** Neutral ML manipulation-risk when no model / score is available. */
const ML_NEUTRAL = 0.5;
/** Trust tiers (>= threshold ⇒ the level; low is bad). */
const TRUST_HIGH = 75;
const TRUST_MED = 50;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Deviation credit: 1 at 0% deviation, decaying to 0 at the danger line. */
function deviationCredit(maxDeviationPct: number | null): number {
  if (maxDeviationPct === null || !Number.isFinite(maxDeviationPct)) return 0.5;
  return clamp(1 - Math.abs(maxDeviationPct) / DEV_DANGER_PCT, 0, 1);
}

export function computeOracleWatchTrust(input: OracleWatchTrustInput): OracleWatchTrust {
  const noCoverage = input.participantCount === 0;
  // Below the floor there are too few independent sources to establish
  // credibility with, even if the ones that did respond look perfect.
  const belowQuorum = input.participantCount < QUORUM_FLOOR;
  // Independence is a separate axis from headcount: N providers that all
  // resolve to one operator are one source of truth wearing N badges.
  const requiredGroups = input.requiredSourceGroupCount ?? INDEPENDENCE_FLOOR;
  const sourceGroupCount = input.sourceGroupCount ?? input.participantCount;
  const belowIndependence = sourceGroupCount < requiredGroups;
  const belowFloor = belowQuorum || belowIndependence;

  // No independent source → nothing to establish credibility with, so the
  // coverage-dependent credits should be zero (≠ their neutral 0.5 default).
  const quorum = belowFloor ? 0 : clamp(input.participantCount / QUORUM_OK, 0, 1);
  const agreement = noCoverage ? 0 : clamp(input.agreement, 0, 1);
  const deviation = noCoverage ? 0 : deviationCredit(input.maxDeviationPct);
  const cleanliness = noCoverage || input.outlierCount > 0 || input.staleCount > 0 ? 0.5 : 1;

  const mlRaw =
    input.mlRiskScore !== null && Number.isFinite(input.mlRiskScore)
      ? clamp(input.mlRiskScore, 0, 1)
      : ML_NEUTRAL;
  const ml = 1 - mlRaw;

  const reputationRaw = (input.minReputation ?? input.avgReputation ?? 50) / 100;
  const reputation = clamp(reputationRaw, 0, 1);

  const weighted = Math.round(
    100 *
      (quorum * 0.25 +
        agreement * 0.2 +
        deviation * 0.2 +
        ml * 0.15 +
        reputation * 0.1 +
        cleanliness * 0.1)
  );

  // A coverage or independence shortfall has to be able to override
  // otherwise-perfect component scores: agreement/deviation/reputation near 1.0
  // with only two sources — or with three sources that are all one operator —
  // says nothing, so the total is held below the medium tier rather than being
  // allowed to contradict the DANGER/halt verdict sitting next to it.
  const score = belowFloor
    ? Math.min(clamp(weighted, 0, 100), TRUST_MED - 1)
    : clamp(weighted, 0, 100);

  const level: OracleWatchTrustLevel =
    score >= TRUST_HIGH ? 'high' : score >= TRUST_MED ? 'medium' : 'low';

  return {
    score,
    level,
    components: {
      quorum: Number(quorum.toFixed(3)),
      agreement: Number(agreement.toFixed(3)),
      deviation: Number(deviation.toFixed(3)),
      ml: Number(ml.toFixed(3)),
      reputation: Number(reputation.toFixed(3)),
      cleanliness: Number(cleanliness.toFixed(3)),
    },
  };
}
