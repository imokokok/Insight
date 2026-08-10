/**
 * @fileoverview Pre-trade re-check service.
 *
 * A recheck is a FRESH re-run of the pre-trade safety check that issues a new
 * `OracleSafetyRecheck` attestation referencing the original check (by
 * originalUid + originalRequestHash). Use case: an agent got a safety check at
 * time T₀, then time passes; right before executing the trade at T₁, the agent
 * calls recheck to confirm oracle state is still healthy. The recheck verdict +
 * consensusPrice reflect CURRENT state (T₁), not a stale copy of T₀.
 *
 * Per Raul's locked spec: rechecks do NOT overwrite v1 and do NOT mutate the
 * original attestation — they issue a separate signed type that binds the
 * original. The recheck is keyed by originalUid + chainId + sourceAssetId
 * (CAIP-19) + checkedAt (the recheck's own checkedAt), so each recheck is a
 * distinct, independently-verifiable attestation.
 *
 * Binding invariant: the recheck re-runs with the SAME trade params as the
 * original, so its own `requestHash` (one of the 26 v2 fields) equals
 * `originalRequestHash`. Verifiers can assert this to confirm same-trade
 * continuity without re-fetching the original.
 *
 * Drift: when the caller passes `originalConsensusPrice` (the raw consensus
 * price from the original response), the service reports how far the current
 * consensus has drifted since the original — a key signal for "is the trade
 * still safe to execute now?".
 */

