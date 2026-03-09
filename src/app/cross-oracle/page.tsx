'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
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
    [OracleProvider.CHAINLINK]: '#375BD2',
    [OracleProvider.BAND_PROTOCOL]: '#4F46E5',
    [OracleProvider.UMA]: '#EC4899',
    [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
    [OracleProvider.API3]: '#10B981',
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">{t('title')}</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('export')}:</span>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                disabled={priceData.length === 0}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                CSV
              </button>
              <button
                onClick={exportToJSON}
                disabled={priceData.length === 0}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                JSON
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">自动刷新:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
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
            {t('refresh')}
          </button>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              {t('lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('averagePrice')}</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-3xl font-bold text-gray-900">
                {avgPrice > 0
                  ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </p>
              {renderTrendIndicator(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
            </div>
            <p className="text-xs text-gray-500 mb-1">{t('weightedAverage')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-semibold text-blue-600">
                {weightedAvgPrice > 0
                  ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </p>
              {renderTrendIndicator(
                calculateChangePercent(weightedAvgPrice, lastStats?.weightedAvgPrice || 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {t('highestPrice')} / {t('lowestPrice')}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {maxPrice > 0
                  ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </p>
              {renderTrendIndicator(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
            </div>
            {minPrice > 0 && (
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-sm text-gray-500">
                  {t('lowestPrice')}: $
                  {minPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {renderTrendIndicator(calculateChangePercent(minPrice, lastStats?.minPrice || 0))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('priceRange')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {priceRange > 0
                  ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </p>
              {renderTrendIndicator(calculateChangePercent(priceRange, lastStats?.priceRange || 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('standardDeviation')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
              </p>
              {renderTrendIndicator(
                calculateChangePercent(
                  standardDeviationPercent,
                  lastStats?.standardDeviationPercent || 0
                )
              )}
            </div>
            {standardDeviation > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {t('absoluteValue')}: $
                {standardDeviation.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('variance')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {variance > 0
                  ? `$${variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '-'}
              </p>
              {renderTrendIndicator(calculateChangePercent(variance, lastStats?.variance || 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('consistencyRating')}</p>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-3xl font-bold ${
                  getConsistencyRating(standardDeviationPercent) === 'excellent'
                    ? 'text-green-600'
                    : getConsistencyRating(standardDeviationPercent) === 'good'
                      ? 'text-blue-600'
                      : getConsistencyRating(standardDeviationPercent) === 'fair'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                }`}
              >
                {standardDeviationPercent > 0
                  ? t(`consistency.${getConsistencyRating(standardDeviationPercent)}`)
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('selectSymbol')} & {t('selectOracles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {symbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSymbol === symbol
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                {Object.values(OracleProvider).map((oracle) => (
                  <label
                    key={oracle}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOracles.includes(oracle)}
                      onChange={() => toggleOracle(oracle)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{oracleNames[oracle]}</span>
                  </label>
                ))}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      {t('oracle')}
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('price')}
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            sortColumn === 'price'
                              ? sortDirection === 'asc'
                                ? 'rotate-180'
                                : ''
                              : 'opacity-30'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </th>
                    {validPrices.length > 1 && avgPrice > 0 && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                        {t('deviation')}
                      </th>
                    )}
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                      {t('confidence')}
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                      来源
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('timestamp')}
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            sortColumn === 'timestamp'
                              ? sortDirection === 'asc'
                                ? 'rotate-180'
                                : ''
                              : 'opacity-30'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
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
                        className={`border-b border-gray-100 hover:bg-gray-50 ${outlier ? 'bg-amber-50' : ''}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chartColors[data.provider] }}
                            />
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {oracleNames[data.provider]}
                              </span>
                              {outlier && (
                                <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                                  <svg
                                    className="w-4 h-4"
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
                          className={`py-4 px-4 text-right font-semibold ${outlier ? 'text-amber-700' : 'text-gray-900'}`}
                        >
                          $
                          {data.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        {validPrices.length > 1 && avgPrice > 0 && (
                          <td className="py-4 px-4 text-right">
                            {deviationPercent !== null ? (
                              <div className="flex flex-col items-end">
                                <span
                                  className={
                                    deviationPercent >= 0
                                      ? 'text-green-600 font-semibold'
                                      : 'text-red-600 font-semibold'
                                  }
                                >
                                  {deviationPercent >= 0 ? '+' : ''}
                                  {deviationPercent.toFixed(2)}%
                                </span>
                                <div className="w-24 h-2 mt-1 bg-gray-100 rounded-full overflow-hidden relative">
                                  {deviationPercent > 0 ? (
                                    <div
                                      className="absolute top-0 left-1/2 h-full bg-green-100"
                                      style={{
                                        width: `${(Math.min(Math.abs(deviationPercent), 2) / 2) * 50}%`,
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="absolute top-0 right-1/2 h-full bg-red-100"
                                      style={{
                                        width: `${(Math.min(Math.abs(deviationPercent), 2) / 2) * 50}%`,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        <td className="py-4 px-4 text-right text-gray-700">
                          {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-4 px-4 text-right text-gray-500 text-sm">
                          {data.source || '-'}
                        </td>
                        <td className="py-4 px-4 text-right text-gray-500 text-sm">
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

      <Card>
        <CardHeader>
          <CardTitle>{t('priceTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
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
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow:
                        '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{
                      color: '#374151',
                      fontWeight: 600,
                      marginBottom: '8px',
                      fontSize: '13px',
                    }}
                    itemStyle={{
                      padding: '4px 0',
                      fontSize: '13px',
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
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {selectedOracles.map((oracle) => (
                    <Line
                      key={oracle}
                      type="monotone"
                      dataKey={oracleNames[oracle]}
                      stroke={chartColors[oracle]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
