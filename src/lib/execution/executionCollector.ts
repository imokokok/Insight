/**
 * @fileoverview Execution collector — turn a transaction hash into the facts an
 * Execution Receipt needs.
 *
 * Deliberately venue-agnostic. Insight does not know which DEX, router or
 * aggregator an agent used, and a collector that understood only Uniswap would
 * be quietly wrong for every agent routing elsewhere. Instead it reads the one
 * event every ERC-20 movement emits (`Transfer`) and attributes amounts to the
 * taker, which works for single-hop and multi-hop routes alike.
 *
 * Honesty rules this module is built around — each one exists because the
 * alternative produces a confident-looking receipt that is wrong:
 *
 *   - A native-asset SOURCE leg (the asset the agent sold) is read from the
 *     transaction's `value` — native leaves the sender's balance directly. A
 *     native DESTINATION leg (the asset bought) emits no `Transfer` and is not
 *     in `value` either, so it is genuinely unobservable and the price stays
 *     unavailable rather than being guessed.
 *   - `decimals()` returning null is NOT treated as 18. Assuming 18 for a
 *     6-decimal token misstates the fill price by a factor of a trillion.
 *   - A reverted transaction is a real, signable outcome (nothing settled), not
 *     a collection failure.
 *   - A transaction the node has not seen is a failure to collect, and no
 *     receipt is issued at all.
 */

import { parseCaip19 } from '@/lib/attestations/caip19';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';

import {
  DECIMALS_SELECTOR,
  decodeAllTransfers,
  parseDecimalsResult,
  type DecodedTransfer,
} from './events';

export type ExecutionCollectionCode = 'NOT_FOUND' | 'RPC_ERROR' | 'UNSUPPORTED_CHAIN';

export interface ExecutionFacts {
  txHash: `0x${string}`;
  chainId: number;
  blockNumber: bigint | null;
  /** 'REVERTED' when the transaction failed; 'FULL' when it settled on-chain.
   *  Settlement completeness is independent of Insight's ability to attribute
   *  the amount: a successful transaction is reported as FULL even when the fill
   *  price is unreadable, in which case {@link unavailableReason} is set and the
   *  receipt's verdict is UNDETERMINED. Partial fills are not distinguishable
   *  from Transfer events alone, so every settled transaction is FULL. */
  fillStatus: 'FULL' | 'REVERTED';
  /** Human-unit amounts (raw amount divided by the token's decimals). */
  sourceAmount: number | null;
  destinationAmount: number | null;
  /** Destination units per source unit. Null when it cannot be computed. */
  executedPrice: number | null;
  /** Gas actually consumed, in the chain's native units (wei for EVM). */
  feeNative: bigint | null;
  /** Block timestamp, unix seconds. Null when the block could not be read;
   *  `blockNumber` remains the authoritative anchor in that case. */
  executedAt: number | null;
  /** The address whose balance changes define this settlement: the
   *  caller-supplied taker when given, else the transaction sender — read from
   *  chain, never guessed. Null only when the receipt carried no sender.
   *  Signed as v3's `taker` (and the default `subject`). */
  taker: `0x${string}` | null;
  /** Machine-readable reason the price is unavailable, when it is. */
  unavailableReason: 'FILL_PRICE_UNAVAILABLE' | 'NATIVE_ASSET_LEG' | 'PRICE_NOT_ATTRIBUTED' | null;
}

export type ExecutionCollectionResult =
  | { ok: true; facts: ExecutionFacts }
  | { ok: false; code: ExecutionCollectionCode; message: string };

export interface CollectExecutionParams {
  txHash: `0x${string}`;
  chainId: number;
  /** RPC endpoints for `chainId`, already resolved by the caller. */
  endpoints: string[];
  /** CAIP-19 id of the asset the agent was selling. */
  sourceAssetId: string;
  /** CAIP-19 id of the asset the agent was buying. */
  destinationAssetId: string;
  /** Address whose balances define the trade. Defaults to the tx sender. */
  taker?: `0x${string}`;
  signal?: AbortSignal;
  /** Injectable for tests. Defaults to a fresh client. */
  client?: RpcClientWithFallback;
}

