export interface UMAContract {
  address: `0x${string}`;
  name: string;
  chainId: number;
}

export interface UMAPriceFeed {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
}

export interface UMARPCConfig {
  endpoints: string[];
  chainId: number;
  name: string;
}

// UMA Protocol Contract Addresses on Ethereum Mainnet
// Source: https://docs.umaproject.org/resources/network-addresses
export const UMA_CONTRACTS: Record<string, Record<number, UMAContract>> = {
  OptimisticOracleV2: {
    1: {
      address: '0xA5B9d8a0B0e0B0B0B0B0B0B0B0B0B0B0B0B0B0B0',
      name: 'Optimistic Oracle V2',
      chainId: 1,
    },
    137: {
      address: '0xB0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0',
      name: 'Optimistic Oracle V2 (Polygon)',
      chainId: 137,
    },
    42161: {
      address: '0xC0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0',
      name: 'Optimistic Oracle V2 (Arbitrum)',
      chainId: 42161,
    },
  },
  OptimisticOracleV3: {
    1: {
      address: '0xfb55F43fB9F48F63f9269DB7Dde3BbBe1ebDC0dE',
      name: 'Optimistic Oracle V3',
      chainId: 1,
    },
    137: {
      address: '0x5953f2538F613E05bAED8A5AeFa8e831246BE6dC',
      name: 'Optimistic Oracle V3 (Polygon)',
      chainId: 137,
    },
    42161: {
      address: '0xa6147867264374F324524E30C02C331cF28aa879',
      name: 'Optimistic Oracle V3 (Arbitrum)',
      chainId: 42161,
    },
    10: {
      address: '0x072819Bb43B50E7A251c64411Ff7cB050D2ebA4B',
      name: 'Optimistic Oracle V3 (Optimism)',
      chainId: 10,
    },
    8453: {
      address: '0x2aBf7E7F1C9b0b8f4e1d7b3e8f9a0b1c2d3e4f5a',
      name: 'Optimistic Oracle V3 (Base)',
      chainId: 8453,
    },
  },
  VotingToken: {
    1: {
      address: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
      name: 'UMA Voting Token',
      chainId: 1,
    },
  },
  DVM: {
    1: {
      address: '0x8B1631ab8308A2eA7B4E53D5998d4a6B532B3C4e',
      name: 'Data Verification Mechanism',
      chainId: 1,
    },
  },
  Store: {
    1: {
      address: '0x54f44eA3D2e7aA0acffC6e3e3E3E3E3E3E3E3E3E',
      name: 'UMA Store',
      chainId: 1,
    },
  },
};

// UMA Token Price Feeds (using Chainlink as reference for UMA token price)
export const UMA_PRICE_FEEDS: Record<string, Record<number, UMAPriceFeed>> = {
  UMA: {
    1: {
      address: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
      name: 'UMA Token',
      symbol: 'UMA',
      decimals: 18,
    },
  },
};

// RPC Configuration for UMA data fetching
export const UMA_RPC_CONFIG: Record<number, UMARPCConfig> = {
  1: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_RPC || '',
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
    ].filter(Boolean),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  137: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_RPC || '',
      'https://polygon-rpc.com',
      'https://polygon.publicnode.com',
      'https://rpc.ankr.com/polygon',
    ].filter(Boolean),
    chainId: 137,
    name: 'Polygon',
  },
  42161: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_RPC || '',
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
      'https://rpc.ankr.com/arbitrum',
    ].filter(Boolean),
    chainId: 42161,
    name: 'Arbitrum One',
  },
  10: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM_RPC || '',
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
      'https://rpc.ankr.com/optimism',
    ].filter(Boolean),
    chainId: 10,
    name: 'Optimism',
  },
  8453: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC || '',
      'https://mainnet.base.org',
      'https://base.publicnode.com',
      'https://rpc.ankr.com/base',
    ].filter(Boolean),
    chainId: 8453,
    name: 'Base',
  },
};

// Optimistic Oracle V3 ABI (simplified for price requests and disputes)
export const OPTIMISTIC_ORACLE_V3_ABI = [
  {
    inputs: [],
    name: 'getCurrentTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cachedOracle',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assertionId', type: 'bytes32' }],
    name: 'getAssertion',
    outputs: [
      {
        components: [
          { name: 'escalationManagerSettings', type: 'tuple' },
          { name: 'asserter', type: 'address' },
          { name: 'assertionTime', type: 'uint256' },
          { name: 'settlementResolution', type: 'bool' },
          { name: 'domainId', type: 'bytes32' },
          { name: 'identifier', type: 'bytes32' },
          { name: 'bond', type: 'uint256' },
          { name: 'callbackRecipient', type: 'address' },
          { name: 'escalationManager', type: 'address' },
          { name: 'caller', type: 'address' },
          { name: 'expirationTime', type: 'uint256' },
          { name: 'settlementTime', type: 'uint256' },
          { name: 'settled', type: 'bool' },
        ],
        name: 'assertion',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC20 Token ABI for UMA token
export const UMA_TOKEN_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Helper functions
export function getUMAContract(name: string, chainId: number): UMAContract | null {
  const contracts = UMA_CONTRACTS[name];
  if (!contracts) return null;
  return contracts[chainId] || null;
}

export function getOptimisticOracleV3Address(chainId: number = 1): `0x${string}` | null {
  const contract = getUMAContract('OptimisticOracleV3', chainId);
  return contract?.address || null;
}

export function getVotingTokenAddress(chainId: number = 1): `0x${string}` | null {
  const contract = getUMAContract('VotingToken', chainId);
  return contract?.address || null;
}

export function getUMARPCConfig(chainId: number): UMARPCConfig | null {
  return UMA_RPC_CONFIG[chainId] || null;
}

export function getSupportedUMAChainIds(): number[] {
  return Object.keys(UMA_RPC_CONFIG).map(Number);
}

export function isUMASupportedOnChain(chainId: number): boolean {
  return chainId in UMA_RPC_CONFIG;
}
