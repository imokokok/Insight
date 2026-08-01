import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import { OracleCache } from '../base';
import { TWAP_RPC_CONFIG } from '../constants/twapConstants';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('CurvePoolService');

// Curve Pool ABI — only the methods we need
const CURVE_POOL_ABI = [
  {
    inputs: [
      { name: 'i', type: 'uint256' },
      { name: 'j', type: 'uint256' },
      { name: 'dx', type: 'uint256' },
    ],
    name: 'get_dy',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'get_virtual_price',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'arg0', type: 'uint256' }],
    name: 'balances',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface CurvePoolConfig {
  poolAddress: `0x${string}`;
  chainId: number;
  tokens: { symbol: string; decimals: number; index: number }[];
  poolType: 'stableswap' | 'metapool';
}

interface CurvePriceResult {
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  price: number; // How much tokenOut for 1 unit of tokenIn
  virtualPrice: number; // Curve virtual price (LP token value)
  liquidityUsd: number; // Estimated TVL in the pool
  timestamp: number;
  confidence: number;
}

// Pre-configured Curve pools for stablecoin tracking
const CURVE_STABLECOIN_POOLS: CurvePoolConfig[] = [
  {
    // Curve 3pool: DAI/USDC/USDT — the only pool getStablecoinPrice can match
    // (it looks up pools containing both <symbol> and USDC).
    poolAddress: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    chainId: 1,
    tokens: [
      { symbol: 'DAI', decimals: 18, index: 0 },
      { symbol: 'USDC', decimals: 6, index: 1 },
      { symbol: 'USDT', decimals: 6, index: 2 },
    ],
    poolType: 'stableswap',
  },
  {
    // Curve LUSD/3pool — a valid metapool, but it pairs LUSD with 3CRV (the
    // 3pool LP token), not USDC, so getStablecoinPrice never matches it.
    // Kept for completeness; safe to remove if it stays unused.
    poolAddress: '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
    chainId: 1,
    tokens: [
      { symbol: 'LUSD', decimals: 18, index: 0 },
      { symbol: '3POOL', decimals: 18, index: 1 },
    ],
    poolType: 'metapool',
  },
  // NOTE: The FRAX/USDC (0xDcEF968d...) and USDD/3pool (0x42d1...) entries were
  // removed — both are dead addresses (get_virtual_price returns empty), so
  // every get_dy call reverted and logged a misleading ERROR. The catch in
  // getStablecoinPrice already swallows that failure (returns null), so it was
  // non-fatal but noisy.
];

class CurvePoolService {
  private rpcClient = new RpcClientWithFallback({ contextLabel: 'curve' });
  private cache = new OracleCache();
  private cacheTTL = 30000;
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

  private encodeGetDyCall(i: number, j: number, dx: bigint): `0x${string}` {
    return viemEncodeFunctionData({
      abi: CURVE_POOL_ABI,
      functionName: 'get_dy',
      args: [BigInt(i), BigInt(j), dx],
    });
  }

  private encodeGetVirtualPriceCall(): `0x${string}` {
    return viemEncodeFunctionData({
      abi: CURVE_POOL_ABI,
      functionName: 'get_virtual_price',
    });
  }

  private encodeBalancesCall(index: number): `0x${string}` {
    return viemEncodeFunctionData({
      abi: CURVE_POOL_ABI,
      functionName: 'balances',
      args: [BigInt(index)],
    });
  }

