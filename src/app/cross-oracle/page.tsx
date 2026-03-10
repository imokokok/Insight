'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import GaugeChart from '@/components/GaugeChart';
import { OracleProvider, PriceData } from '@/lib/types/oracle';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const oracleNames = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'];

type SortColumn = 'price' | 'timestamp' | null;
type SortDirection = 'asc' | 'desc';
type RefreshInterval = 0 | 30000 | 60000 | 300000;
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

export default function CrossOraclePage() {
  const { t } = useI18n();
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.BAND_PROTOCOL,
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<OracleProvider, PriceData[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [prevStats, setPrevStats] = useState<{
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    variance: number;
    standardDeviation: number;
    standardDeviationPercent: number;
  } | null>(null);
  const [lastStats, setLastStats] = useState<{
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    variance: number;
    standardDeviation: number;
    standardDeviationPercent: number;
  } | null>(null);

  const calculateWeightedAverage = (prices: PriceData[]): number => {
    const validData = prices.filter((d) => d.price > 0);
    if (validData.length === 0) return 0;

    let weightedSum = 0;
    let weightSum = 0;

    validData.forEach((data) => {
      const weight = data.confidence && data.confidence > 0 ? data.confidence : 1;
      weightedSum += data.price * weight;
      weightSum += weight;
    });

    return weightSum > 0 ? weightedSum / weightSum : 0;
  };

  const calculateVariance = (prices: number[], mean: number): number => {
    if (prices.length < 2) return 0;
    const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
    return sumSquaredDiff / prices.length;
  };

  const calculateStandardDeviation = (variance: number): number => {
    return Math.sqrt(variance);
  };

  const getConsistencyRating = (stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'excellent';
    if (stdDevPercent < 0.3) return 'good';
    if (stdDevPercent < 0.5) return 'fair';
    return 'poor';
  };

  const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
    if (stdDev === 0) return null;
    return (price - mean) / stdDev;
  };

  const isOutlier = (zScore: number | null): boolean => {
    if (zScore === null) return false;
    return Math.abs(zScore) > 2;
  };

  const exportToCSV = () => {
    const headers = ['Oracle', 'Price', 'Deviation (%)', 'Confidence', 'Source', 'Timestamp'];
    const rows = priceData.map((data) => {
      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
      }
      return [
        oracleNames[data.provider],
        data.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        deviationPercent !== null ? deviationPercent.toFixed(2) : '',
        data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '',
        data.source || '',
        new Date(data.timestamp).toLocaleString(),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `oracle-prices-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const exportData = priceData.map((data) => {
      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
      }
      return {
        oracle: oracleNames[data.provider],
        provider: data.provider,
        symbol: data.symbol,
        price: data.price,
        deviationPercent: deviationPercent,
        confidence: data.confidence,
        source: data.source,
        timestamp: new Date(data.timestamp).toISOString(),
      };
    });

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `oracle-prices-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validPrices = priceData.map((d) => d.price).filter((p) => p > 0);
  const avgPrice =
    validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  const weightedAvgPrice = calculateWeightedAverage(priceData);
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  const priceRange = maxPrice - minPrice;

  const variance = calculateVariance(validPrices, avgPrice);
  const standardDeviation = calculateStandardDeviation(variance);
  const standardDeviationPercent = avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPriceData = [...priceData].sort((a, b) => {
    if (!sortColumn) return 0;

    if (sortColumn === 'price') {
      return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
    }

    if (sortColumn === 'timestamp') {
      return sortDirection === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    }

    return 0;
  });

  const fetchPriceData = useCallback(async () => {
    setIsLoading(true);
    const prices: PriceData[] = [];
    const histories: Partial<Record<OracleProvider, PriceData[]>> = {};

    const getHoursForTimeRange = (range: TimeRange): number | undefined => {
      switch (range) {
        case '1H':
          return 1;
        case '24H':
          return 24;
        case '7D':
          return 168;
        case '30D':
          return 720;
        case '90D':
          return 2160;
        case '1Y':
          return 8760;
        case 'ALL':
          return undefined;
        default:
          return 24;
      }
    };

    const hours = getHoursForTimeRange(timeRange);

    for (const oracle of selectedOracles) {
      try {
        const client = oracleClients[oracle];
        const price = await client.getPrice(selectedSymbol.split('/')[0]);
        const history = await client.getHistoricalPrices(
          selectedSymbol.split('/')[0],
          undefined,
          hours
        );
        prices.push(price);
        histories[oracle] = history;
      } catch (error) {
        console.error(`Error fetching data from ${oracle}:`, error);
      }
    }

    const currentValidPrices = prices.map((d) => d.price).filter((p) => p > 0);
    const currentAvgPrice =
      currentValidPrices.length > 0
        ? currentValidPrices.reduce((a, b) => a + b, 0) / currentValidPrices.length
        : 0;
    const currentMaxPrice = currentValidPrices.length > 0 ? Math.max(...currentValidPrices) : 0;
    const currentMinPrice = currentValidPrices.length > 0 ? Math.min(...currentValidPrices) : 0;
    const currentPriceRange = currentMaxPrice - currentMinPrice;

    const calculateWeightedAverageForFetch = (dataArr: PriceData[]): number => {
      const validData = dataArr.filter((d) => d.price > 0);
      if (validData.length === 0) return 0;

      let weightedSum = 0;
      let weightSum = 0;

      validData.forEach((data) => {
        const weight = data.confidence && data.confidence > 0 ? data.confidence : 1;
        weightedSum += data.price * weight;
        weightSum += weight;
      });

      return weightSum > 0 ? weightedSum / weightSum : 0;
    };
    const currentWeightedAvgPrice = calculateWeightedAverageForFetch(prices);

    const calculateVarianceForFetch = (pricesArr: number[], mean: number): number => {
      if (pricesArr.length < 2) return 0;
      const sumSquaredDiff = pricesArr.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
      return sumSquaredDiff / pricesArr.length;
    };
    const currentVariance = calculateVarianceForFetch(currentValidPrices, currentAvgPrice);
    const currentStandardDeviation = Math.sqrt(currentVariance);
    const currentStandardDeviationPercent =
      currentAvgPrice > 0 ? (currentStandardDeviation / currentAvgPrice) * 100 : 0;

    setLastStats(prevStats);
    setPrevStats({
      avgPrice: currentAvgPrice,
      weightedAvgPrice: currentWeightedAvgPrice,
      maxPrice: currentMaxPrice,
      minPrice: currentMinPrice,
      priceRange: currentPriceRange,
      variance: currentVariance,
      standardDeviation: currentStandardDeviation,
      standardDeviationPercent: currentStandardDeviationPercent,
    });

    setPriceData(prices);
    setHistoricalData(histories);
    setLastUpdated(new Date());
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOracles, selectedSymbol, timeRange]);

  const calculateChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0 || current === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const renderTrendIndicator = (changePercent: number | null) => {
    if (changePercent === null) return null;
    const isPositive = changePercent >= 0;
    return (
      <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
      </span>
    );
  };

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  useEffect(() => {
    if (refreshInterval === 0) return;

    const intervalId = setInterval(() => {
      fetchPriceData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchPriceData]);

  const refreshOptions = [
    { value: 0, label: '关闭' },
    { value: 30000, label: '30 秒' },
    { value: 60000, label: '1 分钟' },
    { value: 300000, label: '5 分钟' },
  ];

  const timeRanges: TimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const chartColors = {
    [OracleProvider.CHAINLINK]: '#3B82F6',
    [OracleProvider.BAND_PROTOCOL]: '#10B981',
    [OracleProvider.UMA]: '#F59E0B',
    [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
    [OracleProvider.API3]: '#EC4899',
  };

  const getChartData = () => {
    if (Object.keys(historicalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(historicalData).forEach((history) => {
      history.forEach((data) => timestamps.add(data.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const point: Record<string, string | number | undefined> = {
        timestamp: new Date(timestamp).toLocaleTimeString(),
      };

      selectedOracles.forEach((oracle) => {
        const dataPoint = historicalData[oracle]?.find((d) => d.timestamp === timestamp);
        if (dataPoint) {
          point[oracleNames[oracle]] = dataPoint.price;
        }
      });

      return point;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossOracle.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(`crossOracle.timeRange.${range}`) || range}
              </button>
            ))}
          </div>
          <button
            onClick={exportToCSV}
            disabled={priceData.length === 0}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('crossOracle.exportCsv')}
          </button>
          <button
            onClick={exportToJSON}
            disabled={priceData.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('crossOracle.exportJson')}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200">
            <span className="text-sm text-gray-600">{t('crossOracle.auto')}</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              className="text-sm bg-transparent focus:outline-none border-none"
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label === '关闭' ? t('crossOracle.refreshInterval.off') : option.label === '30秒' ? t('crossOracle.refreshInterval.30s') : option.label === '1分钟' ? t('crossOracle.refreshInterval.1m') : t('crossOracle.refreshInterval.5m')}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            {isLoading ? t('crossOracle.loading') : t('crossOracle.refresh')}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('crossOracle.updated')} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid - Flat Design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-200 border border-gray-200 mb-8">
        {/* Average Price */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {t('crossOracle.averagePrice')}
            </span>
            {renderTrendIndicator(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {avgPrice > 0
              ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Wtd:{' '}
            {weightedAvgPrice > 0
              ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </p>
        </div>

        {/* Highest Price */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {t('crossOracle.highestPrice')}
            </span>
            {renderTrendIndicator(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {maxPrice > 0
              ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Low:{' '}
            {minPrice > 0
              ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </p>
        </div>

        {/* Price Range */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('crossOracle.priceRange')}</span>
            {renderTrendIndicator(calculateChangePercent(priceRange, lastStats?.priceRange || 0))}
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {priceRange > 0
              ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {avgPrice > 0 ? `${((priceRange / avgPrice) * 100).toFixed(2)}% of avg` : '-'}
          </p>
        </div>

        {/* Standard Deviation */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('crossOracle.stdDev')}</span>
            {renderTrendIndicator(
              calculateChangePercent(
                standardDeviationPercent,
                lastStats?.standardDeviationPercent || 0
              )
            )}
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Abs:{' '}
            {standardDeviation > 0
              ? `$${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </p>
        </div>

        {/* Variance */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('crossOracle.variance')}</span>
            {renderTrendIndicator(calculateChangePercent(variance, lastStats?.variance || 0))}
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {variance > 0
              ? `$${variance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : '-'}
          </p>
          <div className="w-full h-1 bg-gray-100 mt-2">
            <div
              className="h-full bg-gray-400"
              style={{ width: `${Math.min((standardDeviationPercent / 1) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Consistency Rating */}
        <div className="bg-white p-4">
          <span className="text-xs text-gray-500 uppercase tracking-wide block mb-2">
            {t('crossOracle.consistencyRating')}
          </span>
          <div className="flex items-center gap-3">
            <GaugeChart value={standardDeviationPercent} maxValue={1} size={48} />
            {standardDeviationPercent > 0 && (
              <span
                className={`text-sm font-medium ${
                  getConsistencyRating(standardDeviationPercent) === 'excellent'
                    ? 'text-green-600'
                    : getConsistencyRating(standardDeviationPercent) === 'good'
                      ? 'text-blue-600'
                      : getConsistencyRating(standardDeviationPercent) === 'fair'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                }`}
              >
                {t(`crossOracle.consistency.${getConsistencyRating(standardDeviationPercent)}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selectors - Flat Design */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">{t('crossOracle.selectSymbolTitle')}</h3>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">{t('crossOracle.selectOraclesTitle')}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.values(OracleProvider).map((oracle) => {
              const isSelected = selectedOracles.includes(oracle);
              return (
                <button
                  key={oracle}
                  onClick={() => toggleOracle(oracle)}
                  className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : chartColors[oracle] }}
                  />
                  {oracleNames[oracle]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Price Comparison Table - Flat Design */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crossOracle.currentPriceComparison')}</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 border border-gray-200">
            <svg
              className="w-6 h-6 text-gray-400 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('crossOracle.oracle')}
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('crossOracle.price')}
                      {sortColumn === 'price' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  {validPrices.length > 1 && avgPrice > 0 && (
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {t('crossOracle.deviation')}
                    </th>
                  )}
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('crossOracle.confidence')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('crossOracle.source')}
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('crossOracle.timestamp')}
                      {sortColumn === 'timestamp' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPriceData.map((data, index) => {
                  let deviationPercent: number | null = null;
                  if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
                    deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
                  }
                  const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
                  const outlier = isOutlier(zScore);
                  return (
                    <tr
                      key={index}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        outlier ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: chartColors[data.provider] }}
                          />
                          <span className="font-medium text-gray-900 text-sm">
                            {oracleNames[data.provider]}
                          </span>
                          {outlier && (
                            <span className="text-amber-600 text-xs font-medium bg-amber-100 px-1.5 py-0.5">
                              {t('crossOracle.outlier')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-sm ${outlier ? 'text-amber-700' : 'text-gray-900'}`}
                      >
                        $
                        {data.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      {validPrices.length > 1 && avgPrice > 0 && (
                        <td className="py-3 px-4 text-right">
                          {deviationPercent !== null ? (
                            <span
                              className={`text-sm font-medium ${
                                deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {deviationPercent >= 0 ? '+' : ''}
                              {deviationPercent.toFixed(3)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        {data.confidence ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm text-gray-700">
                              {(data.confidence * 100).toFixed(1)}%
                            </span>
                            <div className="w-16 h-1 bg-gray-200">
                              <div
                                className="h-full bg-gray-600"
                                style={{ width: `${data.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 text-sm">
                        {data.source || '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 text-sm font-mono">
                        {new Date(data.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Price Trend Chart - Flat Design */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.priceTrend')}
          {timeRange !== 'ALL' && (
            <span className="text-sm text-gray-500 ml-2">
              ({timeRange === '1H' ? '1 小时' : timeRange === '24H' ? '24 小时' : timeRange === '7D' ? '7 天' : timeRange === '30D' ? '30 天' : timeRange === '90D' ? '90 天' : '1 年'})
            </span>
          )}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-24 border border-gray-200">
            <svg
              className="w-6 h-6 text-gray-400 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        ) : (
          <div className="h-80 border border-gray-200 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getChartData()}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    padding: '12px',
                  }}
                  labelStyle={{
                    color: '#1f2937',
                    fontWeight: 600,
                    marginBottom: '8px',
                    fontSize: '13px',
                  }}
                  itemStyle={{
                    padding: '4px 0',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    if (typeof value === 'number') {
                      return [
                        `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        name,
                      ];
                    }
                    return [value, name];
                  }}
                  cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '16px',
                    fontSize: '12px',
                  }}
                  iconType="line"
                  iconSize={10}
                />
                {selectedOracles.map((oracle) => (
                  <Line
                    key={oracle}
                    type="monotone"
                    dataKey={oracleNames[oracle]}
                    stroke={chartColors[oracle]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
