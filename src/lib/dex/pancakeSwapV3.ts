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
 * BNB Smart Chain deployment of the same PancakeSwap V3 contracts. Addresses
 * match Base; the recorded code hashes are per-chain because the deployed
 * router/quoter/pool bytecodes differ between networks.
 */
export const PANCAKE_SWAP_V3_BNB_CHAIN_ID = 56;
export const PANCAKE_SWAP_V3_BNB_FACTORY = PANCAKE_SWAP_V3_BASE_FACTORY;
export const PANCAKE_SWAP_V3_BNB_QUOTER_V2 = PANCAKE_SWAP_V3_BASE_QUOTER_V2;
export const PANCAKE_SWAP_V3_BNB_SWAP_ROUTER = PANCAKE_SWAP_V3_BASE_SWAP_ROUTER;
export const PANCAKE_SWAP_V3_BNB_USDT = '0x55d398326f99059fF775485246999027B3197955' as const;
export const PANCAKE_SWAP_V3_BNB_USDC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as const;
/** Canonical WBNB (wrapped BNB) of the reviewed BNB Smart Chain deployment. */
export const PANCAKE_SWAP_V3_BNB_WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as const;

/** Runtime pins recorded from the reviewed BNB deployment. */
export const PANCAKE_SWAP_V3_BNB_CODE_IDENTITY = {
  factory: '0x8191d3ab1d55d3da9822199f28865415c99566b6f1aee4a4b16713f57930678c',
  quoterV2: '0x2734833b7d2a656d4797f4a7d959314654749a7424ec473267613ff26424138a',
  router: '0x61002a11263b2c38ff8d5ded90a655987ed98f171a31840ee0014dd7052bccda',
} as const;

export const PANCAKE_SWAP_V3_BNB_USDT_USDC = {
  pool: '0x92b7807bf19b7dddf89b706143896d05228f3121' as const,
  poolCodeHash: '0xc7f2aca72215bdbdca3ee6ae87d5500b09b13f0e6cfe097cd3092ab9e8439f34',
  feeTier: 100,
  twapWindowSeconds: 1_800,
} as const;

/**
 * Reviewed volatile major pair. Recorded live from BSC mainnet at block
 * 131435862: factory.getPool(WBNB, USDT, 100) won the in-range-liquidity
 * comparison against the 0.05%/0.25%/1% siblings, and the router/quoter/factory
 * code hashes match the pinned BNB deployment exactly, so no new contract
 * identity is admitted with this profile.
 */
export const PANCAKE_SWAP_V3_BNB_USDT_WBNB = {
  pool: '0x172fcD41E0913e95784454622d1c3724f546f849' as const,
  poolCodeHash: '0x6796316e56ef0dd38755758b3239f271b2398ef028c8200bcf7fc8cc00ae1cfd',
  feeTier: 100,
  twapWindowSeconds: 1_800,
} as const;

/** The router's WETH9 on each reviewed chain. */
export const PANCAKE_SWAP_V3_ROUTER_WETH9_BY_CHAIN = {
  [PANCAKE_SWAP_V3_BASE_CHAIN_ID]: '0x4200000000000000000000000000000000000006',
  [PANCAKE_SWAP_V3_BNB_CHAIN_ID]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
} as const;

/** The immutable deployment bundle one reviewed chain is admitted through. */
export interface PancakeSwapV3ChainDeployment {
  chainId: number;
  factory: string;
  quoterV2: string;
  swapRouter: string;
  routerCodeHash: string;
}

const PANCAKE_SWAP_V3_DEPLOYMENTS_BY_CHAIN: Record<number, PancakeSwapV3ChainDeployment> = {
  [PANCAKE_SWAP_V3_BASE_CHAIN_ID]: {
    chainId: PANCAKE_SWAP_V3_BASE_CHAIN_ID,
    factory: PANCAKE_SWAP_V3_BASE_FACTORY,
    quoterV2: PANCAKE_SWAP_V3_BASE_QUOTER_V2,
    swapRouter: PANCAKE_SWAP_V3_BASE_SWAP_ROUTER,
    routerCodeHash: PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.router,
  },
  [PANCAKE_SWAP_V3_BNB_CHAIN_ID]: {
    chainId: PANCAKE_SWAP_V3_BNB_CHAIN_ID,
    factory: PANCAKE_SWAP_V3_BNB_FACTORY,
    quoterV2: PANCAKE_SWAP_V3_BNB_QUOTER_V2,
    swapRouter: PANCAKE_SWAP_V3_BNB_SWAP_ROUTER,
    routerCodeHash: PANCAKE_SWAP_V3_BNB_CODE_IDENTITY.router,
  },
};

/**
 * The reviewed deployment for one chain, or null for a chain Insight has not
 * reviewed. Callers must treat null as fail-closed, never fall back to another
 * chain's addresses.
 */
