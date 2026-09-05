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
 *   - v3: when the receipt commits to a SECOND gate, that gate must be presented
 *     and its uid must equal `executionReceipt.data.destinationPreTradeUid`, and
 *     `preTradeUidsHash` must recompute from the presented gates in order (F1) —
 *     this is what stops the denominator of a two-leg quote being swapped for a
 *     different gate after signing.
 *   - chain + asset ids corroborate (informational; the hashes above are the
 *     authoritative binding, since they are signed into both receipts).
 *
 * The resulting `closedLoopStatus` is the execution receipt's own verdict, now
 * proven to be about this pre-trade:
 *   CLOSED_FAITHFUL     — bound + FAITHFUL (v1/v2 receipts)
 *   PRICE_CLOSED_FAITHFUL — the same, on a v3 receipt whose signed verdict is
 *                           `priceExecutionStatus` — the scope travels in the
 *                           name (F2): the loop closed on PRICE only, and says
 *                           nothing about size, fees or timing.
 *   …DEVIATED / …NOT_EXECUTED / …UNDETERMINED as above; PAIR_INVALID when the
 *   binding or a signature failed.
 *
 * Disclosure boundary (verification != endorsement): this proves the loop
 * closed and was faithful to the CERTIFIED price within the signed band. It
 * does not assert the certified price was "correct" or the trade well-timed.
 */

import { getAttesterAddress, getSampleAttesterAddress } from '@/lib/attestations/attesterAccount';
import { computePreTradeUidsHash } from '@/lib/attestations/executionCommitments';
import { type ExecutionReceipt, type ExecutionStatus } from '@/lib/attestations/executionReceipt';
import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
import {
  buildKeyRegistryConfig,
  trustedAttesterEntry,
  type KeyRegistryConfig,
} from '@/lib/attestations/keyRegistryConfig';
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

/** v1/v2 closed-loop verdicts (the receipt's own verdict field was
 *  `executionStatus`; scope was not in the name). */
export type ClosedLoopStatus =
  | 'CLOSED_FAITHFUL'
  | 'CLOSED_DEVIATED'
  | 'CLOSED_NOT_EXECUTED'
  | 'CLOSED_UNDETERMINED'
  /** v3: the signed verdict field is `priceExecutionStatus`, so the closed-loop
   *  verdict carries that scope explicitly: faithful on PRICE. */
  | 'PRICE_CLOSED_FAITHFUL'
  | 'PRICE_CLOSED_DEVIATED'
  | 'PRICE_CLOSED_NOT_EXECUTED'
  | 'PRICE_CLOSED_UNDETERMINED'
  | 'PAIR_INVALID';

export interface ExecutionPairBinding {
  /** Execution receipt's preTradeUid equals the pre-trade attestation's uid. */
  preTradeUidMatch: boolean;
  /** Execution receipt's requestHash equals the pre-trade attestation's data.requestHash. */
  requestHashMatch: boolean;
  /** v3: the destination gate the receipt commits to was presented and its uid
   *  matches `data.destinationPreTradeUid`. True trivially on v1/v2 (which bind
   *  one gate) and on a v3 receipt that commits to no destination gate. */
  destinationPreTradeUidMatch: boolean;
  /** v3: `data.preTradeUidsHash` recomputes from the presented gates, in order.
   *  True trivially on v1/v2, which do not carry the commitment. */
  preTradeUidsHashMatch: boolean;
  /** Settlement chain in the execution receipt matches the pre-trade's subjectChainId. */
  chainMatch: boolean;
  /** Both CAIP-19 asset ids correlate between the two receipts. */
  assetMatch: boolean;
  /** The signed action is the same in the gate and execution receipt. */
  actionMatch: boolean;
  /** A committed destination gate is the exact opposite leg with the same scope. */
  destinationGateMatch: boolean;
  /** All presented proofs were signed by registry-authorised production keys. */
  trustedSigners: boolean;
  /** PASS/CAUTION on every pre-trade gate; DANGER/BLOCK never authorise execution. */
  preTradeAuthorized: boolean;
  /** The settlement occurred inside every signed pre-trade validity window. */
  executionWithinGateWindow: boolean;
  /** Current receipts must prove their gate originals, not merely repeat caller claims. */
  verifiedBinding: boolean;
}

