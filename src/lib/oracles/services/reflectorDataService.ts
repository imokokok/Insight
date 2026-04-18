import {
  Account,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';

import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';
import { OracleProvider } from '@/types/oracle';

import {
  STELLAR_RPC_URL,
  STELLAR_NETWORK_PASSPHRASE,
  REFLECTOR_DEFAULT_ACCOUNT,
  REFLECTOR_DEFAULT_DECIMALS,
  REFLECTOR_CACHE_TTL,
  REFLECTOR_CONTRACT_METHODS,
  REFLECTOR_TIMEOUT_MS,
  REFLECTOR_ASSET_CONTRACT_MAP,
  REFLECTOR_CRYPTO_ASSETS,
} from '../constants/reflectorConstants';

const logger = createLogger('ReflectorDataService');

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class ReflectorDataService {
  private server: rpc.Server | null = null;

  private cache = new Map<string, CacheEntry<unknown>>();

  private decimalsCache: number | null = null;

  private resolutionCache: number | null = null;

  private versionCache: number | null = null;

  private assetsCache: string[] | null = null;

  private assetScValCache: Map<string, xdr.ScVal> = new Map();

  private lastTimestampCache: number | null = null;

  private static instance: ReflectorDataService | null = null;

  private constructor() {
    this.initServer();
  }

  static getInstance(): ReflectorDataService {
    if (!ReflectorDataService.instance) {
      ReflectorDataService.instance = new ReflectorDataService();
    }
    return ReflectorDataService.instance;
  }

  private initServer(): void {
    try {
      this.server = new rpc.Server(STELLAR_RPC_URL, {
        allowHttp: STELLAR_RPC_URL.startsWith('http://'),
      });
      logger.info('Reflector Soroban RPC server initialized', { url: STELLAR_RPC_URL });
    } catch (error) {
      logger.error(
        'Failed to initialize Soroban RPC server',
        error instanceof Error ? error : new Error(String(error))
      );
      this.server = null;
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  private async ensureAssetScVal(symbol: string, signal?: AbortSignal): Promise<xdr.ScVal> {
    const upper = symbol.toUpperCase();
    const cached = this.assetScValCache.get(upper);
    if (cached) return cached;

    await this.fetchAssetScVals(signal);
    const scVal = this.assetScValCache.get(upper);
    if (!scVal) {
      throw new Error(`Asset ${upper} not found in Reflector contract`);
    }
    return scVal;
  }

  private async fetchAssetScVals(signal?: AbortSignal): Promise<void> {
    if (this.assetScValCache.size > 0) return;

    const contractId = REFLECTOR_ASSET_CONTRACT_MAP['BTC'];
    if (!contractId) return;

    try {
      const result = await this.simulateContractCall(
        contractId,
        REFLECTOR_CONTRACT_METHODS.ASSETS,
        [],
        signal
      );

      const vecItems = result.vec();
      if (!vecItems) return;

      for (const assetScVal of vecItems) {
        const nativeAsset = scValToNative(assetScVal);
        if (Array.isArray(nativeAsset) && nativeAsset.length === 2) {
          const variantName = nativeAsset[0];
          const symbolName = nativeAsset[1];
          if (variantName === 'Other' && typeof symbolName === 'string') {
            this.assetScValCache.set(symbolName.toUpperCase(), assetScVal);
          }
        }
      }

      logger.info(`Cached ${this.assetScValCache.size} asset ScVals from Reflector contract`);
    } catch (error) {
      logger.warn(
        'Failed to fetch asset ScVals, building manually',
        error instanceof Error ? error : new Error(String(error))
      );
      for (const symbol of REFLECTOR_CRYPTO_ASSETS) {
        const symbolScVal = nativeToScVal(symbol, { type: 'symbol' });
        const assetScVal = xdr.ScVal.scvVec([xdr.ScVal.scvU32(1), symbolScVal]);
        this.assetScValCache.set(symbol, assetScVal);
      }
    }
  }

  private async simulateContractCall(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
    _signal?: AbortSignal
  ): Promise<xdr.ScVal> {
    if (!this.server) {
      throw new Error('Soroban RPC server not initialized');
    }

    const sourceAccount = new Account(REFLECTOR_DEFAULT_ACCOUNT, '0');
    const contract = new Contract(contractId);
    const call = contract.call(method, ...args);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(call)
      .setTimeout(REFLECTOR_TIMEOUT_MS)
      .build();

    const simulationResult = await this.server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulationResult)) {
      throw new Error(`Simulation error: ${simulationResult.error}`);
    }

    if (rpc.Api.isSimulationRestore(simulationResult)) {
      throw new Error('Simulation requires restore, which is not supported for read-only calls');
    }

    const results = simulationResult.result?.retval;
    if (!results) {
      throw new Error('No result returned from simulation');
    }

    return results;
  }

  private parsePriceData(
    scVal: xdr.ScVal,
    decimals: number
  ): { price: number; timestamp: number } | null {
    try {
      if (scVal.switch() === xdr.ScValType.scvVoid()) {
        return null;
      }

      const parsed = scValToNative(scVal);

      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const rawPrice = typeof obj.price === 'bigint' ? Number(obj.price) : Number(obj.price || 0);
        const timestamp =
          typeof obj.timestamp === 'bigint' ? Number(obj.timestamp) : Number(obj.timestamp || 0);

        const actualPrice = rawPrice / Math.pow(10, decimals);

        return { price: actualPrice, timestamp };
      }

      return null;
    } catch (error) {
      logger.error(
        'Failed to parse PriceData XDR',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  async fetchLatestPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) return cached;

    try {
      const contractId = REFLECTOR_ASSET_CONTRACT_MAP[symbol.toUpperCase()];
      if (!contractId) {
        logger.warn(`No contract mapping for symbol: ${symbol}`);
        return null;
      }

      const decimals = await this.fetchDecimals(signal);
      const assetArg = await this.ensureAssetScVal(symbol.toUpperCase(), signal);
      const result = await this.simulateContractCall(
        contractId,
        REFLECTOR_CONTRACT_METHODS.LAST_PRICE,
        [assetArg],
        signal
      );

      const parsed = this.parsePriceData(result, decimals);
      if (!parsed) {
        logger.warn(`No price data returned for ${symbol}`);
        return null;
      }

      const dataAge = Date.now() - parsed.timestamp * 1000;
      const freshnessScore = Math.max(0, 1 - dataAge / (5 * 60 * 1000));
      const confidence = Math.min(0.99, 0.85 + freshnessScore * 0.14);

      const resolution = await this.fetchResolution(signal).catch(() => null);
      const version = await this.fetchVersion(signal).catch(() => null);

      const priceData: PriceData = {
        provider: OracleProvider.REFLECTOR,
        symbol: symbol.toUpperCase(),
        price: parsed.price,
        timestamp: parsed.timestamp * 1000,
        decimals,
        confidence,
        source: 'reflector',
        dataSource: 'real',
        resolution: resolution ?? undefined,
        contractVersion: version ?? undefined,
      };

      this.setCache(cacheKey, priceData, REFLECTOR_CACHE_TTL.PRICE);
      return priceData;
    } catch (error) {
      logger.error(
        `Failed to fetch latest price for ${symbol}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async fetchDecimals(signal?: AbortSignal): Promise<number> {
    if (this.decimalsCache !== null) return this.decimalsCache;

    const cacheKey = 'metadata:decimals';
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      this.decimalsCache = cached;
      return cached;
    }

    try {
      const result = await this.simulateContractCall(
        REFLECTOR_ASSET_CONTRACT_MAP['BTC'],
        REFLECTOR_CONTRACT_METHODS.DECIMALS,
        [],
        signal
      );

      const decimals = Number(scValToNative(result));
      this.decimalsCache = decimals;
      this.setCache(cacheKey, decimals, REFLECTOR_CACHE_TTL.METADATA);
      return decimals;
    } catch (_error) {
      logger.warn('Failed to fetch decimals, using default', {
        default: REFLECTOR_DEFAULT_DECIMALS,
      });
      return REFLECTOR_DEFAULT_DECIMALS;
    }
  }

  async fetchResolution(signal?: AbortSignal): Promise<number> {
    if (this.resolutionCache !== null) return this.resolutionCache;

    const cacheKey = 'metadata:resolution';
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      this.resolutionCache = cached;
      return cached;
    }

    try {
      const result = await this.simulateContractCall(
        REFLECTOR_ASSET_CONTRACT_MAP['BTC'],
        REFLECTOR_CONTRACT_METHODS.RESOLUTION,
        [],
        signal
      );

      const resolution = Number(scValToNative(result));
      this.resolutionCache = resolution;
      this.setCache(cacheKey, resolution, REFLECTOR_CACHE_TTL.METADATA);
      return resolution;
    } catch (error) {
      logger.warn(
        'Failed to fetch resolution',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async fetchVersion(signal?: AbortSignal): Promise<number> {
    if (this.versionCache !== null) return this.versionCache;

    const cacheKey = 'metadata:version';
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      this.versionCache = cached;
      return cached;
    }

    try {
      const result = await this.simulateContractCall(
        REFLECTOR_ASSET_CONTRACT_MAP['BTC'],
        REFLECTOR_CONTRACT_METHODS.VERSION,
        [],
        signal
      );

      const version = Number(scValToNative(result));
      this.versionCache = version;
      this.setCache(cacheKey, version, REFLECTOR_CACHE_TTL.METADATA);
      return version;
    } catch (error) {
      logger.warn(
        'Failed to fetch version',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async fetchAssets(signal?: AbortSignal): Promise<string[]> {
    if (this.assetsCache !== null) return this.assetsCache;

    const cacheKey = 'metadata:assets';
    const cached = this.getFromCache<string[]>(cacheKey);
    if (cached !== null) {
      this.assetsCache = cached;
      return cached;
    }

    try {
      await this.fetchAssetScVals(signal);
      const assets = Array.from(this.assetScValCache.keys());
      this.assetsCache = assets;
      this.setCache(cacheKey, assets, REFLECTOR_CACHE_TTL.ASSETS);
      return assets;
    } catch (error) {
      logger.warn(
        'Failed to fetch assets, using default list',
        error instanceof Error ? error : new Error(String(error))
      );
      return [...REFLECTOR_CRYPTO_ASSETS];
    }
  }

  async fetchLastTimestamp(signal?: AbortSignal): Promise<number> {
    if (this.lastTimestampCache !== null) return this.lastTimestampCache;

    const cacheKey = 'metadata:lastTimestamp';
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      this.lastTimestampCache = cached;
      return cached;
    }

    try {
      const result = await this.simulateContractCall(
        REFLECTOR_ASSET_CONTRACT_MAP['BTC'],
        REFLECTOR_CONTRACT_METHODS.LAST_TIMESTAMP,
        [],
        signal
      );

      const ts = Number(scValToNative(result));
      this.lastTimestampCache = ts;
      this.setCache(cacheKey, ts, REFLECTOR_CACHE_TTL.PRICE);
      return ts;
    } catch (error) {
      logger.warn(
        'Failed to fetch last timestamp',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async fetchOnChainMetadata(signal?: AbortSignal): Promise<ReflectorOnChainMetadata> {
    const [decimals, resolution, version, assets, lastTimestamp] = await Promise.allSettled([
      this.fetchDecimals(signal),
      this.fetchResolution(signal),
      this.fetchVersion(signal),
      this.fetchAssets(signal),
      this.fetchLastTimestamp(signal),
    ]);

    return {
      decimals: decimals.status === 'fulfilled' ? decimals.value : REFLECTOR_DEFAULT_DECIMALS,
      resolution: resolution.status === 'fulfilled' ? resolution.value : 300,
      version: version.status === 'fulfilled' ? version.value : 0,
      assets: assets.status === 'fulfilled' ? assets.value : [...REFLECTOR_CRYPTO_ASSETS],
      lastTimestamp: lastTimestamp.status === 'fulfilled' ? lastTimestamp.value : 0,
      nodeCount: 7,
      threshold: 4,
      baseAsset: 'USD',
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.decimalsCache = null;
    this.resolutionCache = null;
    this.versionCache = null;
    this.assetsCache = null;
    this.assetScValCache.clear();
    this.lastTimestampCache = null;
  }
}

export interface ReflectorOnChainMetadata {
  decimals: number;
  resolution: number;
  version: number;
  assets: string[];
  lastTimestamp: number;
  nodeCount: number;
  threshold: number;
  baseAsset: string;
}

export function getReflectorDataService(): ReflectorDataService {
  return ReflectorDataService.getInstance();
}

export { ReflectorDataService };
