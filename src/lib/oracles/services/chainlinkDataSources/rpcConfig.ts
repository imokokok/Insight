import { ALCHEMY_RPC } from '@/lib/config/serverEnv';

export interface ChainlinkRPCConfig {
  endpoints: string[];
  chainId: number;
  name: string;
}

// Build RPC endpoint list, prioritizing Alchemy, then using reliable public nodes
function buildEndpoints(
  alchemyUrl: string,
  publicEndpoints: string[],
  preferAlchemy: boolean = true
): string[] {
  const hasAlchemy = alchemyUrl && alchemyUrl.length > 0;

  if (preferAlchemy && hasAlchemy) {
    // Alchemy priority mode: Alchemy first, then public nodes
    return [alchemyUrl, ...publicEndpoints];
  } else if (hasAlchemy) {
    // Public node priority mode (fallback)
    return [...publicEndpoints, alchemyUrl];
  } else {
    // No Alchemy available, using only public nodes
    return publicEndpoints;
  }
}

export const CHAINLINK_RPC_CONFIG: Record<number, ChainlinkRPCConfig> = {
  1: {
    endpoints: buildEndpoints(ALCHEMY_RPC.ethereum, [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://eth.drpc.org',
      'https://rpc.mevblocker.io',
    ]),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  42161: {
    endpoints: buildEndpoints(ALCHEMY_RPC.arbitrum, [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ]),
    chainId: 42161,
    name: 'Arbitrum One',
  },
  137: {
    endpoints: buildEndpoints(ALCHEMY_RPC.polygon, [
      'https://polygon.publicnode.com',
      'https://polygon-rpc.com',
    ]),
    chainId: 137,
    name: 'Polygon',
  },
  8453: {
    endpoints: buildEndpoints(ALCHEMY_RPC.base, [
      'https://mainnet.base.org',
      'https://base.publicnode.com',
      'https://base.drpc.org',
    ]),
    chainId: 8453,
    name: 'Base',
  },
  43114: {
    endpoints: buildEndpoints(ALCHEMY_RPC.avalanche, [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
      'https://rpc.ankr.com/avalanche',
    ]),
    chainId: 43114,
    name: 'Avalanche C-Chain',
  },
  56: {
    endpoints: buildEndpoints(ALCHEMY_RPC.bnb, [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://rpc.ankr.com/bsc',
    ]),
    chainId: 56,
    name: 'BNB Chain',
  },
  10: {
    // Optimism: Alchemy may not be enabled, prefer official RPC
    endpoints: [
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
      ...(ALCHEMY_RPC.optimism ? [ALCHEMY_RPC.optimism] : []),
    ],
    chainId: 10,
    name: 'Optimism',
  },
  143: {
    // Monad mainnet: Alchemy is preferred when configured; official endpoints
    // remain as an independent fallback. No Feed Registry is deployed here —
    // feed resolution goes through the committed catalog directory (network
    // key "143", seeded from the official Chainlink reference data directory
    // feeds-monad-mainnet.json).
    endpoints: buildEndpoints(ALCHEMY_RPC.monad, [
      'https://rpc.monad.xyz',
      'https://rpc1.monad.xyz',
      'https://rpc2.monad.xyz',
      'https://rpc3.monad.xyz',
      'https://rpc-mainnet.monadinfra.com',
    ]),
    chainId: 143,
    name: 'Monad',
  },
};
