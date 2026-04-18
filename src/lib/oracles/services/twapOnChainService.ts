import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import {
  TWAP_POOL_ADDRESSES,
  TWAP_RPC_CONFIG,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_FACTORY_ABI,
  UNISWAP_V3_FACTORY,
  TWAP_FEE_TIERS as _TWAP_FEE_TIERS,
  TWAP_INTERVALS,
  TWAP_TOKEN_ADDRESSES,
  BLOCKCHAIN_TO_CHAIN_ID as _BLOCKCHAIN_TO_CHAIN_ID,
  type TwapPoolConfig,
} from '../constants/twapConstants';

const logger = createLogger('TwapOnChainService');

interface TwapPriceData {
  symbol: string;
  twapPrice: number;
  spotPrice: number;
  tick: number;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  timestamp: number;
  chainId: number;
  poolAddress: string;
  feeTier: number;
  twapInterval: number;
  confidence: number;
}

interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
  feeTier: number;
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tick: number;
}

interface RPCResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

class TwapOnChainService {
  private requestId = 0;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 30000;
  private readonly MAX_CACHE_SIZE = 500;
  private endpointHealth: Record<string, boolean> = {};
  private currentEndpointIndex: Record<number, number> = {};
  private requestTimeout = 10000;
  private endpointFailureTime: Record<string, number> = {};
  private endpointRecoveryTime = 60000;
  private ethUsdPrice = 0;
  private ethUsdPriceTimestamp = 0;
  private readonly ETH_USD_CACHE_TTL = 60000;
  private bnbUsdPrice = 0;
  private bnbUsdPriceTimestamp = 0;
  private readonly BNB_USD_CACHE_TTL = 60000;
  private btcUsdPrice = 0;
  private btcUsdPriceTimestamp = 0;
  private readonly BTC_USD_CACHE_TTL = 60000;
  private inFlightRequests: Map<string, Promise<unknown>> = new Map();

  private isEndpointHealthy(chainId: number, index: number): boolean {
    const key = `${chainId}-${index}`;
    const health = this.endpointHealth[key];

    if (health === false) {
      const lastFail = this.endpointFailureTime[key];
      if (lastFail && Date.now() - lastFail > this.endpointRecoveryTime) {
        this.endpointHealth[key] = true;
        delete this.endpointFailureTime[key];
        logger.debug(`Endpoint ${key} recovered`, { chainId, index });
        return true;
      }
      return false;
    }
    return true;
  }

  private async rpcCallWithFallback<T>(
    chainId: number,
    method: string,
    params: unknown[],
    signal?: AbortSignal
  ): Promise<T> {
    const config = TWAP_RPC_CONFIG[chainId];
    if (!config) {
      throw new Error(`No RPC config for chain ${chainId}`);
    }

    const endpoints = config.endpoints;
    if (!endpoints || endpoints.length === 0) {
      throw new Error(`No RPC endpoints for chain ${chainId}`);
    }

    if (signal?.aborted) {
      throw new Error(`Request aborted for chain ${chainId}`);
    }

    const startIndex = this.currentEndpointIndex[chainId] || 0;
    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i++) {
      if (signal?.aborted) {
        throw new Error(`Request aborted for chain ${chainId}`);
      }

      const endpointIndex = (startIndex + i) % endpoints.length;
      const endpoint = endpoints[endpointIndex];

      if (!this.isEndpointHealthy(chainId, endpointIndex)) {
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const onExternalAbort = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++this.requestId,
            method,
            params,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onExternalAbort);
        }

        if (!response.ok) {
          throw new Error(`RPC call failed: ${response.status}`);
        }

        const result: RPCResponse<T> = await response.json();

        if (result.error) {
          throw new Error(`RPC error: ${result.error.message}`);
        }

        this.currentEndpointIndex[chainId] = endpointIndex;
        this.endpointHealth[`${chainId}-${endpointIndex}`] = true;
        delete this.endpointFailureTime[`${chainId}-${endpointIndex}`];

