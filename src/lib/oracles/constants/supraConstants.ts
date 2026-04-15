export const SUPRA_DORA_REST_URL = 'https://rpc-mainnet-dora-2.supra.com';

export const SUPRA_KLINE_REST_URL = 'https://prod-kline-rest.supra.com';

export const SUPRA_CACHE_TTL = {
  PRICE: 10000,
  HISTORY: 60000,
} as const;

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
  INJ: 121,
  KAVA: 122,
  CAKE: 125,
  FXS: 128,
  CELO: 142,
  GRT: 163,
  TON: 164,
  WBTC: 166,
  STX: 167,
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
  WIF: 442,
  PEPE: 92,
  SUPRA: 500,
  MEME: 337,
  MNT: 136,
  RPL: 118,
  THETA: 120,
  GALA: 114,
  WETH: 211,
  STETH: 149,
  RETH: 291,
  FTM: 56,
  MKR: 11,
  XAUT: 250,
  PAXG: 169,
  ONDO: 301,
  TAO: 311,
  JUP: 361,
  ENA: 465,
  EIGEN: 494,
  ZRO: 486,
  IO: 487,
  ZK: 485,
  NOT: 483,
  BOME: 481,
  WLD: 130,
  AR: 131,
};

export const SUPRA_INDEX_TO_SYMBOL: Record<number, string> = Object.fromEntries(
  Object.entries(SUPRA_PAIR_INDEX_MAP).map(([symbol, index]) => [index, symbol])
);

export const SUPRA_SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SUPRA_PAIR_INDEX_MAP).map(([symbol]) => [symbol, `${symbol.toLowerCase()}_usdt`])
);

export const SUPRA_REVERSE_SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SUPRA_SYMBOL_MAP).map(([symbol, pair]) => [pair, symbol])
);

export const SUPRA_DEFAULT_PAIR_INDEXES = [0, 1, 10, 49, 14, 90, 104, 107, 80, 2];
