import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import { OracleCache } from '../base';
import {
  TWAP_POOL_ADDRESSES,
  TWAP_RPC_CONFIG,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_FACTORY_ABI,
  UNISWAP_V3_FACTORY,
  TWAP_FEE_TIERS as _TWAP_FEE_TIERS,
  TWAP_INTERVALS,
  BLOCKCHAIN_TO_CHAIN_ID as _BLOCKCHAIN_TO_CHAIN_ID,
  type TwapPoolConfig,
  getTwapPoolConfigAsync,
  getTwapTokenAddressAsync,
} from '../constants/twapConstants';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

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

class TwapOnChainService {
  // Per-endpoint timeout is intentionally tighter than the default 10s so a
  // single dead/slow RPC endpoint cannot eat the whole TWAP getPrice budget.
  // TWAP's getPrice() issues several sequential eth_calls (slot0, liquidity,
  // observe, plus USD-reference pool reads) under a 15s outer oracle timeout.
  // With a 10s per-endpoint timeout, ONE timing-out BSC endpoint (e.g. the
  // flaky bsc-dataseed.binance.org) consumed 10s, leaving no room for the
  // public fallback endpoints to respond before the outer timeout aborted the
  // entire fetch — producing the recurring twap/ETH, twap/BNB, twap/USDT
  // BSC failures in the daily report. 4s lets all 3 endpoints be tried within
  // the 15s outer budget while still allowing a healthy endpoint ample time
  // (a slot0/observe call normally returns in <1s).
  private rpcClient = new RpcClientWithFallback({
    contextLabel: 'twap',
    requestTimeout: 4000,
  });
  private cache = new OracleCache();
  private cacheTTL = 30000;
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

  private async ethCall(
    chainId: number,
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    const config = TWAP_RPC_CONFIG[chainId];
    if (!config) {
      throw new Error(`No RPC config for chain ${chainId}`);
    }
    return this.rpcClient.ethCall(String(chainId), config.endpoints, to, data, signal);
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

  private async getEthUsdPrice(chainId: number, signal?: AbortSignal): Promise<number> {
    if (this.ethUsdPrice && Date.now() - this.ethUsdPriceTimestamp < this.ETH_USD_CACHE_TTL) {
      return this.ethUsdPrice;
    }

    const usdcWethPool = await getTwapPoolConfigAsync('ETH', chainId);
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
        const bnbTokens = ['BNB', 'WBNB'];
        let ethPrice: number;
        if (stablecoins.includes(usdcWethPool.token0)) {
          ethPrice = 1 / adjustedPrice;
        } else if (stablecoins.includes(usdcWethPool.token1)) {
          ethPrice = adjustedPrice;
        } else if (bnbTokens.includes(usdcWethPool.token1)) {
          // ETH paired against BNB with no stablecoin (e.g. BSC's WETH/BNB
          // pool). Derive ETH/USD via the BNB/USD reference, which on BSC is
          // the USDT/BNB pool (a stablecoin pair, so getBnbUsdPrice resolves
          // directly without recursing back into getEthUsdPrice).
          // adjustedPrice = token1 (BNB) per token0 (WETH); ETH/USD = BNB-per-WETH * USD-per-BNB.
          const bnbUsdPrice = await this.getBnbUsdPrice(chainId, signal);
          ethPrice = adjustedPrice * bnbUsdPrice;
        } else if (bnbTokens.includes(usdcWethPool.token0)) {
          // token0=BNB, token1=WETH → adjustedPrice = WETH per BNB;
          // ETH/USD = (1/adjustedPrice) * bnbUsdPrice.
          const bnbUsdPrice = await this.getBnbUsdPrice(chainId, signal);
          ethPrice = (1 / adjustedPrice) * bnbUsdPrice;
        } else {
          throw new Error(
            'Cannot determine ETH price from pool - no stablecoin/BNB pair and no cached price'
          );
        }

        if (ethPrice > 0 && ethPrice < 100000) {
          this.ethUsdPrice = ethPrice;
          this.ethUsdPriceTimestamp = Date.now();
          return ethPrice;
        }
      } catch {}
    }

