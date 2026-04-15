declare module 'supra-oracle-sdk' {
  interface SupraOracleClientOptions {
    restAddress?: string;
    chainType?: string;
    history?: {
      enabled: boolean;
      apiKey: string;
      baseUrl?: string;
    };
  }

  interface OraclePriceFeed {
    pairIndex: string;
    price: string;
    decimals: string;
    timestamp: string;
  }

  interface HistoricalPriceOptions {
    tradingPair: string;
    startDate: number;
    endDate: number;
    interval: number;
  }

  interface OHLCDataPoint {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }

  interface HistoricalPriceResponse {
    data: OHLCDataPoint[];
  }

  class SupraOracleClient {
    constructor(options: SupraOracleClientOptions);
    getOracleData(pairIndexes: number[]): Promise<OraclePriceFeed[]>;
    getHistoricalPrices(options: HistoricalPriceOptions): Promise<HistoricalPriceResponse>;
  }

  export = SupraOracleClient;
}
