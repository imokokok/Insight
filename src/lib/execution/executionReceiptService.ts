/**
 * @fileoverview Execution Receipt issuer — the orchestration that turns a
 * pre-trade attestation + a settlement transaction into a signed Execution
 * Receipt.
 *
 * This is the bridge between the two existing receipt types. Pre-trade proves
 * "the oracle data was trustworthy to act on"; this service proves "the agent
 * actually executed at a price within the bound of the price it was certified
 * against", and carries the oracle basis the agent gated on (participant/
 * source-group counts + age at execution) so a holder can judge whether that
 * basis was still sound at settlement.
 *
 * It does not query the pre-trade table — the dependency is by proof, not by
 * database join. What it does instead is stronger: when the caller presents the
 * signed pre-trade attestations, they are verified first and every binding
 * field is read out of the verified payload, so the caller cannot steer the
 * quote it will be graded against. Without them the receipt is still issued, but
 * marked SELF_REPORTED and barred from a FAITHFUL verdict.
 *
 * Honesty boundaries enforced here:
 *   - An unsupported chain yields a clean error, never a guessed endpoint.
 *   - A reverted transaction is a real, signable outcome (NOT_EXECUTED), not a
 *     collection failure.
 *   - When the on-chain fill price cannot be read, the receipt says
 *     UNDETERMINED — it does not invent a drift.
 *   - `quotedPrice` and `executedPrice` MUST share the caller's price
 *     convention (the service does not know which way the pre-trade oracle price
 *     was quoted, so it will not silently assume one).
 */

import { type MeasurableExecutionField } from '@/lib/attestations/executionCommitments';
import {
  derivePriceDeltaBps,
  EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
  EXECUTION_REQUIRED_PARTICIPANT_COUNT,
  EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
  type ClaimRole,
  type ExecutionBindingMode,
  type ExecutionReceipt,
  type ExecutionReceiptInput,
  type FillStatus,
  type QuoteBasis,
  signExecutionReceipt,
} from '@/lib/attestations/executionReceipt';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';

import { collectExecutionFacts, type ExecutionFacts } from './executionCollector';
import { resolvePreTradeBinding, type PreTradeAttestationEnvelope } from './preTradeBinding';
import { getRpcEndpoints } from './rpcEndpoints';

/** Beyond this age, the oracle basis the agent gated on is treated as stale and
 *  flagged in the reason codes. Mirrors the pre-trade window (600s): if the
 *  agent executed outside the window it was certified in, that is worth saying. */
export const EXECUTION_ORACLE_STALE_SECONDS = 600;

export type IssueExecutionReceiptErrorCode =
  | 'UNSUPPORTED_CHAIN'
  | 'NOT_FOUND'
  | 'RPC_ERROR'
  | 'SIGNING_UNAVAILABLE'
  /** A pre-trade attestation was presented but did not verify. Never downgraded
   *  to a weaker receipt: claiming a provenance you cannot prove is a rejection,
   *  not a lesser product. */
  | 'PRE_TRADE_VERIFICATION_FAILED';

/** The pre-trade attestation originals, when the caller can present them.
 *  Supplying BOTH upgrades the receipt to a VERIFIED binding, which is the only
 *  way a receipt can reach a FAITHFUL verdict. */
export interface PreTradeOriginals {
  source: PreTradeAttestationEnvelope;
  destination: PreTradeAttestationEnvelope;
}

export interface IssueExecutionReceiptParams {
  // --- Pre-trade binding (the agent holds its own pre-trade receipt) ---
  preTradeUid: `0x${string}`;
  requestHash: `0x${string}`;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  settlementChainId: number;
  /** Oracle providers the agent gated on (carried forward as the basis). */
  participantCount: number;
  /** Distinct non-derived operator groups the agent gated on. */
  sourceGroupCount: number;
  /** Unix seconds the pre-trade was signed — bounds oracleDataAgeAtExec. */
  preTradeSignedAt: number;
  /** The signed pre-trade gates themselves. When both are present and verify,
   *  every binding field above is re-derived from the verified payloads and the
   *  receipt is marked VERIFIED. When absent, the fields above are the caller's
   *  own assertion and the receipt says so (SELF_REPORTED), which can never be
   *  graded FAITHFUL. */
  preTradeAttestations?: PreTradeOriginals | null;

