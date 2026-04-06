import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { bandProtocolSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import type { PriceData } from '@/types/oracle';
import { OracleProvider, Blockchain } from '@/types/oracle';

export interface BandProtocolClientConfig extends OracleClientConfig {
  rpcUrl?: string;
  restUrl?: string;
}

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.COSMOS,
    Blockchain.OSMOSIS,
    Blockchain.JUNO,
  ];

  defaultUpdateIntervalMinutes = 30;

  constructor(config?: BandProtocolClientConfig) {
    super(config);
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();

    if (upperSymbol === 'BAND') {
      try {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.BAND_PROTOCOL,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 8,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain,
            source: 'binance-api',
          };
        }
        throw this.createError(
          `Failed to fetch BAND price: no market data returned from Binance`,
          'BAND_PROTOCOL_PRICE_UNAVAILABLE'
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('BAND_PROTOCOL_PRICE_UNAVAILABLE')) {
          throw error;
        }
        throw this.createError(
          `Failed to fetch BAND price from Binance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'BAND_PROTOCOL_PRICE_FETCH_ERROR'
        );
      }
    }

    throw this.createError(
      `Symbol '${upperSymbol}' is not supported by Band Protocol client. Only BAND token is supported.`,
      'BAND_PROTOCOL_SYMBOL_NOT_SUPPORTED'
    );
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    _period: number = 24
  ): Promise<PriceData[]> {
    throw this.createError(
      'Band Protocol does not provide direct historical price feeds.',
      'BAND_PROTOCOL_NO_HISTORICAL_PRICES'
    );
  }

  getSupportedSymbols(): string[] {
    return [...bandProtocolSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = bandProtocolSymbols.includes(
      symbol.toUpperCase() as (typeof bandProtocolSymbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
