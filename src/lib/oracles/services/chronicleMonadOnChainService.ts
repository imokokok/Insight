import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  CHRONICLE_MONAD_CHAIN_ID,
  CHRONICLE_MONAD_RPC_ENDPOINTS,
  type ChronicleMonadFeed,
} from '@/lib/oracles/constants/chronicleMonad';
import { createLogger } from '@/lib/utils/logger';

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
    const reading = decodePrice(raw, feed);
    if (!this.isUsable(reading)) {
      const age = Math.max(0, Math.floor(Date.now() / 1000) - reading.sourceTimestamp);
      throw new Error(
        `Chronicle Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${feed.maxStalenessSeconds}s)`
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