  private decodeUint256(data: string): bigint {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData || cleanData.length < 64) return BigInt(0);
    return BigInt('0x' + cleanData.slice(0, 64));
  }

  /**
   * Get the exchange rate between two tokens in a Curve pool via get_dy.
   * Returns how much tokenOut you get for 1 unit of tokenIn.
   */
  async getPoolPrice(
    pool: CurvePoolConfig,
    tokenInSymbol: string,
    tokenOutSymbol: string,
    signal?: AbortSignal
  ): Promise<CurvePriceResult> {
    const tokenIn = pool.tokens.find((t) => t.symbol === tokenInSymbol);
    const tokenOut = pool.tokens.find((t) => t.symbol === tokenOutSymbol);
    if (!tokenIn || !tokenOut) {
      throw new Error(`Token not found in pool: ${tokenInSymbol} or ${tokenOutSymbol}`);
    }

    const cacheKey = `curve-${pool.poolAddress}-${tokenInSymbol}-${tokenOutSymbol}`;
    const cached = this.cache.get<CurvePriceResult>(cacheKey);
    if (cached) return cached;

    const dedupeKey = `inflight-${cacheKey}`;
    const inFlight = this.inFlightRequests.get(dedupeKey);
    if (inFlight) return inFlight as Promise<CurvePriceResult>;

    const requestPromise = this._executeGetPoolPrice(pool, tokenIn, tokenOut, signal);
    this.inFlightRequests.set(dedupeKey, requestPromise);

    try {
      const result = await requestPromise;
      return result as CurvePriceResult;
    } finally {
      this.inFlightRequests.delete(dedupeKey);
    }
  }

  private async _executeGetPoolPrice(
    pool: CurvePoolConfig,
    tokenIn: { symbol: string; decimals: number; index: number },
    tokenOut: { symbol: string; decimals: number; index: number },
    signal?: AbortSignal
  ): Promise<CurvePriceResult> {
    const cacheKey = `curve-${pool.poolAddress}-${tokenIn.symbol}-${tokenOut.symbol}`;
    const poolAddress = pool.poolAddress as `0x${string}`;

    try {
      // get_dy(i, j, dx): how much token[j] for dx amount of token[i]
      const dx = BigInt(10) ** BigInt(tokenIn.decimals); // 1 unit of tokenIn
      const getDyData = await this.ethCall(
        pool.chainId,
        poolAddress,
        this.encodeGetDyCall(tokenIn.index, tokenOut.index, dx),
        signal
      );
      const dyAmount = this.decodeUint256(getDyData);
      const price = Number(dyAmount) / Math.pow(10, tokenOut.decimals);

      // Get virtual price
      let virtualPrice = 0;
      try {
        const vpData = await this.ethCall(
          pool.chainId,
          poolAddress,
          this.encodeGetVirtualPriceCall(),
          signal
        );
        virtualPrice = Number(this.decodeUint256(vpData)) / 1e18;
      } catch {
        logger.warn(`Failed to get virtual price for pool ${pool.poolAddress}`);
      }

      // Estimate liquidity from balances
      let liquidityUsd = 0;
      try {
        const balancePromises = pool.tokens.map(async (token) => {
          const balanceData = await this.ethCall(
            pool.chainId,
            poolAddress,
            this.encodeBalancesCall(token.index),
            signal
          );
          return Number(this.decodeUint256(balanceData)) / Math.pow(10, token.decimals);
        });
        const balances = await Promise.all(balancePromises);
        const avgBalance = balances.reduce((a, b) => a + b, 0) / balances.length;
        liquidityUsd = avgBalance * balances.length;
      } catch {
        logger.warn(`Failed to get balances for pool ${pool.poolAddress}`);
      }

      const confidence = Math.min(
        0.98,
        Math.max(0.85, liquidityUsd > 1000000 ? 0.95 : (liquidityUsd / 1000000) * 0.95)
      );

      const result: CurvePriceResult = {
        poolAddress: pool.poolAddress,
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        price,
        virtualPrice,
        liquidityUsd,
        timestamp: Date.now(),
        confidence,
      };

      this.cache.set(cacheKey, result, this.cacheTTL);
      return result;
    } catch (error) {
      // Non-fatal: getStablecoinPrice swallows this and returns null, so a
      // reverting/dead pool degrades to "no Curve price" rather than failing
      // the snapshot. Log at warn level to avoid noisy ERROR lines for an
      // already-handled condition.
      logger.warn(
        `Failed to fetch Curve pool price for ${pool.poolAddress}`,
        error instanceof Error ? error : undefined
      );
      throw new Error(
        `Failed to fetch Curve price: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get price of a stablecoin relative to another in a Curve pool.
   */
  async getStablecoinPrice(
    symbol: string,
    referenceSymbol: string = 'USDC',
    signal?: AbortSignal
  ): Promise<CurvePriceResult | null> {
    const pool = CURVE_STABLECOIN_POOLS.find(
      (p) =>
        p.tokens.some((t) => t.symbol === symbol) &&
        p.tokens.some((t) => t.symbol === referenceSymbol)
    );
    if (!pool) return null;

    try {
      return await this.getPoolPrice(pool, symbol, referenceSymbol, signal);
    } catch {
      return null;
    }
  }
}

export const curvePoolService = new CurvePoolService();
