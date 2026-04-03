import { ALCHEMY_RPC } from '@/lib/config/serverEnv';

export interface ChroniclePriceFeed {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  category: 'crypto' | 'fiat' | 'commodity';
}

export interface ChronicleContracts {
  validatorRegistry?: `0x${string}`;
  stakingContract?: `0x${string}`;
}

export interface ChronicleRPCConfig {
  endpoints: string[];
  chainId: number;
  name: string;
}

// Chronicle (MakerDAO Oracle) Price Feed Addresses
// Source: https://chroniclelabs.org/
export const CHRONICLE_PRICE_FEEDS: Record<string, Record<number, ChroniclePriceFeed>> = {
  ETH: {
    1: {
      address: '0x46ef007e1d6a1d8cd893a3c5b0e17b4a8f5a6c8e',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 18,
      category: 'crypto',
    },
  },
  BTC: {
    1: {
      address: '0xe0f5b8f5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 18,
      category: 'crypto',
    },
  },
  DAI: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'DAI / USD',
      symbol: 'DAI',
      decimals: 18,
      category: 'fiat',
    },
  },
  MKR: {
    1: {
      address: '0xdb3a3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e',
      name: 'MKR / USD',
      symbol: 'MKR',
      decimals: 18,
      category: 'crypto',
    },
  },
  USDC: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'USDC / USD',
      symbol: 'USDC',
      decimals: 18,
      category: 'fiat',
    },
  },
  USDT: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'USDT / USD',
      symbol: 'USDT',
      decimals: 18,
      category: 'fiat',
    },
  },
  LINK: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 18,
      category: 'crypto',
    },
  },
  WBTC: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'WBTC / USD',
      symbol: 'WBTC',
      decimals: 18,
      category: 'crypto',
    },
  },
  STETH: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'stETH / USD',
      symbol: 'STETH',
      decimals: 18,
      category: 'crypto',
    },
  },
  WSTETH: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'wstETH / USD',
      symbol: 'WSTETH',
      decimals: 18,
      category: 'crypto',
    },
  },
  RETH: {
    1: {
      address: '0x5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
      name: 'rETH / USD',
      symbol: 'RETH',
      decimals: 18,
      category: 'crypto',
    },
  },
};

export const CHRONICLE_RPC_CONFIG: Record<number, ChronicleRPCConfig> = {
  1: {
    endpoints: [
      ALCHEMY_RPC.ethereum,
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
    ].filter(Boolean),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  42161: {
    endpoints: [
      ALCHEMY_RPC.arbitrum,
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ].filter(Boolean),
    chainId: 42161,
    name: 'Arbitrum One',
  },
  137: {
    endpoints: [
      ALCHEMY_RPC.polygon,
      'https://polygon-rpc.com',
      'https://polygon.publicnode.com',
    ].filter(Boolean),
    chainId: 137,
    name: 'Polygon',
  },
  8453: {
    endpoints: [ALCHEMY_RPC.base, 'https://mainnet.base.org', 'https://base.publicnode.com'].filter(
      Boolean
    ),
    chainId: 8453,
    name: 'Base',
  },
  10: {
    endpoints: [
      ALCHEMY_RPC.optimism,
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
    ].filter(Boolean),
    chainId: 10,
    name: 'Optimism',
  },
};

// Chronicle Oracle ABI - Minimal for reading prices
export const CHRONICLE_ORACLE_ABI = [
  {
    inputs: [],
    name: 'read',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'peek',
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'wat',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'bar',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'bud',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// MakerDAO DSS (DAI Stablecoin System) ABI for Vault data
export const MAKER_DSS_ABI = [
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'ilks',
    outputs: [
      { name: 'Art', type: 'uint256' },
      { name: 'rate', type: 'uint256' },
      { name: 'spot', type: 'uint256' },
      { name: 'line', type: 'uint256' },
      { name: 'dust', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'Line',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'debt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'surplus',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// MakerDAO Vat contract address (CDP Engine)
export const MAKER_DSS_CONTRACTS: Record<number, { vat: `0x${string}`; pot?: `0x${string}` }> = {
  1: {
    vat: '0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B',
    pot: '0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7',
  },
};

export function getChroniclePriceFeed(symbol: string, chainId: number): ChroniclePriceFeed | null {
  const feeds = CHRONICLE_PRICE_FEEDS[symbol.toUpperCase()];
  if (!feeds) return null;
  return feeds[chainId] || null;
}

export function getChronicleRPCConfig(chainId: number): ChronicleRPCConfig | null {
  return CHRONICLE_RPC_CONFIG[chainId] || null;
}

export function getMakerDSSContracts(
  chainId: number
): { vat: `0x${string}`; pot?: `0x${string}` } | null {
  return MAKER_DSS_CONTRACTS[chainId] || null;
}

export function getSupportedSymbols(): string[] {
  return Object.keys(CHRONICLE_PRICE_FEEDS);
}

export function isPriceFeedSupported(symbol: string, chainId: number): boolean {
  return getChroniclePriceFeed(symbol, chainId) !== null;
}
