export const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'PYTH/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'DOT/USD': '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  'UNI/USD': '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  'BNB/USD': '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'ARB/USD': '0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
  'OP/USD': '0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf',
  'ATOM/USD': '0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819',
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
