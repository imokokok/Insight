import { ALCHEMY_RPC } from '@/lib/config/serverEnv';

export interface TellorOracleConfig {
  address: `0x${string}`;
  chainId: number;
  name: string;
}

export interface TellorRPCConfig {
  endpoints: string[];
  chainId: number;
  name: string;
}

// Tellor Oracle 合约地址 (Playground / Main)
// 主网合约地址
export const TELLOR_ORACLE_ADDRESSES: Record<number, `0x${string}`> = {
  // Ethereum Mainnet - Tellor Flex Oracle
  1: '0x8cFc184c877154a8F9ffE0fe63561d8b39A16bf9',
  // Arbitrum
  42161: '0x8cFc184c877154a8F9ffE0fe63561d8b39A16bf9',
  // Optimism
  10: '0x8cFc184c877154a8F9ffE0fe63561d8b39A16bf9',
  // Polygon
  137: '0x8cFc184c877154a8F9ffE0fe63561d8b39A16bf9',
  // Base
  8453: '0x8cFc184c877154a8F9ffE0fe63561d8b39A16bf9',
  // Avalanche
  43114: '0x8cFc184c877154a8F9ffE0fe63561d8b39A16bf9',
  // Sepolia Testnet (用于开发和测试)
  11155111: '0xC866DB9021fe81856fF6c5B3E3514BF9D1593D81',
};

// 支持的 Token 及其 Query ID
// Query ID 是通过 keccak256(queryData) 计算得出的
export const TELLOR_PRICE_QUERIES: Record<
  string,
  { queryId: string; asset: string; currency: string }
> = {
  BTC: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000001',
    asset: 'btc',
    currency: 'usd',
  },
  ETH: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000002',
    asset: 'eth',
    currency: 'usd',
  },
  LINK: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000003',
    asset: 'link',
    currency: 'usd',
  },
  TRB: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000004',
    asset: 'trb',
    currency: 'usd',
  },
  USDC: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000005',
    asset: 'usdc',
    currency: 'usd',
  },
  USDT: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000006',
    asset: 'usdt',
    currency: 'usd',
  },
  DAI: {
    queryId: '0x0000000000000000000000000000000000000000000000000000000000000007',
    asset: 'dai',
    currency: 'usd',
  },
};

// RPC 配置
export const TELLOR_RPC_CONFIG: Record<number, TellorRPCConfig> = {
  1: {
    endpoints: [
      ALCHEMY_RPC.ethereum,
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
    ].filter(Boolean),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  42161: {
    endpoints: [
      ALCHEMY_RPC.arbitrum,
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
    ].filter(Boolean),
    chainId: 42161,
    name: 'Arbitrum',
  },
  10: {
    endpoints: [
      ALCHEMY_RPC.optimism,
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
    ].filter(Boolean),
    chainId: 10,
    name: 'Optimism',
  },
  137: {
    endpoints: [
      ALCHEMY_RPC.polygon,
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
    ].filter(Boolean),
    chainId: 137,
    name: 'Polygon',
  },
  8453: {
    endpoints: [ALCHEMY_RPC.base, 'https://mainnet.base.org', 'https://base.llamarpc.com'].filter(
      Boolean
    ),
    chainId: 8453,
    name: 'Base',
  },
  43114: {
    endpoints: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.llamarpc.com'],
    chainId: 43114,
    name: 'Avalanche',
  },
  11155111: {
    endpoints: ['https://rpc.sepolia.org', 'https://sepolia.drpc.org'],
    chainId: 11155111,
    name: 'Sepolia Testnet',
  },
};

// Tellor Oracle ABI (简化版，包含核心函数)
export const TELLOR_ORACLE_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: '_queryId', type: 'bytes32' }],
    name: 'getCurrentValue',
    outputs: [
      { internalType: 'bytes', name: '_value', type: 'bytes' },
      { internalType: 'uint256', name: '_timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_queryId', type: 'bytes32' }],
    name: 'getNewValueCountbyQueryId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_queryId', type: 'bytes32' },
      { internalType: 'uint256', name: '_index', type: 'uint256' },
    ],
    name: 'getTimestampbyQueryIdandIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_queryId', type: 'bytes32' },
      { internalType: 'uint256', name: '_timestamp', type: 'uint256' },
    ],
    name: 'retrieveData',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_queryId', type: 'bytes32' }],
    name: 'getTimeOfLastNewValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Tellor Playground API (用于获取历史数据)
export const TELLOR_PLAYGROUND_API = {
  BASE_URL: 'https://api.tellorscan.com',
  ENDPOINTS: {
    PRICE: '/price',
    HISTORY: '/history',
    REPORTER: '/reporter',
  },
};

export function getTellorOracleAddress(chainId: number): `0x${string}` | null {
  return TELLOR_ORACLE_ADDRESSES[chainId] || null;
}

export function getTellorPriceQuery(
  symbol: string
): { queryId: string; asset: string; currency: string } | null {
  return TELLOR_PRICE_QUERIES[symbol.toUpperCase()] || null;
}

export function getTellorRPCConfig(chainId: number): TellorRPCConfig | null {
  return TELLOR_RPC_CONFIG[chainId] || null;
}

export function isPriceQuerySupported(symbol: string): boolean {
  return symbol.toUpperCase() in TELLOR_PRICE_QUERIES;
}

export function getSupportedSymbols(): string[] {
  return Object.keys(TELLOR_PRICE_QUERIES);
}
