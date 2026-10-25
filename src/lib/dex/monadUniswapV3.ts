import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import {
  getUniswapV3MarketSnapshot,
  resetUniswapV3MarketCacheForTests,
  uniswapV3ArithmeticMeanTick,
  uniswapV3Token1PerToken0FromTick,
  UniswapV3MarketError,
  UniswapV3MarketRpcClient,
  type UniswapV3MarketBlock,
  type UniswapV3MarketProfile,
  type UniswapV3MarketSnapshot,
  type UniswapV3RawLog,
} from './uniswapV3Market';

/** @deprecated Use UniswapV3MarketError for new cross-chain integrations. */
export { UniswapV3MarketError as MonadDexRpcError } from './uniswapV3Market';

/** Monad mainnet's immutable EVM chain id. */
export const MONAD_CHAIN_ID = 143;
export const MONAD_UNISWAP_V3_FACTORY = '0x204faca1764b154221e35c0d20abb3c525710498' as const;
export const MONAD_UNISWAP_V3_QUOTER_V2 = '0x661e93cca42afacb172121ef892830ca3b70f08d' as const;
export const MONAD_WMON = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A' as const;
export const MONAD_USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' as const;

/**
 * The first admitted Uniswap V3 market-evidence profile. It remains a DEX
 * market source, not an oracle feed or a consensus participant.
 */
export const MONAD_UNISWAP_V3_WMON_USDC = {
  pool: '0x659bD0BC4167BA25c62E05656F78043E7eD4a9da' as const,
  feeTier: 3_000,
  twapWindowSeconds: 900,
  token0: MONAD_WMON,
  token1: MONAD_USDC,
  token0Symbol: 'WMON',
  token1Symbol: 'USDC',
  token0Decimals: 18,
  token1Decimals: 6,
} as const;

function monadRpcEndpoints(): string[] {
  const configured = CHAINLINK_RPC_CONFIG[MONAD_CHAIN_ID]?.endpoints ?? [];
  const valid = configured.filter((endpoint) => {
    try {
      return new URL(endpoint).protocol === 'https:';
    } catch {
      return false;
    }
  });
  return [...new Set(valid)];
}

/** Monad is the first profile; future networks must provide their own review. */
export function monadUniswapV3WmonUsdcProfile(): UniswapV3MarketProfile {
  return {
    id: 'monad-uniswap-v3-wmon-usdc',
    chainId: MONAD_CHAIN_ID,
    venue: 'uniswap-v3',
    market: 'MON/USDC',
    factory: MONAD_UNISWAP_V3_FACTORY,
    quoterV2: MONAD_UNISWAP_V3_QUOTER_V2,
    pool: MONAD_UNISWAP_V3_WMON_USDC.pool,
    token0: {
      address: MONAD_WMON,
      symbol: MONAD_UNISWAP_V3_WMON_USDC.token0Symbol,
      decimals: MONAD_UNISWAP_V3_WMON_USDC.token0Decimals,
    },
    token1: {
      address: MONAD_USDC,
      symbol: MONAD_UNISWAP_V3_WMON_USDC.token1Symbol,
      decimals: MONAD_UNISWAP_V3_WMON_USDC.token1Decimals,
    },
    feeTier: MONAD_UNISWAP_V3_WMON_USDC.feeTier,
    twapWindowSeconds: MONAD_UNISWAP_V3_WMON_USDC.twapWindowSeconds,
    quoteAmountsToken0: [1, 1_000, 100_000],
    rpcEndpoints: monadRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

/** Backward-compatible Monad reader used by the finalized Swap-event index. */
export class MonadDexRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: string[] = monadRpcEndpoints()) {
    super(MONAD_CHAIN_ID, endpoints);
  }
}

export type MonadDexBlock = UniswapV3MarketBlock;
export type MonadDexRawLog = UniswapV3RawLog;

export interface MonadDexQuote {
  amountInWmon: number;
  amountInRaw: string;
  amountOutUsdc: number;
  amountOutRaw: string;
  effectiveUsdcPerWmon: number;
  initializedTicksCrossed: number;
  priceImpactBps: number;
}

