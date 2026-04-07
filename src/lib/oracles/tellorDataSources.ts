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

// Tellor Oracle 合约地址
// 参考: https://github.com/tellor-io/tellor-contracts
// 主网合约地址 - Tellor 360 Oracle
export const TELLOR_ORACLE_ADDRESSES: Record<number, `0x${string}`> = {
  // Ethereum Mainnet - Tellor Oracle
  1: '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0',
  // Arbitrum
  42161: '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0',
  // Optimism
  10: '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0',
  // Polygon
  137: '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0',
  // Base
  8453: '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0',
  // Avalanche
  43114: '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0',
  // Sepolia Testnet (用于开发和测试)
  11155111: '0xC866DB9021fe81856fF6c5B3E3514BF9D1593D81',
};

// 支持的 Token 及其 Query ID
// Query ID 是通过 keccak256(queryData) 计算得出的
// 参考: https://github.com/tellor-io/dataSpecs/blob/main/types/SpotPrice.md
export const TELLOR_PRICE_QUERIES: Record<
  string,
  { queryId: string; asset: string; currency: string }
> = {
  BTC: {
    // SpotPrice(btc, usd) - keccak256(abi.encode("SpotPrice", abi.encode("btc", "usd")))
    queryId: '0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac',
    asset: 'btc',
    currency: 'usd',
  },
  ETH: {
    // SpotPrice(eth, usd)
    queryId: '0x83a7f3d48786ac2667503a61e8c415438ed2922eb86a2906e4ee66d9bb2cb49a',
    asset: 'eth',
    currency: 'usd',
  },
  LINK: {
    // SpotPrice(link, usd)
    queryId: '0x5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0',
    asset: 'link',
    currency: 'usd',
  },
  TRB: {
    // SpotPrice(trb, usd)
    queryId: '0x5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0',
    asset: 'trb',
    currency: 'usd',
  },
};

// RPC 配置
export const TELLOR_RPC_CONFIG: Record<number, TellorRPCConfig> = {
  1: {
    endpoints: [
      ALCHEMY_RPC.ethereum,
      'https://ethereum-rpc.publicnode.com',
      'https://rpc.mevblocker.io',
      'https://eth.drpc.org',
      'https://eth.llamarpc.com',
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
