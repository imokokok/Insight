/**
 * @fileoverview Post-settlement closure for a Base Agent Swap Guard decision.
 *
 * The guard's MCP output points at `execution_receipt` after settlement, but the
 * generic Execution Receipt pairs a pre-trade oracle gate with a transaction —
 * it never learns whether the bytes actually executed were the bytes the guard
 * bound. This module closes that loop with a guard-specific artifact:
 *
 *   1. Verify the signed `BaseAgentSwapGuardDecision` (integrity hash, exact
 *      two-call binding, attester signature, trust, expiry).
 *   2. Read the settlement transaction from Base and require its `to`, `value`
 *      and keccak256(calldata) to match the guarded swap call byte-for-byte.
 *      When the caller presents the approval transaction too, it must match the
 *      guarded approval the same way; a presented-but-mismatched approval is a
 *      hard rejection, not a footnote.
 *   3. Reconcile the observed ERC-20 movements against the guarded commitment:
 *      input amount in, output amount against the quoted and minimum bounds,
 *      realized output-leg slippage against the agent's own `maxSlippageBps`.
 *   4. Sign a `BaseAgentSwapGuardSettlement` bound to the `decisionHash` and
 *      both transaction hashes, with every shortfall carried as an explicit
 *      reason code.
 *
 * Honesty boundaries this module keeps (they mirror the rest of the execution
 * stack, because a confident-looking closure that is wrong is worse than none):
 *
 *   - A decision that cannot be verified produces NO settlement — a closure
 *     over an unproven authorization would launder it.
 *   - An expired-but-genuine decision still closes: expiry invalidates the
 *     forward authorization, not the historical fact that this tx matched that
 *     decision. It is reported as `DECISION_EXPIRED_AT_CLOSURE`.
 *   - A reverted swap is a real, signable outcome (`SWAP_TX_REVERTED`), not a
 *     collection failure.
 *   - Amounts that cannot be attributed are signed as empty strings, never as
 *     zeros, and the receipt says so via the reason codes.
 *   - The settlement certifies "the executed bytes were the guarded bytes and
 *     the fill matched the guarded quote". It is not a claim the price was
 *     correct, the trade was well-timed, or the agent was authorized by anyone.
 */

import { hashTypedData, keccak256, toBytes, verifyTypedData, type Hex } from 'viem';

import { getAttesterAccount, type AttesterAccount } from '@/lib/attestations/attesterAccount';
import { collectExecutionFacts, type ExecutionFacts } from '@/lib/execution/executionCollector';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import {
  baseAgentSwapGuardDestinationToken,
  type BaseAgentSwapGuardChainId,
  type BaseAgentSwapGuardResult,
} from './baseAgentSwapGuard';
import {
  isPublishedBaseAgentSwapGuardAttester,
  verifyBaseAgentSwapGuardDecision,
} from './baseAgentSwapGuardAttestation';

const logger = createLogger('BaseAgentSwapGuardSettlement');

export const BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA =
  'insight.base-agent-swap-guard-settlement.v1' as const;
export const BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE =
  'BaseAgentSwapGuardSettlement' as const;