        return result.result as T;
      } catch (error) {
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onExternalAbort);
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        const key = `${chainId}-${endpointIndex}`;
        this.endpointHealth[key] = false;
        this.endpointFailureTime[key] = Date.now();

        if (error instanceof Error && (error.name === 'AbortError' || signal?.aborted)) {
          if (signal?.aborted) {
            throw new Error(`Request aborted for chain ${chainId}`);
          }
          logger.warn(`RPC endpoint ${endpoint} timed out after ${this.requestTimeout}ms`, {
            chainId,
            endpoint,
            method,
          });
        } else {
          logger.warn(`RPC endpoint ${endpoint} failed, trying next`, {
            chainId,
            endpoint,
            error: lastError.message,
          });
        }
      }
    }

    throw lastError || new Error(`All RPC endpoints failed for chain ${chainId}`);
  }

  private async ethCall(
    chainId: number,
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    const result = await this.rpcCallWithFallback<string>(
      chainId,
      'eth_call',
      [{ to, data }, 'latest'],
      signal
    );

    if (!result || result === '0x') {
      throw new Error('Contract call returned empty data');
    }

    if (result.startsWith('0x08c379a0')) {
      throw new Error(`Contract revert: ${result}`);
    }

    return result;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private encodeSlot0Call(): `0x${string}` {
    return viemEncodeFunctionData({ abi: UNISWAP_V3_POOL_ABI, functionName: 'slot0' });
  }

  private encodeObserveCall(secondsAgos: number[]): `0x${string}` {
    return viemEncodeFunctionData({
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'observe',
      args: [secondsAgos],
    });
  }

  private encodeLiquidityCall(): `0x${string}` {
    return viemEncodeFunctionData({ abi: UNISWAP_V3_POOL_ABI, functionName: 'liquidity' });
  }

  private encodeFeeCall(): `0x${string}` {
    return viemEncodeFunctionData({ abi: UNISWAP_V3_POOL_ABI, functionName: 'fee' });
  }

  private encodeToken0Call(): `0x${string}` {
    return viemEncodeFunctionData({ abi: UNISWAP_V3_POOL_ABI, functionName: 'token0' });
  }

  private encodeToken1Call(): `0x${string}` {
    return viemEncodeFunctionData({ abi: UNISWAP_V3_POOL_ABI, functionName: 'token1' });
  }

  private encodeGetPoolCall(
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    fee: number
  ): `0x${string}` {
    return viemEncodeFunctionData({
      abi: UNISWAP_V3_FACTORY_ABI,
      functionName: 'getPool',
      args: [tokenA, tokenB, fee],
    });
  }

  private decodeSlot0(data: string): { sqrtPriceX96: bigint; tick: number } {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData || cleanData.length < 384) {
      throw new Error('Invalid slot0 data length');
    }
    const sqrtPriceX96 = BigInt('0x' + cleanData.slice(0, 64));
    const tickRaw = BigInt('0x' + cleanData.slice(64, 128));
    const tick = Number(
      tickRaw > BigInt('0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')
        ? tickRaw - BigInt('0x10000000000000000000000000000000000000000000000000000000000000000')
        : tickRaw
    );
    return { sqrtPriceX96, tick };
  }

  private decodeObserve(data: string): {
    tickCumulatives: bigint[];
    secondsPerLiquidityCumulativeX128s: bigint[];
  } {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData || cleanData.length < 128) {
      throw new Error(`Invalid observe data length: ${cleanData.length}, expected at least 128`);
    }

    try {
      const offset1 = parseInt(cleanData.slice(0, 64), 16) * 2;
      const offset2 = parseInt(cleanData.slice(64, 128), 16) * 2;

      const arr1Length = parseInt(cleanData.slice(offset1, offset1 + 64), 16);
      const tickCumulatives: bigint[] = [];
      for (let i = 0; i < arr1Length; i++) {
        const start = offset1 + 64 + i * 64;
        if (start + 64 > cleanData.length) break;
        const raw = BigInt('0x' + cleanData.slice(start, start + 64));
        const MAX_INT56 = BigInt('0x7FFFFFFFFFFFFFFF');
        const INT56_MOD = BigInt(
          '0x10000000000000000000000000000000000000000000000000000000000000000'
        );
        tickCumulatives.push(raw > MAX_INT56 ? raw - INT56_MOD : raw);
      }

      const arr2Length = parseInt(cleanData.slice(offset2, offset2 + 64), 16);
      const secondsPerLiquidityCumulativeX128s: bigint[] = [];
      for (let i = 0; i < arr2Length; i++) {
        const start = offset2 + 64 + i * 64;
        if (start + 64 > cleanData.length) break;
        secondsPerLiquidityCumulativeX128s.push(BigInt('0x' + cleanData.slice(start, start + 64)));
      }

      return { tickCumulatives, secondsPerLiquidityCumulativeX128s };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid observe data length')) {
        throw error;
      }
      throw new Error(
        `Failed to decode observe data: ${error instanceof Error ? error.message : String(error)}, data length: ${cleanData.length}`
      );
    }
  }

  private decodeLiquidity(data: string): bigint {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData) return BigInt(0);
    return BigInt('0x' + cleanData);
  }

  private decodeFee(data: string): number {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData) return 0;
    return parseInt(cleanData, 16);
  }

  private decodeAddress(data: string): string {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData || cleanData.length < 64) return '0x';
    return '0x' + cleanData.slice(24).toLowerCase();
  }

  private tickToPrice(tick: number): number {
    if (tick === 0) return 1;
    const absTick = Math.abs(tick);
    if (absTick <= 100) {
      return Math.pow(1.0001, tick);
    }
    const absPrice = Math.exp(absTick * Math.log(1.0001));
    return tick > 0 ? absPrice : 1 / absPrice;
  }

  private sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
    const Q96 = BigInt(2) ** BigInt(96);
    if (sqrtPriceX96 <= BigInt(0)) return 0;
    const priceRatio = Number((sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96));
    return Number.isFinite(priceRatio) ? priceRatio : Number(sqrtPriceX96) / Number(Q96) ** 2;
  }

  private async getEthUsdPrice(chainId: number, signal?: AbortSignal): Promise<number> {
    if (this.ethUsdPrice && Date.now() - this.ethUsdPriceTimestamp < this.ETH_USD_CACHE_TTL) {
      return this.ethUsdPrice;
    }

    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', {
        signal,
      });
      if (response.ok) {
        const data = await response.json();
        const ethPrice = parseFloat(data.price);
        if (ethPrice > 0) {
          this.ethUsdPrice = ethPrice;
          this.ethUsdPriceTimestamp = Date.now();
          return ethPrice;
        }
      }
    } catch {
      // Binance API failed, trying on-chain method
    }

    const usdcWethPool = TWAP_POOL_ADDRESSES['ETH']?.[chainId];
    if (usdcWethPool) {
      try {
        const slot0Data = await this.ethCall(
          chainId,
          usdcWethPool.address as `0x${string}`,
          this.encodeSlot0Call(),
          signal
        );
        const { tick } = this.decodeSlot0(slot0Data);
        const rawPrice = this.tickToPrice(tick);
        const token0Decimals = this.getTokenDecimals(usdcWethPool.token0, chainId);
        const token1Decimals = this.getTokenDecimals(usdcWethPool.token1, chainId);
        const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
        const adjustedPrice = rawPrice * decimalAdjustment;

        const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX'];
        let ethPrice: number;
        if (stablecoins.includes(usdcWethPool.token0)) {
          ethPrice = 1 / adjustedPrice;
        } else if (stablecoins.includes(usdcWethPool.token1)) {
          ethPrice = adjustedPrice;
        } else {
          ethPrice = 2320;
        }

        if (ethPrice > 0 && ethPrice < 100000) {
          this.ethUsdPrice = ethPrice;
          this.ethUsdPriceTimestamp = Date.now();
          return ethPrice;
        }
      } catch {
        // On-chain method also failed
      }
    }

    return this.ethUsdPrice || 2320;
  }

  private async getBnbUsdPrice(chainId: number, signal?: AbortSignal): Promise<number> {
    if (this.bnbUsdPrice && Date.now() - this.bnbUsdPriceTimestamp < this.BNB_USD_CACHE_TTL) {
      return this.bnbUsdPrice;
    }

    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT', {
        signal,
      });
      if (response.ok) {
        const data = await response.json();
        const bnbPrice = parseFloat(data.price);
        if (bnbPrice > 0) {
          this.bnbUsdPrice = bnbPrice;
          this.bnbUsdPriceTimestamp = Date.now();
          return bnbPrice;
        }
      }
    } catch {
      // Binance API failed, trying on-chain method
    }

    const bnbPool = TWAP_POOL_ADDRESSES['BNB']?.[chainId];
    if (bnbPool) {
      try {
        const slot0Data = await this.ethCall(
          chainId,
          bnbPool.address as `0x${string}`,
          this.encodeSlot0Call(),
          signal
        );
        const { tick } = this.decodeSlot0(slot0Data);
        const rawPrice = this.tickToPrice(tick);
        const token0Decimals = this.getTokenDecimals(bnbPool.token0, chainId);
        const token1Decimals = this.getTokenDecimals(bnbPool.token1, chainId);
        const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
        const adjustedPrice = rawPrice * decimalAdjustment;

        const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX'];
        let bnbPrice: number;
        if (stablecoins.includes(bnbPool.token0)) {
          bnbPrice = 1 / adjustedPrice;
        } else if (stablecoins.includes(bnbPool.token1)) {
          bnbPrice = adjustedPrice;
        } else {
          bnbPrice = 600;
        }

        if (bnbPrice > 0 && bnbPrice < 100000) {
          this.bnbUsdPrice = bnbPrice;
          this.bnbUsdPriceTimestamp = Date.now();
          return bnbPrice;
        }
      } catch {
        // On-chain method also failed
      }
    }

    return this.bnbUsdPrice || 600;
  }

  private async getBtcUsdPrice(chainId: number, signal?: AbortSignal): Promise<number> {
    if (this.btcUsdPrice && Date.now() - this.btcUsdPriceTimestamp < this.BTC_USD_CACHE_TTL) {
      return this.btcUsdPrice;
    }

    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
        signal,
      });
      if (response.ok) {
        const data = await response.json();
        const btcPrice = parseFloat(data.price);
        if (btcPrice > 0) {
          this.btcUsdPrice = btcPrice;
          this.btcUsdPriceTimestamp = Date.now();
          return btcPrice;
        }
      }
    } catch {
      // Binance API failed, trying on-chain method
    }

    const wbtcWethPool = TWAP_POOL_ADDRESSES['WBTC']?.[chainId];
    if (wbtcWethPool) {
      try {
        const slot0Data = await this.ethCall(
          chainId,
          wbtcWethPool.address as `0x${string}`,
          this.encodeSlot0Call(),
          signal
        );
        const { tick } = this.decodeSlot0(slot0Data);
        const rawPrice = this.tickToPrice(tick);
        const token0Decimals = this.getTokenDecimals(wbtcWethPool.token0, chainId);
        const token1Decimals = this.getTokenDecimals(wbtcWethPool.token1, chainId);
        const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
        const adjustedPrice = rawPrice * decimalAdjustment;

        let btcEthPrice: number;
        if (wbtcWethPool.token0 === 'WBTC') {
          btcEthPrice = adjustedPrice;
        } else {
          btcEthPrice = 1 / adjustedPrice;
        }

        const ethUsdPrice = await this.getEthUsdPrice(chainId, signal);
        const btcUsdPrice = btcEthPrice * ethUsdPrice;

        if (btcUsdPrice > 0 && btcUsdPrice < 10000000) {
          this.btcUsdPrice = btcUsdPrice;
          this.btcUsdPriceTimestamp = Date.now();
          return btcUsdPrice;
        }
      } catch {
        // On-chain method also failed
      }
    }

    return this.btcUsdPrice || 85000;
  }

  private async calculateUsdPrice(
    tick: number,
    token0Symbol: string,
    token1Symbol: string,
    chainId: number,
    signal?: AbortSignal
  ): Promise<number> {
    const rawPrice = this.tickToPrice(tick);
    const token0Decimals = this.getTokenDecimals(token0Symbol, chainId);
    const token1Decimals = this.getTokenDecimals(token1Symbol, chainId);
    const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
    const adjustedPrice = rawPrice * decimalAdjustment;

    const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX'];
    const ethTokens = ['WETH', 'ETH'];
    const btcTokens = ['WBTC', 'BTC'];
    const bnbTokens = ['BNB', 'WBNB'];

    if (stablecoins.includes(token1Symbol)) {
      return adjustedPrice;
    }

    if (stablecoins.includes(token0Symbol)) {
      return 1 / adjustedPrice;
    }

    if (bnbTokens.includes(token1Symbol)) {
      const bnbUsdPrice = await this.getBnbUsdPrice(chainId, signal);
      return adjustedPrice * bnbUsdPrice;
    }

    if (bnbTokens.includes(token0Symbol)) {
      const bnbUsdPrice = await this.getBnbUsdPrice(chainId, signal);
      return (1 / adjustedPrice) * bnbUsdPrice;
    }

    if (ethTokens.includes(token1Symbol)) {
      const ethUsdPrice = await this.getEthUsdPrice(chainId, signal);
      return adjustedPrice * ethUsdPrice;
    }

    if (ethTokens.includes(token0Symbol)) {
      const ethUsdPrice = await this.getEthUsdPrice(chainId, signal);
      return (1 / adjustedPrice) * ethUsdPrice;
    }

    if (btcTokens.includes(token1Symbol)) {
      const btcUsdPrice = await this.getBtcUsdPrice(chainId, signal);
      return adjustedPrice * btcUsdPrice;
    }

    if (btcTokens.includes(token0Symbol)) {
      const btcUsdPrice = await this.getBtcUsdPrice(chainId, signal);
      return (1 / adjustedPrice) * btcUsdPrice;
    }

    return adjustedPrice;
  }

  private getTokenDecimals(symbol: string, chainId?: number): number {
    const decimalsMap: Record<string, number> = {
      WETH: 18,
      ETH: 18,
      USDC: 6,
      USDT: 6,
      DAI: 18,
      WBTC: 8,
      LINK: 18,
      UNI: 18,
      AAVE: 18,
      ARB: 18,
      OP: 18,
      MATIC: 18,
      SNX: 18,
      CRV: 18,
      COMP: 18,
      MKR: 18,
      SUSHI: 18,
      '1INCH': 18,
      BAL: 18,
      BNB: 18,
      STETH: 18,
      FRAX: 18,
      GMX: 18,
    };
    const baseDecimals = decimalsMap[symbol] ?? 18;
    if (chainId === 56 && (symbol === 'USDT' || symbol === 'USDC')) {
      return 18;
    }
    return baseDecimals;
  }

  private getPoolConfig(symbol: string, chainId: number): TwapPoolConfig | null {
    const symbolPools = TWAP_POOL_ADDRESSES[symbol];
    if (!symbolPools) return null;
    return symbolPools[chainId] || null;
  }

  async findPoolAddress(
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    fee: number,
    chainId: number,
    signal?: AbortSignal
  ): Promise<`0x${string}` | null> {
    const factoryAddress = UNISWAP_V3_FACTORY[chainId];
    if (!factoryAddress) return null;

    try {
      const data = this.encodeGetPoolCall(tokenA, tokenB, fee);
      const result = await this.ethCall(chainId, factoryAddress, data, signal);
      const poolAddress = this.decodeAddress(result) as `0x${string}`;

      if (poolAddress === '0x0000000000000000000000000000000000000000') return null;

      return poolAddress;
    } catch {
      return null;
    }
  }

  private async getPoolAddress(
    symbol: string,
    chainId: number,
    signal?: AbortSignal
  ): Promise<{ address: `0x${string}`; feeTier: number; token0: string; token1: string } | null> {
    const poolConfig = this.getPoolConfig(symbol, chainId);
    if (poolConfig) return poolConfig;

    const tokenAddresses = TWAP_TOKEN_ADDRESSES[symbol];
    if (!tokenAddresses || !tokenAddresses[chainId]) return null;

    for (const fee of [500, 3000, 10000]) {
      const usdcAddress = TWAP_TOKEN_ADDRESSES['USDC']?.[chainId];
      if (usdcAddress) {
        const poolAddress = await this.findPoolAddress(
          tokenAddresses[chainId] as `0x${string}`,
          usdcAddress as `0x${string}`,
          fee,
          chainId,
          signal
        );
        if (poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000') {
          return { address: poolAddress, feeTier: fee, token0: symbol, token1: 'USDC' };
        }
      }

      const wethAddress = TWAP_TOKEN_ADDRESSES['WETH']?.[chainId];
      if (wethAddress) {
        const poolAddress = await this.findPoolAddress(
          tokenAddresses[chainId] as `0x${string}`,
          wethAddress as `0x${string}`,
          fee,
          chainId,
          signal
        );
        if (poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000') {
          return { address: poolAddress, feeTier: fee, token0: symbol, token1: 'WETH' };
        }
      }
    }

    return null;
  }

  async getTwapPrice(
    symbol: string,
    chainId: number,
    twapInterval: number = TWAP_INTERVALS.MEDIUM,
    signal?: AbortSignal
  ): Promise<TwapPriceData> {
    if (twapInterval <= 0) {
      twapInterval = TWAP_INTERVALS.MEDIUM;
    }

    const cacheKey = `twap-${symbol}-${chainId}-${twapInterval}`;
    const cached = this.getCached<TwapPriceData>(cacheKey);
    if (cached) return cached;

    const dedupeKey = `inflight-twap-${symbol}-${chainId}-${twapInterval}`;
    const inFlight = this.inFlightRequests.get(dedupeKey);
    if (inFlight) {
      return inFlight as Promise<TwapPriceData>;
    }

    const requestPromise = this._executeGetTwapPrice(symbol, chainId, twapInterval, signal);
    this.inFlightRequests.set(dedupeKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.inFlightRequests.delete(dedupeKey);
    }
  }

  private async _executeGetTwapPrice(
    symbol: string,
    chainId: number,
    twapInterval: number,
    signal?: AbortSignal
  ): Promise<TwapPriceData> {
    const cacheKey = `twap-${symbol}-${chainId}-${twapInterval}`;

    const poolConfig = await this.getPoolAddress(symbol, chainId, signal);
    if (!poolConfig) {
      throw new Error(`Pool not found for ${symbol} on chain ${chainId}`);
    }

    const poolAddress = poolConfig.address as `0x${string}`;

    try {
      const slot0Data = await this.ethCall(chainId, poolAddress, this.encodeSlot0Call(), signal);
      const liquidityData = await this.ethCall(
        chainId,
        poolAddress,
        this.encodeLiquidityCall(),
        signal
      );

      const { sqrtPriceX96, tick } = this.decodeSlot0(slot0Data);
      const liquidity = this.decodeLiquidity(liquidityData);

      let twapTick = tick;
      let effectiveInterval = twapInterval;

      const observeIntervals = [twapInterval, TWAP_INTERVALS.SHORT, 60];
      for (const interval of observeIntervals) {
        try {
          const observeData = await this.ethCall(
            chainId,
            poolAddress,
            this.encodeObserveCall([interval, 0]),
            signal
          );
          const { tickCumulatives } = this.decodeObserve(observeData);
          const tickCumDelta = tickCumulatives[1] - tickCumulatives[0];
          twapTick = Number(tickCumDelta) / interval;
          effectiveInterval = interval;
          break;
        } catch {
          logger.warn(`observe() failed for interval ${interval}s, trying shorter`, {
            symbol,
            chainId,
            interval,
          });
          continue;
        }
      }

      const twapPrice = await this.calculateUsdPrice(
        twapTick,
        poolConfig.token0,
        poolConfig.token1,
        chainId,
        signal
      );
      const spotPrice = await this.calculateUsdPrice(
        tick,
        poolConfig.token0,
        poolConfig.token1,
        chainId,
        signal
      );

      const deviation = spotPrice > 0 ? Math.abs(twapPrice - spotPrice) / spotPrice : 0;
      const liquidityScore =
        liquidity > BigInt(1000000000000000000) ? 1.0 : Number(liquidity) / 1000000000000000000;
      const confidence = Math.min(
        0.99,
        Math.max(0.85, 0.95 * liquidityScore * (1 - deviation * 10))
      );

      const result: TwapPriceData = {
        symbol,
        twapPrice,
        spotPrice,
        tick,
        sqrtPriceX96,
        liquidity,
        timestamp: Date.now(),
        chainId,
        poolAddress: poolAddress,
        feeTier: poolConfig.feeTier,
        twapInterval: effectiveInterval,
        confidence,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(
        `Failed to fetch TWAP price for ${symbol}`,
        error instanceof Error ? error : undefined,
        { symbol, chainId }
      );
      throw new Error(
        `Failed to fetch TWAP price for ${symbol} on chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getSpotPrice(
    symbol: string,
    chainId: number,
    signal?: AbortSignal
  ): Promise<TwapPriceData> {
    const cacheKey = `spot-${symbol}-${chainId}`;
    const cached = this.getCached<TwapPriceData>(cacheKey);
    if (cached) return cached;

    const dedupeKey = `inflight-spot-${symbol}-${chainId}`;
    const inFlight = this.inFlightRequests.get(dedupeKey);
    if (inFlight) {
      return inFlight as Promise<TwapPriceData>;
    }

    const requestPromise = this._executeGetSpotPrice(symbol, chainId, signal);
    this.inFlightRequests.set(dedupeKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.inFlightRequests.delete(dedupeKey);
    }
  }

  private async _executeGetSpotPrice(
    symbol: string,
    chainId: number,
    signal?: AbortSignal
  ): Promise<TwapPriceData> {
    const cacheKey = `spot-${symbol}-${chainId}`;

    const poolConfig = await this.getPoolAddress(symbol, chainId, signal);
    if (!poolConfig) {
      throw new Error(`Pool not found for ${symbol} on chain ${chainId}`);
    }

    const poolAddress = poolConfig.address as `0x${string}`;

    try {
      const [slot0Data, liquidityData] = await Promise.all([
        this.ethCall(chainId, poolAddress, this.encodeSlot0Call(), signal),
        this.ethCall(chainId, poolAddress, this.encodeLiquidityCall(), signal),
      ]);

      const { sqrtPriceX96, tick } = this.decodeSlot0(slot0Data);
      const liquidity = this.decodeLiquidity(liquidityData);
      const spotPrice = await this.calculateUsdPrice(
        tick,
        poolConfig.token0,
        poolConfig.token1,
        chainId,
        signal
      );

      const liquidityScore =
        liquidity > BigInt(1000000000000000000) ? 1.0 : Number(liquidity) / 1000000000000000000;
      const confidence = Math.min(0.99, Math.max(0.85, 0.95 * liquidityScore));

      const result: TwapPriceData = {
        symbol,
        twapPrice: spotPrice,
        spotPrice,
        tick,
        sqrtPriceX96,
        liquidity,
        timestamp: Date.now(),
        chainId,
        poolAddress: poolAddress,
        feeTier: poolConfig.feeTier,
        twapInterval: 0,
        confidence,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(
        `Failed to fetch spot price for ${symbol}`,
        error instanceof Error ? error : undefined,
        { symbol, chainId }
      );
      throw new Error(
        `Failed to fetch spot price for ${symbol} on chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getPoolInfo(symbol: string, chainId: number, signal?: AbortSignal): Promise<PoolInfo> {
    const cacheKey = `pool-${symbol}-${chainId}`;
    const cached = this.getCached<PoolInfo>(cacheKey);
    if (cached) return cached;

    const poolConfig = await this.getPoolAddress(symbol, chainId, signal);
    if (!poolConfig) {
      throw new Error(`Pool not found for ${symbol} on chain ${chainId}`);
    }

    const poolAddress = poolConfig.address as `0x${string}`;

    try {
      const [slot0Data, liquidityData, feeData] = await Promise.all([
        this.ethCall(chainId, poolAddress, this.encodeSlot0Call(), signal),
        this.ethCall(chainId, poolAddress, this.encodeLiquidityCall(), signal),
        this.ethCall(chainId, poolAddress, this.encodeFeeCall(), signal),
      ]);

      const { sqrtPriceX96, tick } = this.decodeSlot0(slot0Data);
      const liquidity = this.decodeLiquidity(liquidityData);
      const feeTier = this.decodeFee(feeData);

      const result: PoolInfo = {
        address: poolAddress,
        token0: poolConfig.token0,
        token1: poolConfig.token1,
        feeTier,
        liquidity,
        sqrtPriceX96,
        tick,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(
        `Failed to fetch pool info for ${symbol}`,
        error instanceof Error ? error : undefined,
        { symbol, chainId }
      );
      throw new Error(
        `Failed to fetch pool info for ${symbol} on chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getPrices(
    symbols: string[],
    chainId: number,
    twapInterval: number = TWAP_INTERVALS.MEDIUM,
    signal?: AbortSignal
  ): Promise<TwapPriceData[]> {
    const promises = symbols.map((symbol) =>
      this.getTwapPrice(symbol, chainId, twapInterval, signal).catch((error) => {
        logger.warn(`Failed to fetch TWAP price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is TwapPriceData => result !== null);
  }

  getSupportedSymbols(): string[] {
    return Object.keys(TWAP_POOL_ADDRESSES);
  }

  getSupportedChainIds(symbol: string): number[] {
    const symbolPools = TWAP_POOL_ADDRESSES[symbol];
    if (!symbolPools) return [];
    return Object.keys(symbolPools).map(Number);
  }

  isPoolSupported(symbol: string, chainId: number): boolean {
    return this.getPoolConfig(symbol, chainId) !== null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetEndpointHealth(): void {
    this.endpointHealth = {};
  }

  getEndpointStatus(chainId: number): {
    current: number;
    total: number;
    health: Record<string, boolean>;
  } {
    const config = TWAP_RPC_CONFIG[chainId];
    const endpoints = config?.endpoints || [];
    return {
      current: this.currentEndpointIndex[chainId] || 0,
      total: endpoints.length,
      health: this.endpointHealth,
    };
  }
}

export const twapOnChainService = new TwapOnChainService();
