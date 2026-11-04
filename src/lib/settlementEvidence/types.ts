import { z } from 'zod';

import {
  EvidenceRightsScopeSchema,
  type EvidenceRightsScope,
} from '@/lib/dataRights/evidenceRights';

/**
 * Settlement-evidence domain types for prediction-market price contracts.
 *
 * Layer (b) of the settlement-evidence MVP: an evidence engine that compares a
 * market's DECLARED settlement outcome against Insight's INDEPENDENT sources
 * (Kraken settlement-window candles + the platform's own oracle-consensus
 * snapshots) and emits a signed evidence pack.
 *
 * Delivery policy is enforced here, not asserted by callers: raw candle rows
 * are an internal collection artifact (Kraken is vendor-licensed
 * derived-analytics-only). Only derived analytics — outcome verdicts, bps
 * deltas, coverage statistics — leave the system in an evidence pack.
 */

export const SETTLEMENT_EVIDENCE_SCHEMA_VERSION = 1;

/** How long a signed settlement pack stays inside its validity window. The
 *  underlying price history is immutable, so the window exists to bound policy
 *  drift, not data decay. */
export const SETTLEMENT_EVIDENCE_VALID_FOR_SECONDS = 30 * 24 * 60 * 60;

/** Independent settlement venues we know how to classify from a market's own
 *  resolution metadata. `binance` markets are watched but never collected from
 *  (research-quarantined in the source-rights register) — the forensic value
 *  comes precisely from comparing their declared outcome against independent
 *  sources. */
export const SETTLEMENT_VENUES = ['chainlink-stream', 'binance', 'unknown'] as const;
export type SettlementVenue = (typeof SETTLEMENT_VENUES)[number];

export const SettlementOutcomeSchema = z.enum(['Up', 'Down']);
export type SettlementOutcome = z.infer<typeof SettlementOutcomeSchema>;

export const SETTLEMENT_EVIDENCE_GRADES = [
  'consistent',
  'inconsistent',
  'insufficient_data',
] as const;
export type SettlementEvidenceGrade = (typeof SETTLEMENT_EVIDENCE_GRADES)[number];

/** One watched prediction-market price contract. */
export interface SettlementMarketWatchRow {
  marketSlug: string;
  gammaId: string;
  question: string;
  asset: string;
  windowSeconds: number;
  windowStartMs: number;
  windowEndMs: number;
  settlementVenue: SettlementVenue;
  resolutionSourceUrl: string | null;
  closed: boolean;
  declaredOutcome: SettlementOutcome | null;
  outcomePricesJson: string | null;
  firstSeenMs: number;
  updatedAtMs: number;
}

/** One internal candle observation. Never serialized into a delivered pack. */
export interface SettlementCandle {
  bucketTs: number; // unix seconds, minute-aligned
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface SettlementCandleMeta {
  venue: string;
  intervalSeconds: number;
  rightsScope: EvidenceRightsScope;
  deliveryPolicy: string;
}

/** One oracle-consensus observation inside (or near) the settlement window. */
export interface SettlementOracleObservation {
  slotMs: number;
  consensusPrice: number;
}

/**
 * The derived-analytics payload. Field order and semantics are FROZEN for
 * schemaVersion 1 — this is what the attestation hash-binds.
 */
export interface SettlementEvidencePayload {
  schemaVersion: 1;
  marketSlug: string;
  question: string;
  asset: string;
  settlementVenue: SettlementVenue;
  resolutionSourceUrl: string | null;
  windowStartMs: number;
  windowEndMs: number;
  windowSeconds: number;
  /** The market's declared resolution, when the market has resolved. */
  declaredOutcome: SettlementOutcome | null;
  /** Insight's independent verdict from settlement-window candles. */
  independentOutcome: SettlementOutcome | null;
  /** Window close vs window open, in basis points (signed). Derived from
   *  candles; no absolute venue prices are ever included. */
  priceChangeBps: number | null;
  /** |endRef − oracle consensus at the window boundary|, in basis points,
   *  when an oracle-consensus snapshot is available near the window end. */
  oracleDeviationBps: number | null;
  oracleConsensusPrice: number | null;
  oracleSlotMs: number | null;
  /** Expected vs observed 1-minute buckets, as a fraction ×1e4. */
  candleCoverageE4: number | null;
  candleSource: string | null;
  candleRightsScope: EvidenceRightsScope | null;
  candleDeliveryPolicy: string | null;
  grade: SettlementEvidenceGrade;
  gradeReasonCodes: string[];
  generatedAtMs: number;
}

export interface SettlementEvidenceAttestation {
  uid: string;
  schemaVersion: 1;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  signature: string;
  eip712: {
    domain: {
      name: string;
      version: string;
      chainId: number;
    };
    primaryType: string;
  };
}

export interface SettlementEvidencePack {
  payload: SettlementEvidencePayload;
  /** keccak256 of the canonical payload JSON — the byte-stable identity. */
  payloadHash: string;
  attestation: SettlementEvidenceAttestation | null;
}

export const SettlementEvidencePayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    marketSlug: z.string().trim().min(1).max(256),
    question: z.string().trim().min(1).max(1024),
    asset: z
      .string()
      .trim()
      .regex(/^[A-Z0-9][A-Z0-9._-]{0,31}$/),
    settlementVenue: z.enum(SETTLEMENT_VENUES),
    resolutionSourceUrl: z.string().max(1024).nullable(),
    windowStartMs: z.number().int().nonnegative().safe(),
    windowEndMs: z.number().int().nonnegative().safe(),
    windowSeconds: z.number().int().min(60).max(604_800),
    declaredOutcome: SettlementOutcomeSchema.nullable(),
    independentOutcome: SettlementOutcomeSchema.nullable(),
    priceChangeBps: z.number().finite().nullable(),
    oracleDeviationBps: z.number().finite().nullable(),
    oracleConsensusPrice: z.number().finite().nullable(),
    oracleSlotMs: z.number().int().nonnegative().safe().nullable(),
    candleCoverageE4: z.number().int().min(0).max(10_000).nullable(),
    candleSource: z.string().max(128).nullable(),
    candleRightsScope: EvidenceRightsScopeSchema.nullable(),
    candleDeliveryPolicy: z.string().max(64).nullable(),
    grade: z.enum(SETTLEMENT_EVIDENCE_GRADES),
    gradeReasonCodes: z.array(z.string().max(128)).max(16),
    generatedAtMs: z.number().int().nonnegative().safe(),
  })
  .strict();
