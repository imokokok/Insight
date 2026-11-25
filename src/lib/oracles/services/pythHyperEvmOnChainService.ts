import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { OracleCache } from '@/lib/oracles/base';
import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import {
  PYTH_HYPEREVM_CORE_ADDRESS,
  PYTH_HYPEREVM_CHAIN_ID,
  type PythHyperEvmFeed,
} from '../constants/pythHyperEvm';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

import { scalePythValue } from './pythMonadOnChainService';

const logger = createLogger('PythHyperEvmOnChainService');
const PYTH_FEED_DIRECTORY_URL = 'https://pyth.dourolabs.app/hermes/v2/price_feeds';
const MAX_FUTURE_SKEW_SECONDS = 300;
const MAX_CONFIDENCE_RATIO = 0.2;
const MAX_DIRECTORY_BYTES = 2_000_000;

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

interface PythDirectoryRow {
  id?: unknown;
  attributes?: {
    symbol?: unknown;
    display_symbol?: unknown;
  };
}

export interface PythHyperEvmPriceData {
  alias: string;
  feedId: `0x${string}`;
  rawPrice: string;
  rawConfidence: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
  timestamp: number;
  confidenceRatio: number;
  maxAgeSeconds: number;
}

function normalizeDirectorySymbol(value: string): string {
  const normalized = value.trim().toUpperCase();
  const dot = normalized.indexOf('.');
  return dot >= 0 ? normalized.slice(dot + 1) : normalized;
}

function validateDirectoryRow(value: unknown): PythDirectoryRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as PythDirectoryRow;
  if (typeof row.id !== 'string' || !/^[0-9a-f]{64}$/i.test(row.id)) return null;
  if (!row.attributes || typeof row.attributes !== 'object') return null;
  return row;
}

