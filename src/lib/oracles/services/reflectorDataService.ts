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
  REFLECTOR_FOREX_ASSETS,
  REFLECTOR_CRYPTO_CONTRACT,
  REFLECTOR_FOREX_CONTRACT,
} from '../constants/reflectorConstants';

const logger = createLogger('ReflectorDataService');

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class ReflectorDataService {
  private server: rpc.Server | null = null;

  private cache = new Map<string, CacheEntry<unknown>>();

  private decimalsCache = new Map<string, number>();

  private resolutionCache = new Map<string, number>();

  private versionCache = new Map<string, number>();

  private assetsCache: string[] | null = null;

  private assetScValCache: Map<string, xdr.ScVal> = new Map();

  private lastTimestampCache = new Map<string, number>();

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

  private getContractIdForSymbol(symbol: string): string | null {
    return REFLECTOR_ASSET_CONTRACT_MAP[symbol.toUpperCase()] ?? null;
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

  private async fetchAssetScValsForContract(
    contractId: string,
    signal?: AbortSignal
  ): Promise<void> {
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
    } catch (error) {
      logger.warn(
        `Failed to fetch asset ScVals from contract ${contractId}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  private buildManualScVals(assets: readonly string[]): void {
    for (const symbol of assets) {
      if (this.assetScValCache.has(symbol)) continue;
      const symbolScVal = nativeToScVal(symbol, { type: 'symbol' });
      const assetScVal = xdr.ScVal.scvVec([xdr.ScVal.scvU32(1), symbolScVal]);
      this.assetScValCache.set(symbol, assetScVal);
    }
  }

  private async fetchAssetScVals(signal?: AbortSignal): Promise<void> {
    if (this.assetScValCache.size > 0) return;

    const results = await Promise.allSettled([
      REFLECTOR_CRYPTO_CONTRACT
        ? this.fetchAssetScValsForContract(REFLECTOR_CRYPTO_CONTRACT, signal)
        : Promise.resolve(),
      REFLECTOR_FOREX_CONTRACT
        ? this.fetchAssetScValsForContract(REFLECTOR_FOREX_CONTRACT, signal)
        : Promise.resolve(),
    ]);

    if (results[0].status === 'rejected') {
      logger.warn('Falling back to manual ScVal building for crypto assets');
      this.buildManualScVals(REFLECTOR_CRYPTO_ASSETS);
    }
    if (results[1].status === 'rejected') {
      logger.warn('Falling back to manual ScVal building for forex assets');
      this.buildManualScVals(REFLECTOR_FOREX_ASSETS);
    }

    logger.info(`Cached ${this.assetScValCache.size} asset ScVals from Reflector contracts`);
  }

  private async simulateContractCall(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
    signal?: AbortSignal
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFLECTOR_TIMEOUT_MS);

    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    let simulationResult: rpc.Api.SimulateTransactionResponse;
    try {
      simulationResult = await this.server.simulateTransaction(transaction);
    } catch (error) {
      if (combinedSignal.aborted) {
        throw new Error(`Simulation call aborted or timed out for method '${method}'`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

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
    const upper = symbol.toUpperCase();
    const cacheKey = `price:${upper}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) return cached;

    try {
      const contractId = this.getContractIdForSymbol(upper);
      if (!contractId) {
        logger.warn(`No contract mapping for symbol: ${upper}`);
        return null;
      }

      const decimals = await this.fetchDecimals(contractId, signal);
      const assetArg = await this.ensureAssetScVal(upper, signal);
      const result = await this.simulateContractCall(
        contractId,
        REFLECTOR_CONTRACT_METHODS.LAST_PRICE,
        [assetArg],
        signal
      );

      const parsed = this.parsePriceData(result, decimals);
      if (!parsed) {
        logger.warn(`No price data returned for ${upper}`);
        return null;
      }

      const dataAge = Date.now() - parsed.timestamp * 1000;
      const freshnessScore = Math.max(0, 1 - dataAge / (5 * 60 * 1000));
      const confidence = Math.min(0.99, 0.85 + freshnessScore * 0.14);

      const [resolution, version] = await Promise.all([
        this.fetchResolution(contractId, signal).catch(() => null),
        this.fetchVersion(contractId, signal).catch(() => null),
      ]);

      const priceData: PriceData = {
        provider: OracleProvider.REFLECTOR,
        symbol: upper,
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
        `Failed to fetch latest price for ${upper}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async fetchDecimals(contractId?: string, signal?: AbortSignal): Promise<number> {
    const resolvedContractId = contractId ?? REFLECTOR_CRYPTO_CONTRACT;
    const cacheKey = `metadata:decimals:${resolvedContractId}`;
    const cached = this.decimalsCache.get(resolvedContractId);
    if (cached !== undefined) return cached;

    const cachedEntry = this.getFromCache<number>(cacheKey);
    if (cachedEntry !== null) {
      this.decimalsCache.set(resolvedContractId, cachedEntry);
      return cachedEntry;
    }

    try {
      const result = await this.simulateContractCall(
        resolvedContractId,
        REFLECTOR_CONTRACT_METHODS.DECIMALS,
        [],
        signal
      );

      const decimals = Number(scValToNative(result));
      this.decimalsCache.set(resolvedContractId, decimals);
      this.setCache(cacheKey, decimals, REFLECTOR_CACHE_TTL.METADATA);
      return decimals;
    } catch (_error) {
      logger.warn('Failed to fetch decimals, using default', {
        default: REFLECTOR_DEFAULT_DECIMALS,
        contractId: resolvedContractId,
      });
      return REFLECTOR_DEFAULT_DECIMALS;
    }
  }

  async fetchResolution(contractId?: string, signal?: AbortSignal): Promise<number> {
    const resolvedContractId = contractId ?? REFLECTOR_CRYPTO_CONTRACT;
    const cacheKey = `metadata:resolution:${resolvedContractId}`;
    const cached = this.resolutionCache.get(resolvedContractId);
    if (cached !== undefined) return cached;

    const cachedEntry = this.getFromCache<number>(cacheKey);
    if (cachedEntry !== null) {
      this.resolutionCache.set(resolvedContractId, cachedEntry);
      return cachedEntry;
    }

    try {
      const result = await this.simulateContractCall(
        resolvedContractId,
        REFLECTOR_CONTRACT_METHODS.RESOLUTION,
        [],
        signal
      );

      const resolution = Number(scValToNative(result));
      this.resolutionCache.set(resolvedContractId, resolution);
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

  async fetchVersion(contractId?: string, signal?: AbortSignal): Promise<number> {
    const resolvedContractId = contractId ?? REFLECTOR_CRYPTO_CONTRACT;
    const cacheKey = `metadata:version:${resolvedContractId}`;
    const cached = this.versionCache.get(resolvedContractId);
    if (cached !== undefined) return cached;

    const cachedEntry = this.getFromCache<number>(cacheKey);
    if (cachedEntry !== null) {
      this.versionCache.set(resolvedContractId, cachedEntry);
      return cachedEntry;
    }

    try {
      const result = await this.simulateContractCall(
        resolvedContractId,
        REFLECTOR_CONTRACT_METHODS.VERSION,
        [],
        signal
      );

      const version = Number(scValToNative(result));
      this.versionCache.set(resolvedContractId, version);
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
      return [...REFLECTOR_CRYPTO_ASSETS, ...REFLECTOR_FOREX_ASSETS];
    }
  }

  async fetchLastTimestamp(contractId?: string, signal?: AbortSignal): Promise<number> {
    const resolvedContractId = contractId ?? REFLECTOR_CRYPTO_CONTRACT;
    const cacheKey = `metadata:lastTimestamp:${resolvedContractId}`;
    const cached = this.lastTimestampCache.get(resolvedContractId);
    if (cached !== undefined) return cached;

    const cachedEntry = this.getFromCache<number>(cacheKey);
    if (cachedEntry !== null) {
      this.lastTimestampCache.set(resolvedContractId, cachedEntry);
      return cachedEntry;
    }

    try {
      const result = await this.simulateContractCall(
        resolvedContractId,
        REFLECTOR_CONTRACT_METHODS.LAST_TIMESTAMP,
        [],
        signal
      );

      const ts = Number(scValToNative(result));
      this.lastTimestampCache.set(resolvedContractId, ts);
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

  async fetchOnChainMetadata(
    contractId?: string,
    signal?: AbortSignal
  ): Promise<ReflectorOnChainMetadata> {
    const resolvedContractId = contractId ?? REFLECTOR_CRYPTO_CONTRACT;
    const [decimals, resolution, version, assets, lastTimestamp] = await Promise.allSettled([
      this.fetchDecimals(resolvedContractId, signal),
      this.fetchResolution(resolvedContractId, signal),
      this.fetchVersion(resolvedContractId, signal),
      this.fetchAssets(signal),
      this.fetchLastTimestamp(resolvedContractId, signal),
    ]);

    return {
      decimals: decimals.status === 'fulfilled' ? decimals.value : REFLECTOR_DEFAULT_DECIMALS,
      resolution: resolution.status === 'fulfilled' ? resolution.value : 300,
      version: version.status === 'fulfilled' ? version.value : 0,
      assets:
        assets.status === 'fulfilled'
          ? assets.value
          : [...REFLECTOR_CRYPTO_ASSETS, ...REFLECTOR_FOREX_ASSETS],
      lastTimestamp: lastTimestamp.status === 'fulfilled' ? lastTimestamp.value : 0,
      nodeCount: 7,
      threshold: 4,
      baseAsset: 'USD',
    };
  }

  static resetInstance(): void {
    if (ReflectorDataService.instance) {
      ReflectorDataService.instance.clearCache();
      ReflectorDataService.instance = null;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.decimalsCache.clear();
    this.resolutionCache.clear();
    this.versionCache.clear();
    this.assetsCache = null;
    this.assetScValCache.clear();
    this.lastTimestampCache.clear();
  }
}

interface ReflectorOnChainMetadata {
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

function resetReflectorDataService(): void {
  ReflectorDataService.resetInstance();
}
