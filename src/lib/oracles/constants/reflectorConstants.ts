import { STELLAR_CONFIG } from '@/lib/config/serverEnv';

export const REFLECTOR_CRYPTO_CONTRACT =
  STELLAR_CONFIG.reflectorCryptoContract ||
  'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN';

export const REFLECTOR_FOREX_CONTRACT =
  STELLAR_CONFIG.reflectorForexContract || 'CBKGDQGJ7GZNK2V2LGIXPR326H7F7K2MMG6WRVZJXYHONI4GJMCJZC';

export const STELLAR_RPC_URL = STELLAR_CONFIG.rpcUrl || 'https://rpc.ankr.com/stellar_soroban';

export const STELLAR_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

export const REFLECTOR_DEFAULT_ACCOUNT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

export const REFLECTOR_CRYPTO_ASSETS = [
  'BTC',
  'ETH',
  'USDT',
  'XRP',
  'SOL',
  'USDC',
  'ADA',
  'AVAX',
  'DOT',
  'LINK',
  'ATOM',
  'XLM',
  'UNI',
  'EURC',
] as const;

export const REFLECTOR_FOREX_ASSETS = ['EUR', 'GBP', 'CAD', 'BRL', 'JPY', 'CNY'] as const;

type ReflectorCryptoAsset = (typeof REFLECTOR_CRYPTO_ASSETS)[number];
type ReflectorForexAsset = (typeof REFLECTOR_FOREX_ASSETS)[number];
type ReflectorAsset = ReflectorCryptoAsset | ReflectorForexAsset;

export const REFLECTOR_ASSET_CONTRACT_MAP: Record<string, string> = {
  ...Object.fromEntries(REFLECTOR_CRYPTO_ASSETS.map((a) => [a, REFLECTOR_CRYPTO_CONTRACT])),
  ...Object.fromEntries(REFLECTOR_FOREX_ASSETS.map((a) => [a, REFLECTOR_FOREX_CONTRACT])),
};

export const REFLECTOR_CACHE_TTL = {
  PRICE: 30_000,
  METADATA: 300_000,
  ASSETS: 600_000,
} as const;

export const REFLECTOR_DEFAULT_DECIMALS = 14;

export const REFLECTOR_CONTRACT_METHODS = {
  LAST_PRICE: 'lastprice',
  PRICES: 'prices',
  DECIMALS: 'decimals',
  RESOLUTION: 'resolution',
  VERSION: 'version',
  ASSETS: 'assets',
  LAST_TIMESTAMP: 'last_timestamp',
  BASE: 'base',
  PERIOD: 'period',
  TWAP: 'twap',
} as const;

export const REFLECTOR_TIMEOUT_MS = 15_000;

const REFLECTOR_MAX_RETRIES = 3;
