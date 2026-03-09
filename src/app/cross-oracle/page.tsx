'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
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

    for (const oracle of selectedOracles) {
      try {
        const client = oracleClients[oracle];
        const price = await client.getPrice(selectedSymbol.split('/')[0]);
        const history = await client.getHistoricalPrices(
          selectedSymbol.split('/')[0],
          undefined,
          24
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
  }, [selectedOracles, selectedSymbol]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    { value: 30000, label: '30秒' },
    { value: 60000, label: '1分钟' },
    { value: 300000, label: '5分钟' },
  ];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">多预言机价格比对与监控</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">{t('export')}:</span>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                disabled={priceData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                CSV
              </button>
              <button
                onClick={exportToJSON}
                disabled={priceData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                JSON
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600 font-medium">自动刷新:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none focus:ring-0 border-none"
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            {isLoading ? t('loading') : t('refresh')}
          </button>
          {lastUpdated && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-600 font-medium">
                {t('lastUpdated')}: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card variant="elevated" hoverable={false}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {renderTrendIndicator(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{t('averagePrice')}</p>
            <p className="text-3xl font-bold text-gray-900 mb-3">
              {avgPrice > 0
                ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('weightedAverage')}:</span>
              <span className="text-sm font-semibold text-blue-600">
                {weightedAvgPrice > 0
                  ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </span>
              {renderTrendIndicator(
                calculateChangePercent(weightedAvgPrice, lastStats?.weightedAvgPrice || 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" hoverable={false}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              {renderTrendIndicator(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{t('highestPrice')}</p>
            <p className="text-3xl font-bold text-gray-900 mb-3">
              {maxPrice > 0
                ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('lowestPrice')}:</span>
              <span className="text-sm font-semibold text-purple-600">
                {minPrice > 0
                  ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </span>
              {renderTrendIndicator(calculateChangePercent(minPrice, lastStats?.minPrice || 0))}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" hoverable={false}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              {renderTrendIndicator(calculateChangePercent(priceRange, lastStats?.priceRange || 0))}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{t('priceRange')}</p>
            <p className="text-3xl font-bold text-gray-900 mb-4">
              {priceRange > 0
                ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
            {minPrice > 0 && maxPrice > 0 && (
              <div className="space-y-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(((priceRange / avgPrice) * 100), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Min</span>
                  <span>Range</span>
                  <span>Max</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" hoverable={false}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl">
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              {renderTrendIndicator(
                calculateChangePercent(
                  standardDeviationPercent,
                  lastStats?.standardDeviationPercent || 0
                )
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{t('standardDeviation')}</p>
            <p className="text-3xl font-bold text-gray-900 mb-3">
              {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
            </p>
            {standardDeviation > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t('absoluteValue')}:</span>
                <span className="text-sm font-semibold text-cyan-600">
                  ${standardDeviation.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" hoverable={false}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              {renderTrendIndicator(calculateChangePercent(variance, lastStats?.variance || 0))}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{t('variance')}</p>
            <p className="text-3xl font-bold text-gray-900 mb-3">
              {variance > 0
                ? `$${variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(((standardDeviationPercent / 1) * 100), 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" hoverable={false}>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-3">{t('consistencyRating')}</p>
              <div className="flex justify-center">
                <GaugeChart 
                  value={standardDeviationPercent} 
                  maxValue={1} 
                  size={140}
                />
              </div>
              {standardDeviationPercent > 0 && (
                <p
                  className={`text-sm font-semibold mt-3 ${
                    getConsistencyRating(standardDeviationPercent) === 'excellent'
                      ? 'text-green-600'
                      : getConsistencyRating(standardDeviationPercent) === 'good'
                        ? 'text-blue-600'
                        : getConsistencyRating(standardDeviationPercent) === 'fair'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                  }`}
                >
                  {t(`consistency.${getConsistencyRating(standardDeviationPercent)}`)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              {t('selectSymbol')} & {t('selectOracles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-semibold text-slate-700">选择交易对</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {symbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      selectedSymbol === symbol
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200 transform scale-105'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{symbol.split('/')[0]}</span>
                      <span className="text-xs opacity-80">/ {symbol.split('/')[1]}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span className="text-sm font-semibold text-slate-700">选择预言机</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.values(OracleProvider).map((oracle) => {
                  const isSelected = selectedOracles.includes(oracle);
                  return (
                    <button
                      key={oracle}
                      onClick={() => toggleOracle(oracle)}
                      className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200 transform scale-105'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {isSelected ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      {oracleNames[oracle]}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('currentPriceComparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
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
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-4 px-5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t('oracle')}
                    </th>
                    <th
                      className="text-right py-4 px-5 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 select-none transition-colors duration-200"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {t('price')}
                        <div className="relative w-4 h-4">
                          <svg
                            className={`absolute top-0 left-0 w-4 h-4 transition-all duration-200 ${
                              sortColumn === 'price' && sortDirection === 'asc'
                                ? 'text-blue-600'
                                : sortColumn === 'price' && sortDirection === 'desc'
                                  ? 'opacity-0'
                                  : 'text-gray-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                          <svg
                            className={`absolute top-0 left-0 w-4 h-4 transition-all duration-200 ${
                              sortColumn === 'price' && sortDirection === 'desc'
                                ? 'text-blue-600'
                                : sortColumn === 'price' && sortDirection === 'asc'
                                  ? 'opacity-0'
                                  : 'text-gray-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    {validPrices.length > 1 && avgPrice > 0 && (
                      <th className="text-right py-4 px-5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t('deviation')}
                      </th>
                    )}
                    <th className="text-right py-4 px-5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t('confidence')}
                    </th>
                    <th className="text-right py-4 px-5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      来源
                    </th>
                    <th
                      className="text-right py-4 px-5 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 select-none transition-colors duration-200"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {t('timestamp')}
                        <div className="relative w-4 h-4">
                          <svg
                            className={`absolute top-0 left-0 w-4 h-4 transition-all duration-200 ${
                              sortColumn === 'timestamp' && sortDirection === 'asc'
                                ? 'text-blue-600'
                                : sortColumn === 'timestamp' && sortDirection === 'desc'
                                  ? 'opacity-0'
                                  : 'text-gray-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                          <svg
                            className={`absolute top-0 left-0 w-4 h-4 transition-all duration-200 ${
                              sortColumn === 'timestamp' && sortDirection === 'desc'
                                ? 'text-blue-600'
                                : sortColumn === 'timestamp' && sortDirection === 'asc'
                                  ? 'opacity-0'
                                  : 'text-gray-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                        className={`transition-all duration-200 ${
                          outlier
                            ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 hover:from-amber-100/80 hover:to-amber-100'
                            : 'bg-white hover:bg-blue-50/60'
                        }`}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div
                                className="w-3.5 h-3.5 rounded-full shadow-sm"
                                style={{ backgroundColor: chartColors[data.provider] }}
                              />
                              {outlier && (
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 text-sm">
                                {oracleNames[data.provider]}
                              </span>
                              {outlier && (
                                <span className="flex items-center gap-1 text-amber-700 text-xs font-bold bg-amber-200/60 px-2 py-0.5 rounded-full">
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                  </svg>
                                  {t('outlier')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-4 px-5 text-right font-bold text-lg font-mono ${
                            outlier ? 'text-amber-800' : 'text-gray-900'
                          }`}
                        >
                          $
                          {data.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        {validPrices.length > 1 && avgPrice > 0 && (
                          <td className="py-4 px-5 text-right">
                            {deviationPercent !== null ? (
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`font-bold text-sm ${
                                    deviationPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {deviationPercent >= 0 ? '+' : ''}
                                  {deviationPercent.toFixed(3)}%
                                </span>
                                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden relative shadow-inner">
                                  <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400 z-10" />
                                  {deviationPercent > 0 ? (
                                    <div
                                      className="absolute top-0 left-1/2 h-full bg-gradient-to-r from-emerald-300 to-emerald-500 rounded-r-full"
                                      style={{
                                        width: `${Math.min((Math.abs(deviationPercent) / 2) * 100, 100)}%`,
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="absolute top-0 right-1/2 h-full bg-gradient-to-l from-rose-300 to-rose-500 rounded-l-full"
                                      style={{
                                        width: `${Math.min((Math.abs(deviationPercent) / 2) * 100, 100)}%`,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        )}
                        <td className="py-4 px-5 text-right">
                          {data.confidence ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-semibold text-blue-700 text-sm">
                                {(data.confidence * 100).toFixed(1)}%
                              </span>
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                  style={{
                                    width: `${data.confidence * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right text-gray-600 text-sm">
                          {data.source ? (
                            <span className="font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {data.source}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right text-gray-600 text-sm font-mono">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdvancedCard className="mb-8" variant="default" hoverable={false}>
        <AdvancedCardHeader>
          <AdvancedCardTitle>{t('priceTrend')}</AdvancedCardTitle>
        </AdvancedCardHeader>
        <AdvancedCardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
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
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    {selectedOracles.map((oracle) => (
                      <linearGradient
                        key={oracle}
                        id={`color${oracle}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={chartColors[oracle]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors[oracle]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#9ca3af"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow:
                        '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      padding: '16px 20px',
                      backdropFilter: 'blur(10px)',
                    }}
                    labelStyle={{
                      color: '#1f2937',
                      fontWeight: 700,
                      marginBottom: '12px',
                      fontSize: '14px',
                      borderBottom: '1px solid #f3f4f6',
                      paddingBottom: '8px',
                    }}
                    itemStyle={{
                      padding: '6px 0',
                      fontSize: '13px',
                      fontWeight: 500,
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
                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '24px',
                      display: 'flex',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {selectedOracles.map((oracle) => (
                    <Line
                      key={oracle}
                      type="monotone"
                      dataKey={oracleNames[oracle]}
                      stroke={chartColors[oracle]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      fill={`url(#color${oracle})`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdvancedCardContent>
      </AdvancedCard>
    </div>
  );
}
