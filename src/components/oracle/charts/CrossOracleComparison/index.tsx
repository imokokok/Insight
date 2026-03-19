'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { OracleProvider, Blockchain } from '@/types/oracle';
import {
  oracleClients,
  oracleNames,
  PriceComparisonData,
  PriceHistoryPoint,
  OracleGroup,
  ORACLE_GROUPS,
} from './crossOracleConfig';
import { useSorting } from './useSorting';
import { useComparisonStats } from './useComparisonStats';
import { CrossOracleSubTabs, SubTab } from './CrossOracleSubTabs';
import { OverviewTab } from './OverviewTab';
import { ChartsTab } from './ChartsTab';
import { DataTab } from './DataTab';
import { SettingsTab } from './SettingsTab';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CrossOracleComparison');

export function CrossOracleComparison() {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');

  // 默认只选择 4 个预言机
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.BAND_PROTOCOL,
    OracleProvider.API3,
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
  const [selectedGroup, setSelectedGroup] = useState<OracleGroup>('ALL');

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
    benchmarkOracle: OracleProvider.CHAINLINK,
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
        if (prev.length < 5) {
          return [...prev, provider];
        }
        return [prev[1], prev[2], prev[3], prev[4], provider].slice(0, 5);
      }
    });
  };

  const handleGroupChange = (group: OracleGroup) => {
    setSelectedGroup(group);
    setSelectedOracles([...ORACLE_GROUPS[group]]);
  };

  const handleQuickCompare = () => {
    setSelectedOracles([
      OracleProvider.CHAINLINK,
      OracleProvider.PYTH,
      OracleProvider.BAND_PROTOCOL,
      OracleProvider.API3,
      OracleProvider.REDSTONE,
    ]);
  };

  return (
    <div className="space-y-6" ref={chartRef}>
      {/* 子选项卡导航 - 独立卡片 */}
      <div className="bg-white border border-gray-200">
        <div className="px-5 py-1">
          <CrossOracleSubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />
        </div>
      </div>

      {/* 内容区域 - 卡片容器 */}
      <div className="bg-white border border-gray-200">
        <div className="p-5">
          {/* 概览视图 */}
          {activeSubTab === 'overview' && (
            <OverviewTab
              consistencyScore={consistencyScore}
              priceStats={priceStats}
              deviationAlerts={deviationAlerts}
              priceData={priceData}
              selectedOracles={selectedOracles}
              getConsistencyLabel={getConsistencyLabel}
              getConsistencyColor={getConsistencyColor}
              extendedStats={extendedStats}
            />
          )}

          {/* 图表视图 */}
          {activeSubTab === 'charts' && (
            <ChartsTab
              deviationChartData={deviationChartData}
              chartData={chartData}
              radarData={radarData}
              lineChartData={lineChartData}
              priceStats={priceStats}
              selectedOracles={selectedOracles}
              priceHistory={priceHistory}
              priceData={priceData}
              performanceData={performanceData}
            />
          )}

          {/* 数据视图 */}
          {activeSubTab === 'data' && (
            <DataTab
              sortedPriceData={sortedPriceData}
              priceStats={priceStats}
              deviationData={deviationData}
              performanceData={performanceData}
              selectedOracles={selectedOracles}
              handleSort={handleSort}
              getSortIcon={getSortIcon}
            />
          )}

          {/* 设置视图 */}
          {activeSubTab === 'settings' && (
            <SettingsTab
              selectedSymbol={selectedSymbol}
              selectedOracles={selectedOracles}
              deviationThreshold={deviationThreshold}
              deviationAlerts={deviationAlerts}
              autoRefresh={autoRefresh}
              refreshInterval={refreshInterval}
              selectedGroup={selectedGroup}
              lastUpdated={lastUpdated}
              exportData={exportData}
              chartRef={chartRef}
              onSymbolChange={setSelectedSymbol}
              onToggleOracle={toggleOracle}
              onDeviationThresholdChange={setDeviationThreshold}
              onAutoRefreshChange={setAutoRefresh}
              onRefreshIntervalChange={setRefreshInterval}
              onQuickCompare={handleQuickCompare}
              onGroupChange={handleGroupChange}
              onManualRefresh={fetchPrices}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
