import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  REDSTONE_MONAD_CHAIN_ID,
  REDSTONE_MONAD_RPC_ENDPOINTS,
  type RedStoneMonadFeed,
} from '@/lib/oracles/constants/redstoneMonad';
import { createLogger } from '@/lib/utils/logger';

import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('RedStoneMonadOnChainService');

const REDSTONE_AGGREGATOR_V3_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'latestRoundData',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const;

const MAX_FUTURE_SKEW_SECONDS = 5 * 60;
const MAX_FEED_DECIMALS = 36;

export interface RedStoneMonadPriceData {
  symbol: string;
  feedName: string;
  feedAddress: `0x${string}`;
  price: number;
  decimals: number;
  roundId: bigint;
  answeredInRound: bigint;
  startedAt: number;
  updatedAt: number;
  timestamp: number;
  rawAnswer: bigint;
  maxAgeSeconds: number;
  priceDeviationPercent: number;
}

function requireSafeTimestamp(value: bigint, field: string, symbol: string): number {
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Invalid RedStone ${field} for ${symbol}`);
  }
  return Number(value);
}

/** Convert an AggregatorV3 signed integer without widening it before scaling. */
export function scaleRedStoneValue(value: bigint, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_FEED_DECIMALS) {
    throw new Error(`Invalid RedStone feed decimals: ${decimals}`);
  }
  const price = Number(`${value.toString()}e-${decimals}`);
  if (!Number.isFinite(price)) throw new Error('RedStone scaled price is not finite');
  return price;
}

function decodePrice(
  roundRaw: string,
  decimalsRaw: string,
  feed: RedStoneMonadFeed
): RedStoneMonadPriceData {
  let decimals: number;
  let round: readonly [bigint, bigint, bigint, bigint, bigint];
  try {
    decimals = Number(
      decodeFunctionResult({
        abi: REDSTONE_AGGREGATOR_V3_ABI,
        functionName: 'decimals',
        data: decimalsRaw as `0x${string}`,
      })
    );
    round = decodeFunctionResult({
      abi: REDSTONE_AGGREGATOR_V3_ABI,
      functionName: 'latestRoundData',
      data: roundRaw as `0x${string}`,
    });
  } catch (error) {
    throw new Error(
      `Malformed RedStone Monad response for ${feed.alias}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const [roundId, rawAnswer, startedAtRaw, updatedAtRaw, answeredInRound] = round;
  if (roundId <= 0n || answeredInRound < roundId) {
    throw new Error(`Incomplete RedStone round for ${feed.alias}`);
  }
  if (rawAnswer <= 0n) throw new Error(`Invalid non-positive RedStone price for ${feed.alias}`);

  const startedAt = requireSafeTimestamp(startedAtRaw, 'startedAt timestamp', feed.alias);
  const updatedAt = requireSafeTimestamp(updatedAtRaw, 'updatedAt timestamp', feed.alias);
  if (updatedAt < startedAt) throw new Error(`Invalid RedStone round timestamps for ${feed.alias}`);

  const price = scaleRedStoneValue(rawAnswer, decimals);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid scaled RedStone price for ${feed.alias}`);
  }

  return {
    symbol: feed.alias,
    feedName: feed.feedName,
    feedAddress: feed.address,
    price,
    decimals,
    roundId,
    answeredInRound,
    startedAt,
    updatedAt,
    timestamp: updatedAt * 1000,
    rawAnswer,
    maxAgeSeconds: feed.maxStalenessSeconds,
    priceDeviationPercent: feed.priceDeviationPercent,
  };
}

export class RedStoneMonadOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'redstone-monad' })) {
    this.rpcClient = rpcClient;
  }

  async getPrice(feed: RedStoneMonadFeed, signal?: AbortSignal): Promise<RedStoneMonadPriceData> {
    const cacheKey = `redstone-monad:${feed.address.toLowerCase()}`;
    const cached = this.cache.get<RedStoneMonadPriceData>(cacheKey);
    if (cached && this.isUsable(cached)) return cached;
    if (cached) this.cache.delete(cacheKey);

    const endpoints = [
      ...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []),
      ...REDSTONE_MONAD_RPC_ENDPOINTS,
    ];
    const [roundRaw, decimalsRaw] = await Promise.all([
      this.rpcClient.ethCall(
        String(REDSTONE_MONAD_CHAIN_ID),
        endpoints,
        feed.address,
        encodeFunctionData({ abi: REDSTONE_AGGREGATOR_V3_ABI, functionName: 'latestRoundData' }),
        signal
      ),
      this.rpcClient.ethCall(
        String(REDSTONE_MONAD_CHAIN_ID),
        endpoints,
        feed.address,
        encodeFunctionData({ abi: REDSTONE_AGGREGATOR_V3_ABI, functionName: 'decimals' }),
        signal
      ),
    ]);
    const reading = decodePrice(roundRaw, decimalsRaw, feed);
    if (!this.isUsable(reading)) {
      const age = Math.max(0, Math.floor(Date.now() / 1000) - reading.updatedAt);
      throw new Error(
        `RedStone Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${feed.maxStalenessSeconds}s)`
      );
    }

    this.cache.set(cacheKey, reading, Math.min(30_000, reading.maxAgeSeconds * 1000));
    return reading;
  }

  private isUsable(reading: RedStoneMonadPriceData): boolean {
    const age = Math.floor(Date.now() / 1000) - reading.updatedAt;
    const usable =
      Number.isFinite(reading.price) &&
      reading.price > 0 &&
      Number.isInteger(reading.decimals) &&
      reading.decimals >= 0 &&
      reading.decimals <= MAX_FEED_DECIMALS &&
      reading.roundId > 0n &&
      reading.answeredInRound >= reading.roundId &&
      reading.rawAnswer > 0n &&
      age >= -MAX_FUTURE_SKEW_SECONDS &&
      age <= reading.maxAgeSeconds;
    if (!usable) {
      logger.warn('Rejected unusable RedStone Monad value', {
        symbol: reading.symbol,
        age,
        maxAgeSeconds: reading.maxAgeSeconds,
      });
    }
    return usable;
  }
}

export const redStoneMonadOnChainService = new RedStoneMonadOnChainService();