export function pancakeSwapV3DeploymentForChain(
  chainId: number
): PancakeSwapV3ChainDeployment | null {
  return PANCAKE_SWAP_V3_DEPLOYMENTS_BY_CHAIN[chainId] ?? null;
}

/**
 * An MCP caller selects from an immutable profile id, never a pool or router
 * address.  Adding a pool therefore remains a review, bytecode-pin, and test
 * event rather than turning Insight into a route proxy.
 */
export const REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS = [
  'base-pancakeswap-v3-usdc-usdt-100',
  'bnb-pancakeswap-v3-usdt-usdc-100',
  'bnb-pancakeswap-v3-usdt-wbnb-100',
] as const;

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

function bnbRpcEndpoints(): string[] {
  const configured = CHAINLINK_RPC_CONFIG[PANCAKE_SWAP_V3_BNB_CHAIN_ID]?.endpoints ?? [];
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

function bnbPancakeSwapV3UsdtUsdcProfile(): UniswapV3MarketProfile {
  return {
    id: 'bnb-pancakeswap-v3-usdt-usdc-100',
    chainId: PANCAKE_SWAP_V3_BNB_CHAIN_ID,
    venue: 'pancakeswap-v3',
    market: 'USDT/USDC',
    factory: PANCAKE_SWAP_V3_BNB_FACTORY,
    quoterV2: PANCAKE_SWAP_V3_BNB_QUOTER_V2,
    pool: PANCAKE_SWAP_V3_BNB_USDT_USDC.pool,
    codeIdentity: {
      factory: PANCAKE_SWAP_V3_BNB_CODE_IDENTITY.factory,
      quoterV2: PANCAKE_SWAP_V3_BNB_CODE_IDENTITY.quoterV2,
      pool: PANCAKE_SWAP_V3_BNB_USDT_USDC.poolCodeHash,
    },
    // On this pool USDT sorts before USDC, so token0 is USDT. Both BSC
    // stablecoins use 18 decimals (unlike Base's 6-decimal USDC).
    token0: { address: PANCAKE_SWAP_V3_BNB_USDT, symbol: 'USDT', decimals: 18 },
    token1: { address: PANCAKE_SWAP_V3_BNB_USDC, symbol: 'USDC', decimals: 18 },
    feeTier: PANCAKE_SWAP_V3_BNB_USDT_USDC.feeTier,
    twapWindowSeconds: PANCAKE_SWAP_V3_BNB_USDT_USDC.twapWindowSeconds,
    quoteAmountsToken0: [100, 1_000, 10_000],
    rpcEndpoints: bnbRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

function bnbPancakeSwapV3UsdtWbnbProfile(): UniswapV3MarketProfile {
  return {
    id: 'bnb-pancakeswap-v3-usdt-wbnb-100',
    chainId: PANCAKE_SWAP_V3_BNB_CHAIN_ID,
    venue: 'pancakeswap-v3',
    market: 'USDT/WBNB',
    factory: PANCAKE_SWAP_V3_BNB_FACTORY,
    quoterV2: PANCAKE_SWAP_V3_BNB_QUOTER_V2,
    pool: PANCAKE_SWAP_V3_BNB_USDT_WBNB.pool,
    codeIdentity: {
      factory: PANCAKE_SWAP_V3_BNB_CODE_IDENTITY.factory,
      quoterV2: PANCAKE_SWAP_V3_BNB_CODE_IDENTITY.quoterV2,
      pool: PANCAKE_SWAP_V3_BNB_USDT_WBNB.poolCodeHash,
    },
    // USDT sorts before WBNB on this pool, so token0 is USDT — same ordering as
    // the reviewed BNB stable lane. Both tokens use 18 decimals.
    token0: { address: PANCAKE_SWAP_V3_BNB_USDT, symbol: 'USDT', decimals: 18 },
    token1: { address: PANCAKE_SWAP_V3_BNB_WBNB, symbol: 'WBNB', decimals: 18 },
    feeTier: PANCAKE_SWAP_V3_BNB_USDT_WBNB.feeTier,
    twapWindowSeconds: PANCAKE_SWAP_V3_BNB_USDT_WBNB.twapWindowSeconds,
    quoteAmountsToken0: [100, 1_000, 10_000],
    rpcEndpoints: bnbRpcEndpoints(),
    maxSourceAgeSeconds: 120,
    cacheTtlMs: 10_000,
  };
}

const REVIEWED_PROFILES: Record<ReviewedPancakeSwapV3ProfileId, () => UniswapV3MarketProfile> = {
  'base-pancakeswap-v3-usdc-usdt-100': basePancakeSwapV3UsdcUsdtProfile,
  'bnb-pancakeswap-v3-usdt-usdc-100': bnbPancakeSwapV3UsdtUsdcProfile,
  'bnb-pancakeswap-v3-usdt-wbnb-100': bnbPancakeSwapV3UsdtWbnbProfile,
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