/**
 * Classify an asset leg by what the collector can read from a receipt.
 *   - 'erc20'      → readable from `Transfer` events (address known).
 *   - 'native'     → the chain's gas token (slip44). No Transfer event; the
 *                    amount SOLD is the transaction's `value`, but the amount
 *                    BOUGHT is not observable (see the native handling below),
 *                    so the price is only ever readable when the native leg is
 *                    the SOURCE.
 *   - 'unsupported' → non-EVM, or an id we cannot parse. Nothing to attribute.
 */
interface AssetSpec {
  kind: 'erc20' | 'native' | 'unsupported';
  /** Lowercased ERC-20 contract address (erc20 kind only). */
  address?: string;
}

function assetSpecFor(assetId: string, chainId: number): AssetSpec {
  const parsed = parseCaip19(assetId);
  if (!parsed || parsed.chainNamespace !== 'eip155') return { kind: 'unsupported' };
  if (parsed.chainReference !== chainId) return { kind: 'unsupported' };
  if (parsed.assetNamespace === 'slip44') return { kind: 'native' };
  if (parsed.assetNamespace === 'erc20') {
    return { kind: 'erc20', address: parsed.assetReference.toLowerCase() };
  }
  return { kind: 'unsupported' };
}

/**
 * Sum the taker-relevant `Transfer`s for one ERC-20 leg and convert to human
 * units. Direction 'out' attributes tokens LEAVING the taker (the source leg);
 * 'in' attributes tokens ARRIVING to the taker (the destination leg). Returns
 * null when the leg emitted no attributable transfer or its `decimals()` could
 * not be read — a missing amount is reported, never assumed (treating a null
 * decimals as 18 would misstate the price for a 6-decimal token by a trillion).
 */
async function readErc20Amount(params: {
  tokenAddress: string;
  taker: string;
  direction: 'out' | 'in';
  transfers: DecodedTransfer[];
  client: RpcClientWithFallback;
  key: string;
  endpoints: string[];
  signal?: AbortSignal;
}): Promise<number | null> {
  let raw = 0n;
  for (const t of params.transfers) {
    if (t.token.toLowerCase() !== params.tokenAddress) continue;
    if (params.direction === 'out' && t.from === params.taker) raw += t.value;
    if (params.direction === 'in' && t.to === params.taker) raw += t.value;
  }
  const decimals = await fetchDecimals(
    params.client,
    params.key,
    params.endpoints,
    params.tokenAddress as `0x${string}`,
    params.signal
  );
  if (raw === 0n || decimals === null) return null;
  return Number(raw) / 10 ** decimals;
}