export interface ExecutionPairVerification {
  /** True only when both receipts verify AND the cryptographic bindings hold
   *  (including the v3 destination-gate + hash checks when they apply). */
  pairedValid: boolean;
  preTrade: UnifiedVerificationResult;
  /** Verification result for the destination gate, when the receipt commits to
   *  one and one was presented. Null otherwise. */
  destinationPreTrade: UnifiedVerificationResult | null;
  execution: {
    valid: boolean;
    cryptographicValid: boolean;
    expired: boolean;
    executionStatus: ExecutionStatus | null;
    reason: string;
  };
  binding: ExecutionPairBinding;
  /** The closed-loop verdict a principal can act on. v3 receipts carry the
   *  PRICE_ prefix so the scope is in the name. */
  closedLoopStatus: ClosedLoopStatus;
  reason: string;
}

const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

/** Read a field that may be a hex string, number, or absent. */
function fieldToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Verify that pre-trade attestation(s) and an Execution Receipt describe the
 * same authorized action and that all are genuinely signed by Insight. Pure: it
 * only calls the existing verifiers and compares the binding fields.
 *
 * v3 receipts commit to up to TWO gates (source + destination, see F1). Pass the
 * destination original when the receipt declares one; when it is missing the
 * destination binding fails rather than being silently skipped.
 */
