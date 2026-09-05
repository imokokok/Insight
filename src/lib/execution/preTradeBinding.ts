/**
 * @fileoverview Resolve HOW an Execution Receipt is bound to its pre-trade gate.
 *
 * The v1 execution receipt signed the pre-trade fields exactly as the caller
 * reported them. That is weaker than it looks: a signature over caller-supplied
 * values proves only that Insight signed those numbers, not that a matching
 * pre-trade gate ever existed. An agent could invent a permissive quote, a wide
 * slippage bound and a flattering provider count, then obtain a receipt that
 * says FAITHFUL and verifies cleanly on its own. Only a holder who also
 * possessed the pre-trade original and ran verify-pair could tell the
 * difference — and a principal handed just the receipt could not.
 *
 * This module closes that. When the caller presents the pre-trade attestation
 * originals, Insight verifies their signatures FIRST and then reads every
 * binding field out of the verified payload, so the receipt binds to a gate
 * that provably exists.
 *
 * Why TWO originals are required for a VERIFIED binding: the execution receipt
 * compares against a destination-per-source price (that is what the on-chain
 * Transfer amounts yield), and a single pre-trade attestation only certifies
 * one asset's consensus price. The quote is the ratio of the two, so both
 * certificates must be proven. A caller that presents only one still gets a
 * receipt, but it is SELF_REPORTED: the quote remains its own assertion, and a
 * SELF_REPORTED receipt can never reach a FAITHFUL verdict.
 *
 * Presenting an original that FAILS verification is a hard rejection, not a
 * downgrade. Someone who claims to hold a gate and cannot produce a valid one
 * is asserting a provenance they do not have; quietly signing a weaker receipt
 * would reward the attempt.
 */

import { getAttesterAddress, getSampleAttesterAddress } from '@/lib/attestations/attesterAccount';
import type { ExecutionBindingMode } from '@/lib/attestations/executionReceipt';
import {
  buildKeyRegistryConfig,
  trustedAttesterEntry,
  type KeyRegistryConfig,
} from '@/lib/attestations/keyRegistryConfig';
import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';

/** Pre-trade prices are signed scaled by 1e8, matching the attestation family. */
const PRE_TRADE_PRICE_SCALE = 1e8;

/** Loose envelope for a caller-supplied pre-trade attestation. The crypto layer
 *  re-derives the hash, so a malformed payload is rejected, never trusted. */
export interface PreTradeAttestationEnvelope {
  uid: string;
  schemaVersion: number;
  attester: string;
  data: Record<string, unknown>;
  eip712?: { primaryType?: string };
  type?: string;
  [key: string]: unknown;
}

/** The caller's own account of the pre-trade gate. Used verbatim when no
 *  originals are presented (and ignored, apart from `preTradeUid`, when they are). */
export interface SelfReportedPreTrade {
  preTradeUid: string;
  /** v3: the caller's claimed destination-gate uid. Carried only when the
   *  caller asserts one; the SELF_REPORTED receipt then commits to it in
   *  `preTradeUidsHash` exactly as claimed, with no VERIFIED strength. */
  destinationPreTradeUid?: string | null;
  requestHash: string;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  action?: string;
  participantCount: number;
  sourceGroupCount: number;
  preTradeSignedAt: number;
  quotedPrice: number;
}

export interface ResolvedPreTradeBinding {
  bindingMode: ExecutionBindingMode;
  preTradeUid: string;
  /** v3: uid of the SECOND pre-trade gate the quote was built from (the
   *  destination leg). Null when the binding is SELF_REPORTED — the caller
   *  showed no destination original, so the receipt commits to the source gate
   *  only and must not claim a two-gate basis it did not prove. */
  destinationPreTradeUid: string | null;
  requestHash: string;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  action: string;
  participantCount: number;
  sourceGroupCount: number;
  preTradeSignedAt: number;
  /** Earliest signed expiry across every gate used for the quote. */
  preTradeValidUntil: number;
  /** Destination-per-source quote, matching the on-chain executedPrice. */
  quotedPrice: number;
  /** True when the pre-trade attestation was genuine but outside its 600s
   *  window. Carried for reporting: an expired gate can still prove a
   *  historical authorisation, and the receipt's own STALE_ORACLE_AT_EXEC code
   *  already reports the age consequence. */
  preTradeExpired: boolean;
}

