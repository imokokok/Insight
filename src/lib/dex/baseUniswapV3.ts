import { BASE_USDC_ADDRESS } from '@/lib/constants/tokenAddresses';

import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import {
  getUniswapV3MarketSnapshot,
  UniswapV3MarketRpcClient,
  type UniswapV3MarketProfile,
  type UniswapV3MarketSnapshot,
} from './uniswapV3Market';

/** Base mainnet's immutable EVM chain id. */
export const BASE_CHAIN_ID = 8453;
export const BASE_UNISWAP_V3_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD' as const;
export const BASE_UNISWAP_V3_QUOTER_V2 = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const;
export const BASE_WETH = '0x4200000000000000000000000000000000000006' as const;
export const BASE_USDC = BASE_USDC_ADDRESS;

/**
 * Reviewed Uniswap V3 WETH/USDC 0.3% pool. The existing TWAP configuration
 * independently records that this pool's 30-minute observation is available.
 * It remains a single-venue market source, never a consensus-oracle input.
 */
export const BASE_UNISWAP_V3_WETH_USDC = {
  pool: '0x6c561B446416E1A00E8E93E221854d6eA4171372' as const,
  feeTier: 3_000,
  token0Symbol: 'WETH',
  token0Decimals: 18,
  token1Symbol: 'USDC',
  token1Decimals: 6,
  twapWindowSeconds: 1_800,
} as const;

/**
 * Reviewed Uniswap V3 WETH/USDC 0.05% pool — the deepest WETH/USDC lane on
 * Base and the second admitted Uniswap V3 profile. Unlike the legacy 0.3%
 * profile it pins the full runtime bytecode identity of the factory, quoter,
 * and pool, which is mandatory for all new allowlisted integrations. Resolved
 * on Base mainnet via `factory.getPool(WETH, USDC, 500)` and pinned at review
 * time; the pool implementation is immutable.
 */
export const BASE_UNISWAP_V3_CODE_IDENTITY = {
  factory: '0x95707a4ac71f20181a63ef7d180e3c625be5d20fc8f6f980befa966bad568132',
  quoterV2: '0xceb5b8bc35e09fc64b1c48c6b920e0d2e37d5710e4f3ef214e1a81f75acee51e',
} as const;

export const BASE_UNISWAP_V3_WETH_USDC_500 = {
  pool: '0xd0b53D9277642d899DF5C87A3966A349A798F224' as const,
  poolCodeHash: '0xcd06f61c6db6a1d8317548aaaa0aa83254624aec741534c51815810e977587ae' as const,
  feeTier: 500,
  twapWindowSeconds: 1_800,
} as const;

function baseRpcEndpoints(): string[] {
  const configured = CHAINLINK_RPC_CONFIG[BASE_CHAIN_ID]?.endpoints ?? [];
  const valid = configured.filter((endpoint) => {
    try {
      return new URL(endpoint).protocol === 'https:';
    } catch {
      return false;
    }
  });
  return [...new Set(valid)];
}

/** The second admitted profile for the shared, EVM-native Uniswap V3 reader. */
export function baseUniswapV3WethUsdcProfile(): UniswapV3MarketProfile {
  return {
    id: 'base-uniswap-v3-weth-usdc',
    chainId: BASE_CHAIN_ID,
    venue: 'uniswap-v3',
    market: 'WETH/USDC',
    factory: BASE_UNISWAP_V3_FACTORY,
    quoterV2: BASE_UNISWAP_V3_QUOTER_V2,
    pool: BASE_UNISWAP_V3_WETH_USDC.pool,
    token0: {
      address: BASE_WETH,
      symbol: BASE_UNISWAP_V3_WETH_USDC.token0Symbol,
      decimals: BASE_UNISWAP_V3_WETH_USDC.token0Decimals,
    },
    token1: {
      address: BASE_USDC,
      symbol: BASE_UNISWAP_V3_WETH_USDC.token1Symbol,
      decimals: BASE_UNISWAP_V3_WETH_USDC.token1Decimals,
    },
    feeTier: BASE_UNISWAP_V3_WETH_USDC.feeTier,
    twapWindowSeconds: BASE_UNISWAP_V3_WETH_USDC.twapWindowSeconds,
    quoteAmountsToken0: [1, 10, 100],
    rpcEndpoints: baseRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

/**
 * The deeper, fully bytecode-pinned WETH/USDC 0.05% profile. Its id is
 * distinct from the legacy 0.3% profile so route selection stays explicit.
 */
export function baseUniswapV3WethUsdc500Profile(): UniswapV3MarketProfile {
  return {
    id: 'base-uniswap-v3-weth-usdc-500',
    chainId: BASE_CHAIN_ID,
    venue: 'uniswap-v3',
    market: 'WETH/USDC',
    factory: BASE_UNISWAP_V3_FACTORY,
    quoterV2: BASE_UNISWAP_V3_QUOTER_V2,
    pool: BASE_UNISWAP_V3_WETH_USDC_500.pool,
    codeIdentity: {
      factory: BASE_UNISWAP_V3_CODE_IDENTITY.factory,
      quoterV2: BASE_UNISWAP_V3_CODE_IDENTITY.quoterV2,
      pool: BASE_UNISWAP_V3_WETH_USDC_500.poolCodeHash,
    },
    token0: {
      address: BASE_WETH,
      symbol: BASE_UNISWAP_V3_WETH_USDC.token0Symbol,
      decimals: BASE_UNISWAP_V3_WETH_USDC.token0Decimals,
    },
    token1: {
      address: BASE_USDC,
      symbol: BASE_UNISWAP_V3_WETH_USDC.token1Symbol,
      decimals: BASE_UNISWAP_V3_WETH_USDC.token1Decimals,
    },
    feeTier: BASE_UNISWAP_V3_WETH_USDC_500.feeTier,
    twapWindowSeconds: BASE_UNISWAP_V3_WETH_USDC_500.twapWindowSeconds,
    quoteAmountsToken0: [1, 10, 100],
    rpcEndpoints: baseRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

/** Backward-compatible typed RPC entry point for Base-specific integrations. */
export class BaseDexRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: string[] = baseRpcEndpoints()) {
    super(BASE_CHAIN_ID, endpoints);
  }
}

/**
 * Fresh, block-pinned market evidence for the reviewed Base Uniswap V3
 * WETH/USDC pool. This remains separate from price consensus.
 */
export async function getBaseUniswapV3MarketSnapshot(
  options: {
    rpc?: BaseDexRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<UniswapV3MarketSnapshot> {
  return getUniswapV3MarketSnapshot(baseUniswapV3WethUsdcProfile(), options);
}
