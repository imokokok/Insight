import { decodeFunctionResult, encodeFunctionData, keccak256, toHex } from 'viem';

import { OracleCache } from '@/lib/oracles/base';
import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import { STORK_OTHER_EVM_CONTRACTS, type StorkOtherEvmFeed } from '../constants/storkOtherEvm';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('StorkOtherEvmOnChainService');

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

const STORK_PRICE_DECIMALS = 18;
const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
const MAX_FUTURE_SKEW_SECONDS = 300;

export interface StorkOtherEvmPriceData {
  feed: StorkOtherEvmFeed;
  encodedAssetId: `0x${string}`;
  price: number;
  timestampNs: bigint;
  sourceTimestamp: number;
  timestamp: number;
  quantizedValue: bigint;
}

function decodePrice(raw: string, feed: StorkOtherEvmFeed): StorkOtherEvmPriceData {
  const decoded = decodeFunctionResult({
    abi: STORK_ABI,
    functionName: 'getTemporalNumericValueV1',
    data: raw as `0x${string}`,
  });
  if (decoded.quantizedValue <= 0n || decoded.timestampNs <= 0n) {
    throw new Error(`Stork returned a non-positive value or timestamp for ${feed.alias}`);
  }

  const timestampMs = decoded.timestampNs / NANOSECONDS_PER_MILLISECOND;
  if (timestampMs > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Stork timestamp is outside the safe integer range for ${feed.alias}`);
  }
  const timestamp = Number(timestampMs);
  const price = Number(`${decoded.quantizedValue.toString()}e-${STORK_PRICE_DECIMALS}`);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Stork returned an invalid scaled value for ${feed.alias}`);
  }
  const sourceTimestamp = Math.floor(timestamp / 1000);
  const age = Math.floor(Date.now() / 1000) - sourceTimestamp;
  if (age < -MAX_FUTURE_SKEW_SECONDS || age > feed.maxStalenessSeconds) {
    throw new Error(`Stork value is stale or future-dated for ${feed.alias}`);
  }

  return {
    feed,
    encodedAssetId: feed.encodedAssetId,
    price,
    timestampNs: decoded.timestampNs,
    sourceTimestamp,
    timestamp,
    quantizedValue: decoded.quantizedValue,
  };
}

export class StorkOtherEvmOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'stork-other-evm' })) {
    this.rpcClient = rpcClient;
  }

  async getPrice(feed: StorkOtherEvmFeed, signal?: AbortSignal): Promise<StorkOtherEvmPriceData> {
    const contract = STORK_OTHER_EVM_CONTRACTS[feed.chain];
    if (!contract || contract.chainId !== feed.chainId) {
      throw new Error(`Stork chain contract mismatch for ${feed.alias}`);
    }
    const expectedAssetId = keccak256(toHex(feed.assetId));
    if (expectedAssetId.toLowerCase() !== feed.encodedAssetId.toLowerCase()) {
      throw new Error(`Stork encoded asset ID mismatch for ${feed.alias}`);
    }

    const cacheKey = `stork:${feed.chainId}:${feed.encodedAssetId}`;
    const cached = this.cache.get<StorkOtherEvmPriceData>(cacheKey);
    if (cached) {
      const age = Math.floor(Date.now() / 1000) - cached.sourceTimestamp;
      if (age >= -MAX_FUTURE_SKEW_SECONDS && age <= feed.maxStalenessSeconds) return cached;
      this.cache.delete(cacheKey);
    }

    const rpc = CHAINLINK_RPC_CONFIG[feed.chainId];
    if (!rpc || rpc.chainId !== feed.chainId || rpc.endpoints.length === 0) {
      throw new Error(`No reviewed EVM RPC endpoints for Stork chain ${feed.chainId}`);
    }
    const callData = encodeFunctionData({
      abi: STORK_ABI,
      functionName: 'getTemporalNumericValueV1',
      args: [feed.encodedAssetId],
    });
    const raw = await this.rpcClient.ethCall(
      String(feed.chainId),
      rpc.endpoints,
      contract.address,
      callData,
      signal
    );
    const result = decodePrice(raw, feed);
    this.cache.set(cacheKey, result, Math.min(10_000, feed.maxStalenessSeconds * 1000));
    return result;
  }

  async getPrices(
    feeds: readonly StorkOtherEvmFeed[],
    signal?: AbortSignal
  ): Promise<StorkOtherEvmPriceData[]> {
    const results = await mapWithConcurrency(feeds, 3, async (feed) => {
      try {
        return await this.getPrice(feed, signal);
      } catch (error) {
        logger.warn('Stork EVM pushed feed unavailable or unusable', {
          chain: feed.chain,
          symbol: feed.alias,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });
    return results.filter((result): result is StorkOtherEvmPriceData => result !== null);
  }
}

export const storkOtherEvmOnChainService = new StorkOtherEvmOnChainService();
