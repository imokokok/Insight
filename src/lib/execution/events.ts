/**
 * @fileoverview Minimal on-chain event decoding for execution verification.
 *
 * Scoped deliberately narrow. Insight does not know or care which DEX, router
 * or aggregator an agent used — a receipt that only understood Uniswap would
 * be wrong for every agent routing anywhere else, and silently wrong is worse
 * than unavailable. So the collector reads the one event every ERC-20 transfer
 * emits, `Transfer`, which is emitted by every venue and every hop.
 *
 * Trade-off this buys: venue-agnostic and simple. Trade-off it costs: it only
 * works when both legs of the trade are ERC-20 tokens. A native-ETH leg has no
 * `Transfer` event, so instead of inferring an amount it does not have, the
 * collector reports it as unavailable and the receipt says UNDETERMINED.
 */

import { decodeEventLog } from 'viem';

/** keccak256("Transfer(address,address,uint256)") */
export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const;

const TRANSFER_EVENT_ABI = {
  type: 'event',
  name: 'Transfer',
  anonymous: false,
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

export interface DecodedTransfer {
  /** The token contract that emitted the event. */
  token: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  /** Raw amount in the token's smallest unit. */
  value: bigint;
}

/** Decode one log as an ERC-20 Transfer. Returns null when the log is not a
 *  Transfer, or is malformed — a non-matching log is normal in any swap
 *  receipt, so this is not an error condition. */
export function decodeTransferLog(log: {
  address: `0x${string}`;
  topics: readonly `0x${string}`[];
  data: `0x${string}`;
}): DecodedTransfer | null {
  if (!log.topics || log.topics.length < 3) return null;
  if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) return null;

  try {
    const decoded = decodeEventLog({
      abi: [TRANSFER_EVENT_ABI],
      data: log.data,
      // viem wants a mutable tuple; the log's topics are readonly by contract.
      topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
    });
    const args = decoded.args as { from?: unknown; to?: unknown; value?: unknown };
    if (typeof args.from !== 'string' || typeof args.to !== 'string') return null;
    if (typeof args.value !== 'bigint') return null;

    return {
      token: log.address,
      from: args.from.toLowerCase() as `0x${string}`,
      to: args.to.toLowerCase() as `0x${string}`,
      value: args.value,
    };
  } catch {
    // Malformed data for a topic we matched: not a Transfer we can read.
    return null;
  }
}

/** Decode every Transfer in a transaction receipt's logs. */
export function decodeAllTransfers(
  logs: ReadonlyArray<{
    address: `0x${string}`;
    topics: readonly `0x${string}`[];
    data: `0x${string}`;
  }>
): DecodedTransfer[] {
  const out: DecodedTransfer[] = [];
  for (const log of logs) {
    const decoded = decodeTransferLog(log);
    if (decoded) out.push(decoded);
  }
  return out;
}

/**
 * `decimals()` selector: keccak256("decimals()")[0:4].
 *
 * Hand-rolled rather than pulled from a full ERC-20 ABI because it is the only
 * method this module needs, and a bare selector keeps the decoding explicit.
 */
export const DECIMALS_SELECTOR = '0x313ce567' as const;

/**
 * Parse an `eth_call` response to `decimals()`.
 *
 * Returns null on anything unexpected. Callers must treat null as "unknown",
 * never as 18 — assuming 18 for a token with 6 decimals would misstate the fill
 * price by a factor of a trillion, and the receipt would look confident while
 * being wrong.
 */
export function parseDecimalsResult(result: string | null | undefined): number | null {
  if (!result || result === '0x' || result.length < 66) return null;
  try {
    const value = BigInt(result);
    // A sane ERC-20 has 0..36 decimals; anything else means we misread the call.
    if (value > 36n) return null;
    return Number(value);
  } catch {
    return null;
  }
}
