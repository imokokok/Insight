import { PriceData, OracleProvider, OracleError, Blockchain } from '@/lib/types/oracle';

export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]>;

  protected createError(message: string, code?: string): OracleError {
    return {
      message,
      provider: this.name,
      code,
    };
  }

  protected generateMockPrice(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    timestamp?: number
  ): PriceData {
    const chainVolatility: Record<Blockchain, number> = {
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
      [Blockchain.BINANCE]: 0.02,
      [Blockchain.BASE]: 0.022,
    };
    const volatility = chain ? chainVolatility[chain] : 0.02;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + randomChange);

    return {
      provider: this.name,
      chain,
      symbol,
      price: Number(price.toFixed(4)),
      timestamp: timestamp || Date.now(),
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
    };
  }

  protected generateMockHistoricalPrices(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    period: number = 24
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const interval = (period * 60 * 60 * 1000) / (period * 4);

    for (let i = 0; i < period * 4; i++) {
      const timestamp = now - i * interval;
      prices.push(this.generateMockPrice(symbol, basePrice, chain, timestamp));
    }

    return prices.reverse();
  }
}