/** Preserves the existing public Monad API schema while using the shared reader. */
export interface MonadDexMarketSnapshot {
  source: 'dex-market';
  venue: 'uniswap-v3';
  chainId: 143;
  market: 'MON/USDC';
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: UniswapV3MarketSnapshot['block'];
  contracts: UniswapV3MarketSnapshot['contracts'];
  spot: { tick: number; usdcPerWmon: number };
  twap: {
    windowSeconds: number;
    tick: number;
    usdcPerWmon: number;
    deviationBpsFromSpot: number;
  };
  activeLiquidityRaw: string;
  poolBalances: {
    wmonRaw: string;
    wmon: number;
    usdcRaw: string;
    usdc: number;
  };
  quotes: MonadDexQuote[];
}

function toMonadSnapshot(snapshot: UniswapV3MarketSnapshot): MonadDexMarketSnapshot {
  if (
    snapshot.venue !== 'uniswap-v3' ||
    snapshot.chainId !== MONAD_CHAIN_ID ||
    snapshot.market !== 'MON/USDC'
  ) {
    throw new UniswapV3MarketError(
      'Shared Uniswap V3 reader returned an unexpected Monad profile.'
    );
  }
  return {
    source: snapshot.source,
    venue: 'uniswap-v3',
    chainId: MONAD_CHAIN_ID,
    market: 'MON/USDC',
    sourceFreshnessSeconds: snapshot.sourceFreshnessSeconds,
    observedAt: snapshot.observedAt,
    block: snapshot.block,
    contracts: snapshot.contracts,
    spot: { tick: snapshot.spot.tick, usdcPerWmon: snapshot.spot.token1PerToken0 },
    twap: {
      windowSeconds: snapshot.twap.windowSeconds,
      tick: snapshot.twap.tick,
      usdcPerWmon: snapshot.twap.token1PerToken0,
      deviationBpsFromSpot: snapshot.twap.deviationBpsFromSpot,
    },
    activeLiquidityRaw: snapshot.activeLiquidityRaw,
    poolBalances: {
      wmonRaw: snapshot.poolBalances.token0Raw,
      wmon: snapshot.poolBalances.token0,
      usdcRaw: snapshot.poolBalances.token1Raw,
      usdc: snapshot.poolBalances.token1,
    },
    quotes: snapshot.quotes.map((quote) => ({
      amountInWmon: quote.amountIn,
      amountInRaw: quote.amountInRaw,
      amountOutUsdc: quote.amountOut,
      amountOutRaw: quote.amountOutRaw,
      effectiveUsdcPerWmon: quote.effectiveToken1PerToken0,
      initializedTicksCrossed: quote.initializedTicksCrossed,
      priceImpactBps: quote.priceImpactBps,
    })),
  };
}

/** Backward-compatible name for Monad tests and API consumers. */
export function uniswapArithmeticMeanTick(
  olderCumulative: bigint,
  currentCumulative: bigint,
  windowSeconds: number
): number {
  return uniswapV3ArithmeticMeanTick(olderCumulative, currentCumulative, windowSeconds);
}

/** Backward-compatible Monad price orientation helper. */
export function wmonUsdcPriceFromTick(tick: number): number {
  return uniswapV3Token1PerToken0FromTick(tick, 18, 6);
}

/** Test hook for the Monad profile's short live-data cache. */
export function resetMonadDexMarketCacheForTests(): void {
  resetUniswapV3MarketCacheForTests('monad-uniswap-v3-wmon-usdc');
}

/**
 * Fresh, block-pinned market evidence for the reviewed Monad Uniswap V3
 * WMON/USDC pool. It remains separate from oracle price consensus.
 */
export async function getMonadUniswapV3MarketSnapshot(
  options: {
    rpc?: MonadDexRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<MonadDexMarketSnapshot> {
  return toMonadSnapshot(
    await getUniswapV3MarketSnapshot(monadUniswapV3WmonUsdcProfile(), options)
  );
}