    if (this.ethUsdPrice > 0) {
      return this.ethUsdPrice;
    }
    throw new Error('Failed to fetch ETH/USD price from all sources');
  }

  private async getBnbUsdPrice(chainId: number, signal?: AbortSignal): Promise<number> {
    if (this.bnbUsdPrice && Date.now() - this.bnbUsdPriceTimestamp < this.BNB_USD_CACHE_TTL) {
      return this.bnbUsdPrice;
    }

    const bnbPool = await getTwapPoolConfigAsync('BNB', chainId);
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
          throw new Error(
            'Cannot determine BNB price from pool - no stablecoin pair and no cached price'
          );
        }

        if (bnbPrice > 0 && bnbPrice < 100000) {
          this.bnbUsdPrice = bnbPrice;
          this.bnbUsdPriceTimestamp = Date.now();
          return bnbPrice;
        }
      } catch {}
    }

    if (this.bnbUsdPrice > 0) {
      return this.bnbUsdPrice;
    }
    throw new Error('Failed to fetch BNB/USD price from all sources');
  }

  private async getBtcUsdPrice(chainId: number, signal?: AbortSignal): Promise<number> {
    if (this.btcUsdPrice && Date.now() - this.btcUsdPriceTimestamp < this.BTC_USD_CACHE_TTL) {
      return this.btcUsdPrice;
    }

    const wbtcWethPool = await getTwapPoolConfigAsync('WBTC', chainId);
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

        const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX'];
        let btcUsdPrice: number;
        if (stablecoins.includes(wbtcWethPool.token0)) {
          // token0=stablecoin, token1=WBTC (e.g. BSC's USDT/WBTC pool).
          // adjustedPrice = WBTC per stablecoin; BTC/USD = 1/adjustedPrice.
          btcUsdPrice = 1 / adjustedPrice;
        } else if (stablecoins.includes(wbtcWethPool.token1)) {
          // token0=WBTC, token1=stablecoin → adjustedPrice = stablecoin per WBTC = BTC/USD.
          btcUsdPrice = adjustedPrice;
        } else {
          // WBTC/WETH pair → derive BTC/USD via ETH/USD reference.
          let btcEthPrice: number;
          if (wbtcWethPool.token0 === 'WBTC') {
            btcEthPrice = adjustedPrice;
          } else {
            btcEthPrice = 1 / adjustedPrice;
          }
          const ethUsdPrice = await this.getEthUsdPrice(chainId, signal);
          btcUsdPrice = btcEthPrice * ethUsdPrice;
        }

        if (btcUsdPrice > 0 && btcUsdPrice < 10000000) {
          this.btcUsdPrice = btcUsdPrice;
          this.btcUsdPriceTimestamp = Date.now();
          return btcUsdPrice;
        }
      } catch {}
    }

    if (this.btcUsdPrice > 0) {
      return this.btcUsdPrice;
    }
    throw new Error('Failed to fetch BTC/USD price from all sources');
  }

  private async calculateUsdPrice(
    tick: number,
    token0Symbol: string,
    token1Symbol: string,
    chainId: number,
    signal?: AbortSignal,
    targetSymbol?: string
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

    let token0UsdPrice: number;
    let token1UsdPrice: number;

    if (stablecoins.includes(token1Symbol)) {
      token0UsdPrice = adjustedPrice;
      token1UsdPrice = 1;
    } else if (stablecoins.includes(token0Symbol)) {
      token0UsdPrice = 1;
      token1UsdPrice = 1 / adjustedPrice;
    } else if (ethTokens.includes(token1Symbol)) {
      const ethUsdPrice = await this.getEthUsdPrice(chainId, signal);
      token0UsdPrice = adjustedPrice * ethUsdPrice;
      token1UsdPrice = ethUsdPrice;
    } else if (ethTokens.includes(token0Symbol)) {
      const ethUsdPrice = await this.getEthUsdPrice(chainId, signal);
      token0UsdPrice = ethUsdPrice;
      token1UsdPrice = (1 / adjustedPrice) * ethUsdPrice;
    } else if (bnbTokens.includes(token1Symbol)) {
      const bnbUsdPrice = await this.getBnbUsdPrice(chainId, signal);
      token0UsdPrice = adjustedPrice * bnbUsdPrice;
      token1UsdPrice = bnbUsdPrice;
    } else if (bnbTokens.includes(token0Symbol)) {
      const bnbUsdPrice = await this.getBnbUsdPrice(chainId, signal);
      token0UsdPrice = bnbUsdPrice;
      token1UsdPrice = (1 / adjustedPrice) * bnbUsdPrice;
    } else if (btcTokens.includes(token1Symbol)) {
      const btcUsdPrice = await this.getBtcUsdPrice(chainId, signal);
      token0UsdPrice = adjustedPrice * btcUsdPrice;
      token1UsdPrice = btcUsdPrice;
    } else if (btcTokens.includes(token0Symbol)) {
      const btcUsdPrice = await this.getBtcUsdPrice(chainId, signal);
      token0UsdPrice = btcUsdPrice;
      token1UsdPrice = (1 / adjustedPrice) * btcUsdPrice;
    } else {
      token0UsdPrice = adjustedPrice;
      token1UsdPrice = 1 / adjustedPrice;
    }

    const normalizedTarget = targetSymbol
      ? ethTokens.includes(targetSymbol)
        ? 'WETH'
        : btcTokens.includes(targetSymbol)
          ? 'WBTC'
          : targetSymbol
      : undefined;
    const normalizedToken0 = ethTokens.includes(token0Symbol)
      ? 'WETH'
      : btcTokens.includes(token0Symbol)
        ? 'WBTC'
        : token0Symbol;
    const normalizedToken1 = ethTokens.includes(token1Symbol)
      ? 'WETH'
      : btcTokens.includes(token1Symbol)
        ? 'WBTC'
        : token1Symbol;

    if (normalizedTarget === normalizedToken1) {
      return token1UsdPrice;
    }

    if (normalizedTarget && normalizedTarget !== normalizedToken0) {
      const targetDecimals = this.getTokenDecimals(targetSymbol!, chainId);
      const token0Dec = this.getTokenDecimals(token0Symbol, chainId);
      const decAdj = Math.pow(10, targetDecimals - token0Dec);
      return token0UsdPrice / (adjustedPrice * decAdj);
    }

    return token0UsdPrice;
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

  private async getPoolConfig(symbol: string, chainId: number): Promise<TwapPoolConfig | null> {
    return getTwapPoolConfigAsync(symbol, chainId);
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
    const poolConfig = await this.getPoolConfig(symbol, chainId);
    if (poolConfig) return poolConfig;

    const tokenAddress = await getTwapTokenAddressAsync(symbol, chainId);
    if (!tokenAddress) return null;

    for (const fee of [500, 3000, 10000]) {
      const usdcAddress = await getTwapTokenAddressAsync('USDC', chainId);
      if (usdcAddress) {
        const poolAddress = await this.findPoolAddress(
          tokenAddress as `0x${string}`,
          usdcAddress as `0x${string}`,
          fee,
          chainId,
          signal
        );
        const oriented = await this.orientPool(
          poolAddress,
          tokenAddress,
          usdcAddress,
          symbol,
          'USDC',
          chainId,
          signal
        );
        if (oriented) return { address: poolAddress!, feeTier: fee, ...oriented };
      }

      const wethAddress = await getTwapTokenAddressAsync('WETH', chainId);
      if (wethAddress) {
        const poolAddress = await this.findPoolAddress(
          tokenAddress as `0x${string}`,
          wethAddress as `0x${string}`,
          fee,
          chainId,
          signal
        );
        const oriented = await this.orientPool(
          poolAddress,
          tokenAddress,
          wethAddress,
          symbol,
          'WETH',
          chainId,
          signal
        );
        if (oriented) return { address: poolAddress!, feeTier: fee, ...oriented };
      }
    }

    return null;
  }

  /**
   * Resolve which side of a discovered pool the queried symbol actually sits on.
   *
   * Uniswap V3 stores token0/token1 sorted by ADDRESS VALUE, which has nothing
   * to do with the order we passed to `findPoolAddress`. Assuming the probe
   * order therefore reads the tick backwards for any symbol whose address sorts
   * above its pair — BNB (0xb8c7…) vs USDC (0xa0b8…) on Ethereum being the live
   * case, where the inverted reading produced a price of 6.14e20 instead of
   * ~689 and poisoned every consensus it entered.
   *
   * Returns null when the on-chain ordering cannot be confirmed, or when the
   * pool has no liquidity. A missing price is safe; an inverted or frozen one
   * silently corrupts consensus, so we decline rather than guess.
   */
  private async orientPool(
    poolAddress: `0x${string}` | null,
    symbolTokenAddress: string,
    pairTokenAddress: string,
    symbol: string,
    pairSymbol: string,
    chainId: number,
    signal?: AbortSignal
  ): Promise<{ token0: string; token1: string } | null> {
    if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    let realToken0: string;
    let realToken1: string;
    let liquidity: bigint;
    try {
      const [t0, t1, liq] = await Promise.all([
        this.ethCall(chainId, poolAddress, '0x0dfe1681', signal),
        this.ethCall(chainId, poolAddress, '0xd21220a7', signal),
        this.ethCall(chainId, poolAddress, this.encodeLiquidityCall(), signal),
      ]);
      realToken0 = ('0x' + t0.slice(-40)).toLowerCase();
      realToken1 = ('0x' + t1.slice(-40)).toLowerCase();
      liquidity = this.decodeLiquidity(liq);
    } catch {
      return null;
    }

    // A zero-liquidity pool has no market. Whatever price its slot0 reports is
    // the number the deployer seeded and it never moves, so quoting it as a live
    // oracle price is worse than quoting nothing — it looks plausible enough to
    // survive sanity checks and quietly poisons every consensus it enters.
    if (liquidity <= BigInt(0)) {
      logger.warn('Discovered TWAP pool has zero liquidity; skipping', {
        symbol,
        pairSymbol,
        chainId,
        poolAddress,
      });
      return null;
    }

    const symbolAddr = symbolTokenAddress.toLowerCase();
    const pairAddr = pairTokenAddress.toLowerCase();

    if (realToken0 === symbolAddr && realToken1 === pairAddr) {
      return { token0: symbol, token1: pairSymbol };
    }
    if (realToken0 === pairAddr && realToken1 === symbolAddr) {
      return { token0: pairSymbol, token1: symbol };
    }

    logger.warn('Discovered TWAP pool has unexpected token pair; skipping', {
      symbol,
      pairSymbol,
      chainId,
      poolAddress,
      realToken0,
      realToken1,
    });
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
    const cached = this.cache.get<TwapPriceData>(cacheKey);
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
        signal,
        symbol
      );
      const spotPrice = await this.calculateUsdPrice(
        tick,
        poolConfig.token0,
        poolConfig.token1,
        chainId,
        signal,
        symbol
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

      this.cache.set(cacheKey, result, this.cacheTTL);
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

  /**
   * Get spot price from Uniswap V3 pool slot0 (no TWAP averaging).
   * Used for DEX market price reference in depeg tracking.
   */
  async getSpotPrice(
    symbol: string,
    chainId: number,
    signal?: AbortSignal
  ): Promise<TwapPriceData> {
    const cacheKey = `spot-${symbol}-${chainId}`;
    const cached = this.cache.get<TwapPriceData>(cacheKey);
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
      const slot0Data = await this.ethCall(chainId, poolAddress, this.encodeSlot0Call(), signal);
      const liquidityData = await this.ethCall(
        chainId,
        poolAddress,
        this.encodeLiquidityCall(),
        signal
      );

      const { sqrtPriceX96, tick } = this.decodeSlot0(slot0Data);
      const liquidity = this.decodeLiquidity(liquidityData);

      const spotPrice = await this.calculateUsdPrice(
        tick,
        poolConfig.token0,
        poolConfig.token1,
        chainId,
        signal,
        symbol
      );

      const liquidityScore =
        liquidity > BigInt(1000000000000000000) ? 1.0 : Number(liquidity) / 1000000000000000000;
      const confidence = Math.min(0.99, Math.max(0.85, 0.9 * liquidityScore));

      const result: TwapPriceData = {
        symbol,
        twapPrice: spotPrice, // For spot-only, twapPrice = spotPrice
        spotPrice,
        tick,
        sqrtPriceX96,
        liquidity,
        timestamp: Date.now(),
        chainId,
        poolAddress,
        feeTier: poolConfig.feeTier,
        twapInterval: 0, // Spot price has no TWAP interval
        confidence,
      };

      this.cache.set(cacheKey, result, this.cacheTTL);
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

  getSupportedSymbols(): string[] {
    return Object.keys(TWAP_POOL_ADDRESSES);
  }

  getSupportedChainIds(symbol: string): number[] {
    const symbolPools = TWAP_POOL_ADDRESSES[symbol];
    if (!symbolPools) return [];
    return Object.keys(symbolPools).map(Number);
  }

  async isPoolSupported(symbol: string, chainId: number): Promise<boolean> {
    return (await this.getPoolConfig(symbol, chainId)) !== null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetEndpointHealth(): void {
    this.rpcClient = new RpcClientWithFallback({
      contextLabel: 'twap',
      requestTimeout: 4000,
    });
  }

  getEndpointStatus(chainId: number): {
    current: number;
    total: number;
    health: Record<string, boolean>;
  } {
    const config = TWAP_RPC_CONFIG[chainId];
    const endpoints = config?.endpoints || [];
    return {
      current: 0,
      total: endpoints.length,
      health: {},
    };
  }
}

export const twapOnChainService = new TwapOnChainService();
