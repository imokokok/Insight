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
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

import {
  STELLAR_RPC_URL,
  STELLAR_NETWORK_PASSPHRASE,
  REFLECTOR_DEFAULT_ACCOUNT,
  REFLECTOR_DEFAULT_DECIMALS,
  REFLECTOR_CACHE_TTL,
  REFLECTOR_CONTRACT_METHODS,
  REFLECTOR_TIMEOUT_MS,
  REFLECTOR_CRYPTO_ASSETS,
  REFLECTOR_FOREX_ASSETS,
  REFLECTOR_CRYPTO_CONTRACT,
  getReflectorContractIdAsync,
} from '../constants/reflectorConstants';
import { bigIntToPrice } from '../utils/oracleDataUtils';

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
    // Reflector queries Stellar's Soroban RPC (rpc.ankr.com) over HTTPS. Under
    // Node 22 the global fetch uses undici's EnvHttpProxyAgent, which honors
    // HTTPS_PROXY. In sandboxed/dev environments that proxy can mishandle HTTPS
    // (forwards the CONNECT tunnel as plaintext), and ankr's nginx replies
    // `400 The plain HTTP request was sent to HTTPS port`, so every Reflector
    // price lookup fails while other HTTPS providers keep working. Bypass the
    // proxy for the Stellar RPC host. This is a no-op when no proxy env vars are
    // set, so it's safe in production.
    this.ensureStellarRpcBypassesProxy();

    try {
      this.server = new rpc.Server(STELLAR_RPC_URL, {
        allowHttp: STELLAR_RPC_URL.startsWith('http://'),
        // Bound every RPC request (incl. simulateTransaction) so a degraded
        // Stellar endpoint can't hold a socket open indefinitely. Without this
        // the SDK's fetch hangs on a slow/non-responsive RPC forever; the
        // Promise.race timeout in simulateContractCall rejects the result but
        // leaves the underlying socket pending, which keeps the Node process
        // alive after runFeedSync returns and trips the GH Actions 15m job
        // limit. The SDK's `timeout` actually aborts the fetch (closes the
        // socket), matching the per-call ceiling already enforced below.
        timeout: REFLECTOR_TIMEOUT_MS,
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

  /**
   * Appends the Stellar RPC host to NO_PROXY/no_proxy so undici skips the
   * egress proxy for it. Idempotent and a no-op when no proxy is configured.
   */
  private ensureStellarRpcBypassesProxy(): void {
    try {
      const rpcHost = new URL(STELLAR_RPC_URL).host;
      const existing = process.env.NO_PROXY ?? process.env.no_proxy ?? '';
      const entries = existing
        .split(/[,\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      if (entries.includes(rpcHost) || entries.includes(`.${rpcHost}`)) return;
      entries.push(rpcHost);
      const updated = entries.join(',');
      process.env.NO_PROXY = updated;
      process.env.no_proxy = updated;
      logger.info('Stellar RPC host added to NO_PROXY (proxy bypass enabled)', { host: rpcHost });
    } catch {
      // STELLAR_RPC_URL is a constant; ignore any parse failure.
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

  private async getContractIdForSymbolAsync(symbol: string): Promise<string | null> {
    return getReflectorContractIdAsync(symbol);
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

  private buildManualScVals(assets: readonly string[]): void {
    for (const symbol of assets) {
      if (this.assetScValCache.has(symbol)) continue;
      // The Asset ScVal the contract expects is `scvVec([scvSymbol("Other"),
      // scvSymbol(<symbol>)])` — i.e. the SEP-40 `Asset::Other(<symbol>)` enum
      // variant serialized with the variant name as a *symbol* (NOT the numeric
      // discriminant `scvU32(1)`). Passing `scvU32(1)` makes `lastprice` trap
      // on-chain (WasmVm InvalidAction). This matches the exact bytes the
      // contract's own `assets()` returns, so it's a faithful fallback.
      const assetScVal = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Other'),
        nativeToScVal(symbol, { type: 'symbol' }),
      ]);
      this.assetScValCache.set(symbol, assetScVal);
    }
  }

  private async fetchAssetScVals(_signal?: AbortSignal): Promise<void> {
    if (this.assetScValCache.size > 0) return;

    // The ScVal passed to `lastprice` must be byte-identical to what the
    // contract itself returns from `assets()`. A hand-built
    // scvVec([scvU32(1), scvSymbol(sym)]) (the previous shortcut) decodes as
    // the correct Asset enum but makes `lastprice` trap on-chain
    // (WasmVm InvalidAction / UnreachableCodeReached) for EVERY symbol, so
    // every Reflector price lookup failed before any price was returned.
    // Fetch the authoritative ScVals from the contract once and cache the
    // exact xdr.ScVal objects so lastprice accepts them. Falls back to the
    // manual build only if the contract call fails or returns nothing.
    try {
      const result = await this.simulateContractCall(
        REFLECTOR_CRYPTO_CONTRACT,
        REFLECTOR_CONTRACT_METHODS.ASSETS,
        []
      );
      let loaded = 0;
      // The SEP-40 `assets()` retval is an ScVal vec. In @stellar/stellar-sdk
      // the enum switch name is `scvVec` (NOT `vec`) — comparing against `'vec'`
      // was always false, so the real assets were never loaded and we always
      // fell through to the (wrongly-encoded) manual fallback, which made
      // `lastprice` trap on-chain for every symbol. `vec()` returns the array
      // of Asset ScVals directly (no `.value` wrapper).
      if (result.switch().name === 'scvVec') {
        const assets = result.vec();
        if (assets) {
          for (const el of assets) {
            let symbol: string | undefined;
            try {
              const native = scValToNative(el) as unknown[];
              symbol = Array.isArray(native) ? String(native[1]) : undefined;
            } catch {
              symbol = undefined;
            }
            if (symbol) {
              // Store the contract's EXACT xdr.ScVal — do not rebuild it, or the
              // subtle encoding mismatch that breaks lastprice returns. Round-trip
              // through XDR so the cached value is a self-contained ScVal; `el`
              // is a child of the assets() response tree, and re-serializing a
              // nested child via contract.call() can otherwise pull in the parent
              // frame and make lastprice trap on-chain.
              const detached = xdr.ScVal.fromXDR(el.toXDR());
              this.assetScValCache.set(symbol.toUpperCase(), detached);
              loaded++;
            }
          }
        }
      }
      if (loaded === 0) {
        this.buildManualScVals(REFLECTOR_CRYPTO_ASSETS);
        this.buildManualScVals(REFLECTOR_FOREX_ASSETS);
      }
      logger.info(`Loaded ${this.assetScValCache.size} Reflector asset ScVals from contract`);
    } catch (error) {
      logger.warn(
        'Failed to load Reflector asset ScVals from contract, using manual fallback',
        error instanceof Error ? error : undefined
      );
      this.buildManualScVals(REFLECTOR_CRYPTO_ASSETS);
      this.buildManualScVals(REFLECTOR_FOREX_ASSETS);
    }
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

    if (signal?.aborted) {
      throw new Error(`Simulation call aborted for method '${method}'`);
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

    const simulationPromise = this.server.simulateTransaction(transaction);

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Simulation timed out after ${REFLECTOR_TIMEOUT_MS}ms`));
      }, REFLECTOR_TIMEOUT_MS);
      timeoutId.unref?.();
    });

    let onAbort: (() => void) | null = null;
    const abortPromise = signal
      ? new Promise<never>((_, reject) => {
          onAbort = () => reject(new Error(`Simulation call aborted for method '${method}'`));
          signal.addEventListener('abort', onAbort, { once: true });
        })
      : null;

    const racePromises: Promise<unknown>[] = [simulationPromise, timeoutPromise];
    if (abortPromise) racePromises.push(abortPromise);

    try {
      const simulationResult = (await Promise.race(
        racePromises
      )) as rpc.Api.SimulateTransactionResponse;

      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
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
    } catch (error) {
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }

      if (signal?.aborted) {
        throw new Error(`Simulation call aborted for method '${method}'`);
      }
      throw error;
    }
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
        const rawPriceBigInt =
          typeof obj.price === 'bigint' ? obj.price : BigInt(String(obj.price ?? 0));
        const timestamp =
          typeof obj.timestamp === 'bigint' ? Number(obj.timestamp) : Number(obj.timestamp || 0);

        const actualPrice = bigIntToPrice(rawPriceBigInt, decimals);

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
      const contractId = await this.getContractIdForSymbolAsync(upper);
      if (!contractId) {
        logger.warn(`No contract mapping for symbol: ${upper}`);
        return null;
      }

      const decimalsResult = await this.fetchDecimals(contractId, signal);
      const decimals = decimalsResult.decimals;
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
      let confidence = Math.min(0.99, 0.85 + freshnessScore * 0.14);

      if (decimalsResult.isFallback) {
        confidence = Math.min(confidence, 0.45);
      }

      // Fire-and-forget: resolution and version are optional metadata that
      // shouldn't block price delivery. They're cached for the process
      // lifetime but not awaited — a slow RPC here can't hold up the price
      // result. Previously these were awaited via Promise.all, adding up to
      // 15s to the critical path when the Stellar RPC was slow.
      this.fetchResolution(contractId, signal).catch(() => {});
      this.fetchVersion(contractId, signal).catch(() => {});

      const priceData: PriceData = {
        provider: OracleProvider.REFLECTOR,
        symbol: upper,
        price: parsed.price,
        timestamp: parsed.timestamp * 1000,
        decimals,
        confidence,
        source: 'reflector',
        dataSource: decimalsResult.isFallback ? 'fallback' : 'real',
        resolution: this.resolutionCache.get(contractId) ?? undefined,
        contractVersion: this.versionCache.get(contractId) ?? undefined,
        ingestionTimestamp: Date.now(),
        metadataFallback: decimalsResult.isFallback || undefined,
        failureMode: decimalsResult.isFallback ? FailureMode.FALLBACK_METADATA : FailureMode.NONE,
        signalVector: buildSignalVector({
          dataAgeSeconds: parsed.timestamp ? Math.floor(Date.now() / 1000 - parsed.timestamp) : 999,
          isOnChain: true,
          hasVerification: false,
          providerUptime: 95,
          hasConfidence: true,
          hasTimestamp: parsed.timestamp > 0,
          hasDecimals: decimals !== undefined,
          hasSource: true,
        }),
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

  async fetchDecimals(
    contractId?: string,
    signal?: AbortSignal
  ): Promise<{ decimals: number; isFallback: boolean }> {
    const resolvedContractId = contractId ?? REFLECTOR_CRYPTO_CONTRACT;
    const cacheKey = `metadata:decimals:${resolvedContractId}`;
    const cached = this.decimalsCache.get(resolvedContractId);
    if (cached !== undefined) return { decimals: cached, isFallback: false };

    const cachedEntry = this.getFromCache<number>(cacheKey);
    if (cachedEntry !== null) {
      this.decimalsCache.set(resolvedContractId, cachedEntry);
      return { decimals: cachedEntry, isFallback: false };
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
      return { decimals, isFallback: false };
    } catch (_error) {
      logger.warn('Failed to fetch decimals, using default', {
        default: REFLECTOR_DEFAULT_DECIMALS,
        contractId: resolvedContractId,
      });
      return { decimals: REFLECTOR_DEFAULT_DECIMALS, isFallback: true };
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

export function getReflectorDataService(): ReflectorDataService {
  return ReflectorDataService.getInstance();
}
