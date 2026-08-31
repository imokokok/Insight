/**
 * @fileoverview Pairwise verification of a pre-trade attestation against an
 * Execution Receipt — the third-party "closed loop" proof.
 *
 * The two receipts are independently verifiable on their own (`verify` endpoints
 * exist for each), but a principal evaluating an agent needs one more fact a
 * single receipt cannot give: that the Execution Receipt genuinely belongs to
 * THIS pre-trade gate, and that the whole chain — certify, execute, prove —
 * actually closed. That is what this module answers.
 *
 * It does NOT re-derive either verdict. It reuses the existing verifiers for
 * each receipt (signature + validity window), then asserts the cryptographic
 * binding between them:
 *   - `executionReceipt.data.preTradeUid` === `preTradeAttestation.uid`
 *   - `executionReceipt.data.requestHash` === `preTradeAttestation.data.requestHash`
 *   - chain + asset ids corroborate (informational; the two hashes above are the
 *     authoritative binding, since they are signed into both receipts).
 *
 * The resulting `closedLoopStatus` is the execution receipt's own verdict, now
 * proven to be about this pre-trade:
 *   CLOSED_FAITHFUL    — bound + FAITHFUL
 *   CLOSED_DEVIATED    — bound + DEVIATED
 *   CLOSED_NOT_EXECUTED — bound + NOT_EXECUTED
 *   CLOSED_UNDETERMINED — bound + UNDETERMINED (fill price unreadable)
 *   PAIR_INVALID       — binding or a signature failed
 *
 * Disclosure boundary (verification != endorsement): this proves the loop
 * closed and was faithful to the CERTIFIED price within the signed band. It
 * does not assert the certified price was "correct" or the trade well-timed.
 */

import type { ExecutionReceipt, ExecutionStatus } from '@/lib/attestations/executionReceipt';
import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
import {
  verifyAttestationBySchema,
  type UnifiedVerificationResult,
} from '@/lib/attestations/verifyAttestationBySchema';

/** Loose pre-trade envelope. The binding fields are read off `data` after the
 *  signature is confirmed; the crypto layer re-derives the hash so a tampered
 *  `data` fails signature recovery rather than being trusted. */
export interface PreTradeAttestationInput {
  uid: string;
  schemaVersion: number;
  attester: string;
  data: Record<string, unknown>;
  eip712?: { primaryType?: string };
  type?: string;
  [key: string]: unknown;
}

export type ClosedLoopStatus =
  | 'CLOSED_FAITHFUL'
  | 'CLOSED_DEVIATED'
  | 'CLOSED_NOT_EXECUTED'
  | 'CLOSED_UNDETERMINED'
  | 'PAIR_INVALID';

export interface ExecutionPairBinding {
  /** Execution receipt's preTradeUid equals the pre-trade attestation's uid. */
  preTradeUidMatch: boolean;
  /** Execution receipt's requestHash equals the pre-trade attestation's data.requestHash. */
  requestHashMatch: boolean;
  /** Settlement chain in the execution receipt matches the pre-trade's subjectChainId. */
  chainMatch: boolean;
  /** Both CAIP-19 asset ids correlate between the two receipts. */
  assetMatch: boolean;
}

export interface ExecutionPairVerification {
  /** True only when both receipts verify AND the two cryptographic bindings hold. */
  pairedValid: boolean;
  preTrade: UnifiedVerificationResult;
  execution: {
    valid: boolean;
    expired: boolean;
    executionStatus: ExecutionStatus | null;
    reason: string;
  };
  binding: ExecutionPairBinding;
  /** The closed-loop verdict a principal can act on. */
  closedLoopStatus: ClosedLoopStatus;
  reason: string;
}

/** Read a field that may be a hex string, number, or absent. */
function fieldToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Verify that a pre-trade attestation and an Execution Receipt describe the same
 * authorized action and that both are genuinely signed by Insight. Pure: it only
 * calls the two existing verifiers and compares the binding fields.
 */
export async function verifyExecutionPair(
  preTradeAttestation: PreTradeAttestationInput,
  executionReceipt: ExecutionReceipt
): Promise<ExecutionPairVerification> {
  const preTrade = await verifyAttestationBySchema(preTradeAttestation as never);
  const exec = await verifyExecutionReceipt(executionReceipt);

  const preTradeData = preTradeAttestation.data ?? {};
  const execData = executionReceipt.data;

  const preTradeUidMatch =
    preTrade.uid != null && preTrade.uid === fieldToString(execData.preTradeUid);
  const requestHashMatch =
    fieldToString(preTradeData.requestHash) === fieldToString(execData.requestHash);

  const preTradeChain = Number(fieldToString(preTradeData.subjectChainId) || -1);
  const chainMatch =
    preTradeChain > 0 &&
    preTradeChain === Number(execData.subjectChainId) &&
    preTradeChain === Number(execData.settlementChainId);

  const assetMatch =
    fieldToString(preTradeData.sourceAssetId) === fieldToString(execData.sourceAssetId) &&
    fieldToString(preTradeData.destinationAssetId) === fieldToString(execData.destinationAssetId);

  const preTradeValid = preTrade.valid && !preTrade.expired;
  const execValid = exec.valid && !exec.expired;
  const pairedValid = preTradeValid && execValid && preTradeUidMatch && requestHashMatch;

  let closedLoopStatus: ClosedLoopStatus;
  let reason: string;
  if (!pairedValid) {
    closedLoopStatus = 'PAIR_INVALID';
    reason = !preTradeValid
      ? 'pre-trade attestation is invalid or expired'
      : !execValid
        ? 'execution receipt is invalid or expired'
        : !preTradeUidMatch
          ? 'execution receipt does not reference the pre-trade attestation uid'
          : !requestHashMatch
            ? 'execution receipt requestHash does not match the pre-trade attestation'
            : 'pairing failed';
  } else {
    // Both receipts valid + cryptographically bound. The closed-loop verdict is
    // the execution receipt's own verdict, now proven to belong to this pre-trade.
    switch (exec.executionStatus) {
      case 'FAITHFUL':
        closedLoopStatus = 'CLOSED_FAITHFUL';
        reason =
          'agent filled within the certified band and the receipt is bound to a valid pre-trade gate';
        break;
      case 'DEVIATED':
        closedLoopStatus = 'CLOSED_DEVIATED';
        reason =
          'receipt bound to a valid pre-trade gate but the fill drifted past the certified band';
        break;
      case 'NOT_EXECUTED':
        closedLoopStatus = 'CLOSED_NOT_EXECUTED';
        reason =
          'receipt bound to a valid pre-trade gate but the transaction reverted (nothing settled)';
        break;
      default:
        closedLoopStatus = 'CLOSED_UNDETERMINED';
        reason =
          'receipt bound to a valid pre-trade gate but the on-chain fill price was unreadable';
    }
  }

  return {
    pairedValid,
    preTrade,
    execution: {
      valid: exec.valid,
      expired: exec.expired,
      executionStatus: exec.executionStatus,
      reason: exec.reason,
    },
    binding: { preTradeUidMatch, requestHashMatch, chainMatch, assetMatch },
    closedLoopStatus,
    reason,
  };
}