import type {
  AttestationDataV2,
  OracleSafetyAttestationV2,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import { signRecheck, type OracleSafetyRecheck } from '@/lib/attestations/oracleSafetyRecheck';
import { createLogger } from '@/lib/utils/logger';

import {
  preTradeSafetyCheck,
  type AuditMeta,
  type PreTradeSafetyInput,
  type PreTradeSafetyResult,
} from './preTradeSafetyService';

/** Default drift threshold (percent) above which stillValid flips to false. */
export const DEFAULT_MAX_DRIFT_PCT = 2;

const logger = createLogger('pre-trade-recheck');

export interface PreTradeRecheckInput {
  /** Trade params — MUST match the original check (so requestHash matches). */
  asset: string;
  chainId: number;
  action: PreTradeSafetyInput['action'];
  tradeAmountUsd: number;
  destinationAsset?: string;
  targetProviders?: string[];
  protocolId?: string;

  /** Reference to the original v2 attestation being re-verified. */
  originalUid: string;
  originalRequestHash: `0x${string}`;

  /** Raw consensus price from the original response, for drift comparison. */
  originalConsensusPrice?: number;
  /** Drift threshold (percent). Defaults to {@link DEFAULT_MAX_DRIFT_PCT}. */
  maxDriftPct?: number;
}

export type RecheckStillValidReason =
  | 'ok'
  | 'verdict_deteriorated'
  | 'drift_exceeded'
  | 'no_attester_key'
  | 'recheck_sign_failed'
  | 'original_request_hash_mismatch';

export interface PreTradeRecheckResult extends PreTradeSafetyResult {
  /** The recheck attestation (28-field OracleSafetyRecheck), or null when no
   *  attester key is configured / signing failed. Distinct from
   *  `attestation` (the v2 OracleSafetyCheck from the re-run). */
  recheck: OracleSafetyRecheck | null;
  /** Echoed original references (for the response + client confirmation). */
  originalUid: string;
  originalRequestHash: `0x${string}`;
  /** |current − original| / original × 100. null when originalConsensusPrice
   *  was not provided. */
  driftSinceOriginalPct: number | null;
  /** Whether the trade is still safe to execute now. False when the fresh
   *  verdict is DANGER/BLOCK, or when drift exceeds the threshold. */
  stillValid: boolean;
  /** Why stillValid is false (or 'ok' when true). */
  stillValidReason: RecheckStillValidReason;
}

/**
 * Re-run the pre-trade safety check and issue a recheck attestation referencing
 * the original. The verdict / consensusPrice / freshness reflect the CURRENT
 * oracle state. The original attestation is NOT mutated; a new signed
 * `OracleSafetyRecheck` is issued alongside the fresh v2 attestation.
 */
export async function preTradeRecheck(
  input: PreTradeRecheckInput,
  meta: AuditMeta = {}
): Promise<PreTradeRecheckResult> {
  // 1. Re-run the safety check with v2 schema (fresh oracle state). Pass the
  //    audit meta through so the re-run's audit row attributes to the same key.
  const result = await preTradeSafetyCheck(
    {
      asset: input.asset,
      chainId: input.chainId,
      action: input.action,
      tradeAmountUsd: input.tradeAmountUsd,
      targetProviders: input.targetProviders,
      protocolId: input.protocolId,
      schemaVersion: 2,
      destinationAsset: input.destinationAsset,
    },
    meta
  );

  // 2. Build the recheck attestation from the fresh v2 data + original refs.
  //    The re-run's v2 attestation carries the current checkedAt / validUntil /
  //    verdict / requestHash; we append originalUid + originalRequestHash and
  //    sign under the OracleSafetyRecheck type.
  let recheck: OracleSafetyRecheck | null = null;
  const v2Att = result.attestation as OracleSafetyAttestationV2 | null;

  if (v2Att && v2Att.schemaVersion === 2) {
    // Enforce the same-trade binding invariant (Raul's spec): a recheck must
    // re-run the SAME trade params as the original, so its own requestHash must
    // equal the originalRequestHash the caller claims to be rechecking. If they
    // differ, the caller passed inconsistent references and we must NOT issue a
    // signed continuity proof that falsely binds to the claimed original — we
    // surface the mismatch instead of signing a misleading attestation.
    if (v2Att.data.requestHash !== input.originalRequestHash) {
      logger.warn('recheck binding invariant violated: re-run requestHash != originalRequestHash', {
        asset: input.asset,
        chainId: input.chainId,
        rerunRequestHash: v2Att.data.requestHash,
        claimedOriginalRequestHash: input.originalRequestHash,
      });
      return {
        ...result,
        recheck: null,
        originalUid: input.originalUid,
        originalRequestHash: input.originalRequestHash,
        driftSinceOriginalPct: null,
        stillValid: false,
        stillValidReason: 'original_request_hash_mismatch',
      };
    }

    recheck = await signRecheck({
      v2Data: v2Att.data as AttestationDataV2,
      originalUid: input.originalUid,
      originalRequestHash: input.originalRequestHash,
    });
  }

  // 3. Drift vs the original consensus price (raw, un-scaled).
  const driftSinceOriginalPct =
    input.originalConsensusPrice !== undefined && input.originalConsensusPrice > 0
      ? (Math.abs(result.consensusPrice - input.originalConsensusPrice) /
          input.originalConsensusPrice) *
        100
      : null;

  // 4. stillValid: verdict not DANGER/BLOCK AND drift within threshold.
  const verdictDeteriorated = result.verdict === 'DANGER' || result.verdict === 'BLOCK';
  const maxDrift = input.maxDriftPct ?? DEFAULT_MAX_DRIFT_PCT;
  const driftExceeded = driftSinceOriginalPct !== null && driftSinceOriginalPct > maxDrift;

  let stillValid: boolean;
  let stillValidReason: RecheckStillValidReason;
  if (verdictDeteriorated) {
    stillValid = false;
    stillValidReason = 'verdict_deteriorated';
  } else if (driftExceeded) {
    stillValid = false;
    stillValidReason = 'drift_exceeded';
  } else if (!recheck) {
    // Verdict + drift are fine, but no portable recheck proof could be issued.
    // The safety SIGNAL is still valid; only the signed attestation is missing.
    // Distinguish "attestation subsystem off" (no v2 either) from "v2 worked
    // but recheck signing threw" so operators can diagnose the gap.
    stillValid = true;
    stillValidReason = v2Att ? 'recheck_sign_failed' : 'no_attester_key';
  } else {
    stillValid = true;
    stillValidReason = 'ok';
  }

  return {
    ...result,
    recheck,
    originalUid: input.originalUid,
    originalRequestHash: input.originalRequestHash,
    driftSinceOriginalPct,
    stillValid,
    stillValidReason,
  };
}
