import { PriceData, OracleProvider, Blockchain, OracleError } from '@/types/oracle';

export const MOCK_PRICES: Record<string, number> = {
  BTC: 68000,
  ETH: 3500,
  SOL: 180,
  BNB: 600,
  MATIC: 0.9,
  AVAX: 35,
  LINK: 15,
  UNI: 8,
  AAUE: 1,
  USDC: 1,
  USDT: 1,
  DAI: 1,
};

export function createMockPriceData(symbol: string, options: Partial<PriceData> = {}): PriceData {
  const basePrice = MOCK_PRICES[symbol] ?? 100;
  const volatility = 0.02;
  const randomChange = (Math.random() - 0.5) * 2 * volatility;
  const price = basePrice * (1 + randomChange);
  const change24hPercent = (Math.random() - 0.5) * 10;
  const change24h = basePrice * (change24hPercent / 100);

  return {
    provider: options.provider ?? ('chainlink' as OracleProvider),
    symbol,
    price: options.price ?? Number(price.toFixed(4)),
    timestamp: options.timestamp ?? Date.now(),
    decimals: options.decimals ?? 8,
    confidence: options.confidence ?? 0.95 + Math.random() * 0.05,
    chain: options.chain,
    change24h: options.change24h ?? Number(change24h.toFixed(4)),
    change24hPercent: options.change24hPercent ?? Number(change24hPercent.toFixed(2)),
  };
}

export function createMockHistoricalPriceData(
  symbol: string,
  options: {
    period?: number;
    basePrice?: number;
    chain?: Blockchain;
    provider?: OracleProvider;
  } = {}
): PriceData[] {
  const { period = 24, basePrice = MOCK_PRICES[symbol] ?? 100, chain, provider } = options;
  const prices: PriceData[] = [];
  const now = Date.now();
  const dataPoints = period * 4;
  const interval = (period * 60 * 60 * 1000) / dataPoints;

  let currentPrice = basePrice * (0.95 + Math.random() * 0.1);

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - 1 - i) * interval;
    const volatility = 0.002;
    const randomWalk = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + randomWalk);

    const maxPrice = basePrice * 1.2;
    const minPrice = basePrice * 0.8;
    currentPrice = Math.max(minPrice, Math.min(maxPrice, currentPrice));

    const change24hPercent = ((currentPrice - basePrice) / basePrice) * 100;
    const change24h = currentPrice - basePrice;

    prices.push({
      provider: provider ?? ('chainlink' as OracleProvider),
      symbol,
      price: Number(currentPrice.toFixed(4)),
      timestamp,
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
      chain,
      change24h: Number(change24h.toFixed(4)),
      change24hPercent: Number(change24hPercent.toFixed(2)),
    });
  }

  return prices;
}

export function createMockOracleError(
  message: string,
  provider?: OracleProvider,
  code?: string
): OracleError {
  return {
    message,
    provider: provider ?? ('chainlink' as OracleProvider),
    code,
  };
}

export function createMockPriceDataSet(
  symbols: string[],
  options: Partial<PriceData> = {}
): Record<string, PriceData> {
  const result: Record<string, PriceData> = {};
  symbols.forEach((symbol) => {
    result[symbol] = createMockPriceData(symbol, options);
  });
  return result;
}

export function createMockHistoricalPriceDataSet(
  symbols: string[],
  options: {
    period?: number;
    chain?: Blockchain;
    provider?: OracleProvider;
  } = {}
): Record<string, PriceData[]> {
  const result: Record<string, PriceData[]> = {};
  symbols.forEach((symbol) => {
    result[symbol] = createMockHistoricalPriceData(symbol, options);
  });
  return result;
}

export const COMMON_TEST_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'UNI'];

export const COMMON_TEST_CHAINS = [
  Blockchain.ETHEREUM,
  Blockchain.POLYGON,
  Blockchain.ARBITRUM,
  Blockchain.OPTIMISM,
];
