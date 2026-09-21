/** BandChain v3 public REST endpoint documented by Band Protocol. */
export const BAND_V3_API_BASE_URL = 'https://laozi1.bandchain.org/api';

export const BAND_MAX_FUTURE_SKEW_SECONDS = 5 * 60;
export const BAND_PRICE_DECIMALS = 9;
export const BAND_REQUEST_TIMEOUT_MS = 8_000;
export const BAND_CACHE_TTL_MS = 15_000;

const BAND_FIAT_SYMBOLS = new Set([
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'EUR',
  'GBP',
  'HKD',
  'INR',
  'JPY',
  'KRW',
  'MYR',
  'NZD',
  'PHP',
  'PLN',
  'RUB',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'XAU',
]);

/** Snapshot of symbols currently signalled by BandChain v3. Live discovery
 * refreshes the database from /feeds/v1beta1/current_feeds; this list is the
 * fail-safe used when the registry or discovery job is unavailable. */
export const bandSymbols = [
  '1INCH',
  'AAVE',
  'ADA',
  'ASTR',
  'ATOM',
  'AVAX',
  'BAND',
  'BAT',
  'BNB',
  'BTC',
  'BTT',
  'CAKE',
  'CELO',
  'COTI',
  'CRO',
  'CRV',
  'DAI',
  'DOGE',
  'DOT',
  'DYDX',
  'ETH',
  'FLOW',
  'GCOTI',
  'GLMR',
  'ICX',
  'INJ',
  'JST',
  'KNC',
  'LINK',
  'LTC',
  'NFT',
  'NIGHT',
  'OKB',
  'ONE',
  'OP',
  'OSMO',
  'POL',
  'PYUSD',
  'RLUSD',
  'ROSE',
  'S',
  'SCRT',
  'SHIB',
  'SOL',
  'SUI',
  'SUN',
  'SUSHI',
  'TIA',
  'TRX',
  'TUSD',
  'UNI',
  'USDC',
  'USDT',
  'WBTC',
  'XLM',
  'XRP',
  ...BAND_FIAT_SYMBOLS,
] as const;

export function getBandSignalId(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase().split('/')[0];
  if (!(bandSymbols as readonly string[]).includes(normalized)) return null;
  return `${BAND_FIAT_SYMBOLS.has(normalized) ? 'FS' : 'CS'}:${normalized}-USD`;
}

export function parseBandSignalId(signalId: string): { symbol: string; quote: string } | null {
  const match = /^(?:CS|FS):([A-Z0-9]+)-([A-Z0-9]+)$/.exec(signalId);
  if (!match) return null;
  return { symbol: match[1], quote: match[2] };
}