export const BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA_VERSION = 1 as const;
export const BASE_AGENT_SWAP_GUARD_SETTLEMENT_DOMAIN = {
  name: 'Insight Base Agent Swap Guard Settlement',
  version: '1',
  // Chain-separated from the settlement it attests, mirroring the decision
  // domain; the signed message commits to the reviewed execution chain
  // (8453, 56, or 143) explicitly inside the struct.
  chainId: 1,
} as const;
export const BASE_AGENT_SWAP_GUARD_SETTLEMENT_TYPES = {
  BaseAgentSwapGuardSettlement: [
    { name: 'decisionHash', type: 'bytes32' },
    { name: 'swapTxHash', type: 'bytes32' },
    { name: 'approvalTxHash', type: 'bytes32' },
    { name: 'onChainSwapCalldataHash', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
    { name: 'chainId', type: 'uint256' },
    { name: 'fillStatus', type: 'string' },
    { name: 'sourceAmountRaw', type: 'string' },
    { name: 'destinationAmountRaw', type: 'string' },
    { name: 'executedPrice', type: 'string' },
    { name: 'realizedSlippageBps', type: 'string' },
    { name: 'blockNumber', type: 'string' },
    { name: 'executedAt', type: 'uint256' },
    { name: 'checkedAt', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ZERO_HASH = `0x${'0'.repeat(64)}` as Hex;
/** Raw amounts and prices are signed as exact decimal strings; '' = unmeasured. */
const EMPTY = '';
/** The chains a settlement closure may be issued on, mirroring the reviewed
 *  guard profiles. Any other chain id is rejected before any RPC work. */
const SETTLEMENT_CHAIN_IDS = new Set<number>([8453, 56, 143]);

export interface BaseAgentSwapGuardSettlementData {
  decisionHash: Hex;
  swapTxHash: Hex;
  /** Zero hash when the caller did not present an approval transaction. */
  approvalTxHash: Hex;
  /** keccak256 of the settlement transaction's actual input bytes. */
  onChainSwapCalldataHash: Hex;
  recipient: `0x${string}`;
  chainId: BaseAgentSwapGuardChainId;
  fillStatus: 'FULL' | 'REVERTED';
  /** Measured input amount in raw units; '' when unattributed. */
  sourceAmountRaw: string;
  /** Measured output amount in raw units; '' when unattributed. */
  destinationAmountRaw: string;
  /** Observed destination-per-source price in human units; '' when unavailable. */
  executedPrice: string;
  /** (1 − actualOut / quotedOut) × 1e4, six-decimal rounded; '' when unavailable.
   *  Positive means the agent received less than quoted. */
  realizedSlippageBps: string;
  blockNumber: string;
  /** Block timestamp, unix seconds; 0 when the block could not be read. */
  executedAt: number;
  /** Unix seconds the closure evidence was checked and signed. */
  checkedAt: number;
  /** keccak256(canonicalJson(reasonCodes)) — binds the codes into the signature. */
  reasonCodesHash: Hex;
  schemaVersion: 1;
}

export interface BaseAgentSwapGuardSettlement {
  type: typeof BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE;
  schemaVersion: 1;
  schema: typeof BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA;
  /** hashTypedData of the signed struct; null when unsigned. */
  uid: Hex | null;
  attester: `0x${string}` | null;
  attesterLabel: 'Insight Base Agent Swap Guard settlement attester';
  signedAt: string;
  signature: Hex | null;
  verifyUrl: string;
  decisionHash: Hex;
  reasonCodes: string[];
  data: BaseAgentSwapGuardSettlementData;
  eip712: {
    domain: typeof BASE_AGENT_SWAP_GUARD_SETTLEMENT_DOMAIN;
    types: typeof BASE_AGENT_SWAP_GUARD_SETTLEMENT_TYPES;
    primaryType: typeof BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE;
  };
}

export type BaseAgentSwapGuardSettlementErrorCode =
  | 'DECISION_NOT_VERIFIABLE'
  | 'UNSUPPORTED_CHAIN'
  | 'RPC_ERROR'
  | 'SWAP_TX_NOT_FOUND'
  | 'APPROVAL_TX_NOT_FOUND'
  | 'ON_CHAIN_CALL_MISMATCH'
  | 'COLLECTION_FAILED';

export interface VerifyBaseAgentSwapGuardSettlementParams {
  /** The signed (or unsigned) guard decision produced by the guard workflow. */
  decision: unknown;
  /** Hash of the executed swap transaction. */
  swapTxHash: `0x${string}`;
  /** Hash of the executed approval transaction, when the caller has it. */
  approvalTxHash?: `0x${string}` | null;
  signal?: AbortSignal;
  /** Injectable for tests. Defaults to a fresh client. */
  client?: RpcClientWithFallback;
  /** Injectable signer; defaults to the configured attester account. */
  signer?: AttesterAccount | null;
  now?: () => number;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
  verifyUrl?: string;
}

export type BaseAgentSwapGuardSettlementResult =
  | { ok: true; settlement: BaseAgentSwapGuardSettlement }
  | {
      ok: false;
      code: BaseAgentSwapGuardSettlementErrorCode;
      message: string;
      /** The guard-decision verifier's reason, when the failure is upstream. */
      reason?: string;
    };

function sameHash(left: unknown, right: unknown): boolean {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    HASH.test(left) &&
    HASH.test(right) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function settlementVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL(
    '/api/v1/safety/base-agent-swap-guard/settlement',
    `${base.replace(/\/+$/, '')}/`
  ).toString();
}

function typedDataArgs(data: BaseAgentSwapGuardSettlementData) {
  return {
    domain: BASE_AGENT_SWAP_GUARD_SETTLEMENT_DOMAIN,
    types: BASE_AGENT_SWAP_GUARD_SETTLEMENT_TYPES,
    primaryType: BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE,
    message: {
      decisionHash: data.decisionHash,
      swapTxHash: data.swapTxHash,
      approvalTxHash: data.approvalTxHash,
      onChainSwapCalldataHash: data.onChainSwapCalldataHash,
      recipient: data.recipient,
      chainId: BigInt(data.chainId),
      fillStatus: data.fillStatus,
      sourceAmountRaw: data.sourceAmountRaw,
      destinationAmountRaw: data.destinationAmountRaw,
      executedPrice: data.executedPrice,
      realizedSlippageBps: data.realizedSlippageBps,
      blockNumber: data.blockNumber,
      executedAt: BigInt(data.executedAt),
      checkedAt: BigInt(data.checkedAt),
      reasonCodesHash: data.reasonCodesHash,
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

function rpcMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type OnChainBindingCheck =
  | { ok: true; onChainSwapCalldataHash: Hex; approvalTxHash: Hex }
  | { ok: false; result: BaseAgentSwapGuardSettlementResult };

/** Step 2 of the closure: the executed transactions must be the guarded calls,
 *  byte for byte. The swap tx is required; the approval tx is required to match
 *  only when the caller presents it. */
async function verifyOnChainCallBindings(params: {
  client: RpcClientWithFallback;
  key: string;
  endpoints: string[];
  swapTxHash: `0x${string}`;
  approvalTxHash?: `0x${string}` | null;
  signal?: AbortSignal;
  guardedSwapTarget: string;
  guardedSwapCalldataHash: string;
  guardedApprovalTarget: string;
  guardedApprovalCalldataHash: string;
  reasonCodes: string[];
}): Promise<OnChainBindingCheck> {
  const callMismatch = (detail: string): OnChainBindingCheck => ({
    ok: false,
    result: {
      ok: false,
      code: 'ON_CHAIN_CALL_MISMATCH',
      message: `${detail} — the executed bytes are not the guarded bytes, so no settlement closure is issued.`,
    },
  });

  let swapTx;
  try {
    swapTx = await params.client.getTransactionByHash(
      params.key,
      params.endpoints,
      params.swapTxHash,
      params.signal
    );
  } catch (error) {
    return { ok: false, result: { ok: false, code: 'RPC_ERROR', message: rpcMessage(error) } };
  }
  if (!swapTx) {
    return {
      ok: false,
      result: {
        ok: false,
        code: 'SWAP_TX_NOT_FOUND',
        message: 'Swap transaction not found on the configured RPC.',
      },
    };
  }
  if (!swapTx.to || swapTx.to.toLowerCase() !== params.guardedSwapTarget.toLowerCase()) {
    return callMismatch('The swap transaction was sent to a different contract');
  }
  if (BigInt(swapTx.value ?? '0x0') !== 0n) {
    return callMismatch(
      'The swap transaction carries native value, but the guarded call is value-free'
    );
  }
  if (!swapTx.input) {
    return callMismatch('The swap transaction carries no input data');
  }
  const onChainSwapCalldataHash = keccak256(swapTx.input);
  if (!sameHash(onChainSwapCalldataHash, params.guardedSwapCalldataHash)) {
    return callMismatch(
      'The on-chain swap calldata hash does not match the guarded swapCalldataHash'
    );
  }

  if (!params.approvalTxHash) {
    params.reasonCodes.push('APPROVAL_TX_NOT_PRESENTED');
    return { ok: true, onChainSwapCalldataHash, approvalTxHash: ZERO_HASH };
  }
  let approvalTx;
  try {
    approvalTx = await params.client.getTransactionByHash(
      params.key,
      params.endpoints,
      params.approvalTxHash,
      params.signal
    );
  } catch (error) {
    return { ok: false, result: { ok: false, code: 'RPC_ERROR', message: rpcMessage(error) } };
  }
  if (!approvalTx) {
    return {
      ok: false,
      result: {
        ok: false,
        code: 'APPROVAL_TX_NOT_FOUND',
        message: 'The presented approval transaction was not found on the configured RPC.',
      },
    };
  }
  if (
    !approvalTx.to ||
    approvalTx.to.toLowerCase() !== params.guardedApprovalTarget.toLowerCase() ||
    BigInt(approvalTx.value ?? '0x0') !== 0n ||
    !approvalTx.input ||
    !sameHash(keccak256(approvalTx.input), params.guardedApprovalCalldataHash)
  ) {
    return callMismatch('The approval transaction does not match the guarded approval call');
  }
  return { ok: true, onChainSwapCalldataHash, approvalTxHash: params.approvalTxHash };
}

/** Step 3 of the closure: reconcile the observed ERC-20 movements against the
 *  guarded commitment. Unattributable amounts stay empty strings with an
 *  explicit reason code — never zeros, never guesses. */
async function reconcileFill(params: {
  facts: ExecutionFacts;
  exactInput: NonNullable<BaseAgentSwapGuardResult['market']>['exactInput'];
  maxSlippageBps: number;
}): Promise<{
  sourceAmountRaw: string;
  destinationAmountRaw: string;
  executedPrice: string;
  realizedSlippageBps: string;
  codes: string[];
}> {
  const out = {
    sourceAmountRaw: EMPTY,
    destinationAmountRaw: EMPTY,
    executedPrice: EMPTY,
    realizedSlippageBps: EMPTY,
    codes: [] as string[],
  };
  const facts = params.facts;
  const exactInput = params.exactInput;

  if (facts.fillStatus === 'REVERTED') {
    // Nothing settled; gas was still consumed. A real, signable outcome.
    out.codes.push('SWAP_TX_REVERTED');
    return out;
  }
  if (facts.unavailableReason) {
    out.codes.push(facts.unavailableReason);
    return out;
  }
  if (facts.sourceAmountRaw === null || facts.destinationAmountRaw === null) {
    out.codes.push('FILL_PRICE_UNAVAILABLE');
    return out;
  }
  // The exact on-chain raw sums from the receipt, carried BigInt-safe through
  // the collector. Rebuilding raw from the float human amount would lose
  // precision on 18-decimal tokens and misreport the reconciliation.
  out.sourceAmountRaw = facts.sourceAmountRaw;
  out.destinationAmountRaw = facts.destinationAmountRaw;
  if (facts.executedPrice !== null) out.executedPrice = String(facts.executedPrice);

  if (out.sourceAmountRaw !== exactInput.amountInRaw) {
    out.codes.push('SOURCE_AMOUNT_MISMATCH');
  }
  const quotedOut = BigInt(exactInput.quotedAmountOutRaw);
  const actualOut = BigInt(out.destinationAmountRaw);
  if (actualOut < BigInt(exactInput.amountOutMinimumRaw)) {
    out.codes.push('RECEIVED_BELOW_GUARANTEED_MINIMUM');
  }
  // Realized slippage on the output leg, matching the guard's own bound
  // (amountOutMinimum = quoted × (1 − maxSlippageBps/1e4)). Signed value:
  // receiving more than quoted is negative slippage, reported as such.
  if (quotedOut > 0n) {
    const microBps = (quotedOut - actualOut) * 10_000n * 1_000_000n;
    const value = Number(microBps / quotedOut) / 1_000_000;
    if (Number.isFinite(value)) {
      out.realizedSlippageBps = String(Math.round(value * 1_000_000) / 1_000_000);
      if (value > params.maxSlippageBps) {
        out.codes.push('REALIZED_SLIPPAGE_EXCEEDED');
      }
    } else {
      out.codes.push('FILL_PRICE_UNAVAILABLE');
    }
  }
  return out;
}

/**
 * Verify a signed guard decision against its settlement transaction, reconcile
 * the on-chain fill with the guarded quote, and sign the closure. Never throws;
 * every failure path returns an explicit `ok:false`.
 */
export async function settleBaseAgentSwapGuard(
  params: VerifyBaseAgentSwapGuardSettlementParams
): Promise<BaseAgentSwapGuardSettlementResult> {
  const now = (params.now ?? nowInSeconds)();

  // 1. The decision must be genuine. An expired-but-genuine decision still
  //    closes (reported); anything weaker is a hard rejection.
  const verification = await verifyBaseAgentSwapGuardDecision(params.decision, {
    now: params.now,
    trustAttester: params.trustAttester,
  });
  if (!verification.valid && !verification.expired) {
    return {
      ok: false,
      code: 'DECISION_NOT_VERIFIABLE',
      reason: verification.reason,
      message: `The guard decision did not verify (${verification.reason}); no settlement closure is issued.`,
    };
  }
  const decision = params.decision as {
    decisionHash: Hex;
    guard: BaseAgentSwapGuardResult;
  };
  const guard = decision.guard;
  if (
    !guard.binding ||
    !guard.transactionsToSign ||
    !guard.market ||
    guard.market.exactInput.amountOutMinimumRaw === undefined
  ) {
    return {
      ok: false,
      code: 'DECISION_NOT_VERIFIABLE',
      reason: 'malformed',
      message: 'The verified decision carries no complete call binding and market commitment.',
    };
  }

  // The settlement is issued on the chain the decision itself binds to; the
  // set membership was already enforced by the decision verification above.
  const settlementChainId = guard.scope.chainId;
  const endpoints = getRpcEndpoints(settlementChainId);
  if (!endpoints) {
    return {
      ok: false,
      code: 'UNSUPPORTED_CHAIN',
      message: `No RPC endpoints configured for chain ${settlementChainId}`,
    };
  }
  const client =
    params.client ??
    new RpcClientWithFallback({ contextLabel: 'base-agent-swap-guard-settlement' });
  const key = String(settlementChainId);

  const reasonCodes: string[] = [];
  if (verification.expired) reasonCodes.push('DECISION_EXPIRED_AT_CLOSURE');

  // 2. The executed transactions must be the guarded calls, byte for byte.
  const bindingCheck = await verifyOnChainCallBindings({
    client,
    key,
    endpoints,
    swapTxHash: params.swapTxHash,
    approvalTxHash: params.approvalTxHash,
    signal: params.signal,
    guardedSwapTarget: guard.transactionsToSign.swap.to,
    guardedSwapCalldataHash: guard.binding.swap.calldataHash,
    guardedApprovalTarget: guard.transactionsToSign.approval.to,
    guardedApprovalCalldataHash: guard.binding.approval.calldataHash,
    reasonCodes,
  });
  if (!bindingCheck.ok) return bindingCheck.result;
  const { onChainSwapCalldataHash, approvalTxHash } = bindingCheck;

  // 3. Reconcile the observed ERC-20 movements against the guarded commitment.
  const tokenIn = guard.binding.approval.token;
  const tokenOut = baseAgentSwapGuardDestinationToken(guard);
  if (!tokenOut) {
    return {
      ok: false,
      code: 'DECISION_NOT_VERIFIABLE',
      reason: 'malformed',
      message:
        'The guarded approval token is outside the reviewed profile; the pair cannot be reconciled.',
    };
  }
  const factsResult = await collectExecutionFacts({
    txHash: params.swapTxHash,
    chainId: settlementChainId,
    endpoints,
    // The guarded input token is the approval token (binding is verified above).
    sourceAssetId: `eip155:${settlementChainId}/erc20:${tokenIn}`,
    destinationAssetId: `eip155:${settlementChainId}/erc20:${tokenOut}`,
    // The source leg leaves the transaction sender; the destination leg arrives
    // at the guarded recipient, which may be a different address.
    destinationReceiver: guard.binding.recipient,
    signal: params.signal,
    client,
  });
  if (!factsResult.ok) {
    return {
      ok: false,
      code: 'COLLECTION_FAILED',
      message: factsResult.message,
    };
  }
  const facts = factsResult.facts;
  const fill = await reconcileFill({
    facts,
    exactInput: guard.market.exactInput,
    maxSlippageBps: guard.policy.maxSlippageBps,
  });
  reasonCodes.push(...fill.codes);

  const executedAt = facts.executedAt ?? 0;
  if (executedAt > 0 && guard.validUntil !== null && executedAt > guard.validUntil) {
    reasonCodes.push('EXECUTED_AFTER_DECISION_WINDOW');
  }

  // 4. Sign the closure, binding the decisionHash, both tx hashes and the
  //    reason-code set into one EIP-712 structure.
  const data: BaseAgentSwapGuardSettlementData = {
    decisionHash: decision.decisionHash,
    swapTxHash: params.swapTxHash,
    approvalTxHash,
    onChainSwapCalldataHash,
    recipient: guard.binding.recipient.toLowerCase() as `0x${string}`,
    chainId: settlementChainId,
    fillStatus: facts.fillStatus,
    sourceAmountRaw: fill.sourceAmountRaw,
    destinationAmountRaw: fill.destinationAmountRaw,
    executedPrice: fill.executedPrice,
    realizedSlippageBps: fill.realizedSlippageBps,
    blockNumber: facts.blockNumber ? facts.blockNumber.toString() : '0',
    executedAt,
    checkedAt: now,
    reasonCodesHash: keccak256(toBytes(canonicalJsonString(reasonCodes))),
    schemaVersion: BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA_VERSION,
  };

  const signer = params.signer === undefined ? await getAttesterAccount() : params.signer;
  let signature: Hex | null = null;
  let attester: `0x${string}` | null = null;
  let uid: Hex | null = null;
  if (signer) {
    const trusted = params.trustAttester ?? isPublishedBaseAgentSwapGuardAttester;
    if (await trusted(signer.address, now)) {
      const args = typedDataArgs(data);
      signature = (await signer.signTypedData(args)) as Hex;
      attester = signer.address.toLowerCase() as `0x${string}`;
      uid = hashTypedData(args);
    } else {
      logger.warn('Base agent swap guard settlement signer is outside the published key registry', {
        attester: signer.address,
      });
    }
  }

  return {
    ok: true,
    settlement: {
      type: BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE,
      schemaVersion: BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA_VERSION,
      schema: BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA,
      uid,
      attester,
      attesterLabel: 'Insight Base Agent Swap Guard settlement attester',
      signedAt: new Date(now * 1_000).toISOString(),
      signature,
      verifyUrl: params.verifyUrl ?? settlementVerifyUrl(),
      decisionHash: decision.decisionHash,
      reasonCodes,
      data,
      eip712: {
        domain: BASE_AGENT_SWAP_GUARD_SETTLEMENT_DOMAIN,
        types: BASE_AGENT_SWAP_GUARD_SETTLEMENT_TYPES,
        primaryType: BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE,
      },
    },
  };
}

export interface BaseAgentSwapGuardSettlementVerification {
  valid: boolean;
  decisionHash: string | null;
  /** The swap transaction hash bound inside the signed struct, when the
   *  struct parsed far enough to trust it. Exposed so a third party can
   *  detect two valid closures claiming the same decisionHash for different
   *  swap transactions — a contradiction no honest settlement can produce. */
  swapTxHash: string | null;
  attester: string | null;
  reason:
    | 'verified'
    | 'malformed'
    | 'reason_codes_mismatch'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'untrusted_attester'
    | 'verification_error';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Independently verify a signed settlement closure: structural shape, the
 * reason-code hash, the typed-data uid, the attester signature, and trust.
 */
export async function verifyBaseAgentSwapGuardSettlement(
  value: unknown,
  dependencies: {
    now?: () => number;
    trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
  } = {}
): Promise<BaseAgentSwapGuardSettlementVerification> {
  const empty = {
    valid: false,
    decisionHash: null,
    swapTxHash: null,
    attester: null,
  } as const;
  try {
    if (!isPlainObject(value) || !isPlainObject(value.data))
      return { ...empty, reason: 'malformed' };
    const data = value.data as unknown as BaseAgentSwapGuardSettlementData;
    const attester = typeof value.attester === 'string' ? value.attester : null;
    const signature = typeof value.signature === 'string' ? value.signature : null;
    if (
      value.type !== BASE_AGENT_SWAP_GUARD_SETTLEMENT_PRIMARY_TYPE ||
      data.schemaVersion !== BASE_AGENT_SWAP_GUARD_SETTLEMENT_SCHEMA_VERSION ||
      !SETTLEMENT_CHAIN_IDS.has(data.chainId) ||
      (data.fillStatus !== 'FULL' && data.fillStatus !== 'REVERTED') ||
      typeof data.decisionHash !== 'string' ||
      !HASH.test(data.decisionHash) ||
      typeof data.swapTxHash !== 'string' ||
      !HASH.test(data.swapTxHash) ||
      typeof data.approvalTxHash !== 'string' ||
      !HASH.test(data.approvalTxHash) ||
      typeof data.onChainSwapCalldataHash !== 'string' ||
      !HASH.test(data.onChainSwapCalldataHash) ||
      typeof data.reasonCodesHash !== 'string' ||
      !HASH.test(data.reasonCodesHash) ||
      typeof data.recipient !== 'string' ||
      !/^0x[0-9a-fA-F]{40}$/.test(data.recipient) ||
      !Array.isArray(value.reasonCodes) ||
      value.reasonCodes.some((code) => typeof code !== 'string')
    )
      return { ...empty, reason: 'malformed' };
    if (!attester || !signature) return { ...empty, reason: 'malformed' };

    // From here on the struct parsed completely, so the signed
    // decision/swap binding is reportable even when trust fails.
    const bound = { decisionHash: data.decisionHash, swapTxHash: data.swapTxHash, attester };

    const expectedCodesHash = keccak256(
      toBytes(canonicalJsonString(value.reasonCodes as string[]))
    );
    if (!sameHash(expectedCodesHash, data.reasonCodesHash))
      return { ...empty, ...bound, reason: 'reason_codes_mismatch' };

    const args = typedDataArgs(data);
    if (!sameHash(hashTypedData(args), value.uid))
      return { ...empty, ...bound, reason: 'uid_mismatch' };

    const signatureValid = await verifyTypedData({
      ...args,
      address: attester as `0x${string}`,
      signature: signature as Hex,
    });
    if (!signatureValid) return { ...empty, ...bound, reason: 'signature_invalid' };

    const trusted = dependencies.trustAttester ?? isPublishedBaseAgentSwapGuardAttester;
    if (!(await trusted(attester, data.checkedAt)))
      return { ...empty, ...bound, reason: 'untrusted_attester' };

    return {
      valid: true,
      ...bound,
      reason: 'verified',
    };
  } catch (error) {
    logger.warn('Base agent swap guard settlement verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}
