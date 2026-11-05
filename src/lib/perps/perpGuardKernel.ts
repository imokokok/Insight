/**
 * @fileoverview Shared kernel for cross-venue perp guards (BNB/Aster, Monad/Perpl).
 *
 * Each venue guard owns its evidence shapes, reviewed market set, reason
 * wording, and venue-specific escalation. This module owns only the pieces
 * that are intentionally identical across venues so a future perp guard
 * cannot silently fork them:
 *
 * - the verdict vocabulary and its monotonic escalation;
 * - the cross-oracle check summary shape derived from `preTradeSafetyCheck`;
 * - reviewed venue-integrity thresholds (mark/index divergence bands and
 *   consensus-vs-venue divergence bands);
 * - the leverage-band evaluation (reviewed profile capped by the live venue
 *   margin ratio) and its mechanical verdicts;
 * - small numeric helpers.
 *
 * The thresholds and the 0.9 conservative-buffer factor are reviewed guard
 * values, not caller-set preflight limits: callers cannot tune them via
 * input, and a venue guard that needs different bands must register new
 * reviewed values rather than bypassing these constants.
 */

import type { PreTradeSafetyResult } from '@/lib/api/services/preTradeSafetyService';

/** Monotonic verdict ladder: BLOCK > CAUTION > ALLOW; escalation never downgrades. */
export type PerpGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

/**
 * Reviewed venue-integrity thresholds for the venue's own mark/index
 * divergence. These are static guard values, not caller-set preflight limits.
 */
export const PERP_GUARD_MARK_ORACLE_DEVIATION_CAUTION_BPS = 100;
export const PERP_GUARD_MARK_ORACLE_DEVIATION_BLOCK_BPS = 1_000;

/**
 * Reviewed cross-venue deviation between Insight's cross-oracle consensus
 * price and the venue's reference (index/oracle) price.
 */
export const PERP_GUARD_CONSENSUS_VENUE_DEVIATION_CAUTION_PCT = 1;
export const PERP_GUARD_CONSENSUS_VENUE_DEVIATION_BLOCK_PCT = 5;

/**
 * Fraction of the effective leverage cap that leaves a mechanical buffer.
 * This is advisory; it is not a claim that the position is safe under every
 * move.
 */
export const PERP_GUARD_LEVERAGE_BUFFER_FRACTION = 0.9;

export interface PerpGuardOracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  consensusPrice: number;
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  /** A reference to the separately verifiable Oracle Safety attestation, if configured. */
  attestationUid: string | null;
  attester: string | null;
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function summarizeOracleCheck(result: PreTradeSafetyResult): PerpGuardOracleCheckSummary {
  return {
    verdict: result.verdict,
    consensusPrice: result.consensusPrice,
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    attester: result.attestation?.attester ?? null,
  };
}

export function isBlockingOracleVerdict(verdict: PreTradeSafetyResult['verdict']): boolean {
  return verdict === 'DANGER' || verdict === 'BLOCK';
}

