import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CoinGeckoMarketService');

export interface TokenMarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume24h: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d?: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  ath: number;
  athChangePercentage: number;
  atl: number;
  atlChangePercentage: number;
  lastUpdated: string;
}

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  marketCap?: number;
  volume?: number;
}

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * (i + 1) * 2;
          logger.warn(`Rate limited, waiting ${waitTime}ms...`);
          await delay(waitTime);
          continue;
        }
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i === retries - 1) {
        break;
      }

      logger.warn(`Fetch attempt ${i + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY * (i + 1));
    }
  }

  throw new Error(`Failed after ${retries} retries: ${lastError?.message}`);
}

const COINGECKO_IDS: Record<string, string> = {
  LINK: 'chainlink',
  ETH: 'ethereum',
  BTC: 'bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  BNB: 'binancecoin',
  ARB: 'arbitrum',
  OP: 'optimism',
  UNI: 'uniswap',
  AAVE: 'aave',
  BAND: 'band-protocol',
  PYTH: 'pyth-network',
  API3: 'api3',
  UMA: 'uma',
  TRB: 'tellor',
  DIA: 'dia-data',
};

export async function getTokenMarketData(symbol: string): Promise<TokenMarketData | null> {
  try {
    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    if (!coinId) {
      logger.warn(`Unknown symbol: ${symbol}`);
      return null;
    }

    logger.info(`Fetching market data for ${symbol} (${coinId})...`);

    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    );

    const data = await response.json();

    const marketData: TokenMarketData = {
      symbol: symbol.toUpperCase(),
      name: data.name,
      currentPrice: data.market_data.current_price.usd,
      marketCap: data.market_data.market_cap.usd,
      marketCapRank: data.market_cap_rank,
      totalVolume24h: data.market_data.total_volume.usd,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
      priceChange24h: data.market_data.price_change_24h,
      priceChangePercentage24h: data.market_data.price_change_percentage_24h,
      priceChangePercentage7d: data.market_data.price_change_percentage_7d,
      circulatingSupply: data.market_data.circulating_supply,
      totalSupply: data.market_data.total_supply,
      maxSupply: data.market_data.max_supply,
      ath: data.market_data.ath.usd,
      athChangePercentage: data.market_data.ath_change_percentage.usd,
      atl: data.market_data.atl.usd,
      atlChangePercentage: data.market_data.atl_change_percentage.usd,
      lastUpdated: data.last_updated,
    };

    logger.info(`Successfully fetched market data for ${symbol}`);
    return marketData;
  } catch (error) {
    logger.error(
      `Failed to fetch market data for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getMultipleTokensMarketData(symbols: string[]): Promise<TokenMarketData[]> {
  try {
    const ids = symbols
      .map((s) => COINGECKO_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(',');

    if (!ids) {
      logger.warn('No valid symbols provided');
      return [];
    }

    logger.info(`Fetching market data for multiple tokens: ${ids}`);

    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`
    );

    const dataArray = await response.json();

    const symbolToId = Object.fromEntries(
      Object.entries(COINGECKO_IDS).map(([sym, id]) => [id, sym])
    );

    return dataArray.map((data: any) => ({
      symbol: symbolToId[data.id] || data.symbol.toUpperCase(),
      name: data.name,
      currentPrice: data.current_price,
      marketCap: data.market_cap,
      marketCapRank: data.market_cap_rank,
      totalVolume24h: data.total_volume,
      high24h: data.high_24h,
      low24h: data.low_24h,
      priceChange24h: data.price_change_24h,
      priceChangePercentage24h: data.price_change_percentage_24h,
      priceChangePercentage7d: data.price_change_percentage_7d_in_currency,
      circulatingSupply: data.circulating_supply,
      totalSupply: data.total_supply,
      maxSupply: data.max_supply,
      ath: data.ath,
      athChangePercentage: data.ath_change_percentage,
      atl: data.atl,
      atlChangePercentage: data.atl_change_percentage,
      lastUpdated: data.last_updated,
    }));
  } catch (error) {
    logger.error(
      'Failed to fetch multiple tokens market data:',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getHistoricalPrices(
  symbol: string,
  days: number = 30
): Promise<HistoricalPricePoint[]> {
  try {
    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    if (!coinId) {
      logger.warn(`Unknown symbol: ${symbol}`);
      return [];
    }

    logger.info(`Fetching historical prices for ${symbol} (${days} days)...`);

    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );

    const data = await response.json();

    const prices: HistoricalPricePoint[] = data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));

    logger.info(`Successfully fetched ${prices.length} historical price points for ${symbol}`);
    return prices;
  } catch (error) {
    logger.error(
      `Failed to fetch historical prices for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getOHLCData(
  symbol: string,
  days: number = 30
): Promise<Array<{ timestamp: number; open: number; high: number; low: number; close: number }>> {
  try {
    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    if (!coinId) {
      logger.warn(`Unknown symbol: ${symbol}`);
      return [];
    }

    logger.info(`Fetching OHLC data for ${symbol} (${days} days)...`);

    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
    );

    const data = await response.json();

    const ohlcData = data.map(([timestamp, open, high, low, close]: number[]) => ({
      timestamp,
      open,
      high,
      low,
      close,
    }));

    logger.info(`Successfully fetched ${ohlcData.length} OHLC data points for ${symbol}`);
    return ohlcData;
  } catch (error) {
    logger.error(
      `Failed to fetch OHLC data for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export const coinGeckoMarketService = {
  getTokenMarketData,
  getMultipleTokensMarketData,
  getHistoricalPrices,
  getOHLCData,
};