  // --- The trade the agent committed to ---
  /** Target price, in the SAME convention as executedPrice (e.g. units of
   *  destinationAsset per 1 unit of sourceAsset). The service does not assume a
   *  convention; the caller must keep quotedPrice and executedPrice consistent. */
  quotedPrice: number;
  maxSlippageBps?: number;
  action?: string;

  // --- Informational notional (not part of the slippage verdict) ---
  /** Only values the caller genuinely measured should be supplied. v3 commits
   *  to WHICH fields were measured (`measuredFieldsHash`); a field omitted here
   *  is signed as an unmeasured zero, which is honest, while a supplied value
   *  is signed as a measured one. */
  quotedAmountUsd?: number;
  executedAmountUsd?: number;
  actualFeeUsd?: number;
  mevRiskScore?: number;

  // --- v3 quote-basis claims ---
  /** Whether `quotedPrice` came from a source independent of the venue the
   *  agent executed on. Defaults to FALSE (v3's honest default): deriving the
   *  quote from the venue itself is the common construction, and independence
   *  must be claimed, never implied. */
  quoteVenueIndependent?: boolean;
  /** Which price state `quotedPrice` was taken against. Defaults to
   *  UNSPECIFIED — a receipt that does not record the convention must not look
   *  like one that did. */
  quoteBasis?: QuoteBasis;
  /** The block `quotedPrice` was read from. 0 when not applicable. */
  quoteBlockNumber?: number;
  /** Age of the price state the quote came from, seconds. Distinct from the
   *  pre-trade attestation's own age (`executedAt − preTradeSignedAt`). */
  priceStateAgeAtExecSeconds?: number;
  /** v3: whose execution this is. Defaults to THIRD_PARTY_OBSERVATION — an
   *  observer of public settlements must claim the first-person role to get it. */
  claimRole?: ClaimRole;
  /** v3: uid of the destination pre-trade gate, when the caller holds one. When
   *  originals are presented it is read from the verified destination payload
   *  and this input is ignored. */
  destinationPreTradeUid?: `0x${string}` | null;

  // --- On-chain settlement to collect ---
  txHash: `0x${string}`;
  /** Address whose balances define the trade. Defaults to the tx sender. */
  taker?: `0x${string}`;

  signal?: AbortSignal;
  /** Injectable for tests. Defaults to a fresh client. */
  client?: RpcClientWithFallback;
}

export type IssueExecutionReceiptResult =
  | {
      ok: true;
      receipt: ExecutionReceipt;
      facts: ExecutionFacts;
      /** Echoed so the caller can see why a receipt did not come back FAITHFUL. */
      binding: {
        bindingMode: ExecutionBindingMode;
        quotedPrice: number;
        preTradeSignedAt: number;
        preTradeExpired: boolean;
        /** v3: the destination-gate uid committed to by `preTradeUidsHash`.
         *  Null when no destination gate was proven or claimed. */
        destinationPreTradeUid: string | null;
      };
    }
  | { ok: false; code: IssueExecutionReceiptErrorCode; message: string };

/** Build the executed-side reason-code set from the evidence. Pure and local;
 *  these codes are informational + hashed; the verdict is derived independently
 *  inside buildMessage, so a mismatch here is a reporting bug, not a security
 *  one. */
