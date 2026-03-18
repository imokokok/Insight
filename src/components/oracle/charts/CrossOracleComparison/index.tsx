'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { FlatStatItem } from '../../common/DashboardCard';
import { ComparisonReportExporter } from '@/components/oracle/forms/ComparisonReportExporter';
import {
  oracleClients,
  oracleNames,
  oracleColors,
  PriceComparisonData,
  PriceHistoryPoint,
  TimeWindow,
} from './crossOracleConfig';
import { useSorting } from './useSorting';
import { useComparisonStats } from './useComparisonStats';
import { DeviationTable } from './DeviationTable';
import { PriceComparisonTable } from './PriceComparisonTable';
import { PerformanceTable } from './PerformanceTable';
import { ComparisonCharts } from './ComparisonCharts';
import { ComparisonControls } from './ComparisonControls';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CrossOracleComparison');

export function CrossOracleComparison() {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.BAND_PROTOCOL,
  ]);
  const [priceData, setPriceData] = useState<PriceComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [priceHistory, setPriceHistory] = useState<Record<OracleProvider, PriceHistoryPoint[]>>(
    {} as Record<OracleProvider, PriceHistoryPoint[]>
  );
  const [deviationThreshold, setDeviationThreshold] = useState<number>(1);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [benchmarkOracle, setBenchmarkOracle] = useState<OracleProvider>(OracleProvider.CHAINLINK);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);

    try {
      const promises = selectedOracles.map(async (provider) => {
        const client = oracleClients[provider];
        const requestStart = Date.now();
        try {
          const price = await client.getPrice(selectedSymbol, Blockchain.ETHEREUM);
          const responseTime = Date.now() - requestStart;

          return {
            provider,
            price: price.price,
            timestamp: price.timestamp,
            confidence: price.confidence,
            responseTime,
          };
        } catch (error) {
          logger.error(
            `Error fetching price from ${provider}`,
            error instanceof Error ? error : new Error(String(error))
          );
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((r) => r !== null) as PriceComparisonData[];

      setPriceData((prevData) => {
        const prevDataMap = new Map(prevData.map((d) => [d.provider, d.price]));
        const resultsWithPrevious = validResults.map((result) => ({
          ...result,
          previousPrice: prevDataMap.get(result.provider),
        }));
        return resultsWithPrevious;
      });
      setLastUpdated(new Date());

      setPriceHistory((prev) => {
        const newHistory = { ...prev };
        validResults.forEach((result) => {
          if (!newHistory[result.provider]) {
            newHistory[result.provider] = [];
          }
          newHistory[result.provider] = [
            ...newHistory[result.provider].slice(-99),
            { timestamp: result.timestamp, price: result.price },
          ];
        });
        return newHistory;
      });
    } catch (error) {
      logger.error(
        'Error fetching prices',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, selectedOracles]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPrices]);

  const {
    performanceData,
    priceStats,
    deviationData,
    deviationChartData,
    chartData,
    radarData,
    lineChartData,
    extendedStats,
    deviationAlerts,
    consistencyScore,
    exportData,
    getConsistencyLabel,
    getConsistencyColor,
  } = useComparisonStats({
    priceData,
    priceHistory,
    selectedOracles,
    benchmarkOracle,
    deviationThreshold,
    selectedSymbol,
    lastUpdated,
  });

  const { handleSort, getSortIcon, sortedPriceData } = useSorting(priceData, priceStats);

  const toggleOracle = (provider: OracleProvider) => {
    setSelectedOracles((prev) => {
      if (prev.includes(provider)) {
        if (prev.length > 2) {
          return prev.filter((p) => p !== provider);
        }
        return prev;
      } else {
        if (prev.length < 3) {
          return [...prev, provider];
        }
        return [prev[1], prev[2], provider].slice(0, 3);
      }
    });
  };

  const handleQuickCompare = () => {
    setSelectedOracles([
      OracleProvider.CHAINLINK,
      OracleProvider.PYTH,
      OracleProvider.BAND_PROTOCOL,
    ]);
  };

  return (
    <div className="space-y-6" ref={chartRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('crossOracleComparison.title')}</h2>
          <p className="text-gray-500 mt-1">{t('crossOracleComparison.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <ComparisonReportExporter
            data={exportData}
            chartRef={chartRef as React.RefObject<HTMLDivElement>}
            fileName={`cross-oracle-comparison-${selectedSymbol}-${lastUpdated.toISOString().split('T')[0]}`}
          />
          <span className="text-sm text-gray-500">
            {t('common.time.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchPrices}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? t('common.status.loading') : t('common.actions.refresh')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-b border-gray-100">
        <div className="text-center md:text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('crossOracleComparison.consistencyScore')}
          </p>
          <p className={`text-3xl font-bold ${getConsistencyColor(consistencyScore)}`}>
            {consistencyScore}
          </p>
          <p className="text-xs text-gray-500 mt-1">{getConsistencyLabel(consistencyScore)}</p>
        </div>

        {priceStats && (
          <>
            <FlatStatItem
              label={t('crossOracle.averagePrice')}
              value={`$${priceStats.avg.toFixed(2)}`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />
            <FlatStatItem
              label={t('crossOracle.priceRange')}
              value={`$${priceStats.range.toFixed(2)}`}
              subValue={`${((priceStats.range / priceStats.avg) * 100).toFixed(2)}%`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              }
            />
            <FlatStatItem
              label={t('crossOracle.standardDeviation')}
              value={`$${priceStats.stdDev.toFixed(2)}`}
              subValue={`${((priceStats.stdDev / priceStats.avg) * 100).toFixed(2)}%`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />
          </>
        )}
      </div>

      {extendedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-b border-gray-100">
          <FlatStatItem
            label={t('crossOracle.stats.highestPrice')}
            value={`$${priceStats?.max.toFixed(2)}`}
            subValue={extendedStats.maxPriceOracle?.name}
            icon={
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <FlatStatItem
            label={t('crossOracle.stats.lowestPrice')}
            value={`$${priceStats?.min.toFixed(2)}`}
            subValue={extendedStats.minPriceOracle?.name}
            icon={
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            }
          />
          <FlatStatItem
            label={t('crossOracle.stats.maxPriceDifference')}
            value={`${extendedStats.maxDeviation.toFixed(3)}%`}
            subValue={t('crossOracle.stats.deviationFromAverage')}
            icon={
              <svg
                className="w-4 h-4 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />
          <FlatStatItem
            label={t('crossOracle.stats.avgResponseTime')}
            value={`${Math.round(extendedStats.avgResponseTime)}ms`}
            icon={
              <svg
                className="w-4 h-4 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      <ComparisonControls
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        deviationThreshold={deviationThreshold}
        deviationAlerts={deviationAlerts}
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        onSymbolChange={setSelectedSymbol}
        onToggleOracle={toggleOracle}
        onDeviationThresholdChange={setDeviationThreshold}
        onAutoRefreshChange={setAutoRefresh}
        onRefreshIntervalChange={setRefreshInterval}
        onQuickCompare={handleQuickCompare}
      />

      <DeviationTable deviationData={deviationData} />

      <ComparisonCharts
        deviationChartData={deviationChartData}
        chartData={chartData}
        radarData={radarData}
        lineChartData={lineChartData}
        priceStats={priceStats}
        selectedOracles={selectedOracles}
        priceHistory={priceHistory}
        priceData={priceData}
      />

      <PriceComparisonTable
        sortedPriceData={sortedPriceData}
        priceStats={priceStats}
        deviationData={deviationData}
        handleSort={handleSort}
        getSortIcon={getSortIcon}
      />

      <PerformanceTable performanceData={performanceData} selectedOracles={selectedOracles} />
    </div>
  );
}
