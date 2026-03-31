import { Blockchain, type PriceData, type OracleProvider } from '@/types/oracle';

const CHAIN_VOLATILITY: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: 0.02,
  [Blockchain.ARBITRUM]: 0.018,
  [Blockchain.OPTIMISM]: 0.022,
  [Blockchain.POLYGON]: 0.025,
  [Blockchain.SOLANA]: 0.03,
  [Blockchain.AVALANCHE]: 0.028,
  [Blockchain.FANTOM]: 0.032,
  [Blockchain.CRONOS]: 0.035,
  [Blockchain.JUNO]: 0.025,
  [Blockchain.COSMOS]: 0.022,
  [Blockchain.OSMOSIS]: 0.028,
  [Blockchain.BNB_CHAIN]: 0.02,
  [Blockchain.BASE]: 0.022,
  [Blockchain.SCROLL]: 0.024,
  [Blockchain.ZKSYNC]: 0.026,
  [Blockchain.APTOS]: 0.03,
  [Blockchain.SUI]: 0.032,
  [Blockchain.GNOSIS]: 0.02,
  [Blockchain.MANTLE]: 0.023,
  [Blockchain.LINEA]: 0.024,
  [Blockchain.CELESTIA]: 0.028,
  [Blockchain.INJECTIVE]: 0.035,
  [Blockchain.SEI]: 0.04,
  [Blockchain.TRON]: 0.025,
  [Blockchain.TON]: 0.028,
  [Blockchain.NEAR]: 0.026,
  [Blockchain.AURORA]: 0.024,
  [Blockchain.CELO]: 0.022,
  [Blockchain.STARKNET]: 0.024,
  [Blockchain.BLAST]: 0.026,
  [Blockchain.CARDANO]: 0.028,
  [Blockchain.POLKADOT]: 0.025,
  [Blockchain.KAVA]: 0.03,
  [Blockchain.MOONBEAM]: 0.027,
  [Blockchain.STARKEX]: 0.024,
};

const CHAIN_VOLATILITY_HISTORICAL: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: 0.002,
  [Blockchain.ARBITRUM]: 0.0018,
  [Blockchain.OPTIMISM]: 0.0022,
  [Blockchain.POLYGON]: 0.0025,
  [Blockchain.SOLANA]: 0.003,
  [Blockchain.AVALANCHE]: 0.0028,
  [Blockchain.FANTOM]: 0.0032,
  [Blockchain.CRONOS]: 0.0035,
  [Blockchain.JUNO]: 0.0025,
  [Blockchain.COSMOS]: 0.0022,
  [Blockchain.OSMOSIS]: 0.0028,
  [Blockchain.BNB_CHAIN]: 0.002,
  [Blockchain.BASE]: 0.0022,
  [Blockchain.SCROLL]: 0.0024,
  [Blockchain.ZKSYNC]: 0.0026,
  [Blockchain.APTOS]: 0.003,
  [Blockchain.SUI]: 0.0032,
  [Blockchain.GNOSIS]: 0.002,
  [Blockchain.MANTLE]: 0.0023,
  [Blockchain.LINEA]: 0.0024,
  [Blockchain.CELESTIA]: 0.0028,
  [Blockchain.INJECTIVE]: 0.0035,
  [Blockchain.SEI]: 0.004,
  [Blockchain.TRON]: 0.0025,
  [Blockchain.TON]: 0.0028,
  [Blockchain.NEAR]: 0.0026,
  [Blockchain.AURORA]: 0.0024,
  [Blockchain.CELO]: 0.0022,
  [Blockchain.STARKNET]: 0.0024,
  [Blockchain.BLAST]: 0.0026,
  [Blockchain.CARDANO]: 0.0028,
  [Blockchain.POLKADOT]: 0.0025,
  [Blockchain.KAVA]: 0.003,
  [Blockchain.MOONBEAM]: 0.0027,
  [Blockchain.STARKEX]: 0.0024,
};

export function generateMockPrice(
  provider: OracleProvider,
  symbol: string,
  basePrice: number,
  chain?: Blockchain,
  timestamp?: number
): PriceData {
  const volatility =
    chain && CHAIN_VOLATILITY[chain] !== undefined ? CHAIN_VOLATILITY[chain] : 0.02;
  const randomChange = (Math.random() - 0.5) * 2 * volatility;
  const price = basePrice * (1 + randomChange);

  const change24hPercent = (Math.random() - 0.5) * 10;
  const change24h = basePrice * (change24hPercent / 100);

  return {
    provider,
    chain,
    symbol,
    price: Number(price.toFixed(4)),
    timestamp: timestamp || Date.now(),
    decimals: 8,
    confidence: 0.95 + Math.random() * 0.05,
    change24h: Number(change24h.toFixed(4)),
    change24hPercent: Number(change24hPercent.toFixed(2)),
  };
}

export function generateMockHistoricalPrices(
  provider: OracleProvider,
  symbol: string,
  basePrice: number,
  chain?: Blockchain,
  period: number = 24
): PriceData[] {
  const prices: PriceData[] = [];
  const now = Date.now();
  const dataPoints = period * 4;
  const interval = (period * 60 * 60 * 1000) / dataPoints;

  const volatility =
    chain && CHAIN_VOLATILITY_HISTORICAL[chain] !== undefined
      ? CHAIN_VOLATILITY_HISTORICAL[chain]
      : 0.002;

  const trendDirection = Math.random() > 0.6 ? 1 : Math.random() > 0.6 ? -1 : 0;
  const trendStrength = 0.0003 * trendDirection;

  let currentPrice = basePrice * (0.95 + Math.random() * 0.1);

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - 1 - i) * interval;

    const randomWalk = (Math.random() - 0.5) * 2 * volatility;
    const trendComponent = trendStrength * (1 + Math.sin((i / dataPoints) * Math.PI) * 0.5);

    currentPrice = currentPrice * (1 + randomWalk + trendComponent);

    const maxPrice = basePrice * 1.2;
    const minPrice = basePrice * 0.8;
    currentPrice = Math.max(minPrice, Math.min(maxPrice, currentPrice));

    const change24hPercent = ((currentPrice - basePrice) / basePrice) * 100;
    const change24h = currentPrice - basePrice;

    prices.push({
      provider,
      chain,
      symbol,
      price: Number(currentPrice.toFixed(4)),
      timestamp,
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
      change24h: Number(change24h.toFixed(4)),
      change24hPercent: Number(change24hPercent.toFixed(2)),
    });
  }

  return prices;
}
