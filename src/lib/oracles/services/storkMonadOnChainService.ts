import { decodeFunctionResult, encodeFunctionData, keccak256, toHex } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { OracleCache } from '@/lib/oracles/base';
import {
  STORK_MONAD_CHAIN_ID,
  STORK_MONAD_CONTRACT_ADDRESS,
  STORK_MONAD_RPC_ENDPOINTS,
  type StorkMonadFeed,
} from '@/lib/oracles/constants/storkMonad';
import { createLogger } from '@/lib/utils/logger';

import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('StorkMonadOnChainService');

const STORK_ABI = [
  {
    type: 'function',
    name: 'getTemporalNumericValueV1',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        name: 'value',
        type: 'tuple',
        components: [
          { name: 'timestampNs', type: 'uint64' },
          { name: 'quantizedValue', type: 'int192' },
        ],
      },
    ],
  },
] as const;

/** Stork's fixed TemporalNumericValue scale: quantized value × 10^-18. */
const STORK_PRICE_DECIMALS = 18;
const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;

export interface StorkMonadPriceData {
  symbol: string;
  assetId: string;
  encodedAssetId: `0x${string}`;
  price: number;
  timestampNs: bigint;
  sourceTimestamp: number;
  timestamp: number;
  quantizedValue: bigint;
  maxAgeSeconds: number;
  priceDeviationPercent: number;
}

function toSafeTimestampMs(timestampNs: bigint, symbol: string): number {
  if (timestampNs <= 0n) throw new Error(`Missing Stork timestamp for ${symbol}`);
  const timestampMs = timestampNs / NANOSECONDS_PER_MILLISECOND;
  if (timestampMs > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Stork timestamp is outside the safe integer range for ${symbol}`);
  }
  return Number(timestampMs);
}

/** Convert Stork's signed 18-decimal fixed-point integer without widening the raw value first. */
export function scaleStorkValue(value: bigint): number {
  const price = Number(`${value.toString()}e-${STORK_PRICE_DECIMALS}`);
  if (!Number.isFinite(price)) throw new Error('Stork scaled value is not finite');
  return price;
}

function decodeStorkPrice(raw: string, feed: StorkMonadFeed): StorkMonadPriceData {
  let decoded: { timestampNs: bigint; quantizedValue: bigint };
  try {
    decoded = decodeFunctionResult({
      abi: STORK_ABI,
      functionName: 'getTemporalNumericValueV1',
      data: raw as `0x${string}`,
    });
  } catch (error) {
    throw new Error(
      `Malformed Stork Monad response for ${feed.alias}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (decoded.quantizedValue <= 0n) {
    throw new Error(`Invalid non-positive Stork price for ${feed.alias}`);
  }

  const timestamp = toSafeTimestampMs(decoded.timestampNs, feed.alias);
  const price = scaleStorkValue(decoded.quantizedValue);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid scaled Stork price for ${feed.alias}`);
  }

  return {
    symbol: feed.alias,
    assetId: feed.assetId,
    encodedAssetId: feed.encodedAssetId,
    price,
    timestampNs: decoded.timestampNs,
    sourceTimestamp: Math.floor(timestamp / 1000),
    timestamp,
    quantizedValue: decoded.quantizedValue,
    maxAgeSeconds: feed.maxStalenessSeconds,
    priceDeviationPercent: feed.priceDeviationPercent,
  };
}

export class StorkMonadOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'stork-monad' })) {
    this.rpcClient = rpcClient;
  }

  async getPrice(feed: StorkMonadFeed, signal?: AbortSignal): Promise<StorkMonadPriceData> {
    const cacheKey = `stork-monad:${feed.encodedAssetId}`;
    const cached = this.cache.get<StorkMonadPriceData>(cacheKey);
    if (cached && this.isUsable(cached)) return cached;
    if (cached) this.cache.delete(cacheKey);

    // This independently protects the checked-in plaintext asset id from an
    // accidental mismatch with the bytes32 sent to the contract.
    const derivedAssetId = keccak256(toHex(feed.assetId));
    if (derivedAssetId.toLowerCase() !== feed.encodedAssetId.toLowerCase()) {
      throw new Error(`Stork encoded asset id mismatch for ${feed.alias}`);
    }

    const data = encodeFunctionData({
      abi: STORK_ABI,
      functionName: 'getTemporalNumericValueV1',
      args: [feed.encodedAssetId],
    });
    const raw = await this.rpcClient.ethCall(
      String(STORK_MONAD_CHAIN_ID),
      [...(ALCHEMY_RPC.monad ? [ALCHEMY_RPC.monad] : []), ...STORK_MONAD_RPC_ENDPOINTS],
      STORK_MONAD_CONTRACT_ADDRESS,
      data,
      signal
    );
    const price = decodeStorkPrice(raw, feed);
    if (!this.isUsable(price)) {
      const age = Math.max(0, Math.floor(Date.now() / 1000) - price.sourceTimestamp);
      throw new Error(
        `Stork Monad price is stale or future-dated for ${feed.alias} (age ${age}s, maximum ${feed.maxStalenessSeconds}s)`
      );
    }

    // A contract safe-read already rejects values outside the contract's own
    // valid window. Keep a short cache so a value cannot outlive Insight's
    // independently enforced per-feed policy.
    this.cache.set(cacheKey, price, Math.min(30_000, price.maxAgeSeconds * 1000));
    return price;
  }

  private isUsable(price: StorkMonadPriceData): boolean {
    const age = Math.floor(Date.now() / 1000) - price.sourceTimestamp;
    const usable =
      Number.isFinite(price.price) &&
      price.price > 0 &&
      price.timestampNs > 0n &&
      age >= -MAX_FUTURE_SKEW_SECONDS &&
      age <= price.maxAgeSeconds;
    if (!usable) {
      logger.warn('Rejected unusable Stork Monad value', {
        symbol: price.symbol,
        age,
        maxAgeSeconds: price.maxAgeSeconds,
      });
    }
    return usable;
  }
}

export const storkMonadOnChainService = new StorkMonadOnChainService();
