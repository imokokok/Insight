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
 * It is deliberately stateless about pre-trade: the caller hands in the pre-trade
 * fields it needs (the agent already holds its own pre-trade receipt). The
 * cryptographic pairing (`preTradeUid` + `requestHash`) lives in the signed
 * receipt; this module never queries the pre-trade table, so the dependency is
 * by proof, not by database join.
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

import {
  derivePriceDeltaBps,
  EXECUTION_REQUIRED_PARTICIPANT_COUNT,
  EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
  type ExecutionReceipt,
  type ExecutionReceiptInput,
  type FillStatus,
  signExecutionReceipt,
} from '@/lib/attestations/executionReceipt';
import { type RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';

import { collectExecutionFacts, type ExecutionFacts } from './executionCollector';
import { getRpcEndpoints } from './rpcEndpoints';

/** Beyond this age, the oracle basis the agent gated on is treated as stale and
 *  flagged in the reason codes. Mirrors the pre-trade window (600s): if the
 *  agent executed outside the window it was certified in, that is worth saying. */
export const EXECUTION_ORACLE_STALE_SECONDS = 600;

export type IssueExecutionReceiptErrorCode =
  | 'UNSUPPORTED_CHAIN'
  | 'NOT_FOUND'
  | 'RPC_ERROR'
  | 'SIGNING_UNAVAILABLE';

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

  // --- The trade the agent committed to ---
  /** Target price, in the SAME convention as executedPrice (e.g. units of
   *  destinationAsset per 1 unit of sourceAsset). The service does not assume a
   *  convention; the caller must keep quotedPrice and executedPrice consistent. */
  quotedPrice: number;
  maxSlippageBps?: number;
  action?: string;

  // --- Informational notional (not part of the slippage verdict) ---
  quotedAmountUsd?: number;
  executedAmountUsd?: number;
  actualFeeUsd?: number;
  mevRiskScore?: number;

  // --- On-chain settlement to collect ---
  txHash: `0x${string}`;
  /** Address whose balances define the trade. Defaults to the tx sender. */
  taker?: `0x${string}`;

  signal?: AbortSignal;
  /** Injectable for tests. Defaults to a fresh client. */
  client?: RpcClientWithFallback;
}

export type IssueExecutionReceiptResult =
  | { ok: true; receipt: ExecutionReceipt; facts: ExecutionFacts }
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
  const oracleAgeSeconds = Math.max(0, executedAt - params.preTradeSignedAt);

  const priceDeltaBps = derivePriceDeltaBps(params.quotedPrice, facts.executedPrice ?? 0);
  const reasonCodes = deriveReasonCodes({
    fillStatus: facts.fillStatus,
    unavailableReason: facts.unavailableReason,
    priceDeltaBps,
    maxSlippageBps: params.maxSlippageBps ?? 50,
    oracleAgeSeconds,
    participantCount: params.participantCount,
    sourceGroupCount: params.sourceGroupCount,
  });

  const input: ExecutionReceiptInput = {
    preTradeUid: params.preTradeUid,
    requestHash: params.requestHash,
    sourceAssetId: params.sourceAssetId,
    destinationAssetId: params.destinationAssetId,
    subjectChainId: params.subjectChainId,
    settlementChainId: params.settlementChainId,
    action: params.action ?? 'SWAP',
    quotedPrice: params.quotedPrice,
    executedPrice: facts.executedPrice ?? 0,
    maxSlippageBps: params.maxSlippageBps,
    quotedAmountUsd: params.quotedAmountUsd ?? 0,
    executedAmountUsd: params.executedAmountUsd ?? 0,
    actualFeeUsd: params.actualFeeUsd ?? 0,
    fillStatus: facts.fillStatus,
    txHash: params.txHash,
    blockNumber: Number(facts.blockNumber ?? 0),
    executedAt,
    oracleDataAgeAtExecSeconds: oracleAgeSeconds,
    participantCount: params.participantCount,
    sourceGroupCount: params.sourceGroupCount,
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

  return { ok: true, receipt, facts };
}