function deriveReasonCodes(params: {
  fillStatus: FillStatus;
  unavailableReason: ExecutionFacts['unavailableReason'];
  priceDeltaBps: number;
  maxSlippageBps: number;
  oracleAgeSeconds: number;
  participantCount: number;
  sourceGroupCount: number;
  bindingMode: ExecutionBindingMode;
}): string[] {
  if (params.fillStatus === 'REVERTED' || params.fillStatus === 'FAILED') {
    return [params.fillStatus === 'REVERTED' ? 'TX_REVERTED' : 'TX_FAILED'];
  }
  if (params.unavailableReason) {
    // Surface the specific reason the fill price could not be read. Each value
    // is a distinct, honest statement: a native-asset leg emits no Transfer
    // event; an attributed-zero amount means the route was not readable.
    return [params.unavailableReason];
  }

  const codes: string[] = [];

  // A gate signed AFTER the fill cannot have authorised it. This used to be
  // invisible: the age was clamped with Math.max(0, ...), so a pre-trade
  // fabricated after a favourable fill reported the freshest possible age.
  // Report it first — it invalidates everything the quote comparison claims.
  if (params.oracleAgeSeconds < 0) {
    codes.push('PRE_TRADE_AFTER_EXECUTION');
  }
  // No proven pre-trade: the quote this receipt compares against is the
  // caller's own assertion, so faithfulness is not gradable.
  if (params.bindingMode !== 'VERIFIED') {
    codes.push('PRE_TRADE_NOT_PRESENTED');
  }
  // Symmetric band (matches the status derivation): a fill outside ±maxSlippageBps
  // of the certified price is slippage, in either direction.
  if (Math.abs(params.priceDeltaBps) > params.maxSlippageBps) codes.push('SLIPPAGE_EXCEEDED');
  if (params.oracleAgeSeconds > EXECUTION_ORACLE_STALE_SECONDS) codes.push('STALE_ORACLE_AT_EXEC');
  if (params.participantCount < EXECUTION_REQUIRED_PARTICIPANT_COUNT) {
    codes.push('INSUFFICIENT_QUORUM_AT_EXEC');
  }
  if (params.sourceGroupCount < EXECUTION_REQUIRED_SOURCE_GROUP_COUNT) {
    codes.push('INSUFFICIENT_INDEPENDENCE_AT_EXEC');
  }
  if (params.fillStatus === 'PARTIAL') codes.push('PARTIAL_FILL');
  return codes;
}

/**
 * Issue an Execution Receipt for a settled transaction. Stateless with respect
 * to pre-trade storage; pairs cryptographically via the inputs. Never throws —
 * every failure path returns an explicit `ok:false` so a caller can decide how
 * to surface it.
 */
