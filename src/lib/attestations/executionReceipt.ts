/**
 * @fileoverview Execution Receipt — a signed, independently verifiable record
 * of "the agent actually executed at the price Insight said was trustworthy".
 *
 * Closes the one gap the existing receipt family leaves open. Pre-trade answers
 * "is this price trustworthy to act on right now?" and signs that answer.
 * Oracle Watch answers "can I keep depending on this feed?" Neither says
 * anything about what the agent DID after being told the price was safe, so a
 * principal holding both receipts still cannot tell a faithful fill from a
 * drifted one. This module signs that third fact.
 *
 * It is an ADDITIVE receipt type, not a change to the frozen pre-trade line:
 * v1 (11 fields), v2 (26) and v3 (27) are untouched and stay verifiable. The
 * pairing is by reference, not by mutation: `preTradeUid` binds the pre-trade
 * attestation this execution belongs to, and `requestHash` is the SAME canonical
 * request commitment pre-trade signs, so a holder can prove the two receipts
 * describe the same action without trusting either issuer further.
 *
 * Design rules inherited from the existing line, each paid for by a partner
 * finding — they are not stylistic:
 *
 *   - Thresholds that gate a verdict are SIGNED alongside the value they are
 *     compared against, so a receipt is self-contained. `maxSlippageBps` sits
 *     next to `priceDeltaBps`; `requiredSourceGroupCount` sits next to
 *     `sourceGroupCount`. Without them a holder would need our source code to
 *     interpret a document we signed (VERITAS, 2026-08-29).
 *   - Derived verdict fields are computed INSIDE buildMessage so a receipt can
 *     never disagree with the evidence it carries.
 *   - A missing attester key means "attestations unavailable", never a different
 *     verdict. Signing is additive and must never become a safety dependency.
 *
 * Disclosure boundary (verification != endorsement): this receipt asserts only
 * that (a) the fill price landed within the signed slippage bound of the price
 * pre-trade certified, and (b) the oracle basis the agent was certified against
 * at pre-trade — provider count, distinct-operator-group count, and data age —
 * is carried forward into this receipt so a holder can judge whether that basis
 * was still sound at settlement. The basis counts are the agent's own pre-trade
 * gate values, presented by the caller and re-signed here; this receipt does NOT
 * independently re-prove oracle quorum or independence at execution time. It does
 * NOT assert the price was "correct", that the trade was well-timed, or that the
 * strategy was sound.
 *
 * Scale conventions match the rest of the family so one verifier handles all
 * receipt types: price -> 1e8, USD -> 1e6, percent -> 1e2 (bps), ratio -> 1e4.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount } from './attesterAccount';
import { computeReasonCodesHash } from './reasonCodesHash';

const logger = createLogger('ExecutionReceipt');

export const EXECUTION_SCHEMA_VERSION = 1;
/**
 * v2 adds two signed fields that close a real trust hole in v1.
 *
 * v1 signed the pre-trade binding fields (`preTradeUid`, `requestHash`,
 * `quotedPrice`, `participantCount`, `sourceGroupCount`) exactly as the caller
 * reported them. A signature over caller-supplied values proves only that
 * Insight signed those numbers — not that a matching pre-trade gate ever
 * existed. An agent could invent a permissive quote, a wide slippage bound and
 * a flattering provider count, and obtain a receipt that says FAITHFUL and
 * verifies cleanly on its own.
 *
 * v2 fixes that by signing HOW the binding was established:
 *   - `bindingMode` — VERIFIED when Insight verified the pre-trade attestation
 *     itself and took every binding field from the signature-checked payload;
 *     SELF_REPORTED when the caller asserted them and Insight merely re-signed
 *     the assertion.
 *   - `preTradeSignedAt` — the pre-trade signing time, so a holder can check
 *     the gate genuinely PRECEDED the execution instead of being fabricated
 *     after a favourable fill was already known.
 *
 * v1 receipts stay verifiable: the verify path routes on the signed
 * `schemaVersion` and re-derives the matching type layout.
 */
