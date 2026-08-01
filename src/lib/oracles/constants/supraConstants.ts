import { resolveFeed } from '@/lib/oracles/utils/dynamicFeedResolver';

export const SUPRA_DORA_REST_URL = 'https://rpc-mainnet-dora-2.supra.com';

export const SUPRA_CACHE_TTL = {
  PRICE: 10000,
  HISTORY: 60000,
} as const;

// Supra trading pair index mapping (based on actual verification results - 2026-04-16)
// Note: MKR (index: 11) and FTM (index: 56) have been removed because data cannot be fetched
export const supraSymbols = [
  'AAVE',
  'ADA',
  'APE',
  'APT',
  'AR',
  'ARB',
  'AVAX',
  'AXS',
  'BAL',
  'BCH',
  'BLUR',
  'BNB',
  'BOME',
  'BONK',
  'BTC',
  'CAKE',
  'CELO',
  'COMP',
  'CRV',
  'CVX',
  'DAI',
  'DOGE',
  'DOT',
  'DYDX',
  'EIGEN',
  'ENA',
  'ENS',
  'ETC',
  'ETH',
  'FET',
  'FIL',
  'FLOKI',
  'FXS',
  'GALA',
  'GMX',
  'GRT',
  'HBAR',
  'ICP',
  'IMX',
  'INJ',
  'IO',
  'JUP',
  'KAVA',
  'LINK',
  'LTC',
  'MANA',
  'MEME',
  'MNT',
  'NEAR',
  'NOT',
  'ONDO',
  'OP',
  'PAXG',
  'PEPE',
  'MATIC',
  'PYTH',
  'RETH',
  'RNDR',
  'RPL',
  'RUNE',
  'SAND',
  'SEI',
  'SHIB',
  'SNX',
  'SOL',
  'STETH',
  'STX',
  'SUI',
  'SUPRA',
  'SUSHI',
  'TAO',
  'THETA',
  'TIA',
  'TON',
  'TRX',
  'UMA',
  'UNI',
  'WBTC',
  'WETH',
  'WIF',
  'WLD',
  'XAUT',
  'XLM',
  'XRP',
  'YFI',
  'ZK',
  'ZRO',
] as const;

export const SUPRA_PAIR_INDEX_MAP: Record<string, number> = {
  BTC: 0,
  ETH: 1,
  LINK: 2,
  DOGE: 3,
  BCH: 4,
  AVAX: 5,
  DOT: 6,
  AAVE: 7,
  UNI: 8,
  LTC: 9,
  SOL: 10,
  COMP: 12,
  SUSHI: 13,
  XRP: 14,
  TRX: 15,
  ADA: 16,
  SNX: 22,
  YFI: 23,
  FIL: 24,
  ETC: 26,
  CRV: 35,
  MANA: 37,
  DAI: 41,
  XLM: 42,
  BNB: 49,
  BAL: 57,
  RUNE: 61,
  UMA: 74,
  HBAR: 75,
  ARB: 80,
  PEPE: 92,
  SUI: 90,
  SHIB: 102,
  APE: 103,
  APT: 104,
  DYDX: 105,
  ICP: 106,
  OP: 107,
  NEAR: 108,
  AXS: 109,
  IMX: 110,
  SAND: 111,
  RNDR: 112,
  GALA: 114,
  RPL: 118,
  THETA: 120,
  INJ: 121,
  KAVA: 122,
  CAKE: 125,
  FXS: 128,
  WLD: 130,
  AR: 131,
  MNT: 136,
  CELO: 142,
  STETH: 149,
  GRT: 163,
  TON: 164,
  WBTC: 166,
  STX: 167,
  PAXG: 169,
  BLUR: 177,
  CVX: 182,
  PYTH: 183,
  ENS: 187,
  GMX: 189,
  FET: 191,
  FLOKI: 192,
  POL: 197,
  BONK: 199,
  TIA: 205,
  SEI: 208,
  WETH: 211,
  XAUT: 250,
  RETH: 291,
  ONDO: 301,
  TAO: 311,
  MEME: 337,
  JUP: 361,
  ENA: 465,
  BOME: 481,
  NOT: 483,
  ZK: 485,
  ZRO: 486,
  IO: 487,
  WIF: 442,
  EIGEN: 494,
  SUPRA: 500,
};

export const SUPRA_INDEX_TO_SYMBOL: Record<number, string> = Object.fromEntries(
  Object.entries(SUPRA_PAIR_INDEX_MAP).map(([symbol, index]) => [index, symbol])
);

export async function getSupraPairIndexAsync(symbol: string): Promise<number | null> {
  const upperSymbol = symbol.toUpperCase();

  // Database-first: prefer the DB value so feed-discovery updates take effect.
  try {
    const feed = await resolveFeed('supra', upperSymbol, 0);
    if (feed) {
      const pairIndex =
        typeof feed.metadata?.pairIndex === 'number'
          ? (feed.metadata.pairIndex as number)
          : parseInt(feed.address, 10);
      if (!isNaN(pairIndex)) {
        return pairIndex;
      }
    }
  } catch {
    // Database lookup failed, fall through to hardcoded
  }

  // Hardcoded fallback when database is unavailable or has no entry.
  const hardcodedIndex = SUPRA_PAIR_INDEX_MAP[upperSymbol];
  if (hardcodedIndex !== undefined) {
    return hardcodedIndex;
  }

  return null;
}
