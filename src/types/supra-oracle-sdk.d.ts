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
    pairIndex: number;
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

  class SupraOracleClient {
    history: {
      enabled: boolean;
      apiKey: string;
      baseUrl?: string;
    };
    constructor(options: SupraOracleClientOptions);
    getOracleData(pairIndexes: number[]): Promise<OraclePriceFeed[]>;
    getHistoricalPrices(options: HistoricalPriceOptions): Promise<OHLCDataPoint[]>;
  }

  export = SupraOracleClient;
}
