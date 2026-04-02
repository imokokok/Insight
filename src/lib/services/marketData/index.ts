import {
  type OracleMarketData,
  type AssetData,
  type TVSTrendData,
} from '@/app/[locale]/market-overview/types';
import { createLogger } from '@/lib/utils/logger';

import { detectAnomalies } from './anomalyCalculations';
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
  generateTVSTrendData,
  exportWithConfig,
  downloadExport,
  type ExportDataOptions,
} from './priceCalculations';
import { fetchRiskMetrics, fetchHHI, fetchDiversificationScore } from './riskCalculations';
import {
  performanceMetricsCalculator,
  calculateMetricsFromPriceData,
  type PriceDataPoint,
  type ReferencePricePoint,
  type OraclePerformanceMetrics,
} from './performanceMetrics';

const logger = createLogger('marketData');

export interface MarketDataResponse {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  lastUpdated: Date;
  error?: string;
}

export async function fetchMarketData(timeRangeHours: number = 720): Promise<MarketDataResponse> {
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

export {
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
};

export { generateTVSTrendData, exportWithConfig, downloadExport };

export type { ExportDataOptions };

export { fetchRiskMetrics, fetchHHI, fetchDiversificationScore };

export { detectAnomalies };

export {
  performanceMetricsCalculator,
  calculateMetricsFromPriceData,
  type PriceDataPoint,
  type ReferencePricePoint,
  type OraclePerformanceMetrics,
};
