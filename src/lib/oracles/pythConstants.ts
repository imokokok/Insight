export const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'PYTH/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433617f47b4d5d3a132b01d9dca6a9',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'DOT/USD': '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  'UNI/USD': '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d56834200e2a28e860bb308e3',
  'ARB/USD': '0x3fa4252848f9f0a1450fbbf801fcfc1778a2a91a5b11c13f5e2f5f8f8f8f8f8f',
  'OP/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'DOGE/USD': '0xdcef50dd0dbba52e4872c4a8c7b1b8c2a0f0e8e7a6b5c4d3e2f1a0b9c8d7e6f5',
  'XRP/USD': '0xec5d3c8a4b9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f',
  'ADA/USD': '0xa3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b',
  'BNB/USD': '0x2b27a4e8c8f9d1e8c9b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c',
};

export const HERMES_API_URL = 'https://hermes.pyth.network';
export const HERMES_WS_URL = 'wss://hermes.pyth.network/ws';
export const PYTHNET_RPC_URL = 'https://api.pythnet.pyth.network';

export const CACHE_TTL = {
  PRICE: 5000,
  PUBLISHERS: 60000,
  VALIDATORS: 60000,
  STATS: 30000,
  FEEDS: 300000,
  CROSS_CHAIN: 10000,
} as const;

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export function normalizeSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  const baseSymbol = upperSymbol.replace('/USD', '');
  return `${baseSymbol}/USD`;
}

export function getPriceIdForSymbol(symbol: string): string | undefined {
  return PYTH_PRICE_FEED_IDS[normalizeSymbol(symbol)];
}

export function getSymbolFromPriceId(priceId: string): string | null {
  for (const [symbol, id] of Object.entries(PYTH_PRICE_FEED_IDS)) {
    if (id === priceId) {
      return symbol;
    }
  }
  return null;
}