export async function issueExecutionReceipt(
  params: IssueExecutionReceiptParams
): Promise<IssueExecutionReceiptResult> {
  const chainId = params.subjectChainId;
  const endpoints = getRpcEndpoints(chainId);
  if (!endpoints) {
    return {
      ok: false,
      code: 'UNSUPPORTED_CHAIN',
      message: `No RPC endpoints configured for chain ${chainId}`,
    };
  }

  // Resolve HOW we are bound to the pre-trade gate before anything is signed.
  // When originals are presented, every binding field below is re-derived from
  // the verified payloads, so the receipt cannot be steered by the caller.
  const bindingResult = await resolvePreTradeBinding({
    source: params.preTradeAttestations?.source ?? null,
    destination: params.preTradeAttestations?.destination ?? null,
    selfReported: {
      preTradeUid: params.preTradeUid,
      destinationPreTradeUid: params.destinationPreTradeUid ?? null,
      requestHash: params.requestHash,
      sourceAssetId: params.sourceAssetId,
      destinationAssetId: params.destinationAssetId,
      subjectChainId: params.subjectChainId,
      participantCount: params.participantCount,
      sourceGroupCount: params.sourceGroupCount,
      preTradeSignedAt: params.preTradeSignedAt,
      quotedPrice: params.quotedPrice,
    },
  });
  if (!bindingResult.ok) {
    return { ok: false, code: bindingResult.code, message: bindingResult.message };
  }
  const binding = bindingResult.binding;

  const factsResult = await collectExecutionFacts({
    txHash: params.txHash,
    chainId,
    endpoints,
    sourceAssetId: params.sourceAssetId,
    destinationAssetId: params.destinationAssetId,
    taker: params.taker,
    signal: params.signal,
    client: params.client,
  });

  if (!factsResult.ok) {
    // Map the collector's code space through; the meanings are identical.
    return {
      ok: false,
      code: factsResult.code === 'UNSUPPORTED_CHAIN' ? 'UNSUPPORTED_CHAIN' : factsResult.code,
      message: factsResult.message,
    };
  }
  const facts = factsResult.facts;

  const executedAt = facts.executedAt ?? Math.floor(Date.now() / 1000);
  // Signed NEGATIVE when the pre-trade post-dates the fill. It used to be
  // clamped to 0, which made a gate fabricated after a favourable fill look
  // like the freshest possible one. The receipt's stored age stays non-negative
  // (the EIP-712 field is unsigned), but the ordering violation is reported as
  // a reason code and forces an UNDETERMINED verdict.
  const oracleAgeSeconds = executedAt - binding.preTradeSignedAt;

  const priceDeltaBps = derivePriceDeltaBps(binding.quotedPrice, facts.executedPrice ?? 0);
  const reasonCodes = deriveReasonCodes({
    fillStatus: facts.fillStatus,
    unavailableReason: facts.unavailableReason,
    priceDeltaBps,
    maxSlippageBps: params.maxSlippageBps ?? EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
    oracleAgeSeconds,
    participantCount: binding.participantCount,
    sourceGroupCount: binding.sourceGroupCount,
    bindingMode: binding.bindingMode,
  });

  // v3 commits to which notional fields were genuinely measured. A field the
  // caller did not supply is signed as an unmeasured zero — `measuredFieldsHash`
  // is what lets a holder tell "measured zero" from "never measured" (F2).
  const measuredFields: MeasurableExecutionField[] = [];
  if (params.quotedAmountUsd !== undefined) measuredFields.push('quotedAmountUsd');
  if (params.executedAmountUsd !== undefined) measuredFields.push('executedAmountUsd');
  if (params.actualFeeUsd !== undefined) measuredFields.push('actualFeeUsd');
  if (params.mevRiskScore !== undefined) measuredFields.push('mevRiskBps');

  const input: ExecutionReceiptInput = {
    preTradeUid: binding.preTradeUid as `0x${string}`,
    destinationPreTradeUid: (binding.destinationPreTradeUid ?? undefined) as
      | `0x${string}`
      | undefined,
    requestHash: binding.requestHash as `0x${string}`,
    preTradeSignedAt: binding.preTradeSignedAt,
    bindingMode: binding.bindingMode,
    claimRole: params.claimRole,
    // The signed taker is whoever the chain says moved the balances. The
    // collector prefers a caller-supplied taker for attribution but falls back
    // to the transaction sender; null only when the receipt had no sender.
    taker: facts.taker ?? undefined,
    sourceAssetId: binding.sourceAssetId,
    destinationAssetId: binding.destinationAssetId,
    subjectChainId: binding.subjectChainId,
    settlementChainId: params.settlementChainId,
    action: params.action ?? 'SWAP',
    quotedPrice: binding.quotedPrice,
    executedPrice: facts.executedPrice ?? 0,
    maxSlippageBps: params.maxSlippageBps,
    quoteVenueIndependent: params.quoteVenueIndependent,
    quoteBasis: params.quoteBasis,
    quoteBlockNumber: params.quoteBlockNumber,
    priceStateAgeAtExecSeconds: params.priceStateAgeAtExecSeconds,
    quotedAmountUsd: params.quotedAmountUsd ?? 0,
    executedAmountUsd: params.executedAmountUsd ?? 0,
    actualFeeUsd: params.actualFeeUsd ?? 0,
    measuredFields,
    fillStatus: facts.fillStatus,
    txHash: params.txHash,
    blockNumber: Number(facts.blockNumber ?? 0),
    executedAt,
    oracleDataAgeAtExecSeconds: oracleAgeSeconds,
    participantCount: binding.participantCount,
    sourceGroupCount: binding.sourceGroupCount,
    mevRiskScore: params.mevRiskScore,
    reasonCodes,
  };

  const receipt = await signExecutionReceipt(input);
  if (!receipt) {
    return {
      ok: false,
      code: 'SIGNING_UNAVAILABLE',
      message: 'Insight attester key is not configured; no execution receipt could be signed.',
    };
  }

  return {
    ok: true,
    receipt,
    facts,
    binding: {
      bindingMode: binding.bindingMode,
      quotedPrice: binding.quotedPrice,
      preTradeSignedAt: binding.preTradeSignedAt,
      preTradeExpired: binding.preTradeExpired,
      /** v3: the destination-gate uid committed to by `preTradeUidsHash`. Null
       *  on a SELF_REPORTED binding with no claimed destination gate. */
      destinationPreTradeUid: binding.destinationPreTradeUid,
    },
  };
}