export async function collectExecutionFacts(
  params: CollectExecutionParams
): Promise<ExecutionCollectionResult> {
  const {
    txHash,
    chainId,
    endpoints,
    sourceAssetId,
    destinationAssetId,
    signal,
    client = new RpcClientWithFallback({ contextLabel: 'execution-collector' }),
  } = params;

  const key = String(chainId);

  let receipt;
  try {
    receipt = await client.getTransactionReceipt(key, endpoints, txHash, signal);
  } catch (error) {
    return {
      ok: false,
      code: 'RPC_ERROR',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // Not seen by the node: pending or unknown. This is NOT the same as a
  // reverted transaction, and no receipt may be issued for it.
  if (!receipt) {
    return { ok: false, code: 'NOT_FOUND', message: 'Transaction not found on the configured RPC' };
  }

  const blockNumber = receipt.blockNumber ? BigInt(receipt.blockNumber) : null;
  const reverted = receipt.status === '0x0';

  let feeNative: bigint | null = null;
  try {
    feeNative = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice);
  } catch {
    feeNative = null;
  }

  // Block timestamp is best-effort: blockNumber is the authoritative anchor and
  // stays in the receipt either way.
  let executedAt: number | null = null;
  if (blockNumber !== null) {
    try {
      const block = await client.getBlockByNumber(key, endpoints, Number(blockNumber), signal);
      if (block?.timestamp) executedAt = Number(BigInt(block.timestamp));
    } catch {
      executedAt = null;
    }
  }

  if (reverted) {
    // A reverted transaction is a genuine outcome worth signing: it proves
    // nothing settled. Gas was still consumed, which is also worth recording.
    return {
      ok: true,
      facts: {
        txHash,
        chainId,
        blockNumber,
        fillStatus: 'REVERTED',
        sourceAmount: null,
        destinationAmount: null,
        executedPrice: null,
        feeNative,
        executedAt,
        taker: receipt.from
          ? ((params.taker ?? receipt.from).toLowerCase() as `0x${string}`)
          : null,
        unavailableReason: 'FILL_PRICE_UNAVAILABLE',
      },
    };
  }

  const sourceSpec = assetSpecFor(sourceAssetId, chainId);
  const destinationSpec = assetSpecFor(destinationAssetId, chainId);
  if (sourceSpec.kind === 'unsupported' || destinationSpec.kind === 'unsupported') {
    // Non-EVM asset, or an id we cannot parse: no Transfer event and no value
    // semantics we understand, so there is nothing to attribute. Report it as
    // an unavailable fill rather than guessing a (wrong) price.
    return {
      ok: true,
      facts: {
        txHash,
        chainId,
        blockNumber,
        fillStatus: 'FULL',
        sourceAmount: null,
        destinationAmount: null,
        executedPrice: null,
        feeNative,
        executedAt,
        taker: receipt.from
          ? ((params.taker ?? receipt.from).toLowerCase() as `0x${string}`)
          : null,
        unavailableReason: 'FILL_PRICE_UNAVAILABLE',
      },
    };
  }

  const taker = (params.taker ?? receipt.from ?? '').toLowerCase() as `0x${string}`;
  if (!taker) {
    return { ok: false, code: 'RPC_ERROR', message: 'Transaction receipt has no sender' };
  }

  const transfers = decodeAllTransfers(receipt.logs);
  const NATIVE_DECIMALS = 18; // wei; native gas tokens are always 18 decimals.

  // A native leg cannot be read from `Transfer` events. The native amount SOLD
  // (source native) is the transaction's `value` — but only when the taker is
  // the transaction sender, since native leaves the sender's balance directly.
  // The native amount BOUGHT (destination native) never appears in a Transfer
  // log or in tx.value (that is what was sent, not received), so it is genuinely
  // unreadable and the price stays unavailable — we do not guess it.
  const needsTx = sourceSpec.kind === 'native' || destinationSpec.kind === 'native';
  let txValueWei: bigint | null = null;
  if (needsTx) {
    try {
      const tx = await client.getTransactionByHash(key, endpoints, txHash, signal);
      txValueWei = tx?.value ? BigInt(tx.value) : null;
    } catch {
      txValueWei = null;
    }
  }

  // Source leg.
  let sourceAmount: number | null = null;
  if (sourceSpec.kind === 'native') {
    sourceAmount =
      txValueWei !== null && taker === (receipt.from ?? '').toLowerCase()
        ? Number(txValueWei) / 10 ** NATIVE_DECIMALS
        : null;
  } else {
    sourceAmount = await readErc20Amount({
      tokenAddress: sourceSpec.address!,
      taker,
      direction: 'out',
      transfers,
      client,
      key,
      endpoints,
      signal,
    });
  }

  // Destination leg. A native destination is unobservable → price unavailable.
  const destinationNativeUnreadable = destinationSpec.kind === 'native';
  const destinationAmount = destinationNativeUnreadable
    ? null
    : await readErc20Amount({
        tokenAddress: destinationSpec.address!,
        taker,
        direction: 'in',
        transfers,
        client,
        key,
        endpoints,
        signal,
      });

  const executedPrice =
    sourceAmount !== null && sourceAmount > 0 && destinationAmount !== null && destinationAmount > 0
      ? destinationAmount / sourceAmount
      : null;

  let unavailableReason: ExecutionFacts['unavailableReason'] = null;
  if (destinationNativeUnreadable) {
    unavailableReason = 'NATIVE_ASSET_LEG';
  } else if (sourceAmount === null || destinationAmount === null) {
    unavailableReason = 'PRICE_NOT_ATTRIBUTED';
  }

  return {
    ok: true,
    facts: {
      txHash,
      chainId,
      blockNumber,
      fillStatus: 'FULL',
      sourceAmount,
      destinationAmount,
      executedPrice,
      feeNative,
      executedAt,
      taker,
      unavailableReason,
    },
  };
}

/** Read a token's `decimals()`. Null on any failure — callers must not
 *  substitute a default, for the accuracy reason stated at the top of the file. */
async function fetchDecimals(
  client: RpcClientWithFallback,
  key: string,
  endpoints: string[],
  token: `0x${string}`,
  signal?: AbortSignal
): Promise<number | null> {
  try {
    const result = await client.ethCall(key, endpoints, token, DECIMALS_SELECTOR, signal);
    return parseDecimalsResult(result);
  } catch {
    return null;
  }
}