export function bps(numerator: number, denominator: number): number {
  if (!(denominator > 0)) return Number.POSITIVE_INFINITY;
  return ((numerator - denominator) / denominator) * 10_000;
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Monotonic merge: BLOCK wins over CAUTION wins over ALLOW; never downgrades. */
export function escalatePerpGuardVerdict(
  current: PerpGuardVerdict,
  next: PerpGuardVerdict
): PerpGuardVerdict {
  if (current === 'BLOCK' || next === 'BLOCK') return 'BLOCK';
  if (current === 'CAUTION' || next === 'CAUTION') return 'CAUTION';
  return 'ALLOW';
}

/**
 * Cross-venue deviation between the Insight consensus price and the venue's
 * reference price, in percent. Returns null unless both sides are observed,
 * mirroring the guards' rule that an unobservable deviation is disclosed
 * rather than fabricated.
 */
export function computeConsensusVenueDeviationPct(
  indexPrice: number | null,
  consensusPrice: number
): number | null {
  if (indexPrice === null) return null;
  if (!Number.isFinite(consensusPrice) || consensusPrice <= 0) return null;
  return roundTo((Math.abs(indexPrice - consensusPrice) / consensusPrice) * 100, 4);
}

export interface PerpGuardLeverageBandEvaluation {
  effectiveLeverage: number;
  maxLeverage: number;
  /** True when the live venue value bound lower than the reviewed profile. */
  cappedByLive: boolean;
  liquidationBufferPct: number;
  conservativeMaxSizeUsd: number;
  maxLeverageSource:
    | 'reviewed-profile'
    | 'reviewed-profile-capped-by-live-venue'
    | 'reviewed-profile-live-unavailable';
}

/**
 * Evaluate the declared post-action leverage band against the reviewed static
 * profile capped by the freshly observed venue margin ratio. The venue margin
 * requirement can change at any time, so the guard binds to the lower of the
 * reviewed profile and the live value, and discloses when the live value is
 * missing.
 */
export function evaluatePerpGuardLeverageBand(
  sizeUsd: number,
  marginValueUsd: number,
  reviewedMaxLeverage: number,
  liveMaxLeverage: number | null
): PerpGuardLeverageBandEvaluation {
  const effectiveLeverage = sizeUsd / marginValueUsd;
  const cappedByLive = liveMaxLeverage !== null && liveMaxLeverage < reviewedMaxLeverage;
  const maxLeverage = cappedByLive ? (liveMaxLeverage as number) : reviewedMaxLeverage;
  const liquidationBufferPct = Math.max(0, (1 - effectiveLeverage / maxLeverage) * 100);
  return {
    effectiveLeverage,
    maxLeverage,
    cappedByLive,
    liquidationBufferPct,
    conservativeMaxSizeUsd: roundTo(
      marginValueUsd * maxLeverage * PERP_GUARD_LEVERAGE_BUFFER_FRACTION,
      2
    ),
    maxLeverageSource: cappedByLive
      ? 'reviewed-profile-capped-by-live-venue'
      : liveMaxLeverage === null
        ? 'reviewed-profile-live-unavailable'
        : 'reviewed-profile',
  };
}

/**
 * Mechanical leverage-band verdicts: at or above the cap is a BLOCK (no
 * reviewed buffer remains); at or above 90% of the cap escalates to CAUTION.
 * Verdict-neutral (empty reasons) below that band.
 */
export function evaluatePerpGuardLeverageVerdicts(
  effectiveLeverage: number,
  maxLeverage: number
): { verdict: PerpGuardVerdict; reasons: string[] } {
  if (effectiveLeverage >= maxLeverage) {
    return {
      verdict: 'BLOCK',
      reasons: [
        'Declared post-action leverage is at or above the effective leverage cap, leaving no reviewed buffer.',
      ],
    };
  }
  if (effectiveLeverage >= maxLeverage * PERP_GUARD_LEVERAGE_BUFFER_FRACTION) {
    return {
      verdict: 'CAUTION',
      reasons: [
        'Declared post-action leverage consumes at least 90% of the effective leverage cap.',
      ],
    };
  }
  return { verdict: 'ALLOW', reasons: [] };
}

export interface PerpGuardVenueIntegrityInput {
  /** Venue display name used verbatim in reason strings (e.g. 'Aster'). */
  venueLabel: string;
  /** Label for the venue reference price in reason strings (e.g. 'index price'). */
  indexPriceLabel: string;
  /** Label for the mark/reference divergence in reason strings (e.g. 'mark/index'). */
  divergenceLabel: string;
  markIndexDeviationBps: number | null;
  consensusVenueDeviationPct: number | null;
  marketStatus: string | null;
  /**
   * The reviewed operating-state literal for this venue (default 'TRADING').
   * Venues whose on-chain/API status literal differs (e.g. Drift's 'active')
   * pass their own reviewed value; the wording mirrors it verbatim.
   */
  expectedStatus?: string;
}

/**
 * Disclosed venue-integrity layer: concrete observed concerns escalate the
 * verdict; a missing deviation fails closed as maximum divergence. Callers
 * disclose unavailability separately (it never changes the verdict here).
 */
export function evaluatePerpGuardVenueIntegrity(input: PerpGuardVenueIntegrityInput): {
  verdict: PerpGuardVerdict;
  reasons: string[];
} {
  let verdict: PerpGuardVerdict = 'ALLOW';
  const reasons: string[] = [];

  // Fail closed: a missing mark/index deviation counts as maximum divergence.
  const deviation = input.markIndexDeviationBps ?? Number.POSITIVE_INFINITY;
  if (deviation >= PERP_GUARD_MARK_ORACLE_DEVIATION_BLOCK_BPS) {
    verdict = 'BLOCK';
    reasons.push(
      `${input.venueLabel} ${input.divergenceLabel} divergence ${deviation === Number.POSITIVE_INFINITY ? 'is unobservable' : `${input.markIndexDeviationBps?.toFixed(2)} bps`} and is at or above the reviewed ${PERP_GUARD_MARK_ORACLE_DEVIATION_BLOCK_BPS} bps backstop.`
    );
  } else if (deviation >= PERP_GUARD_MARK_ORACLE_DEVIATION_CAUTION_BPS) {
    // Nothing above can have escalated at this point; CAUTION is a strict upgrade.
    verdict = 'CAUTION';
    reasons.push(
      `${input.venueLabel} ${input.divergenceLabel} divergence ${input.markIndexDeviationBps?.toFixed(2)} bps exceeds the reviewed ${PERP_GUARD_MARK_ORACLE_DEVIATION_CAUTION_BPS} bps advisory band.`
    );
  }

  const crossVenue = input.consensusVenueDeviationPct;
  if (crossVenue !== null) {
    if (crossVenue >= PERP_GUARD_CONSENSUS_VENUE_DEVIATION_BLOCK_PCT) {
      verdict = 'BLOCK';
      reasons.push(
        `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the ${input.venueLabel} ${input.indexPriceLabel}, at or above the reviewed ${PERP_GUARD_CONSENSUS_VENUE_DEVIATION_BLOCK_PCT}% backstop.`
      );
    } else if (crossVenue >= PERP_GUARD_CONSENSUS_VENUE_DEVIATION_CAUTION_PCT) {
      if (verdict !== 'BLOCK') verdict = 'CAUTION';
      reasons.push(
        `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the ${input.venueLabel} ${input.indexPriceLabel}, above the reviewed ${PERP_GUARD_CONSENSUS_VENUE_DEVIATION_CAUTION_PCT}% advisory band.`
      );
    }
  }

  const expectedStatus = input.expectedStatus ?? 'TRADING';
  if (input.marketStatus !== null && input.marketStatus !== expectedStatus) {
    verdict = 'BLOCK';
    reasons.push(
      `${input.venueLabel} market status is ${input.marketStatus}, not ${expectedStatus}; trading is not in the reviewed operating state.`
    );
  }

  return { verdict, reasons };
}
