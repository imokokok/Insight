/**
 * Settlement-evidence engine.
 *
 * Compares a price contract's DECLARED outcome against Insight's INDEPENDENT
 * sources and grades the window:
 *   - consistent        declared == independent, with full candle coverage
 *   - inconsistent      declared != independent under full coverage
 *   - insufficient_data coverage incomplete, venue unqueryable, or the market
 *                       has not resolved yet
 *
 * Grading is deliberately conservative. An `inconsistent` grade is a flag for
 * human/UMA-style review — Insight does not arbitrate (that is the resolution
 * oracle's turf); it supplies verifiable derived evidence to whoever does.
 *
 * Delivery policy is enforced by construction: this module consumes internal
 * candles but emits only derived analytics (outcomes, bps deltas, coverage).
 * Absolute Kraken print prices never enter the payload.
 */

import { createHash } from 'node:crypto';

import type { EvidenceRightsScope } from '@/lib/dataRights/evidenceRights';
import { createLogger } from '@/lib/utils/logger';

import type {
  SettlementCandle,
  SettlementEvidenceGrade,
  SettlementEvidencePack,
  SettlementEvidencePayload,
  SettlementMarketWatchRow,
  SettlementOracleObservation,
  SettlementOutcome,
} from './types';

const logger = createLogger('SettlementEvidenceEngine');

/** How far from the window end an oracle-consensus snapshot may sit and still
 *  anchor the deviation metric (15-minute snapshot cadence + slack). */
export const ORACLE_ALIGNMENT_TOLERANCE_MS = 10 * 60 * 1000;

export interface BuildEvidenceInput {
  row: SettlementMarketWatchRow;
  candles: SettlementCandle[];
  candleSource: string | null;
  candleRightsScope: EvidenceRightsScope | null;
  candleDeliveryPolicy: string | null;
  oracleObservations: SettlementOracleObservation[];
  nowMs: number;
}

/** Window start reference = the OPEN of the first bucket at/after window
 *  start; window end reference = the CLOSE of the last bucket before window
 *  end. Minute buckets only — the engine asserts 60-second intervals. */
export function deriveWindowReferences(
  candles: SettlementCandle[],
  windowStartMs: number,
  windowEndMs: number
): {
  startRef: number | null;
  endRef: number | null;
  expectedBuckets: number;
  observedBuckets: number;
} {
  const startSec = Math.floor(windowStartMs / 1000);
  const endSec = Math.ceil(windowEndMs / 1000);
  const expectedBuckets = Math.max(0, Math.round((endSec - startSec) / 60));
  const inWindow = candles.filter((c) => c.bucketTs >= startSec && c.bucketTs < endSec);
  if (inWindow.length === 0) {
    return { startRef: null, endRef: null, expectedBuckets, observedBuckets: 0 };
  }
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  return {
    startRef: first.open,
    endRef: last.close,
    expectedBuckets,
    observedBuckets: inWindow.length,
  };
}

export function computePriceChangeBps(startRef: number, endRef: number): number {
  if (!Number.isFinite(startRef) || startRef <= 0 || !Number.isFinite(endRef)) return 0;
  return ((endRef - startRef) / startRef) * 10_000;
}

export function computeOracleDeviationBps(endRef: number, oraclePrice: number): number | null {
  if (!Number.isFinite(endRef) || !Number.isFinite(oraclePrice) || oraclePrice <= 0) return null;
  return (Math.abs(endRef - oraclePrice) / oraclePrice) * 10_000;
}

/** Nearest oracle observation to the window end within tolerance. */
export function selectAlignedOracleObservation(
  observations: SettlementOracleObservation[],
  windowEndMs: number,
  toleranceMs: number = ORACLE_ALIGNMENT_TOLERANCE_MS
): SettlementOracleObservation | null {
  let best: SettlementOracleObservation | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const observation of observations) {
    const distance = Math.abs(observation.slotMs - windowEndMs);
    if (distance < bestDistance) {
      best = observation;
      bestDistance = distance;
    }
  }
  return best && bestDistance <= toleranceMs ? best : null;
}

export interface EvidenceGrade {
  grade: SettlementEvidenceGrade;
  reasonCodes: string[];
}

