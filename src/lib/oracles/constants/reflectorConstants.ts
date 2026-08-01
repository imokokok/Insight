import { resolveFeedAddress } from '@/lib/oracles/utils/dynamicFeedResolver';

// Contract addresses with hardcoded defaults.
// Server-side code should use STELLAR_CONFIG from serverEnv for env-driven values.
export const REFLECTOR_CRYPTO_CONTRACT = 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN';

export const REFLECTOR_FOREX_CONTRACT = 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC';

export const STELLAR_RPC_URL = 'https://rpc.ankr.com/stellar_soroban';

export const STELLAR_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

export const REFLECTOR_DEFAULT_ACCOUNT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

// Reflector active assets verified against live Stellar RPC on 2026-07-03.
// The contract only returns prices for the following crypto assets; all other
// previously listed assets (including the entire forex set) currently fail.
export const REFLECTOR_CRYPTO_ASSETS = [
  // Major Cryptocurrencies
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'ADA',
  'AVAX',
  'DOT',
  'LINK',
  'ATOM',
  'XLM', // Stellar native token
  'UNI',
  // Major Stablecoins
  'USDT',
  'USDC',
  'EURC', // Circle Euro Coin
] as const;

// Reflector's forex contract no longer returns data for the previously listed
// pairs. Kept empty until the feed set is restored or re-verified.
export const REFLECTOR_FOREX_ASSETS: string[] = [];

export const REFLECTOR_ASSET_CONTRACT_MAP: Record<string, string> = {
  ...Object.fromEntries(REFLECTOR_CRYPTO_ASSETS.map((a) => [a, REFLECTOR_CRYPTO_CONTRACT])),
  ...Object.fromEntries(REFLECTOR_FOREX_ASSETS.map((a) => [a, REFLECTOR_FOREX_CONTRACT])),
};

export const reflectorSymbols = [...REFLECTOR_CRYPTO_ASSETS, ...REFLECTOR_FOREX_ASSETS] as const;

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

export async function getReflectorContractIdAsync(symbol: string): Promise<string | null> {
  const upper = symbol.toUpperCase();
  try {
    const address = await resolveFeedAddress('reflector', upper, 0);
    if (address) return address;
  } catch {
    // Database lookup failed, fallback to hardcoded
  }
  return REFLECTOR_ASSET_CONTRACT_MAP[upper] || null;
}
