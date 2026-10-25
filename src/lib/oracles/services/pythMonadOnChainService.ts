import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  PYTH_MONAD_CHAIN_ID,
  PYTH_MONAD_CORE_ADDRESS,
  PYTH_MONAD_RPC_ENDPOINTS,
  type PythMonadFeed,
} from '@/lib/oracles/constants/pythMonad';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import { aggregateMonadCalls } from '../utils/monadMulticall';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('PythMonadOnChainService');

const PYTH_CORE_ABI = [
  {
    type: 'function',
    name: 'getPriceUnsafe',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        name: 'price',
        type: 'tuple',
        components: [
          { name: 'price', type: 'int64' },
          { name: 'conf', type: 'uint64' },
          { name: 'expo', type: 'int32' },
          { name: 'publishTime', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

/** Two sponsored update intervals is the maximum we will treat as usable. */
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;
const MAX_CONFIDENCE_RATIO = 0.2;
const MIN_EXPONENT = -30;
const MAX_EXPONENT = 30;

export interface PythMonadPriceData {
  symbol: string;
  feedId: `0x${string}`;
  price: number;
  conf: number;
  exponent: number;
  publishTime: number;
  timestamp: number;
  /** Raw Pyth confidence interval width as a fraction of the price. */
  confidenceRatio: number;
  maxAgeSeconds: number;
  priceDeviationPercent: number;
}

function requireSafeInteger(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Invalid Pyth ${label}: outside safe integer range`);
  }
  return Number(value);
}

/** Convert an integer Pyth value using its signed base-10 exponent without lossy intermediate math. */
export function scalePythValue(value: bigint, exponent: number): number {
  if (!Number.isInteger(exponent) || exponent < MIN_EXPONENT || exponent > MAX_EXPONENT) {
    throw new Error(`Invalid Pyth exponent: ${exponent}`);
  }
  const scaled = Number(`${value.toString()}e${exponent}`);
  if (!Number.isFinite(scaled)) throw new Error('Pyth scaled value is not finite');
  return scaled;
}

function decodePythPrice(raw: string, feed: PythMonadFeed): PythMonadPriceData {
  let decoded: { price: bigint; conf: bigint; expo: number; publishTime: bigint };
  try {
    decoded = decodeFunctionResult({
      abi: PYTH_CORE_ABI,
      functionName: 'getPriceUnsafe',
      data: raw as `0x${string}`,
    });
  } catch (error) {
    throw new Error(
      `Malformed Pyth Core response for ${feed.alias}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (decoded.price <= 0n) throw new Error(`Invalid non-positive Pyth price for ${feed.alias}`);
  if (decoded.conf < 0n) throw new Error(`Invalid negative Pyth confidence for ${feed.alias}`);

  const exponent = decoded.expo;
  const price = scalePythValue(decoded.price, exponent);
  const conf = scalePythValue(decoded.conf, exponent);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(conf) || conf < 0) {
    throw new Error(`Invalid scaled Pyth price for ${feed.alias}`);
  }

  const publishTime = requireSafeInteger(decoded.publishTime, 'publish time');
  if (publishTime <= 0) throw new Error(`Missing Pyth publish time for ${feed.alias}`);

  const confidenceRatio = conf / price;
  if (!Number.isFinite(confidenceRatio) || confidenceRatio > MAX_CONFIDENCE_RATIO) {
    throw new Error(`Pyth confidence interval is too wide for ${feed.alias}`);
  }

  return {
    symbol: feed.alias,
    feedId: `0x${feed.id}`,
    price,
    conf,
    exponent,
    publishTime,
    timestamp: publishTime * 1000,
    confidenceRatio,
    maxAgeSeconds: feed.timeDifferenceSeconds * 2,
    priceDeviationPercent: feed.priceDeviationPercent,
  };
}

export class PythMonadOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'pyth-monad' })) {
    this.rpcClient = rpcClient;
  }

  async getPrice(feed: PythMonadFeed, signal?: AbortSignal): Promise<PythMonadPriceData> {
    const cacheKey = `pyth-monad:${feed.id}`;
    const cached = this.cache.get<PythMonadPriceData>(cacheKey);
    if (cached && this.isUsable(cached)) return cached;
    if (cached) this.cache.delete(cacheKey);

    const data = encodeFunctionData({
      abi: PYTH_CORE_ABI,
      functionName: 'getPriceUnsafe',
      args: [`0x${feed.id}`],
    });
    const raw = await this.rpcClient.ethCall(
      String(PYTH_MONAD_CHAIN_ID),
      [...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []), ...PYTH_MONAD_RPC_ENDPOINTS],
      PYTH_MONAD_CORE_ADDRESS,
      data,
      signal
    );
    return this.acceptPrice(feed, raw, cacheKey);
  }

  /**
   * Batch-read reviewed Pyth feeds at one Monad state. A malformed or stale
   * sub-result is retried through the established individual path so a
   * Multicall transport detail can never silently deactivate a valid feed.
   */
  async getPrices(
    feeds: readonly PythMonadFeed[],
    signal?: AbortSignal
  ): Promise<PythMonadPriceData[]> {
    if (feeds.length === 0) return [];
    if (new Set(feeds.map((feed) => feed.id)).size !== feeds.length) {
      throw new Error('Pyth Monad batch contains duplicate feed IDs');
    }

    const readings = new Map<string, PythMonadPriceData>();
    const pending: PythMonadFeed[] = [];
    for (const feed of feeds) {
      const cacheKey = `pyth-monad:${feed.id}`;
      const cached = this.cache.get<PythMonadPriceData>(cacheKey);
      if (cached && this.isUsable(cached)) readings.set(feed.id, cached);
      else {
        if (cached) this.cache.delete(cacheKey);
        pending.push(feed);
      }
    }
    if (pending.length === 0) return feeds.flatMap((feed) => [readings.get(feed.id)!]);

    const endpoints = [
      ...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []),
      ...PYTH_MONAD_RPC_ENDPOINTS,
    ];
    let aggregateResults: Awaited<ReturnType<typeof aggregateMonadCalls>> | null = null;
    try {
      aggregateResults = await aggregateMonadCalls(
        this.rpcClient,
        endpoints,
        pending.map((feed) => ({
          target: PYTH_MONAD_CORE_ADDRESS,
          allowFailure: true,
          callData: encodeFunctionData({
            abi: PYTH_CORE_ABI,
            functionName: 'getPriceUnsafe',
            args: [`0x${feed.id}`],
          }),
        })),
        signal
      );
    } catch (error) {
      logger.warn('Pyth Monad Multicall failed; using bounded individual reads', {
        error: error instanceof Error ? error.message : String(error),
        feeds: pending.length,
      });
    }

    const fallback = async (feed: PythMonadFeed): Promise<void> => {
      try {
        readings.set(feed.id, await this.getPrice(feed, signal));
      } catch (error) {
        logger.warn('Pyth Monad batch feed is unavailable after individual fallback', {
          symbol: feed.alias,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    if (!aggregateResults) {
      await mapWithConcurrency(pending, 4, fallback);
      return feeds.flatMap((feed) => {
        const reading = readings.get(feed.id);
        return reading ? [reading] : [];
      });
    }

    const fallbacks: PythMonadFeed[] = [];
    for (const [index, feed] of pending.entries()) {
      const result = aggregateResults[index];
      if (!result?.success) {
        fallbacks.push(feed);
        continue;
      }
      try {
        readings.set(feed.id, this.acceptPrice(feed, result.returnData, `pyth-monad:${feed.id}`));
      } catch {
        fallbacks.push(feed);
      }
    }
    await mapWithConcurrency(fallbacks, 4, fallback);
    return feeds.flatMap((feed) => {
      const reading = readings.get(feed.id);
      return reading ? [reading] : [];
    });
  }

  private acceptPrice(feed: PythMonadFeed, raw: string, cacheKey: string): PythMonadPriceData {
    const price = decodePythPrice(raw, feed);
    if (!this.isUsable(price)) {
      const age = Math.max(0, Math.floor(Date.now() / 1000) - price.publishTime);
      throw new Error(
        `Pyth Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${price.maxAgeSeconds}s)`
      );
    }
    this.cache.set(cacheKey, price, Math.min(30_000, price.maxAgeSeconds * 1000));
    return price;
  }

  private isUsable(price: PythMonadPriceData): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - price.publishTime;
    const usable =
      Number.isFinite(price.price) &&
      price.price > 0 &&
      Number.isFinite(price.conf) &&
      price.conf >= 0 &&
      Number.isFinite(price.confidenceRatio) &&
      price.confidenceRatio <= MAX_CONFIDENCE_RATIO &&
      age >= -MAX_FUTURE_SKEW_SECONDS &&
      age <= price.maxAgeSeconds;
    if (!usable) {
      logger.warn('Rejected unusable Pyth Monad value', {
        symbol: price.symbol,
        age,
        maxAgeSeconds: price.maxAgeSeconds,
        confidenceRatio: price.confidenceRatio,
      });
    }
    return usable;
  }
}

export const pythMonadOnChainService = new PythMonadOnChainService();