export type ResolvePreTradeBindingResult =
  | { ok: true; binding: ResolvedPreTradeBinding }
  | { ok: false; code: 'PRE_TRADE_VERIFICATION_FAILED'; message: string };

/** Read a numeric field that may arrive as a number or a numeric string. */
function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** Read a string field. */
function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/** Verify one pre-trade original and return its checked-at time and consensus
 *  price (unscaled), or a failure reason. */
async function verifyOne(
  attestation: PreTradeAttestationEnvelope,
  label: string,
  registry: KeyRegistryConfig
): Promise<
  { ok: true; data: Record<string, unknown>; expired: boolean } | { ok: false; message: string }
> {
  const result = await verifyAttestationBySchema(attestation);

  // An expired gate is still a genuine gate: it proves the authorisation
  // existed. Only signature/UID failures are fatal.
  const expired = result.expired;
  const signatureOk = result.valid || (expired && result.reason === 'expired');

  if (!signatureOk) {
    return {
      ok: false,
      message:
        `${label} pre-trade attestation failed verification` +
        (result.reason ? ` (${result.reason})` : ''),
    };
  }

  const checkedAt = toNumber(attestation.data?.checkedAt);
  if (!trustedAttesterEntry(result.attester, checkedAt || null, registry)) {
    return {
      ok: false,
      message: `${label} pre-trade attestation was not signed by an authorised production attester`,
    };
  }

  const verdict = toText(attestation.data?.verdict).toUpperCase();
  if (verdict !== 'PASS' && verdict !== 'CAUTION') {
    return {
      ok: false,
      message: `${label} pre-trade verdict ${verdict || 'UNKNOWN'} did not authorise execution`,
    };
  }

  return { ok: true, data: attestation.data ?? {}, expired };
}

/**
 * Resolve the pre-trade binding for an Execution Receipt.
 *
 * Both originals present and genuine  -> VERIFIED, every field read from the
 *                                        verified payloads.
 * Either original missing             -> SELF_REPORTED, caller values used as
 *                                        given (never graded FAITHFUL).
 * Either original fails verification  -> hard rejection.
 */