export const EXECUTION_SCHEMA_VERSION_V2 = 2;
/** Schema version new receipts are signed with. */
export const CURRENT_EXECUTION_SCHEMA_VERSION = EXECUTION_SCHEMA_VERSION_V2;
/** Every schema version this module can verify. */
export const SUPPORTED_EXECUTION_SCHEMA_VERSIONS = [
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
] as const;

/**
 * How long an execution receipt is considered meaningful. Mirrors the pre-trade
 * and watch windows (600s): the receipt is a statement about a settlement that
 * already happened, not a live subscription.
 */
export const EXECUTION_VALID_FOR_SECONDS = 600;

/** Default slippage bound, signed alongside the observed drift. Callers may
 *  pass a tighter bound per action; the signed value is whatever was used. */
export const EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS = 50;

/** Quorum floor copied from the pre-trade/watch line so the three receipt
 *  types cannot drift on what "enough independent providers" means. */
export const EXECUTION_REQUIRED_PARTICIPANT_COUNT = 3;
/** Independence floor: distinct NON-DERIVED operator groups (TWAP excluded). */
export const EXECUTION_REQUIRED_SOURCE_GROUP_COUNT = 2;

/** Attester label (human-readable) carried in the JSON envelope, not signed. */
export const EXECUTION_ATTESTER_LABEL = 'Insight Execution Receipt';

/** EIP-712 domain. Distinct `name` from the pre-trade and watch domains so a
 *  receipt can never be replayed across surfaces. chainId=1 is a separator. */
export const EXECUTION_DOMAIN = {
  name: 'Insight Execution',
  version: '1',
  chainId: 1,
} as const;

export const EXECUTION_PRIMARY_TYPE = 'ExecutionReceipt';

/**
 * The v1 signed fields (30). Enums are encoded as `string` (portable across
 * EIP-712 implementations); hashes are `bytes32`. Field order is fixed —
 * changing it changes every UID and is a schema-version bump.
 *
 * Layout is frozen: v1 receipts remain verifiable forever.
 */