function requireSafeInteger(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Invalid Pyth ${label}: outside safe integer range`);
  }
  return Number(value);
}

export class PythHyperEvmOnChainService {
  private readonly rpcClient: RpcClientWithFallback;
  private readonly cache = new OracleCache();
  private directory: Map<string, `0x${string}`> | null = null;
  private directoryExpiresAt = 0;

  constructor(rpcClient = new RpcClientWithFallback({ contextLabel: 'pyth-hyperevm' })) {
    this.rpcClient = rpcClient;
  }

  private async getFeedId(feed: PythHyperEvmFeed, signal?: AbortSignal): Promise<`0x${string}`> {
    if (!this.directory || Date.now() >= this.directoryExpiresAt) {
      const discovered = new Map<string, `0x${string}`>();
      for (const query of ['KHYPE', 'USDT0']) {
        const response = await fetch(`${PYTH_FEED_DIRECTORY_URL}?query=${query}`, {
          headers: { Accept: 'application/json' },
          signal: signal ?? AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Pyth feed directory returned HTTP ${response.status}`);
        const body = await response.text();
        if (body.length > MAX_DIRECTORY_BYTES) {
          throw new Error('Pyth feed directory response is too large');
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          throw new Error('Pyth feed directory returned invalid JSON');
        }
        if (!Array.isArray(parsed)) throw new Error('Pyth feed directory response is not an array');

        for (const rawRow of parsed) {
          const row = validateDirectoryRow(rawRow);
          if (!row) continue;
          const candidates = [row.attributes?.display_symbol, row.attributes?.symbol].filter(
            (value): value is string => typeof value === 'string'
          );
          for (const candidate of candidates) {
            const alias = normalizeDirectorySymbol(candidate);
            if (!PYTH_HYPEREVM_ALIASES.has(alias)) continue;
            const id = `0x${(row.id as string).toLowerCase()}` as `0x${string}`;
            const previous = discovered.get(alias);
            if (previous && previous !== id) {
              throw new Error(`Pyth directory has ambiguous IDs for ${alias}`);
            }
            discovered.set(alias, id);
          }
        }
      }
      this.directory = discovered;
      this.directoryExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
    }

    const id = this.directory.get(feed.alias);
    if (!id) throw new Error(`Pyth official directory has no exact ${feed.alias} entry`);
    return id;
  }

  async getPrice(feed: PythHyperEvmFeed, signal?: AbortSignal): Promise<PythHyperEvmPriceData> {
    const feedId = await this.getFeedId(feed, signal);
    const cacheKey = `pyth:${PYTH_HYPEREVM_CHAIN_ID}:${feedId}`;
    const cached = this.cache.get<PythHyperEvmPriceData>(cacheKey);
    if (cached && this.isUsable(cached)) return cached;
    if (cached) this.cache.delete(cacheKey);

    const rpc = CHAINLINK_RPC_CONFIG[PYTH_HYPEREVM_CHAIN_ID];
    if (!rpc || rpc.chainId !== PYTH_HYPEREVM_CHAIN_ID || rpc.endpoints.length === 0) {
      throw new Error('No reviewed HyperEVM RPC endpoint is configured for Pyth Core');
    }
    const callData = encodeFunctionData({
      abi: PYTH_CORE_ABI,
      functionName: 'getPriceUnsafe',
      args: [feedId],
    });
    const raw = await this.rpcClient.ethCall(
      String(PYTH_HYPEREVM_CHAIN_ID),
      rpc.endpoints,
      PYTH_HYPEREVM_CORE_ADDRESS,
      callData,
      signal
    );
    const decoded = decodeFunctionResult({
      abi: PYTH_CORE_ABI,
      functionName: 'getPriceUnsafe',
      data: raw as `0x${string}`,
    });
    if (decoded.price <= 0n)
      throw new Error(`Pyth returned a non-positive price for ${feed.alias}`);
    const exponent = decoded.expo;
    const price = scalePythValue(decoded.price, exponent);
    const confidence = scalePythValue(decoded.conf, exponent);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(confidence) || confidence < 0) {
      throw new Error(`Pyth returned an invalid scaled price for ${feed.alias}`);
    }
    const publishTime = requireSafeInteger(decoded.publishTime, 'publish time');
    const confidenceRatio = confidence / price;
    if (
      publishTime <= 0 ||
      !Number.isFinite(confidenceRatio) ||
      confidenceRatio > MAX_CONFIDENCE_RATIO
    ) {
      throw new Error(`Pyth value failed timestamp or confidence validation for ${feed.alias}`);
    }
    const result: PythHyperEvmPriceData = {
      alias: feed.alias,
      feedId,
      rawPrice: decoded.price.toString(),
      rawConfidence: decoded.conf.toString(),
      price,
      confidence,
      exponent,
      publishTime,
      timestamp: publishTime * 1000,
      confidenceRatio,
      maxAgeSeconds: feed.timeDifferenceSeconds * 2,
    };
    if (!this.isUsable(result))
      throw new Error(`Pyth value is stale or future-dated for ${feed.alias}`);
    this.cache.set(cacheKey, result, Math.min(10_000, result.maxAgeSeconds * 1000));
    return result;
  }

  async getPrices(
    feeds: readonly PythHyperEvmFeed[],
    signal?: AbortSignal
  ): Promise<PythHyperEvmPriceData[]> {
    const results = await mapWithConcurrency(feeds, 2, async (feed) => {
      try {
        return await this.getPrice(feed, signal);
      } catch (error) {
        logger.warn('Pyth HyperEVM sponsored feed unavailable or unusable', {
          symbol: feed.alias,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });
    return results.filter((result): result is PythHyperEvmPriceData => result !== null);
  }

  private isUsable(price: PythHyperEvmPriceData): boolean {
    const age = Math.floor(Date.now() / 1000) - price.publishTime;
    return (
      Number.isFinite(price.price) &&
      price.price > 0 &&
      Number.isFinite(price.confidenceRatio) &&
      price.confidenceRatio <= MAX_CONFIDENCE_RATIO &&
      age >= -MAX_FUTURE_SKEW_SECONDS &&
      age <= price.maxAgeSeconds
    );
  }
}

const PYTH_HYPEREVM_ALIASES = new Set(['KHYPE/HYPE.RR', 'KHYPE/USD', 'USDT0/USD']);

export const pythHyperEvmOnChainService = new PythHyperEvmOnChainService();
