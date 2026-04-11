'use client';

import { useState, useEffect, useRef } from 'react';

import { useTranslations } from '@/i18n';
import { OracleProvider } from '@/types/oracle/enums';

import { ChartsTab } from './ChartsTab';
import { type OracleGroup, ORACLE_GROUPS } from './crossOracleConfig';
import { CrossOracleSubTabs, type SubTab } from './CrossOracleSubTabs';
import { DataTab } from './DataTab';
import { OverviewTab } from './OverviewTab';
import { SettingsTab } from './SettingsTab';
import { useComparisonStats } from './useComparisonStats';
import { useCrossOraclePrices } from './useCrossOraclePrices';
import { useSorting } from './useSorting';

export function CrossOracleComparison() {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.API3,
    OracleProvider.REDSTONE,
  ]);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [deviationThreshold, setDeviationThreshold] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<OracleGroup>('ALL');

  const { priceData, isLoading, isError, errors, lastUpdated, refetchAll, priceHistory } =
    useCrossOraclePrices({
      selectedSymbol,
      selectedOracles,
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : false,
    });

  useEffect(() => {
    if (isError && errors.length > 0) {
      console.error('CrossOracleComparison errors:', errors);
    }
  }, [isError, errors]);

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
      OracleProvider.API3,
      OracleProvider.REDSTONE,
      OracleProvider.DIA,
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
              onManualRefresh={refetchAll}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