export const EXECUTION_TYPES_V1 = {
  ExecutionReceipt: [
    { name: 'preTradeUid', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'settlementChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'quotedPrice', type: 'uint256' },
    { name: 'executedPrice', type: 'uint256' },
    { name: 'priceDeltaBps', type: 'int256' },
    { name: 'maxSlippageBps', type: 'uint256' },
    { name: 'slippageSatisfied', type: 'bool' },
    { name: 'quotedAmountUsd', type: 'uint256' },
    { name: 'executedAmountUsd', type: 'uint256' },
    { name: 'actualFeeUsd', type: 'uint256' },
    { name: 'fillStatus', type: 'string' },
    { name: 'executionStatus', type: 'string' },
    { name: 'txHash', type: 'bytes32' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'executedAt', type: 'uint256' },
    { name: 'oracleDataAgeAtExecSeconds', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
    { name: 'independenceSatisfied', type: 'bool' },
    { name: 'mevRiskBps', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/**
 * The v2 signed fields (32) = v1's 30 plus:
 *   - `bindingMode`, first in the layout so the trust level of the pre-trade
 *     binding is the first thing a reader or verifier sees;
 *   - `preTradeSignedAt`, next to `executedAt` so the ordering of gate and
 *     settlement is checkable from the receipt alone.
 */
export const EXECUTION_TYPES_V2 = {
  ExecutionReceipt: [
    { name: 'bindingMode', type: 'string' },
    { name: 'preTradeUid', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'settlementChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'quotedPrice', type: 'uint256' },
    { name: 'executedPrice', type: 'uint256' },
    { name: 'priceDeltaBps', type: 'int256' },
    { name: 'maxSlippageBps', type: 'uint256' },
    { name: 'slippageSatisfied', type: 'bool' },
    { name: 'quotedAmountUsd', type: 'uint256' },
    { name: 'executedAmountUsd', type: 'uint256' },
    { name: 'actualFeeUsd', type: 'uint256' },
    { name: 'fillStatus', type: 'string' },
    { name: 'executionStatus', type: 'string' },
    { name: 'txHash', type: 'bytes32' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'executedAt', type: 'uint256' },
    { name: 'preTradeSignedAt', type: 'uint256' },
    { name: 'oracleDataAgeAtExecSeconds', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
    { name: 'independenceSatisfied', type: 'bool' },
    { name: 'mevRiskBps', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/** Layout new receipts are signed with. */
export const EXECUTION_TYPES = EXECUTION_TYPES_V2;

/** Resolve the EIP-712 type layout for a signed schema version. Unknown
 *  versions fall back to the current layout, which fails UID recovery (a
 *  tampered or unsupported receipt must never verify, never throw). */
export function executionTypesForSchemaVersion(schemaVersion: number) {
  return schemaVersion === EXECUTION_SCHEMA_VERSION ? EXECUTION_TYPES_V1 : EXECUTION_TYPES_V2;
}

// ---------------------------------------------------------------------------
// Scaling (matches the pre-trade + watch conventions)
// ---------------------------------------------------------------------------

const PRICE_SCALE = 1e8; // prices -> uint256
const USD_SCALE = 1e6; // USD amounts -> uint256
const RATIO_SCALE = 1e4; // 0..1 ratio -> bps

/** Returns a JSON-serializable uint256-encoded number. Mirrors v2/v3's
 *  `toUint`: viem's EIP-712 ops need bigint, so the public message stores
 *  numbers and {@link toBigIntMessage} widens them back only for the crypto.
 *  All values stay far under Number.MAX_SAFE_INTEGER, so the round trip is
 *  exact. This helper is for genuinely non-negative fields (prices, USD
 *  amounts, counts, ages). `priceDeltaBps` is NOT passed through here: it is a
 *  SIGNED quantity (negative = the agent got a better price than certified) and
 *  is carried as `int256`, so its sign is preserved in the signature. */
function toUint(n: number, scale: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * scale));
}

// ---------------------------------------------------------------------------
// Status enums (string-valued; carried as `string`/`bool` in the EIP-712 types)
// ---------------------------------------------------------------------------

export type FillStatus = 'FULL' | 'PARTIAL' | 'REVERTED' | 'FAILED';

/**
 * The receipt's verdict, derived from the evidence it carries.
 *
 *   FAITHFUL     — filled in full, inside the slippage bound, and the oracle
 *                  still satisfied independence at execution.
 *   DEVIATED     — executed, but the fill drifted past the bound, was partial,
 *                  or the oracle's independence gate no longer held.
 *   NOT_EXECUTED — the transaction reverted or failed; nothing settled.
 *   UNDETERMINED — the evidence needed to judge faithfulness is missing (no
 *                  certified quote, or no readable fill price).
 *
 * UNDETERMINED exists for the same reason "specified but not demonstrated" is
 * recorded rather than assumed elsewhere in this codebase: when a price is
 * absent, saying FAITHFUL asserts a comparison that was never performed, and
 * saying DEVIATED asserts a drift that was never measured. Neither is honest,
 * so the verdict says which one it is.
 *
 * This is Insight's verdict, in the same sense pre-trade's `verdict` is: it
 * describes whether the execution matched what Insight certified, never whether
 * the price was right or the trade was wise.
 */
export type ExecutionStatus = 'FAITHFUL' | 'DEVIATED' | 'NOT_EXECUTED' | 'UNDETERMINED';

/** Reason codes specific to execution. Distinct from the pre-trade and watch
 *  sets: they describe what happened at settlement, not at quote time. */
export type ExecutionReasonCode =
  | 'SLIPPAGE_EXCEEDED'
  | 'PARTIAL_FILL'
  | 'TX_REVERTED'
  | 'TX_FAILED'
  | 'STALE_ORACLE_AT_EXEC'
  | 'INSUFFICIENT_QUORUM_AT_EXEC'
  | 'INSUFFICIENT_INDEPENDENCE_AT_EXEC'
  | 'FILL_PRICE_UNAVAILABLE'
  | 'NATIVE_ASSET_LEG'
  | 'PRICE_NOT_ATTRIBUTED'
  /** v2: the pre-trade gate was signed AFTER the trade settled, so it could not
   *  have gated it. A receipt that claims FAITHFUL must be able to rule this
   *  out; when it cannot, the verdict is UNDETERMINED. */
  | 'PRE_TRADE_AFTER_EXECUTION'
  /** v2: no pre-trade attestation was presented, so the binding is the caller's
   *  own assertion. The receipt still records what was claimed, but it refuses
   *  to grade faithfulness against an unproven quote. */
  | 'PRE_TRADE_NOT_PRESENTED';

/**
 * How the pre-trade binding in this receipt was established (v2, signed).
 *
 *   VERIFIED       — Insight verified the pre-trade attestation's signature and
 *                    copied every binding field out of the verified payload.
 *   SELF_REPORTED  — the caller asserted the binding fields; Insight re-signed
 *                    them but did not see a pre-trade attestation.
 *
 * This is not a nicety. A signature over caller-supplied values proves only
 * that we signed those values, so SELF_REPORTED is never allowed to reach a
 * FAITHFUL verdict: there is no proven quote to be faithful to.
 */
export type ExecutionBindingMode = 'VERIFIED' | 'SELF_REPORTED';

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

/** The signed fields as JSON-serializable numbers / hex strings (JSON can't
 *  carry bigint; the verify endpoint receives numbers off the wire).
 *
 *  `bindingMode` and `preTradeSignedAt` exist only in v2; v1 receipts omit them
 *  and are encoded against {@link EXECUTION_TYPES_V1}, which does not declare
 *  them. viem encodes strictly from the type layout, so extra keys are inert. */
export interface ExecutionReceiptData {
  /** v2 only: how the pre-trade binding was established. Absent on v1. */
  bindingMode?: ExecutionBindingMode;
  preTradeUid: `0x${string}`;
  requestHash: `0x${string}`;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  settlementChainId: number;
  action: string;
  quotedPrice: number;
  executedPrice: number;
  priceDeltaBps: number;
  maxSlippageBps: number;
  slippageSatisfied: boolean;
  quotedAmountUsd: number;
  executedAmountUsd: number;
  actualFeeUsd: number;
  fillStatus: FillStatus;
  executionStatus: ExecutionStatus;
  txHash: `0x${string}`;
  blockNumber: number;
  executedAt: number;
  /** v2 only: unix seconds the paired pre-trade attestation was signed. Lets a
   *  holder check the gate preceded the settlement. Absent on v1. */
  preTradeSignedAt?: number;
  oracleDataAgeAtExecSeconds: number;
  participantCount: number;
  requiredParticipantCount: number;
  sourceGroupCount: number;
  requiredSourceGroupCount: number;
  independenceSatisfied: boolean;
  mevRiskBps: number;
  reasonCodesHash: `0x${string}`;
  validUntil: number;
  schemaVersion: number;
}

/** BigInt twin of {@link ExecutionReceiptData}, fed to viem's EIP-712 ops.
 *  Never serialized to JSON. */
export interface ExecutionBigIntMessage {
  /** v2 only. Must be populated whenever the v2 layout is used. */
  bindingMode?: string;
  preTradeUid: `0x${string}`;
  requestHash: `0x${string}`;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: bigint;
  settlementChainId: bigint;
  action: string;
  quotedPrice: bigint;
  executedPrice: bigint;
  priceDeltaBps: bigint;
  maxSlippageBps: bigint;
  slippageSatisfied: boolean;
  quotedAmountUsd: bigint;
  executedAmountUsd: bigint;
  actualFeeUsd: bigint;
  fillStatus: string;
  executionStatus: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
  executedAt: bigint;
  /** v2 only. Must be populated whenever the v2 layout is used. */
  preTradeSignedAt?: bigint;
  oracleDataAgeAtExecSeconds: bigint;
  participantCount: bigint;
  requiredParticipantCount: bigint;
  sourceGroupCount: bigint;
  requiredSourceGroupCount: bigint;
  independenceSatisfied: boolean;
  mevRiskBps: bigint;
  reasonCodesHash: `0x${string}`;
  validUntil: bigint;
  schemaVersion: bigint;
}

/** Raw (un-scaled) inputs. Verdict fields are DERIVED inside buildMessage so
 *  the receipt can't disagree with its own signed evidence. */
export interface ExecutionReceiptInput {
  /** UID of the pre-trade attestation this execution was authorised against. */
  preTradeUid: `0x${string}`;
  /** The SAME canonical request commitment pre-trade signed. */
  requestHash: `0x${string}`;
  /** Unix seconds the paired pre-trade attestation was signed. Required for the
   *  v2 ordering check: a gate signed after the settlement cannot have gated it.
   *  When absent, the ordering is unknown and the verdict becomes UNDETERMINED
   *  rather than silently assumed favourable. */
  preTradeSignedAt: number;
  /** How {@link preTradeUid} / {@link requestHash} and the carried-forward
   *  oracle basis were established. Defaults to SELF_REPORTED, which can never
   *  reach a FAITHFUL verdict. */
  bindingMode?: ExecutionBindingMode;
  /** CAIP-19 source asset id. */
  sourceAssetId: string;
  /** CAIP-19 destination asset id. */
  destinationAssetId: string;
  subjectChainId: number;
  /** Chain the transaction actually settled on. */
  settlementChainId: number;
  action: string;
  /** Price pre-trade certified (raw, e.g. 2450.12). */
  quotedPrice: number;
  /** Price actually achieved on-chain (raw). 0 when nothing filled. */
  executedPrice: number;
  /** Slippage bound to judge the drift against. Defaults to
   *  {@link EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS}. */
  maxSlippageBps?: number;
  /** Notional the pre-trade check was scoped to (raw USD). */
  quotedAmountUsd: number;
  /** Notional actually filled (raw USD). */
  executedAmountUsd: number;
  /** Fees actually paid (raw USD). */
  actualFeeUsd: number;
  fillStatus: FillStatus;
  txHash: `0x${string}`;
  blockNumber: number;
  /** Execution time, unix seconds. */
  executedAt: number;
  /** Age of the oracle consensus at the moment of execution, seconds. */
  oracleDataAgeAtExecSeconds: number;
  participantCount: number;
  /** Distinct NON-DERIVED operator groups at execution. */
  sourceGroupCount: number;
  /** Advisory only: 0..1 MEV-exposure estimate. Never gates the verdict,
   *  matching the standing rule that model scores inform but do not decide. */
  mevRiskScore?: number;
  /** Reason codes explaining a non-FAITHFUL verdict. */
  reasonCodes?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Derived verdict fields
// ---------------------------------------------------------------------------

/**
 * Drift of the fill from the certified price, in basis points. Signed: positive
 * means the agent got a worse price than quoted, negative means better.
 * Guards a zero/absent quote (a receipt with no certified price must not claim
 * a drift), and returns 0 when nothing filled.
 */
export function derivePriceDeltaBps(quotedPrice: number, executedPrice: number): number {
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) return 0;
  if (!Number.isFinite(executedPrice) || executedPrice <= 0) return 0;
  return Math.round(((executedPrice - quotedPrice) / quotedPrice) * RATIO_SCALE);
}

/**
 * The verdict. FAITHFUL requires the fill to be complete, inside the signed
 * bound, and the oracle independence gate to still hold at execution — the
 * receipt's claim is "executed on the price Insight certified", so a degraded
 * oracle basis is a deviation even when the fill itself was clean.
 *
 * Precedence matters: a reverted transaction is NOT_EXECUTED regardless of what
 * the prices say, and a missing price is UNDETERMINED before any comparison is
 * attempted, so the verdict can never be reached by comparing against a
 * placeholder zero.
 *
 * Adverse findings are graded BEFORE the binding checks, and FAITHFUL is graded
 * last. That asymmetry is deliberate:
 *   - A breach we can observe (slippage past the bound, independence lost,
 *     partial fill) is recorded even when the pre-trade binding was never
 *     proven — withholding it because the agent declined to show its gate would
 *     let an unproven submission hide a bad fill.
 *   - A clean bill of health is the one claim that must be earned. It requires
 *     a signature-verified pre-trade (bindingMode VERIFIED) that was signed
 *     BEFORE the trade settled. Otherwise the honest answer is UNDETERMINED:
 *     we cannot grade faithfulness against a quote nobody proved exists, or
 *     against a gate that post-dates the fill it supposedly authorised.
 */
export function deriveExecutionStatus(params: {
  fillStatus: FillStatus;
  slippageSatisfied: boolean;
  independenceSatisfied: boolean;
  quotedPrice: number;
  executedPrice: number;
  bindingMode: ExecutionBindingMode;
  preTradeSignedAt: number;
  executedAt: number;
}): ExecutionStatus {
  if (params.fillStatus === 'REVERTED' || params.fillStatus === 'FAILED') return 'NOT_EXECUTED';
  // No certified quote, or no readable fill price: the comparison this receipt
  // exists to make cannot be performed, so it says so instead of guessing a
  // direction.
  if (!(params.quotedPrice > 0) || !(params.executedPrice > 0)) return 'UNDETERMINED';
  if (!params.slippageSatisfied) return 'DEVIATED';
  if (!params.independenceSatisfied) return 'DEVIATED';
  if (params.fillStatus === 'PARTIAL') return 'DEVIATED';
  // The gate must precede the settlement it authorised. A pre-trade signed
  // after the fill could have been chosen to flatter it.
  if (
    !Number.isFinite(params.preTradeSignedAt) ||
    params.preTradeSignedAt <= 0 ||
    params.preTradeSignedAt > params.executedAt
  ) {
    return 'UNDETERMINED';
  }
  if (params.bindingMode !== 'VERIFIED') return 'UNDETERMINED';
  return 'FAITHFUL';
}

// ---------------------------------------------------------------------------
// Message construction
// ---------------------------------------------------------------------------

export async function buildExecutionMessage(
  input: ExecutionReceiptInput
): Promise<ExecutionReceiptData> {
  const maxSlippageBps = input.maxSlippageBps ?? EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS;

  // Derived INSIDE buildMessage: a receipt can never disagree with the numbers
  // it carries (same rationale as v2's hashes and statuses).
  const bindingMode: ExecutionBindingMode = input.bindingMode ?? 'SELF_REPORTED';
  const priceDeltaBps = derivePriceDeltaBps(input.quotedPrice, input.executedPrice);
  // The receipt does not assume which direction of the price is "worse" — the
  // service documents that the caller owns the quoted/executed price convention
  // (destination-per-source, source-per-destination, or otherwise). So slippage
  // is a symmetric tolerance band: the fill must land within ±maxSlippageBps of
  // the certified price. A drift outside the band in EITHER direction is a
  // deviation worth flagging (e.g. the oracle was stale in the other direction).
  const slippageSatisfied = Math.abs(priceDeltaBps) <= maxSlippageBps;
  const independenceSatisfied = input.sourceGroupCount >= EXECUTION_REQUIRED_SOURCE_GROUP_COUNT;
  const executionStatus = deriveExecutionStatus({
    fillStatus: input.fillStatus,
    slippageSatisfied,
    independenceSatisfied,
    quotedPrice: input.quotedPrice,
    executedPrice: input.executedPrice,
    bindingMode,
    preTradeSignedAt: input.preTradeSignedAt,
    executedAt: input.executedAt,
  });
  const reasonCodesHash = computeReasonCodesHash(input.reasonCodes ?? []);
  const validUntil = input.executedAt + EXECUTION_VALID_FOR_SECONDS;

  return {
    bindingMode,
    preTradeUid: input.preTradeUid,
    requestHash: input.requestHash,
    sourceAssetId: input.sourceAssetId,
    destinationAssetId: input.destinationAssetId,
    subjectChainId: input.subjectChainId,
    settlementChainId: input.settlementChainId,
    action: input.action,
    quotedPrice: toUint(input.quotedPrice, PRICE_SCALE),
    executedPrice: toUint(input.executedPrice, PRICE_SCALE),
    priceDeltaBps: Math.trunc(priceDeltaBps),
    maxSlippageBps: Math.max(0, Math.trunc(maxSlippageBps)),
    slippageSatisfied,
    quotedAmountUsd: toUint(input.quotedAmountUsd, USD_SCALE),
    executedAmountUsd: toUint(input.executedAmountUsd, USD_SCALE),
    actualFeeUsd: toUint(input.actualFeeUsd, USD_SCALE),
    fillStatus: input.fillStatus,
    executionStatus,
    txHash: input.txHash,
    blockNumber: Math.max(0, Math.floor(input.blockNumber)),
    executedAt: Math.max(0, Math.floor(input.executedAt)),
    preTradeSignedAt: Math.max(0, Math.floor(input.preTradeSignedAt)),
    oracleDataAgeAtExecSeconds: Math.max(0, Math.floor(input.oracleDataAgeAtExecSeconds)),
    participantCount: Math.max(0, Math.floor(input.participantCount)),
    requiredParticipantCount: EXECUTION_REQUIRED_PARTICIPANT_COUNT,
    sourceGroupCount: Math.max(0, Math.floor(input.sourceGroupCount)),
    requiredSourceGroupCount: EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
    independenceSatisfied,
    mevRiskBps: toUint(input.mevRiskScore ?? 0, RATIO_SCALE),
    reasonCodesHash,
    validUntil,
    schemaVersion: CURRENT_EXECUTION_SCHEMA_VERSION,
  };
}

/** Widen the JSON-serializable message to its bigint twin for viem. Pure. */
export function toBigIntMessage(data: ExecutionReceiptData): ExecutionBigIntMessage {
  return {
    bindingMode: data.bindingMode ?? 'SELF_REPORTED',
    preTradeUid: data.preTradeUid,
    requestHash: data.requestHash,
    sourceAssetId: data.sourceAssetId,
    destinationAssetId: data.destinationAssetId,
    subjectChainId: BigInt(data.subjectChainId),
    settlementChainId: BigInt(data.settlementChainId),
    action: data.action,
    quotedPrice: BigInt(data.quotedPrice),
    executedPrice: BigInt(data.executedPrice),
    priceDeltaBps: BigInt(data.priceDeltaBps),
    maxSlippageBps: BigInt(data.maxSlippageBps),
    slippageSatisfied: data.slippageSatisfied,
    quotedAmountUsd: BigInt(data.quotedAmountUsd),
    executedAmountUsd: BigInt(data.executedAmountUsd),
    actualFeeUsd: BigInt(data.actualFeeUsd),
    fillStatus: data.fillStatus,
    executionStatus: data.executionStatus,
    txHash: data.txHash,
    blockNumber: BigInt(data.blockNumber),
    executedAt: BigInt(data.executedAt),
    preTradeSignedAt: BigInt(data.preTradeSignedAt ?? 0),
    oracleDataAgeAtExecSeconds: BigInt(data.oracleDataAgeAtExecSeconds),
    participantCount: BigInt(data.participantCount),
    requiredParticipantCount: BigInt(data.requiredParticipantCount),
    sourceGroupCount: BigInt(data.sourceGroupCount),
    requiredSourceGroupCount: BigInt(data.requiredSourceGroupCount),
    independenceSatisfied: data.independenceSatisfied,
    mevRiskBps: BigInt(data.mevRiskBps),
    reasonCodesHash: data.reasonCodesHash,
    validUntil: BigInt(data.validUntil),
    schemaVersion: BigInt(data.schemaVersion),
  };
}

/** EIP-712 typed-data args (domain + types + message) — shared by sign/verify. */
export function executionTypedDataArgs(message: ExecutionReceiptData) {
  return {
    domain: EXECUTION_DOMAIN,
    types: executionTypesForSchemaVersion(message.schemaVersion),
    primaryType: EXECUTION_PRIMARY_TYPE,
    message: toBigIntMessage(message),
  } as const;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export interface ExecutionReceipt {
  uid: string;
  schemaVersion: number;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: ExecutionReceiptData;
  /** Informational only — verification always re-derives types from
   *  `data.schemaVersion`, never from this block. */
  eip712: {
    domain: typeof EXECUTION_DOMAIN;
    types: typeof EXECUTION_TYPES;
    primaryType: typeof EXECUTION_PRIMARY_TYPE;
  };
}

function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/execution/attestation/verify`;
}

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

/** Sign an execution fact. Returns null when no attester key is configured:
 *  the execution data itself remains valid and unchanged; the receipt is
 *  additive and must never become a dependency of the settlement path. */
export async function signExecutionReceipt(
  input: ExecutionReceiptInput
): Promise<ExecutionReceipt | null> {
  const account = await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = await buildExecutionMessage(input);
    const args = executionTypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: CURRENT_EXECUTION_SCHEMA_VERSION,
      attester: account.address,
      attesterLabel: EXECUTION_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: EXECUTION_VALID_FOR_SECONDS,
      validUntil: message.validUntil,
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: EXECUTION_DOMAIN,
        types: EXECUTION_TYPES,
        primaryType: EXECUTION_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign execution receipt', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface ExecutionVerificationResult {
  valid: boolean;
  attester: string;
  uid: string;
  executedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  executionStatus: ExecutionStatus | null;
  /** How the pre-trade binding was established. `null` on v1 receipts, which
   *  predate the field — callers must treat null as "binding strength not
   *  declared", not as VERIFIED. */
  bindingMode: ExecutionBindingMode | null;
  schemaVersion: number;
  reason: string;
}

/** Verify an execution receipt: recompute the UID, recover the signer, check
 *  the window. Anyone can call this against a receipt they were handed. */
export async function verifyExecutionReceipt(
  receipt: ExecutionReceipt
): Promise<ExecutionVerificationResult> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = receipt.data;
    const args = executionTypedDataArgs(message);
    const bindingMode = message.bindingMode ?? null;
    const schemaVersion = Number(message.schemaVersion) || 0;

    const expectedUid = hashTypedData(args);
    if (expectedUid !== receipt.uid) {
      return {
        valid: false,
        attester: receipt.attester,
        uid: receipt.uid,
        executedAt: Number(message.executedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        executionStatus: message.executionStatus ?? null,
        bindingMode,
        schemaVersion,
        reason: 'uid_mismatch: data was modified after signing',
      };
    }

    const signatureValid = await verifyTypedData({
      ...args,
      address: receipt.attester as `0x${string}`,
      signature: receipt.signature as `0x${string}`,
    });

    const now = nowInSeconds();
    const expired = Number(message.validUntil) <= now;

    if (!signatureValid) {
      return {
        valid: false,
        attester: receipt.attester,
        uid: receipt.uid,
        executedAt: Number(message.executedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired,
        executionStatus: message.executionStatus ?? null,
        bindingMode,
        schemaVersion,
        reason: 'signature_invalid: not signed by the claimed attester',
      };
    }

    return {
      valid: !expired,
      attester: receipt.attester,
      uid: receipt.uid,
      executedAt: Number(message.executedAt) || null,
      validUntil: Number(message.validUntil) || null,
      expired,
      executionStatus: message.executionStatus ?? null,
      bindingMode,
      schemaVersion,
      reason: expired ? 'receipt_expired' : 'verified',
    };
  } catch (error) {
    return {
      valid: false,
      attester: receipt.attester ?? '',
      uid: receipt.uid ?? '',
      executedAt: null,
      validUntil: null,
      expired: false,
      executionStatus: null,
      bindingMode: null,
      schemaVersion: 0,
      reason: `verification_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
