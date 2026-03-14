import { createLogger } from '@/lib/utils/logger';
import {
  OracleMarketData,
  AssetData,
  TVSTrendData,
} from '@/app/market-overview/types';
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
  ExportDataOptions,
} from './priceCalculations';
import {
  fetchRiskMetrics,
  fetchHHI,
  fetchDiversificationScore,
} from './riskCalculations';
import { detectAnomalies } from './anomalyCalculations';

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

export {
  generateTVSTrendData,
  exportWithConfig,
  downloadExport,
};

export type { ExportDataOptions };

export {
  fetchRiskMetrics,
  fetchHHI,
  fetchDiversificationScore,
};

export { detectAnomalies };
