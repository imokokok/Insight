'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  OracleProvider,
  Blockchain,
  PriceData,
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import {
  saveQueryHistory,
  getQueryHistory,
  clearQueryHistory,
  QueryHistoryItem,
} from '@/utils/queryHistory';
import { parseQueryParams, updateUrlParams, QueryConfig } from '@/utils/urlParams';
import { QueryResult, providerNames, chainNames, oracleColors, chainColors } from './constants';
import {
  PageHeader,
  Selectors,
  StatsGrid,
  PriceResultsTable,
  PriceChart,
  QuickLinks,
  ChartDataPoint,
  ExportConfig,
  ExportConfigData,
  DataQualityPanel,
} from './components';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { NoDataEmptyState } from '@/components/ui/EmptyState';
import { createLogger } from '@/lib/utils/logger';
import { exportToCSV, exportToJSON, exportToPDF } from './utils/exportUtils';

const logger = createLogger('price-query-page');

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

export default function PriceQueryPage() {
  const { t } = useI18n();
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
  ]);
  const [selectedChains, setSelectedChains] = useState<Blockchain[]>([Blockchain.ETHEREUM]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [historicalData, setHistoricalData] = useState<Partial<Record<string, PriceData[]>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const [queryProgress, setQueryProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [currentQueryTarget, setCurrentQueryTarget] = useState<{
    oracle: OracleProvider | null;
    chain: Blockchain | null;
  }>({ oracle: null, chain: null });
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareTimeRange, setCompareTimeRange] = useState<number>(24);
  const [compareHistoricalData, setCompareHistoricalData] = useState<
    Partial<Record<string, PriceData[]>>
  >({});
  const [compareQueryResults, setCompareQueryResults] = useState<QueryResult[]>([]);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [showExportConfig, setShowExportConfig] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const config = parseQueryParams(window.location.search);
    if (config.oracles && config.oracles.length > 0) {
      setSelectedOracles(config.oracles);
    }
    if (config.chains && config.chains.length > 0) {
      setSelectedChains(config.chains);
    }
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    if (config.timeRange) {
      setSelectedTimeRange(config.timeRange);
    }
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    const config: QueryConfig = {
      oracles: selectedOracles,
      chains: selectedChains,
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
    };
    updateUrlParams(config);
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange]);

  const toggleSeries = (seriesName: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };

  const generateFilename = useCallback(
    (extension: string): string => {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      return `price-query-${selectedSymbol}-${timestamp}.${extension}`;
    },
    [selectedSymbol]
  );

  const handleExportCSV = useCallback(() => {
    const csvLines: string[] = [];
    csvLines.push('=== 价格查询结果 ===');
    const headers = ['预言机', '区块链', '价格', '时间戳', '来源'];
    csvLines.push(headers.join(','));

    queryResults.forEach((result) => {
      const row = [
        providerNames[result.provider],
        chainNames[result.chain],
        result.priceData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }),
        new Date(result.priceData.timestamp).toLocaleString(),
        result.priceData.source || '',
      ];
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename('csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [queryResults, generateFilename]);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      metadata: {
        symbol: selectedSymbol,
        selectedOracles: selectedOracles.map((o) => providerNames[o]),
        selectedChains: selectedChains.map((c) => chainNames[c]),
        exportTimestamp: new Date().toISOString(),
      },
      results: queryResults.map((result) => ({
        oracle: providerNames[result.provider],
        blockchain: chainNames[result.chain],
        price: result.priceData.price,
        timestamp: new Date(result.priceData.timestamp).toISOString(),
        source: result.priceData.source,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename('json'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [queryResults, selectedSymbol, selectedOracles, selectedChains, generateFilename]);

  const fetchQueryData = async () => {
    setLoading(true);
    const startTime = Date.now();
    setQueryStartTime(startTime);
    setQueryDuration(null);
    setQueryProgress({ completed: 0, total: 0 });
    setCurrentQueryTarget({ oracle: null, chain: null });

    let totalQueries = 0;
    for (const provider of selectedOracles) {
      const client = oracleClients[provider];
      const supportedChains = client.supportedChains;
      for (const chain of selectedChains) {
        if (supportedChains.includes(chain)) {
          totalQueries++;
        }
      }
    }

    // 如果开启对比模式，需要查询两倍的数据
    const actualTotalQueries = compareMode ? totalQueries * 2 : totalQueries;
    setQueryProgress({ completed: 0, total: actualTotalQueries });

    try {
      const results: QueryResult[] = [];
      const histories: Partial<Record<string, PriceData[]>> = {};
      let completedQueries = 0;

      // 获取主时间范围数据
      for (const provider of selectedOracles) {
        const client = oracleClients[provider];
        const supportedChains = client.supportedChains;

        for (const chain of selectedChains) {
          if (supportedChains.includes(chain)) {
            setCurrentQueryTarget({ oracle: provider, chain: chain });
            try {
              const price = await client.getPrice(selectedSymbol, chain);
              results.push({
                provider,
                chain,
                priceData: price,
              });

              const history = await client.getHistoricalPrices(
                selectedSymbol,
                chain,
                selectedTimeRange
              );
              const key = `${provider}-${chain}`;
              histories[key] = history;
            } catch (error) {
              logger.error(
                `Error fetching ${provider} on ${chain}`,
                error instanceof Error ? error : new Error(String(error))
              );
            }
            completedQueries++;
            setQueryProgress({ completed: completedQueries, total: actualTotalQueries });
          }
        }
      }

      setQueryResults(results);
      setHistoricalData(histories);

      // 如果开启对比模式，获取对比时间范围数据
      if (compareMode) {
        const compareResults: QueryResult[] = [];
        const compareHistories: Partial<Record<string, PriceData[]>> = {};

        for (const provider of selectedOracles) {
          const client = oracleClients[provider];
          const supportedChains = client.supportedChains;

          for (const chain of selectedChains) {
            if (supportedChains.includes(chain)) {
              setCurrentQueryTarget({ oracle: provider, chain: chain });
              try {
                const price = await client.getPrice(selectedSymbol, chain);
                compareResults.push({
                  provider,
                  chain,
                  priceData: price,
                });

                const history = await client.getHistoricalPrices(
                  selectedSymbol,
                  chain,
                  compareTimeRange
                );
                const key = `${provider}-${chain}`;
                compareHistories[key] = history;
              } catch (error) {
                logger.error(
                  `Error fetching compare data ${provider} on ${chain}`,
                  error instanceof Error ? error : new Error(String(error))
                );
              }
              completedQueries++;
              setQueryProgress({ completed: completedQueries, total: actualTotalQueries });
            }
          }
        }

        setCompareQueryResults(compareResults);
        setCompareHistoricalData(compareHistories);
      } else {
        setCompareQueryResults([]);
        setCompareHistoricalData({});
      }

      if (results.length > 0) {
        saveQueryHistory({
          oracles: selectedOracles,
          chains: selectedChains,
          symbol: selectedSymbol,
          timeRange: selectedTimeRange,
        });
        setHistoryItems(getQueryHistory());
      }
    } catch (error) {
      logger.error(
        'Error fetching query data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
      setQueryDuration(Date.now() - startTime);
      setCurrentQueryTarget({ oracle: null, chain: null });
    }
  };

  useEffect(() => {
    fetchQueryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    setHistoryItems(getQueryHistory());
  }, []);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (Object.keys(historicalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(historicalData).forEach((history) => {
      history?.forEach((price) => timestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (selectedTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (selectedTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };

      queryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const history = historicalData[key];
        const price = history?.find((p) => p.timestamp === timestamp);
        if (price) {
          const label = `${providerNames[provider]} (${chainNames[chain]})`;
          dataPoint[label] = price.price;
        }
      });

      return dataPoint;
    });
  }, [historicalData, queryResults, selectedTimeRange]);

  // 对比数据的 chartData
  const compareChartData = useMemo((): ChartDataPoint[] => {
    if (!compareMode || Object.keys(compareHistoricalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(compareHistoricalData).forEach((history) => {
      history?.forEach((price) => timestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (compareTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (compareTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };

      compareQueryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const history = compareHistoricalData[key];
        const price = history?.find((p) => p.timestamp === timestamp);
        if (price) {
          const label = `${providerNames[provider]} (${chainNames[chain]})`;
          dataPoint[label] = price.price;
        }
      });

      return dataPoint;
    });
  }, [compareHistoricalData, compareQueryResults, compareTimeRange, compareMode]);

  const sortedQueryResults = useMemo(() => {
    return [...queryResults].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'oracle':
          comparison = providerNames[a.provider].localeCompare(providerNames[b.provider]);
          break;
        case 'blockchain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.priceData.price - b.priceData.price;
          break;
        case 'timestamp':
          comparison = a.priceData.timestamp - b.priceData.timestamp;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [queryResults, sortField, sortDirection]);

  const filteredQueryResults = useMemo(() => {
    if (!filterText.trim()) return sortedQueryResults;
    const lowerFilter = filterText.toLowerCase();
    return sortedQueryResults.filter((result) => {
      const oracleName = providerNames[result.provider].toLowerCase();
      const chainName = chainNames[result.chain].toLowerCase();
      const oracleTranslation = t(`navbar.${result.provider.toLowerCase()}`).toLowerCase();
      const chainTranslation = t(`blockchain.${result.chain.toLowerCase()}`).toLowerCase();
      return (
        oracleName.includes(lowerFilter) ||
        chainName.includes(lowerFilter) ||
        oracleTranslation.includes(lowerFilter) ||
        chainTranslation.includes(lowerFilter)
      );
    });
  }, [sortedQueryResults, filterText, t]);

  const handleSort = (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const validPrices = useMemo(() => {
    return queryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [queryResults]);

  const avgPrice = useMemo(() => {
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  }, [validPrices]);

  const avgChange24hPercent = useMemo(() => {
    const changes = queryResults
      .map((r) => r.priceData.change24hPercent)
      .filter((c): c is number => c !== undefined);
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : undefined;
  }, [queryResults]);

  const maxPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.max(...validPrices) : 0;
  }, [validPrices]);

  const minPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [validPrices]);

  // 对比数据的统计计算
  const compareValidPrices = useMemo(() => {
    return compareQueryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [compareQueryResults]);

  const compareAvgPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? compareValidPrices.reduce((a, b) => a + b, 0) / compareValidPrices.length : 0;
  }, [compareValidPrices]);

  const compareAvgChange24hPercent = useMemo(() => {
    const changes = compareQueryResults
      .map((r) => r.priceData.change24hPercent)
      .filter((c): c is number => c !== undefined);
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : undefined;
  }, [compareQueryResults]);

  const compareMaxPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? Math.max(...compareValidPrices) : 0;
  }, [compareValidPrices]);

  const compareMinPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? Math.min(...compareValidPrices) : 0;
  }, [compareValidPrices]);

  const comparePriceRange = useMemo(() => {
    return compareMaxPrice - compareMinPrice;
  }, [compareMaxPrice, compareMinPrice]);

  const priceRange = useMemo(() => {
    return maxPrice - minPrice;
  }, [maxPrice, minPrice]);

  const calculateVariance = (prices: number[], mean: number): number => {
    if (prices.length < 2) return 0;
    const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
    return sumSquaredDiff / prices.length;
  };

  const calculateStandardDeviation = (variance: number): number => {
    return Math.sqrt(variance);
  };

  const variance = useMemo(() => {
    return calculateVariance(validPrices, avgPrice);
  }, [validPrices, avgPrice]);

  const standardDeviation = useMemo(() => {
    return calculateStandardDeviation(variance);
  }, [variance]);

  const standardDeviationPercent = useMemo(() => {
    return avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;
  }, [standardDeviation, avgPrice]);

  const supportedChainsBySelectedOracles = useMemo(() => {
    if (selectedOracles.length === 0) return new Set<Blockchain>();
    const supported = new Set<Blockchain>();
    selectedOracles.forEach((oracle) => {
      const client = oracleClients[oracle];
      client.supportedChains.forEach((chain) => supported.add(chain));
    });
    return supported;
  }, [selectedOracles]);

  const handleHistorySelect = (item: QueryHistoryItem) => {
    setSelectedOracles(item.oracles);
    setSelectedChains(item.chains);
    setSelectedSymbol(item.symbol);
    setSelectedTimeRange(item.timeRange);
  };

  const handleClearHistory = () => {
    clearQueryHistory();
    setHistoryItems([]);
  };

  const handleExportWithConfig = useCallback(
    async (config: ExportConfigData) => {
      const stats = {
        avgPrice,
        maxPrice,
        minPrice,
        priceRange,
        standardDeviation,
        standardDeviationPercent,
        dataPoints: queryResults.length,
        queryDuration,
        avgChange24hPercent,
      };

      switch (config.format) {
        case 'csv':
          exportToCSV(queryResults, config, selectedSymbol);
          break;
        case 'json':
          exportToJSON(queryResults, config, selectedSymbol, selectedOracles, selectedChains);
          break;
        case 'pdf':
          await exportToPDF(
            queryResults,
            config,
            selectedSymbol,
            selectedOracles,
            selectedChains,
            selectedTimeRange,
            stats,
            chartContainerRef
          );
          break;
      }
    },
    [
      queryResults,
      selectedSymbol,
      selectedOracles,
      selectedChains,
      selectedTimeRange,
      avgPrice,
      maxPrice,
      minPrice,
      priceRange,
      standardDeviation,
      standardDeviationPercent,
      queryDuration,
      avgChange24hPercent,
    ]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div aria-live="polite" className="sr-only">
        {loading
          ? t('priceQuery.loadingData')
          : `${queryResults.length} ${t('priceQuery.results.title')}`}
      </div>

      <PageHeader
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        historyItems={historyItems}
        onSelectHistory={handleHistorySelect}
        onClearHistory={handleClearHistory}
        loading={loading}
        queryResultsLength={queryResults.length}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onOpenExportConfig={() => setShowExportConfig(true)}
        selectedOracles={selectedOracles}
        selectedChains={selectedChains}
        selectedSymbol={selectedSymbol}
        selectedTimeRange={selectedTimeRange}
        setSelectedOracles={setSelectedOracles}
        setSelectedChains={setSelectedChains}
        setSelectedSymbol={setSelectedSymbol}
        setSelectedTimeRange={setSelectedTimeRange}
      />

      <Selectors
        selectedOracles={selectedOracles}
        setSelectedOracles={setSelectedOracles}
        selectedChains={selectedChains}
        setSelectedChains={setSelectedChains}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        selectedTimeRange={selectedTimeRange}
        setSelectedTimeRange={setSelectedTimeRange}
        loading={loading}
        onQuery={fetchQueryData}
        supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        compareTimeRange={compareTimeRange}
        setCompareTimeRange={setCompareTimeRange}
        showBaseline={showBaseline}
        setShowBaseline={setShowBaseline}
      />

      {loading ? (
        <div className="space-y-8">
          <ChartSkeleton height={200} variant="area" showToolbar={false} />
          <ChartSkeleton height={400} variant="price" showToolbar={true} />
        </div>
      ) : queryResults.length === 0 ? (
        <NoDataEmptyState onRefresh={fetchQueryData} />
      ) : (
        <>
          <StatsGrid
            avgPrice={avgPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            dataPoints={queryResults.length}
            queryDuration={queryDuration}
            avgChange24hPercent={avgChange24hPercent}
            prices={validPrices}
            compareMode={compareMode}
            compareAvgPrice={compareAvgPrice}
            compareMaxPrice={compareMaxPrice}
            compareMinPrice={compareMinPrice}
            comparePriceRange={comparePriceRange}
            compareAvgChange24hPercent={compareAvgChange24hPercent}
            comparePrices={compareValidPrices}
          />

          <DataQualityPanel
            results={queryResults}
            historicalData={historicalData}
          />

          <PriceResultsTable
            results={queryResults}
            filteredResults={filteredQueryResults}
            filterText={filterText}
            setFilterText={setFilterText}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            avgPrice={avgPrice}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            historicalData={historicalData}
          />

          <div ref={chartContainerRef}>
            <PriceChart
              chartData={chartData}
              queryResults={queryResults}
              hiddenSeries={hiddenSeries}
              onToggleSeries={toggleSeries}
              selectedTimeRange={selectedTimeRange}
              selectedRow={selectedRow}
              compareMode={compareMode}
              compareChartData={compareChartData}
              compareQueryResults={compareQueryResults}
              showBaseline={showBaseline}
              avgPrice={avgPrice}
            />
          </div>

          <QuickLinks />
        </>
      )}

      <ExportConfig
        isOpen={showExportConfig}
        onClose={() => setShowExportConfig(false)}
        onExport={handleExportWithConfig}
        queryResults={queryResults}
        selectedSymbol={selectedSymbol}
        selectedOracles={selectedOracles}
        selectedChains={selectedChains}
        selectedTimeRange={selectedTimeRange}
        chartRef={chartContainerRef}
      />
    </div>
  );
}
