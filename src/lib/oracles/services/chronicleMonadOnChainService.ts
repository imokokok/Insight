import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  CHRONICLE_MONAD_CHAIN_ID,
  CHRONICLE_MONAD_RPC_ENDPOINTS,
  type ChronicleMonadFeed,
} from '@/lib/oracles/constants/chronicleMonad';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import { aggregateMonadCalls } from '../utils/monadMulticall';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('ChronicleMonadOnChainService');

const CHRONICLE_FEED_ABI = [
  {
    type: 'function',
    name: 'readWithAge',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'value', type: 'uint256' },
      { name: 'age', type: 'uint256' },
    ],
  },
] as const;

const CHRONICLE_PRICE_DECIMALS = 18;
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;

export interface ChronicleMonadPriceData {
  symbol: string;
  feedName: string;
  feedAddress: `0x${string}`;
  price: number;
  /** Chronicle feeds expose values as 18-decimal fixed point integers. */
  decimals: number;
  /** Unix seconds from Chronicle's on-chain `readWithAge()` result. */
  sourceTimestamp: number;
  timestamp: number;
  rawValue: bigint;
  maxAgeSeconds: number;
  priceDeviationPercent: number;
}

function requireSafeTimestamp(value: bigint, symbol: string): number {
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Invalid Chronicle source timestamp for ${symbol}`);
  }
  return Number(value);
}

/** Convert Chronicle's uint256 18-decimal value without widening it first. */
export function scaleChronicleValue(value: bigint): number {
  const price = Number(`${value.toString()}e-${CHRONICLE_PRICE_DECIMALS}`);
  if (!Number.isFinite(price)) throw new Error('Chronicle scaled value is not finite');
  return price;
}

function decodePrice(raw: string, feed: ChronicleMonadFeed): ChronicleMonadPriceData {
  let value: bigint;
  let sourceTimestampRaw: bigint;
  try {
    [value, sourceTimestampRaw] = decodeFunctionResult({
      abi: CHRONICLE_FEED_ABI,
      functionName: 'readWithAge',
      data: raw as `0x${string}`,
    });
  } catch (error) {
    throw new Error(
      `Malformed Chronicle Monad response for ${feed.alias}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (value <= 0n) throw new Error(`Invalid non-positive Chronicle price for ${feed.alias}`);
  const sourceTimestamp = requireSafeTimestamp(sourceTimestampRaw, feed.alias);
  const price = scaleChronicleValue(value);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid scaled Chronicle price for ${feed.alias}`);
  }

  return {
    symbol: feed.alias,
    feedName: feed.feedName,
    feedAddress: feed.address,
    price,
    decimals: CHRONICLE_PRICE_DECIMALS,
    sourceTimestamp,
    timestamp: sourceTimestamp * 1000,
    rawValue: value,
    maxAgeSeconds: feed.maxStalenessSeconds,
    priceDeviationPercent: feed.priceDeviationPercent,
  };
}

export class ChronicleMonadOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'chronicle-monad' })) {
    this.rpcClient = rpcClient;
  }

  async getPrice(feed: ChronicleMonadFeed, signal?: AbortSignal): Promise<ChronicleMonadPriceData> {
    const cacheKey = `chronicle-monad:${feed.address.toLowerCase()}`;
    const cached = this.cache.get<ChronicleMonadPriceData>(cacheKey);
    if (cached && this.isUsable(cached)) return cached;
    if (cached) this.cache.delete(cacheKey);

    const raw = await this.rpcClient.ethCall(
      String(CHRONICLE_MONAD_CHAIN_ID),
      [...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []), ...CHRONICLE_MONAD_RPC_ENDPOINTS],
      feed.address,
      encodeFunctionData({ abi: CHRONICLE_FEED_ABI, functionName: 'readWithAge' }),
      signal
    );
    return this.acceptPrice(feed, raw, cacheKey);
  }

  /** Read reviewed Chronicle contracts in bounded Multicall3 chunks on Monad. */
  async getPrices(
    feeds: readonly ChronicleMonadFeed[],
    signal?: AbortSignal
  ): Promise<ChronicleMonadPriceData[]> {
    if (feeds.length === 0) return [];
    if (new Set(feeds.map((feed) => feed.address.toLowerCase())).size !== feeds.length) {
      throw new Error('Chronicle Monad batch contains duplicate feed addresses');
    }

    const readings = new Map<string, ChronicleMonadPriceData>();
    const pending: ChronicleMonadFeed[] = [];
    for (const feed of feeds) {
      const key = feed.address.toLowerCase();
      const cacheKey = `chronicle-monad:${key}`;
      const cached = this.cache.get<ChronicleMonadPriceData>(cacheKey);
      if (cached && this.isUsable(cached)) readings.set(key, cached);
      else {
        if (cached) this.cache.delete(cacheKey);
        pending.push(feed);
      }
    }
    if (pending.length === 0) {
      return feeds.flatMap((feed) => [readings.get(feed.address.toLowerCase())!]);
    }

    const endpoints = [
      ...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []),
      ...CHRONICLE_MONAD_RPC_ENDPOINTS,
    ];
    let aggregateResults: Awaited<ReturnType<typeof aggregateMonadCalls>> | null = null;
    try {
      aggregateResults = await aggregateMonadCalls(
        this.rpcClient,
        endpoints,
        pending.map((feed) => ({
          target: feed.address,
          allowFailure: true,
          callData: encodeFunctionData({ abi: CHRONICLE_FEED_ABI, functionName: 'readWithAge' }),
        })),
        signal
      );
    } catch (error) {
      logger.warn('Chronicle Monad Multicall failed; using bounded individual reads', {
        error: error instanceof Error ? error.message : String(error),
        feeds: pending.length,
      });
    }

    const fallback = async (feed: ChronicleMonadFeed): Promise<void> => {
      try {
        readings.set(feed.address.toLowerCase(), await this.getPrice(feed, signal));
      } catch (error) {
        logger.warn('Chronicle Monad batch feed is unavailable after individual fallback', {
          symbol: feed.alias,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    if (!aggregateResults) {
      await mapWithConcurrency(pending, 4, fallback);
      return feeds.flatMap((feed) => {
        const reading = readings.get(feed.address.toLowerCase());
        return reading ? [reading] : [];
      });
    }

    const fallbacks: ChronicleMonadFeed[] = [];
    for (const [index, feed] of pending.entries()) {
      const result = aggregateResults[index];
      if (!result?.success) {
        fallbacks.push(feed);
        continue;
      }
      try {
        readings.set(
          feed.address.toLowerCase(),
          this.acceptPrice(feed, result.returnData, `chronicle-monad:${feed.address.toLowerCase()}`)
        );
      } catch {
        fallbacks.push(feed);
      }
    }
    await mapWithConcurrency(fallbacks, 4, fallback);
    return feeds.flatMap((feed) => {
      const reading = readings.get(feed.address.toLowerCase());
      return reading ? [reading] : [];
    });
  }

  private acceptPrice(
    feed: ChronicleMonadFeed,
    raw: string,
    cacheKey: string
  ): ChronicleMonadPriceData {
    const reading = decodePrice(raw, feed);
    if (!this.isUsable(reading)) {
      const age = Math.max(0, Math.floor(Date.now() / 1000) - reading.sourceTimestamp);
      throw new Error(
        `Chronicle Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${reading.maxAgeSeconds}s)`
      );
    }
    this.cache.set(cacheKey, reading, Math.min(30_000, reading.maxAgeSeconds * 1000));
    return reading;
  }

  private isUsable(reading: ChronicleMonadPriceData): boolean {
    const age = Math.floor(Date.now() / 1000) - reading.sourceTimestamp;
    const usable =
      Number.isFinite(reading.price) &&
      reading.price > 0 &&
      reading.rawValue > 0n &&
      reading.decimals === CHRONICLE_PRICE_DECIMALS &&
      age >= -MAX_FUTURE_SKEW_SECONDS &&
      age <= reading.maxAgeSeconds;
    if (!usable) {
      logger.warn('Rejected unusable Chronicle Monad value', {
        symbol: reading.symbol,
        age,
        maxAgeSeconds: reading.maxAgeSeconds,
      });
    }
    return usable;
  }
}

export const chronicleMonadOnChainService = new ChronicleMonadOnChainService();
