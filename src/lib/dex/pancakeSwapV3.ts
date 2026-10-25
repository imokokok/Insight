import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import {
  getUniswapV3MarketSnapshot,
  UniswapV3MarketRpcClient,
  type UniswapV3MarketProfile,
  type UniswapV3MarketSnapshot,
} from './uniswapV3Market';

/** Base mainnet is the only network admitted by this reviewed integration. */
export const PANCAKE_SWAP_V3_BASE_CHAIN_ID = 8453;
export const PANCAKE_SWAP_V3_BASE_FACTORY = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865' as const;
export const PANCAKE_SWAP_V3_BASE_QUOTER_V2 = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997' as const;
export const PANCAKE_SWAP_V3_BASE_SWAP_ROUTER =
  '0x1b81D678ffb9C0263b24A97847620C99d213eB14' as const;
export const PANCAKE_SWAP_V3_BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
export const PANCAKE_SWAP_V3_BASE_USDT = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' as const;

/** Runtime pins recorded from the reviewed Base deployment. */
export const PANCAKE_SWAP_V3_BASE_CODE_IDENTITY = {
  factory: '0x8191d3ab1d55d3da9822199f28865415c99566b6f1aee4a4b16713f57930678c',
  quoterV2: '0x945e158b4d4b58c41ade0a10f7e6df0a3c631468fcd762eced1b3fe38fe1f812',
  router: '0x2cbdac93453dc8ebb7906446b3af75ada8ff43a6225a08ed2e0ee6eb12057b42',
} as const;

export const PANCAKE_SWAP_V3_BASE_USDC_USDT = {
  pool: '0x5f07bb9fee6062e9d09a52e6d587c64bad6ba706' as const,
  poolCodeHash: '0xaef3a8195a0422d20abe974031e2b026409664b58b3deebafdfc494edce77a07',
  feeTier: 100,
  twapWindowSeconds: 1_800,
} as const;

/**
 * An MCP caller selects from an immutable profile id, never a pool or router
 * address.  Adding a pool therefore remains a review, bytecode-pin, and test
 * event rather than turning Insight into a route proxy.
 */
export const REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS = ['base-pancakeswap-v3-usdc-usdt-100'] as const;

export type ReviewedPancakeSwapV3ProfileId = (typeof REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS)[number];

function baseRpcEndpoints(): string[] {
  const configured = CHAINLINK_RPC_CONFIG[PANCAKE_SWAP_V3_BASE_CHAIN_ID]?.endpoints ?? [];
  return [
    ...new Set(
      configured.filter((endpoint) => {
        try {
          return new URL(endpoint).protocol === 'https:';
        } catch {
          return false;
        }
      })
    ),
  ];
}

function basePancakeSwapV3UsdcUsdtProfile(): UniswapV3MarketProfile {
  return {
    id: 'base-pancakeswap-v3-usdc-usdt-100',
    chainId: PANCAKE_SWAP_V3_BASE_CHAIN_ID,
    venue: 'pancakeswap-v3',
    market: 'USDC/USDT',
    factory: PANCAKE_SWAP_V3_BASE_FACTORY,
    quoterV2: PANCAKE_SWAP_V3_BASE_QUOTER_V2,
    pool: PANCAKE_SWAP_V3_BASE_USDC_USDT.pool,
    codeIdentity: {
      factory: PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.factory,
      quoterV2: PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.quoterV2,
      pool: PANCAKE_SWAP_V3_BASE_USDC_USDT.poolCodeHash,
    },
    token0: { address: PANCAKE_SWAP_V3_BASE_USDC, symbol: 'USDC', decimals: 6 },
    token1: { address: PANCAKE_SWAP_V3_BASE_USDT, symbol: 'USDT', decimals: 6 },
    feeTier: PANCAKE_SWAP_V3_BASE_USDC_USDT.feeTier,
    twapWindowSeconds: PANCAKE_SWAP_V3_BASE_USDC_USDT.twapWindowSeconds,
    quoteAmountsToken0: [100, 1_000, 10_000],
    rpcEndpoints: baseRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

const REVIEWED_PROFILES: Record<ReviewedPancakeSwapV3ProfileId, () => UniswapV3MarketProfile> = {
  'base-pancakeswap-v3-usdc-usdt-100': basePancakeSwapV3UsdcUsdtProfile,
};

export function isReviewedPancakeSwapV3ProfileId(
  value: string
): value is ReviewedPancakeSwapV3ProfileId {
  return (REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS as readonly string[]).includes(value);
}

export function reviewedPancakeSwapV3Profile(
  id: ReviewedPancakeSwapV3ProfileId
): UniswapV3MarketProfile {
  const profile = REVIEWED_PROFILES[id];
  if (!profile)
    throw new Error('PancakeSwap V3 profile is outside Insight’s reviewed pool allowlist.');
  return profile();
}

export function listReviewedPancakeSwapV3Profiles(): UniswapV3MarketProfile[] {
  return REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS.map((id) => reviewedPancakeSwapV3Profile(id));
}

export class PancakeSwapV3BaseRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: string[] = baseRpcEndpoints()) {
    super(PANCAKE_SWAP_V3_BASE_CHAIN_ID, endpoints);
  }
}

export async function getReviewedPancakeSwapV3MarketSnapshot(
  profileId: ReviewedPancakeSwapV3ProfileId,
  options: {
    rpc?: PancakeSwapV3BaseRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
    cache?: boolean;
  } = {}
): Promise<UniswapV3MarketSnapshot> {
  const profile = reviewedPancakeSwapV3Profile(profileId);
  return getUniswapV3MarketSnapshot(profile, {
    ...options,
    rpc: options.rpc,
  });
}

export async function getPancakeSwapV3BaseMarketSnapshot(
  options: {
    rpc?: PancakeSwapV3BaseRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
    cache?: boolean;
  } = {}
): Promise<UniswapV3MarketSnapshot> {
  return getReviewedPancakeSwapV3MarketSnapshot('base-pancakeswap-v3-usdc-usdt-100', options);
}
