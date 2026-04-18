import {
  type OracleMarketData,
  type AssetData,
  type TVSTrendData,
} from '@/lib/services/marketData/types';
import { createLogger } from '@/lib/utils/logger';

import {
  binanceMarketService,
  type TokenMarketData,
  type HistoricalPricePoint,
} from './binanceMarketService';
import {
  fetchOraclesData,
  fetchAssetsData,
  checkApiHealth,
  fetchChainBreakdown,
  fetchProtocolDetails,
  fetchAssetCategories,
  fetchComparisonData,
  fetchBenchmarkData,
  calculateCorrelation,
  fetchRadarData,
  MarketDataError,
} from './defiLlamaApi';
import {
  performanceMetricsCalculator,
  calculateMetricsFromPriceData,
  type PriceDataPoint,
  type ReferencePricePoint,
  type OraclePerformanceMetrics,
} from './performanceMetrics';
import { generateTVSTrendData } from './priceCalculations';
import { fetchRiskMetrics, fetchHHI, fetchDiversificationScore } from './riskCalculations';

const logger = createLogger('marketData');

interface MarketDataResponse {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  lastUpdated: Date;
  error?: string;
}

async function fetchMarketData(timeRangeHours: number = 720): Promise<MarketDataResponse> {
  const startTime = Date.now();

  try {
    logger.info('Fetching complete market data...');

    const [oracleData, assets] = await Promise.all([fetchOraclesData(), fetchAssetsData()]);

    const trendData = generateTVSTrendData(timeRangeHours, oracleData);

    const duration = Date.now() - startTime;
    logger.info(`Market data fetched successfully in ${duration}ms`);

    return {
      oracleData,
      assets,
      trendData,
      lastUpdated: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Failed to fetch market data',
      error instanceof Error ? error : new Error(errorMessage)
    );

    return {
      oracleData: [],
      assets: [],
      trendData: [],
      lastUpdated: new Date(),
      error: errorMessage,
    };
  }
}

export { performanceMetricsCalculator };
