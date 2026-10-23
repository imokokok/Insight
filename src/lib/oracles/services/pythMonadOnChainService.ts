import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  PYTH_MONAD_CHAIN_ID,
  PYTH_MONAD_CORE_ADDRESS,
  PYTH_MONAD_RPC_ENDPOINTS,
  type PythMonadFeed,
} from '@/lib/oracles/constants/pythMonad';
import { createLogger } from '@/lib/utils/logger';

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
    const price = decodePythPrice(raw, feed);
    if (!this.isUsable(price)) {
      const age = Math.max(0, Math.floor(Date.now() / 1000) - price.publishTime);
      throw new Error(
        `Pyth Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${price.maxAgeSeconds}s)`
      );
    }

    // The contract call is a snapshot. A very short cache prevents redundant
    // reads without allowing an old value to outlive the freshness policy.
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