// The verifier deliberately enumerates every independent trust predicate and
// every diagnostic branch; splitting those checks would obscure the fail-closed
// conjunction that this function is responsible for auditing.
// eslint-disable-next-line complexity
export async function verifyExecutionPair(
  preTradeAttestation: PreTradeAttestationInput,
  executionReceipt: ExecutionReceipt,
  destinationPreTradeAttestation?: PreTradeAttestationInput | null,
  options?: { registry?: KeyRegistryConfig }
): Promise<ExecutionPairVerification> {
  const [preTrade, exec, destinationPreTrade] = await Promise.all([
    verifyAttestationBySchema(preTradeAttestation as never),
    verifyExecutionReceipt(executionReceipt),
    destinationPreTradeAttestation
      ? verifyAttestationBySchema(destinationPreTradeAttestation as never)
      : Promise.resolve(null),
  ]);

  const preTradeData = preTradeAttestation.data ?? {};
  const execData = executionReceipt.data;
  const schemaVersion = Number(execData.schemaVersion) || 0;
  const v3 = schemaVersion >= 3;

  const preTradeUidMatch =
    preTrade.uid != null && preTrade.uid === fieldToString(execData.preTradeUid);
  const requestHashMatch =
    fieldToString(preTradeData.requestHash) === fieldToString(execData.requestHash);

  // --- v3 (F1): the quote is source consensus over destination consensus, so
  // the receipt commits to BOTH gates and their ORDER. Verify both claims. ---
  const declaredDestinationUid = fieldToString(execData.destinationPreTradeUid);
  const commitsDestinationGate =
    v3 && declaredDestinationUid !== '' && declaredDestinationUid !== ZERO_BYTES32;
  let destinationPreTradeUidMatch = true;
  let destinationReason = '';
  if (commitsDestinationGate) {
    const destUid = destinationPreTrade?.uid ?? null;
    // An expired gate is still a genuine gate (matches the source-side rule):
    // what matters here is that the presented gate is real and is the one the
    // receipt committed to. Only a signature/UID failure is fatal.
    const destSignatureOk =
      destinationPreTrade != null &&
      (destinationPreTrade.valid ||
        (destinationPreTrade.expired && destinationPreTrade.reason === 'expired'));
    destinationPreTradeUidMatch =
      destSignatureOk &&
      destUid != null &&
      destUid.toLowerCase() === declaredDestinationUid.toLowerCase();
    if (!destinationPreTradeUidMatch) {
      destinationReason =
        destinationPreTrade == null
          ? 'execution receipt commits to a destination pre-trade gate that was not presented'
          : !destSignatureOk
            ? 'destination pre-trade gate failed verification'
            : 'destination pre-trade gate uid does not match the receipt commitment';
    }
  }
  let preTradeUidsHashMatch = true;
  if (v3 && execData.preTradeUidsHash) {
    const presentedUids: `0x${string}`[] = [fieldToString(execData.preTradeUid) as `0x${string}`];
    if (commitsDestinationGate && destinationPreTradeUidMatch) {
      presentedUids.push(declaredDestinationUid as `0x${string}`);
    }
    // The receipt must never claim an ordered gate set that is not provable
    // from what was presented. On a SELF_REPORTED receipt that committed to the
    // source gate alone, the single-uid hash must still recompute.
    const expected = computePreTradeUidsHash(presentedUids);
    preTradeUidsHashMatch =
      fieldToString(execData.preTradeUidsHash).toLowerCase() === expected.toLowerCase();
  }

  const preTradeChain = Number(fieldToString(preTradeData.subjectChainId) || -1);
  // The pre-trade only knows its subject chain; the receipt carries both a
  // subject chain (derived from the pre-trade's binding) and a settlement chain
  // (where the tx actually landed). The meaningful comparison is the pre-trade
  // subject chain against the receipt's subject chain.
  const chainMatch = preTradeChain > 0 && preTradeChain === Number(execData.subjectChainId);

  const assetMatch =
    fieldToString(preTradeData.sourceAssetId) === fieldToString(execData.sourceAssetId) &&
    fieldToString(preTradeData.destinationAssetId) === fieldToString(execData.destinationAssetId);
  const actionMatch =
    fieldToString(preTradeData.action).toLowerCase() ===
    fieldToString(execData.action).toLowerCase();
  const destinationData = destinationPreTradeAttestation?.data ?? {};
  const destinationGateMatch =
    !commitsDestinationGate ||
    (fieldToString(destinationData.sourceAssetId) ===
      fieldToString(preTradeData.destinationAssetId) &&
      fieldToString(destinationData.destinationAssetId) ===
        fieldToString(preTradeData.sourceAssetId) &&
      Number(destinationData.subjectChainId) === Number(preTradeData.subjectChainId) &&
      fieldToString(destinationData.action).toLowerCase() ===
        fieldToString(preTradeData.action).toLowerCase() &&
      Number(destinationData.tradeAmountUsd) === Number(preTradeData.tradeAmountUsd));

  const registry =
    options?.registry ??
    buildKeyRegistryConfig(await getAttesterAddress(), await getSampleAttesterAddress());
  const preTradeCryptoValid = preTrade.valid || (preTrade.expired && preTrade.reason === 'expired');
  const execCryptoValid = exec.valid || (exec.expired && exec.reason === 'receipt_expired');
  const destinationCryptoValid =
    destinationPreTrade == null ||
    destinationPreTrade.valid ||
    (destinationPreTrade.expired && destinationPreTrade.reason === 'expired');
  const trustedSigners =
    trustedAttesterEntry(preTrade.attester, preTrade.checkedAt, registry) !== null &&
    trustedAttesterEntry(exec.attester, exec.executedAt, registry) !== null &&
    (!commitsDestinationGate ||
      (destinationPreTrade != null &&
        trustedAttesterEntry(
          destinationPreTrade.attester,
          destinationPreTrade.checkedAt,
          registry
        ) !== null));
  const allowedVerdict = (value: unknown) => {
    const verdict = fieldToString(value).toUpperCase();
    return verdict === 'PASS' || verdict === 'CAUTION';
  };
  const preTradeAuthorized =
    allowedVerdict(preTradeData.verdict) &&
    (!commitsDestinationGate || allowedVerdict(destinationPreTradeAttestation?.data?.verdict));
  const executedAt = Number(execData.executedAt);
  const insideWindow = (result: UnifiedVerificationResult | null) =>
    result != null &&
    result.checkedAt != null &&
    result.validUntil != null &&
    executedAt >= result.checkedAt &&
    executedAt <= result.validUntil;
  const executionWithinGateWindow =
    insideWindow(preTrade) && (!commitsDestinationGate || insideWindow(destinationPreTrade));
  const verifiedBinding =
    exec.bindingMode === 'VERIFIED' && fieldToString(execData.bindingMode) === 'VERIFIED';
  const destinationGatePresent = !commitsDestinationGate || destinationPreTradeUidMatch;
  const pairedValid =
    preTradeCryptoValid &&
    execCryptoValid &&
    destinationCryptoValid &&
    trustedSigners &&
    preTradeAuthorized &&
    executionWithinGateWindow &&
    verifiedBinding &&
    preTradeUidMatch &&
    requestHashMatch &&
    preTradeUidsHashMatch &&
    destinationGatePresent &&
    chainMatch &&
    assetMatch &&
    actionMatch &&
    destinationGateMatch;

  let closedLoopStatus: ClosedLoopStatus;
  let reason: string;
  if (!pairedValid) {
    closedLoopStatus = 'PAIR_INVALID';
    reason = !preTradeCryptoValid
      ? 'pre-trade attestation signature is invalid'
      : !execCryptoValid
        ? 'execution receipt signature is invalid'
        : !trustedSigners
          ? 'one or more receipts were not signed by an authorised production attester'
          : !preTradeAuthorized
            ? 'the pre-trade verdict did not authorise execution'
            : !executionWithinGateWindow
              ? 'the settlement did not occur inside the signed pre-trade validity window'
              : !verifiedBinding
                ? 'execution receipt binding is self-reported, not verified'
                : !preTradeUidMatch
                  ? 'execution receipt does not reference the pre-trade attestation uid'
                  : !requestHashMatch
                    ? 'execution receipt requestHash does not match the pre-trade attestation'
                    : destinationReason || !preTradeUidsHashMatch
                      ? !preTradeUidsHashMatch
                        ? 'execution receipt preTradeUidsHash does not recompute from the presented gates'
                        : destinationReason
                      : !chainMatch
                        ? 'execution receipt subject chain does not match the pre-trade gate'
                        : !assetMatch
                          ? 'execution receipt assets do not match the pre-trade gate'
                          : !actionMatch
                            ? 'execution receipt action does not match the pre-trade gate'
                            : !destinationGateMatch
                              ? 'destination gate is not the exact opposite leg with the same signed scope'
                              : 'pairing failed';
  } else {
    // Both receipts valid + cryptographically bound (including every gate the
    // receipt commits to). The closed-loop verdict is the execution receipt's
    // own verdict, now proven to belong to this pre-trade. On v3 the verdict
    // field is `priceExecutionStatus` and the prefix carries that scope.
    const prefix = v3 ? 'PRICE_' : '';
    switch (exec.executionStatus) {
      case 'FAITHFUL':
        closedLoopStatus = `${prefix}CLOSED_FAITHFUL` as ClosedLoopStatus;
        reason =
          'agent filled within the certified band and the receipt is bound to a valid pre-trade gate';
        break;
      case 'DEVIATED':
        closedLoopStatus = `${prefix}CLOSED_DEVIATED` as ClosedLoopStatus;
        reason =
          'receipt bound to a valid pre-trade gate but the fill drifted past the certified band';
        break;
      case 'NOT_EXECUTED':
        closedLoopStatus = `${prefix}CLOSED_NOT_EXECUTED` as ClosedLoopStatus;
        reason =
          'receipt bound to a valid pre-trade gate but the transaction reverted (nothing settled)';
        break;
      default:
        closedLoopStatus = `${prefix}CLOSED_UNDETERMINED` as ClosedLoopStatus;
        reason =
          'receipt bound to a valid pre-trade gate but the on-chain fill price was unreadable';
    }
  }

  return {
    pairedValid,
    preTrade,
    destinationPreTrade,
    execution: {
      valid: exec.valid,
      cryptographicValid: execCryptoValid,
      expired: exec.expired,
      executionStatus: exec.executionStatus,
      reason: exec.reason,
    },
    binding: {
      preTradeUidMatch,
      requestHashMatch,
      destinationPreTradeUidMatch,
      preTradeUidsHashMatch,
      chainMatch,
      assetMatch,
      actionMatch,
      destinationGateMatch,
      trustedSigners,
      preTradeAuthorized,
      executionWithinGateWindow,
      verifiedBinding,
    },
    closedLoopStatus,
    reason,
  };
}
