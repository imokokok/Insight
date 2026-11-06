/**
 * Shared primitives for the decision-input assessment: hashing helpers,
 * deviation math, the reason builder, and the single source of truth for the
 * reason-code vocabulary.
 *
 * The reason-code list is declared once here and consumed by both the
 * TypeScript `DecisionInputReason` interface (via the derived union type) and
 * the zod `DecisionInputAssessmentSchema` (via `z.enum`), removing the
 * previous hand-maintained duplicate lists.
 */

import { keccak256 } from 'viem';

import { canonicalJsonString } from '@/lib/utils/canonicalJson';

export const DECISION_INPUT_REASON_CODES = [
  'CHAINLINK_UNAVAILABLE',
  'CHAINLINK_STALE',
  'MARKET_REFERENCE_UNAVAILABLE',
  'MARKET_REFERENCE_LOW_COVERAGE',
  'MARKET_REFERENCE_SPREAD_UNAVAILABLE',
  'MARKET_REFERENCE_DIVERGENCE',
  'MARKET_REFERENCE_SPREAD',
  'CHAINLINK_DIVERGENCE',
  'REDSTONE_DIVERGENCE',
  'DEX_DEPTH_UNAVAILABLE',
  'REVIEWED_UNISWAP_V3_UNAVAILABLE',
  'REVIEWED_UNISWAP_V3_QUOTE_DIVERGENCE',
  'REVIEWED_UNISWAP_V3_PRICE_IMPACT',
  'REVIEWED_UNISWAP_V3_TWAP_DEVIATION',
  'REVIEWED_AERODROME_SLIPSTREAM_UNAVAILABLE',
  'REVIEWED_AERODROME_SLIPSTREAM_QUOTE_DIVERGENCE',
  'REVIEWED_AERODROME_SLIPSTREAM_PRICE_IMPACT',
  'REVIEWED_AERODROME_SLIPSTREAM_TWAP_DEVIATION',
  'QUOTE_TIMESTAMP_INVALID',
  'QUOTE_STALE',
  'QUOTE_SLIPPAGE',
  'QUOTE_PROVENANCE_REQUIRED',
  'QUOTE_PROVENANCE_MALFORMED',
  'QUOTE_PROVENANCE_MISMATCH',
  'QUOTE_PROVENANCE_RIGHTS',
] as const;

export type DecisionInputReasonCode = (typeof DECISION_INPUT_REASON_CODES)[number];

/** Severity levels are shared by every reason emitted during assessment. */
export type DecisionInputReasonSeverity = 'block' | 'insufficient_evidence';

export interface DecisionInputReason {
  code: DecisionInputReasonCode;
  severity: DecisionInputReasonSeverity;
  message: string;
}

export function deviationBps(input: number, reference: number): number | null {
  if (!Number.isFinite(input) || input <= 0 || !Number.isFinite(reference) || reference <= 0) {
    return null;
  }
  const deviation = (Math.abs(input - reference) / reference) * 10_000;
  return Number.isFinite(deviation) ? deviation : Number.MAX_VALUE;
}

export function snapshotHash(value: unknown): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(value)));
}

export function addReason(
  reasons: DecisionInputReason[],
  code: DecisionInputReason['code'],
  severity: DecisionInputReason['severity'],
  message: string
): void {
  reasons.push({ code, severity, message });
}
