import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  SUPRA_MONAD_CHAIN_ID,
  SUPRA_MONAD_RPC_ENDPOINTS,
  SUPRA_MONAD_SVALUE_FEED_ADDRESS,
  type SupraMonadFeed,
} from '@/lib/oracles/constants/supraMonad';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import { aggregateMonadCalls } from '../utils/monadMulticall';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('SupraMonadOnChainService');

const SUPRA_SVALUE_ABI = [
  {
    type: 'function',
    name: 'getSvalue',
    stateMutability: 'view',
    inputs: [{ name: '_pairIndex', type: 'uint256' }],
    outputs: [
      {
        name: 'priceFeed',
        type: 'tuple',
        components: [
          { name: 'round', type: 'uint256' },
          { name: 'decimals', type: 'uint256' },
          // Supra's DORA Push contract reports this source timestamp in Unix milliseconds.
          { name: 'time', type: 'uint256' },
          { name: 'price', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MIN_DECIMALS = 0;
const MAX_DECIMALS = 36;

export interface SupraMonadPriceData {
  symbol: string;
  pairIndex: number;
  price: number;
  decimals: number;
  sourceTimestampMs: number;
  sourceTimestamp: number;
  timestamp: number;
  round: bigint;
  rawValue: bigint;
  maxAgeSeconds: number;
}

function toSafeNumber(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Invalid Supra ${label}: outside safe integer range`);
  }
  return Number(value);
}

/** Scale the exact integer value only after validating its provider-supplied decimal scale. */
export function scaleSupraValue(value: bigint, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < MIN_DECIMALS || decimals > MAX_DECIMALS) {
    throw new Error(`Invalid Supra decimals: ${decimals}`);
  }
  const price = Number(`${value.toString()}e-${decimals}`);
  if (!Number.isFinite(price)) throw new Error('Supra scaled value is not finite');
  return price;
}

function decodePrice(raw: string, feed: SupraMonadFeed): SupraMonadPriceData {
  let decoded: { round: bigint; decimals: bigint; time: bigint; price: bigint };
  try {
    decoded = decodeFunctionResult({
      abi: SUPRA_SVALUE_ABI,
      functionName: 'getSvalue',
      data: raw as `0x${string}`,
    });
  } catch (error) {
    throw new Error(
      `Malformed Supra Monad response for ${feed.alias}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (decoded.price <= 0n) throw new Error(`Invalid non-positive Supra price for ${feed.alias}`);
  if (decoded.round <= 0n) throw new Error(`Missing Supra round for ${feed.alias}`);

  const decimals = toSafeNumber(decoded.decimals, 'decimals');
  const sourceTimestampMs = toSafeNumber(decoded.time, 'source timestamp');
  // The EVM Push ABI documents `time` as a timestamp and real Monad values
  // are 13-digit Unix milliseconds. Refuse a wrong unit rather than quietly
  // making a seconds-vs-milliseconds freshness mistake.
  if (sourceTimestampMs < 1_000_000_000_000) {
    throw new Error(`Invalid Supra millisecond source timestamp for ${feed.alias}`);
  }
  const price = scaleSupraValue(decoded.price, decimals);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid scaled Supra price for ${feed.alias}`);
  }

  return {
    symbol: feed.alias,
    pairIndex: feed.pairIndex,
    price,
    decimals,
    sourceTimestampMs,
    sourceTimestamp: Math.floor(sourceTimestampMs / 1000),
    timestamp: sourceTimestampMs,
    round: decoded.round,
    rawValue: decoded.price,
    maxAgeSeconds: feed.maxStalenessSeconds,
  };
}

export class SupraMonadOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'supra-monad' })) {
    this.rpcClient = rpcClient;
  }

  async getPrice(feed: SupraMonadFeed, signal?: AbortSignal): Promise<SupraMonadPriceData> {
    const cacheKey = `supra-monad:${feed.pairIndex}`;
    const cached = this.cache.get<SupraMonadPriceData>(cacheKey);
    if (cached && this.isUsable(cached)) return cached;
    if (cached) this.cache.delete(cacheKey);

    const raw = await this.rpcClient.ethCall(
      String(SUPRA_MONAD_CHAIN_ID),
      [...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []), ...SUPRA_MONAD_RPC_ENDPOINTS],
      SUPRA_MONAD_SVALUE_FEED_ADDRESS,
      encodeFunctionData({
        abi: SUPRA_SVALUE_ABI,
        functionName: 'getSvalue',
        args: [BigInt(feed.pairIndex)],
      }),
      signal
    );
    return this.acceptPrice(feed, raw, cacheKey);
  }

  /** Read reviewed Supra pair indices in bounded Multicall3 chunks on Monad. */
  async getPrices(
    feeds: readonly SupraMonadFeed[],
    signal?: AbortSignal
  ): Promise<SupraMonadPriceData[]> {
    if (feeds.length === 0) return [];
    if (new Set(feeds.map((feed) => feed.pairIndex)).size !== feeds.length) {
      throw new Error('Supra Monad batch contains duplicate pair indices');
    }

    const readings = new Map<number, SupraMonadPriceData>();
    const pending: SupraMonadFeed[] = [];
    for (const feed of feeds) {
      const cacheKey = `supra-monad:${feed.pairIndex}`;
      const cached = this.cache.get<SupraMonadPriceData>(cacheKey);
      if (cached && this.isUsable(cached)) readings.set(feed.pairIndex, cached);
      else {
        if (cached) this.cache.delete(cacheKey);
        pending.push(feed);
      }
    }
    if (pending.length === 0) return feeds.flatMap((feed) => [readings.get(feed.pairIndex)!]);

    const endpoints = [
      ...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []),
      ...SUPRA_MONAD_RPC_ENDPOINTS,
    ];
    let aggregateResults: Awaited<ReturnType<typeof aggregateMonadCalls>> | null = null;
    try {
      aggregateResults = await aggregateMonadCalls(
        this.rpcClient,
        endpoints,
        pending.map((feed) => ({
          target: SUPRA_MONAD_SVALUE_FEED_ADDRESS,
          allowFailure: true,
          callData: encodeFunctionData({
            abi: SUPRA_SVALUE_ABI,
            functionName: 'getSvalue',
            args: [BigInt(feed.pairIndex)],
          }),
        })),
        signal
      );
    } catch (error) {
      logger.warn('Supra Monad Multicall failed; using bounded individual reads', {
        error: error instanceof Error ? error.message : String(error),
        feeds: pending.length,
      });
    }

    const fallback = async (feed: SupraMonadFeed): Promise<void> => {
      try {
        readings.set(feed.pairIndex, await this.getPrice(feed, signal));
      } catch (error) {
        logger.warn('Supra Monad batch feed is unavailable after individual fallback', {
          symbol: feed.alias,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    if (!aggregateResults) {
      await mapWithConcurrency(pending, 4, fallback);
      return feeds.flatMap((feed) => {
        const reading = readings.get(feed.pairIndex);
        return reading ? [reading] : [];
      });
    }

    const fallbacks: SupraMonadFeed[] = [];
    for (const [index, feed] of pending.entries()) {
      const result = aggregateResults[index];
      if (!result?.success) {
        fallbacks.push(feed);
        continue;
      }
      try {
        readings.set(
          feed.pairIndex,
          this.acceptPrice(feed, result.returnData, `supra-monad:${feed.pairIndex}`)
        );
      } catch {
        fallbacks.push(feed);
      }
    }
    await mapWithConcurrency(fallbacks, 4, fallback);
    return feeds.flatMap((feed) => {
      const reading = readings.get(feed.pairIndex);
      return reading ? [reading] : [];
    });
  }

  private acceptPrice(feed: SupraMonadFeed, raw: string, cacheKey: string): SupraMonadPriceData {
    const reading = decodePrice(raw, feed);
    if (!this.isUsable(reading)) {
      const age = Math.max(0, Math.floor((Date.now() - reading.sourceTimestampMs) / 1000));
      throw new Error(
        `Supra Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${reading.maxAgeSeconds}s)`
      );
    }
    this.cache.set(cacheKey, reading, Math.min(30_000, reading.maxAgeSeconds * 1000));
    return reading;
  }

  private isUsable(reading: SupraMonadPriceData): boolean {
    const ageMs = Date.now() - reading.sourceTimestampMs;
    const usable =
      Number.isFinite(reading.price) &&
      reading.price > 0 &&
      reading.rawValue > 0n &&
      Number.isInteger(reading.decimals) &&
      reading.decimals >= MIN_DECIMALS &&
      reading.decimals <= MAX_DECIMALS &&
      reading.round > 0n &&
      ageMs >= -MAX_FUTURE_SKEW_MS &&
      ageMs <= reading.maxAgeSeconds * 1000;
    if (!usable) {
      logger.warn('Rejected unusable Supra Monad value', {
        symbol: reading.symbol,
        ageMs,
        maxAgeSeconds: reading.maxAgeSeconds,
      });
    }
    return usable;
  }
}

export const supraMonadOnChainService = new SupraMonadOnChainService();
