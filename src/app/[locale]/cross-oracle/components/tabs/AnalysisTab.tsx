'use client';

import { PriceDeviationHeatmap } from '@/components/oracle/charts/PriceDeviationHeatmap';
import { PriceDistributionBoxPlot } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import { PriceVolatilityChart } from '@/components/oracle/charts/PriceVolatilityChart';
import { PriceCorrelationMatrix } from '@/components/oracle/charts/PriceCorrelationMatrix';
import { LatencyDistributionHistogram } from '@/components/oracle/charts/LatencyDistributionHistogram';
import { OraclePerformanceRanking } from '@/components/oracle/data-display/OraclePerformanceRanking';
import { MovingAverageChart } from '@/components/oracle/charts/MovingAverageChart';
import { DataQualityTrend } from '@/components/oracle/charts/DataQualityTrend';
import { DropdownSelect } from '@/components/ui';
import { OracleProvider, PriceData } from '@/types/oracle';
import { oracleNames } from '../../constants';
import { QualityTrendData } from '../../types';
import { OracleComparisonSection } from '../OracleComparisonSection';
import { BenchmarkComparisonSection } from '../BenchmarkComparisonSection';

interface AnalysisTabProps {
  priceData: PriceData[];
  isLoading: boolean;
  selectedOracles: OracleProvider[];
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  useAccessibleColors: boolean;
  heatmapData: import('@/components/oracle/charts/PriceDeviationHeatmap').PriceDeviationDataPoint[];
  boxPlotData: import('@/components/oracle/charts/PriceDistributionBoxPlot').OraclePriceData[];
  volatilityData: import('@/components/oracle/charts/PriceVolatilityChart').OraclePriceHistory[];
  correlationData: import('@/components/oracle/charts/PriceCorrelationMatrix').OraclePriceSeries[];
  performanceData: import('@/components/oracle/data-display/OraclePerformanceRanking').OraclePerformanceData[];
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
      {/* 预言机对比和基准对比部分 - 从Overview移过来 */}
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

      {/* 价格偏差热力图 */}
      {heatmapData.length > 0 && (
        <div className="mb-6">
          <PriceDeviationHeatmap data={heatmapData} useAccessibleColors={useAccessibleColors} />
        </div>
      )}

      {/* 价格分布箱线图 */}
      {boxPlotData.some((d) => d.prices.length > 0) && (
        <div className="mb-6">
          <PriceDistributionBoxPlot data={boxPlotData} oracleNames={oracleNames} />
        </div>
      )}

      {/* 波动率图表 */}
      {volatilityData.some((d) => d.prices.length > 0) && (
        <div className="mb-6">
          <PriceVolatilityChart data={volatilityData} oracleNames={oracleNames} />
        </div>
      )}

      {/* 移动平均线图表 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.movingAverage')}
        </h2>
        {maData.some((d) => d.prices.length > 0) && (
          <MovingAverageChart data={maData} oracleNames={oracleNames} />
        )}
      </div>

      {/* 数据质量趋势 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.dataQuality')}
        </h2>
        {qualityTrendData.some((d) => d.data.length > 0) && (
          <DataQualityTrend data={qualityTrendData} oracleNames={oracleNames} />
        )}
      </div>

      {/* 性能分析部分 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.analysisTab.performanceComparison')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('crossOracle.analysisTab.selectOracle')}
              </label>
              <DropdownSelect
                options={[
                  { value: '', label: t('crossOracle.analysisTab.allOracles') },
                  ...selectedOracles.map((oracle) => ({
                    value: oracle,
                    label: oracleNames[oracle],
                  })),
                ]}
                value={selectedPerformanceOracle || ''}
                onChange={(value) =>
                  setSelectedPerformanceOracle(value ? (value as OracleProvider) : null)
                }
                placeholder={t('crossOracle.analysisTab.selectOraclePlaceholder')}
                className="w-full"
              />
            </div>
            <LatencyDistributionHistogram
              data={getOracleLatencyData(selectedPerformanceOracle)}
              oracleName={
                selectedPerformanceOracle
                  ? oracleNames[selectedPerformanceOracle]
                  : t('crossOracle.analysisTab.allOracles')
              }
            />
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {t('crossOracle.analysisTab.summary')}
            </h3>
            <div className="space-y-4">
              {performanceData.map((data) => (
                <div
                  key={data.provider}
                  className={`flex items-center justify-between p-4 border transition-colors overflow-hidden rounded-lg ${
                    selectedPerformanceOracle === data.provider
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                  onClick={() => setSelectedPerformanceOracle(data.provider)}
                  style={{ cursor: 'pointer' }}
                  title={t('crossOracle.analysisTab.tooltip', {
                    name: data.name,
                    responseTime: data.responseTime,
                    accuracy: data.accuracy.toFixed(1),
                    stability: data.stability.toFixed(1),
                  })}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 flex-shrink-0"
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="font-medium text-gray-900 truncate">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-gray-400">
                        {t('crossOracle.analysisTab.responseTime')}
                      </p>
                      <p className="font-semibold text-gray-900 truncate">{data.responseTime}ms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.analysisTab.accuracy')}</p>
                      <p className="font-semibold text-success-600">{data.accuracy.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">{t('crossOracle.analysisTab.stability')}</p>
                      <p className="font-semibold text-primary-600">{data.stability.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 相关性矩阵 */}
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

      {/* 性能排名 */}
      {performanceData.length > 0 && (
        <div className="mb-6">
          <OraclePerformanceRanking performanceData={performanceData} />
        </div>
      )}
    </>
  );
}