export async function resolvePreTradeBinding(params: {
  source?: PreTradeAttestationEnvelope | null;
  destination?: PreTradeAttestationEnvelope | null;
  selfReported: SelfReportedPreTrade;
}): Promise<ResolvePreTradeBindingResult> {
  const { source, destination, selfReported } = params;

  if (!source || !destination) {
    return {
      ok: true,
      binding: {
        bindingMode: 'SELF_REPORTED',
        preTradeUid: selfReported.preTradeUid,
        destinationPreTradeUid: selfReported.destinationPreTradeUid ?? null,
        requestHash: selfReported.requestHash,
        sourceAssetId: selfReported.sourceAssetId,
        destinationAssetId: selfReported.destinationAssetId,
        subjectChainId: selfReported.subjectChainId,
        action: selfReported.action ?? 'SWAP',
        participantCount: selfReported.participantCount,
        sourceGroupCount: selfReported.sourceGroupCount,
        preTradeSignedAt: selfReported.preTradeSignedAt,
        preTradeValidUntil: 0,
        quotedPrice: selfReported.quotedPrice,
        preTradeExpired: false,
      },
    };
  }

  const registry = buildKeyRegistryConfig(
    await getAttesterAddress(),
    await getSampleAttesterAddress()
  );

  const sourceResult = await verifyOne(source, 'source', registry);
  if (!sourceResult.ok) {
    return { ok: false, code: 'PRE_TRADE_VERIFICATION_FAILED', message: sourceResult.message };
  }

  const destResult = await verifyOne(destination, 'destination', registry);
  if (!destResult.ok) {
    return { ok: false, code: 'PRE_TRADE_VERIFICATION_FAILED', message: destResult.message };
  }

  const sourceData = sourceResult.data;
  const destData = destResult.data;

  const sourceConsensus = toNumber(sourceData.consensusPrice) / PRE_TRADE_PRICE_SCALE;
  const destConsensus = toNumber(destData.consensusPrice) / PRE_TRADE_PRICE_SCALE;

  if (!(sourceConsensus > 0)) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message: 'source pre-trade attestation carries no usable consensus price',
    };
  }
  if (!(destConsensus > 0)) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message: 'destination pre-trade attestation carries no usable consensus price',
    };
  }

  // Cross-check the two originals describe the same swap, opposite legs. This
  // stops a caller pairing a genuine certificate for one asset with an
  // unrelated one to manufacture a favourable ratio.
  const sourceDestinationAsset = toText(sourceData.destinationAssetId);
  const destSourceAsset = toText(destData.sourceAssetId);
  const sourceSourceAsset = toText(sourceData.sourceAssetId);
  const destDestinationAsset = toText(destData.destinationAssetId);
  const sameOppositePair =
    sourceSourceAsset !== '' &&
    sourceDestinationAsset !== '' &&
    sourceDestinationAsset === destSourceAsset &&
    sourceSourceAsset === destDestinationAsset;
  if (!sameOppositePair) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message:
        'the two pre-trade attestations describe different asset pairs ' +
        `(${sourceSourceAsset} -> ${sourceDestinationAsset} vs ${destSourceAsset} -> ${destDestinationAsset})`,
    };
  }

  if (toNumber(sourceData.subjectChainId) !== toNumber(destData.subjectChainId)) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message: 'the two pre-trade attestations target different subject chains',
    };
  }
  if (toText(sourceData.action).toLowerCase() !== toText(destData.action).toLowerCase()) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message: 'the two pre-trade attestations describe different actions',
    };
  }
  if (toNumber(sourceData.tradeAmountUsd) !== toNumber(destData.tradeAmountUsd)) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message: 'the two pre-trade attestations describe different trade amounts',
    };
  }

  const preTradeSignedAt = Math.max(toNumber(sourceData.checkedAt), toNumber(destData.checkedAt));
  const preTradeValidUntil = Math.min(
    toNumber(sourceData.validUntil),
    toNumber(destData.validUntil)
  );
  if (preTradeValidUntil <= 0 || preTradeSignedAt > preTradeValidUntil) {
    return {
      ok: false,
      code: 'PRE_TRADE_VERIFICATION_FAILED',
      message: 'the two pre-trade gate validity windows never overlap',
    };
  }

  return {
    ok: true,
    binding: {
      bindingMode: 'VERIFIED',
      preTradeUid: source.uid,
      destinationPreTradeUid: destination.uid,
      requestHash: toText(sourceData.requestHash),
      sourceAssetId: toText(sourceData.sourceAssetId) || selfReported.sourceAssetId,
      destinationAssetId: sourceDestinationAsset || selfReported.destinationAssetId,
      subjectChainId: toNumber(sourceData.subjectChainId) || selfReported.subjectChainId,
      action: toText(sourceData.action) || 'SWAP',
      participantCount: toNumber(sourceData.participantCount),
      sourceGroupCount: toNumber(sourceData.sourceGroupCount),
      // `checkedAt` is inside the EIP-712 message. The envelope's `signedAt` is
      // unsigned metadata and must never establish precedence: a holder can
      // edit it without invalidating the gate.
      preTradeSignedAt,
      preTradeValidUntil,
      // The quote is destination-per-source so it is directly comparable to the
      // on-chain executedPrice (also destination/source). consensusPrice is the
      // asset's USD price, so destination-per-source = sourceUSD / destUSD.
      quotedPrice: sourceConsensus / destConsensus,
      preTradeExpired: sourceResult.expired || destResult.expired,
    },
  };
}
