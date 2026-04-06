'use client';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames } from '../../constants';
import { BenchmarkComparisonSection } from '../BenchmarkComparisonSection';
import { OracleComparisonSection } from '../OracleComparisonSection';

import { DataQualityTrend } from './components/DataQualityTrend';
import { MovingAverageChart } from './components/MovingAverageChart';
import { OraclePerformanceRanking } from './components/OraclePerformanceRanking';
import { PerformanceAnalysisSection } from './components/PerformanceAnalysisSection';
import { PriceCorrelationMatrix } from './components/PriceCorrelationMatrix';
import { PriceDeviationHeatmap } from './components/PriceDeviationHeatmap';
import { PriceDistributionBoxPlot } from './components/PriceDistributionBoxPlot';
import { PriceVolatilityChart } from './components/PriceVolatilityChart';

import type {
  QualityTrendData,
  OraclePriceSeries,
  PriceDeviationDataPoint,
  OraclePriceData,
  OraclePriceHistory,
  OraclePerformanceData,
} from '../../types/index';

interface AnalysisTabProps {
  priceData: PriceData[];
  isLoading: boolean;
  selectedOracles: OracleProvider[];
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  useAccessibleColors: boolean;
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  performanceData: OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  qualityTrendData: QualityTrendData[];
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function AnalysisTab({
  priceData,
  isLoading,
  selectedOracles,
  selectedPerformanceOracle,
  setSelectedPerformanceOracle,
  useAccessibleColors,
  heatmapData,
  boxPlotData,
  volatilityData,
  correlationData,
  performanceData,
  maData,
  qualityTrendData,
  getOracleLatencyData,
  t,
}: AnalysisTabProps) {
  return (
    <>
      {priceData.length > 0 && (
        <OracleComparisonSection
          priceData={priceData}
          benchmarkOracle={selectedOracles[0]}
          showTable={true}
        />
      )}

      {priceData.length > 0 && (
        <BenchmarkComparisonSection priceData={priceData} loading={isLoading} />
      )}

      {heatmapData.length > 0 && (
        <div className="mb-6">
          <PriceDeviationHeatmap data={heatmapData} useAccessibleColors={useAccessibleColors} />
        </div>
      )}

      {boxPlotData.some((d) => d.prices.length > 0) && (
        <div className="mb-6">
          <PriceDistributionBoxPlot data={boxPlotData} oracleNames={oracleNames} />
        </div>
      )}

      {volatilityData.some((d) => d.prices.length > 0) && (
        <div className="mb-6">
          <PriceVolatilityChart data={volatilityData} oracleNames={oracleNames} />
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.movingAverage')}
        </h2>
        {maData.some((d) => d.prices.length > 0) && (
          <MovingAverageChart data={maData} oracleNames={oracleNames} />
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.dataQuality')}
        </h2>
        {qualityTrendData.some((d) => d.data.length > 0) && (
          <DataQualityTrend data={qualityTrendData} oracleNames={oracleNames} />
        )}
      </div>

      <PerformanceAnalysisSection
        selectedOracles={selectedOracles}
        selectedPerformanceOracle={selectedPerformanceOracle}
        setSelectedPerformanceOracle={setSelectedPerformanceOracle}
        performanceData={performanceData}
        getOracleLatencyData={getOracleLatencyData}
        t={t}
      />

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.advancedAnalysis')}
        </h2>
        {correlationData.length >= 2 && (
          <div className="mb-4">
            <PriceCorrelationMatrix data={correlationData} oracleNames={oracleNames} />
          </div>
        )}
      </div>

      {performanceData.length > 0 && (
        <div className="mb-6">
          <OraclePerformanceRanking performanceData={performanceData} />
        </div>
      )}
    </>
  );
}
