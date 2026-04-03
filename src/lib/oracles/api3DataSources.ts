export interface API3MarketEndpoints {
  dapis: string;
  airnodes: string;
  chains: string;
  beacons: string;
  templates: string;
}

export interface API3DAOEndpoints {
  staking: string;
  coverage: string;
  governance: string;
  token: string;
  stats: string;
}

export interface API3Contracts {
  api3Token: `0x${string}`;
  api3Pool: `0x${string}`;
  accessControlRegistry: `0x${string}`;
  api3ServerV1: `0x${string}`;
  dapiProxy: `0x${string}`;
}

export interface API3DataSourceConfig {
  market: {
    baseUrl: string;
    endpoints: API3MarketEndpoints;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  dao: {
    baseUrl: string;
    endpoints: API3DAOEndpoints;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  contracts: {
    mainnet: API3Contracts;
    arbitrum: Partial<API3Contracts>;
    polygon: Partial<API3Contracts>;
    base: Partial<API3Contracts>;
    avalanche: Partial<API3Contracts>;
    bnbChain: Partial<API3Contracts>;
  };
  websocket: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    pingInterval: number;
  };
}

export const API3_DATA_SOURCES: API3DataSourceConfig = {
  market: {
    baseUrl: process.env.NEXT_PUBLIC_API3_MARKET_API_URL || 'https://market.api3.org/api/v1',
    endpoints: {
      dapis: '/dapis',
      airnodes: '/airnodes',
      chains: '/chains',
      beacons: '/beacons',
      templates: '/templates',
    },
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  dao: {
    baseUrl: process.env.NEXT_PUBLIC_API3_DAO_API_URL || 'https://api.api3.org',
    endpoints: {
      staking: '/staking',
      coverage: '/coverage-pool',
      governance: '/governance',
      token: '/token',
      stats: '/stats',
    },
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  contracts: {
    mainnet: {
      api3Token: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
      api3Pool: '0x6dd6eC8DDc404Bbf2B09CAc9Bb4bEfA247F8E8E9',
      accessControlRegistry: '0x3Ee97c5FbA0C4a8Cf827F6E59c88e89A3bAB8E2f',
      api3ServerV1: '0x3dEC2E4EeB8D0C50B7a8E7cFf7a2B2d5b8F7D1A9',
      dapiProxy: '0x0A7CA0E12d08228E8aF6b5B5E5E5E5E5E5E5E5E5',
    },
    arbitrum: {
      api3Token: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
      api3Pool: '0x6dd6eC8DDc404Bbf2B09CAc9Bb4bEfA247F8E8E9',
    },
    polygon: {
      api3Token: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
      api3Pool: '0x6dd6eC8DDc404Bbf2B09CAc9Bb4bEfA247F8E8E9',
    },
    base: {
      api3Token: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
    },
    avalanche: {
      api3Token: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
    },
    bnbChain: {
      api3Token: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
    },
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_API3_WS_URL || 'wss://ws.api3.org',
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    pingInterval: 30000,
  },
};

export const API3_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  base: 8453,
  avalanche: 43114,
  bnbChain: 56,
  optimism: 10,
  fantom: 250,
};

export const API3_CHAIN_NAMES: Record<number, string> = {
  1: 'ethereum',
  42161: 'arbitrum',
  137: 'polygon',
  8453: 'base',
  43114: 'avalanche',
  56: 'bnbChain',
  10: 'optimism',
  250: 'fantom',
};

export function getAPI3BaseUrl(source: 'market' | 'dao'): string {
  return source === 'market' ? API3_DATA_SOURCES.market.baseUrl : API3_DATA_SOURCES.dao.baseUrl;
}

export function getAPI3Endpoint(
  source: 'market' | 'dao',
  endpoint: keyof API3MarketEndpoints | keyof API3DAOEndpoints
): string {
  const config = source === 'market' ? API3_DATA_SOURCES.market : API3_DATA_SOURCES.dao;
  const endpoints = config.endpoints as unknown as Record<string, string>;
  return `${config.baseUrl}${endpoints[endpoint] || ''}`;
}

export function getAPI3Contract(
  chain: keyof API3DataSourceConfig['contracts']
): API3Contracts | Partial<API3Contracts> {
  return API3_DATA_SOURCES.contracts[chain] || API3_DATA_SOURCES.contracts.mainnet;
}

export function isMockDataEnabled(): boolean {
  // Mock data has been removed, always return false
  return false;
}

export function getAPI3Config(): API3DataSourceConfig {
  return API3_DATA_SOURCES;
}