export function gradeEvidence(input: {
  declaredOutcome: SettlementOutcome | null;
  independentOutcome: SettlementOutcome | null;
  coverageE4: number | null;
  candleUnavailable: boolean;
}): EvidenceGrade {
  const reasonCodes: string[] = [];
  if (input.candleUnavailable) {
    reasonCodes.push('candles_unavailable');
  } else if (input.coverageE4 === null || input.coverageE4 < 9_500) {
    reasonCodes.push('incomplete_candle_coverage');
  }
  if (input.declaredOutcome === null) reasonCodes.push('market_unresolved');
  if (input.independentOutcome === null) reasonCodes.push('independent_outcome_unavailable');

  if (
    input.candleUnavailable ||
    input.coverageE4 === null ||
    input.coverageE4 < 9_500 ||
    input.declaredOutcome === null ||
    input.independentOutcome === null
  ) {
    return { grade: 'insufficient_data', reasonCodes };
  }
  if (input.declaredOutcome === input.independentOutcome) {
    return { grade: 'consistent', reasonCodes: ['declared_matches_independent'] };
  }
  return {
    grade: 'inconsistent',
    reasonCodes: ['declared_differs_from_independent'],
  };
}

/** Canonical JSON — sorted keys, no whitespace — so payloadHash is byte-stable
 *  across processes and rebuilds. */
export function canonicalEvidenceJson(payload: SettlementEvidencePayload): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export function computePayloadHash(payload: SettlementEvidencePayload): string {
  return createHash('sha256').update(canonicalEvidenceJson(payload)).digest('hex');
}

export function buildEvidencePayload(input: BuildEvidenceInput): SettlementEvidencePayload {
  const { row } = input;
  const refs = deriveWindowReferences(input.candles, row.windowStartMs, row.windowEndMs);
  const candleUnavailable = input.candleSource === null || refs.observedBuckets === 0;

  const independentOutcome: SettlementOutcome | null =
    !candleUnavailable && refs.startRef !== null && refs.endRef !== null
      ? refs.endRef >= refs.startRef
        ? 'Up'
        : 'Down'
      : null;

  const priceChangeBps =
    refs.startRef !== null && refs.endRef !== null
      ? computePriceChangeBps(refs.startRef, refs.endRef)
      : null;

  const alignedOracle = selectAlignedOracleObservation(input.oracleObservations, row.windowEndMs);
  const oracleDeviationBps =
    alignedOracle && refs.endRef !== null
      ? computeOracleDeviationBps(refs.endRef, alignedOracle.consensusPrice)
      : null;

  const coverageE4 =
    refs.expectedBuckets > 0 && !candleUnavailable
      ? Math.round((refs.observedBuckets / refs.expectedBuckets) * 10_000)
      : null;

  const { grade, reasonCodes } = gradeEvidence({
    declaredOutcome: row.declaredOutcome,
    independentOutcome,
    coverageE4,
    candleUnavailable,
  });

  return {
    schemaVersion: 1,
    marketSlug: row.marketSlug,
    question: row.question,
    asset: row.asset,
    settlementVenue: row.settlementVenue,
    resolutionSourceUrl: row.resolutionSourceUrl,
    windowStartMs: row.windowStartMs,
    windowEndMs: row.windowEndMs,
    windowSeconds: row.windowSeconds,
    declaredOutcome: row.declaredOutcome,
    independentOutcome,
    priceChangeBps: priceChangeBps === null ? null : Number(priceChangeBps.toFixed(4)),
    oracleDeviationBps: oracleDeviationBps === null ? null : Number(oracleDeviationBps.toFixed(4)),
    oracleConsensusPrice: alignedOracle?.consensusPrice ?? null,
    oracleSlotMs: alignedOracle?.slotMs ?? null,
    candleCoverageE4: coverageE4,
    candleSource: candleUnavailable ? null : input.candleSource,
    candleRightsScope: input.candleRightsScope,
    candleDeliveryPolicy: input.candleDeliveryPolicy,
    grade,
    gradeReasonCodes: reasonCodes,
    generatedAtMs: input.nowMs,
  };
}

export interface AssemblePackInput {
  payload: SettlementEvidencePayload;
  attestation: SettlementEvidencePack['attestation'];
}

export function assembleEvidencePack({
  payload,
  attestation,
}: AssemblePackInput): SettlementEvidencePack {
  return {
    payload,
    payloadHash: computePayloadHash(payload),
    attestation: attestation ?? null,
  };
}

export function logGradedEvidence(payload: SettlementEvidencePayload): void {
  logger.info('Settlement evidence graded', {
    marketSlug: payload.marketSlug,
    grade: payload.grade,
    declared: payload.declaredOutcome,
    independent: payload.independentOutcome,
    priceChangeBps: payload.priceChangeBps,
    oracleDeviationBps: payload.oracleDeviationBps,
    coverageE4: payload.candleCoverageE4,
  });
}
