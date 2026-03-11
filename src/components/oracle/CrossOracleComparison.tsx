'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useI18n } from '@/lib/i18n/context';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import { OracleProvider, PriceData, Blockchain } from '@/lib/types/oracle';
import { DashboardCard, MetricCard } from './DashboardCard';
import { PriceDeviationHistoryChart } from './PriceDeviationHistoryChart';

type SortField = 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#375BD2',
  [OracleProvider.BAND_PROTOCOL]: '#9B51E0',
  [OracleProvider.UMA]: '#FF6B6B',
  [OracleProvider.PYTH_NETWORK]: '#EC4899',
  [OracleProvider.API3]: '#10B981',
};

interface OraclePerformance {
  provider: OracleProvider;
  responseTime: number;
  updateFrequency: number;
  dataSources: number;
  supportedChains: number;
  reliability: number;
}

interface PriceComparisonData {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
}

export function CrossOracleComparison() {
  const { t } = useI18n();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH_NETWORK,
    OracleProvider.BAND_PROTOCOL,
    OracleProvider.API3,
    OracleProvider.UMA,
  ]);
  const [priceData, setPriceData] = useState<PriceComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [priceHistory, setPriceHistory] = useState<Record<OracleProvider, number[]>>({} as any);
  const [deviationThreshold, setDeviationThreshold] = useState<number>(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: null });

  const symbols = ['BTC', 'ETH', 'SOL', 'USDC', 'LINK'];

  const performanceData: OraclePerformance[] = useMemo(
    () => [
      {
        provider: OracleProvider.CHAINLINK,
        responseTime: 85,
        updateFrequency: 30,
        dataSources: 350,
        supportedChains: 12,
        reliability: 99.8,
      },
      {
        provider: OracleProvider.PYTH_NETWORK,
        responseTime: 45,
        updateFrequency: 0.4,
        dataSources: 180,
        supportedChains: 8,
        reliability: 99.9,
      },
      {
        provider: OracleProvider.BAND_PROTOCOL,
        responseTime: 150,
        updateFrequency: 30,
        dataSources: 180,
        supportedChains: 8,
        reliability: 99.5,
      },
      {
        provider: OracleProvider.API3,
        responseTime: 180,
        updateFrequency: 60,
        dataSources: 168,
        supportedChains: 3,
        reliability: 99.7,
      },
      {
        provider: OracleProvider.UMA,
        responseTime: 300,
        updateFrequency: 120,
        dataSources: 50,
        supportedChains: 2,
        reliability: 99.5,
      },
    ],
    []
  );

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    const startTime = Date.now();

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
          console.error(`Error fetching price from ${provider}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((r) => r !== null) as PriceComparisonData[];

      setPriceData(validResults);
      setLastUpdated(new Date());

      setPriceHistory((prev) => {
        const newHistory = { ...prev };
        validResults.forEach((result) => {
          if (result && !newHistory[result.provider]) {
            newHistory[result.provider] = [];
          }
          if (result) {
            newHistory[result.provider] = [...newHistory[result.provider].slice(-19), result.price];
          }
        });
        return newHistory;
      });
    } catch (error) {
      console.error('Error fetching prices:', error);
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

  const calculateConsistencyScore = useCallback((): number => {
    if (priceData.length < 2) return 0;

    const prices = priceData.map((d) => d.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avg) * 100;

    const score = Math.max(0, Math.min(100, 100 - cv * 10));
    return Math.round(score);
  }, [priceData]);

  const consistencyScore = calculateConsistencyScore();

  const getConsistencyLabel = (score: number): string => {
    if (score >= 90) return t('crossOracle.consistency.excellent');
    if (score >= 70) return t('crossOracle.consistency.good');
    if (score >= 50) return t('crossOracle.consistency.fair');
    return t('crossOracle.consistency.poor');
  };

  const getConsistencyColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const priceStats = useMemo(() => {
    if (priceData.length === 0) return null;

    const prices = priceData.map((d) => d.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return { avg, max, min, range, stdDev };
  }, [priceData]);

  const chartData = useMemo(() => {
    return priceData.map((d) => ({
      name: oracleNames[d.provider],
      price: d.price,
      color: oracleColors[d.provider],
    }));
  }, [priceData]);

  const radarData = useMemo(() => {
    const selectedPerformance = performanceData.filter((p) => selectedOracles.includes(p.provider));

    return [
      {
        metric: t('crossOracleComparison.radar.responseTime'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = Math.max(0, 100 - p.responseTime / 3);
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('crossOracleComparison.radar.updateFrequency'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = Math.min(100, (100 / p.updateFrequency) * 10);
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('crossOracleComparison.radar.dataSources'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = Math.min(100, p.dataSources / 3.5);
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('crossOracleComparison.radar.supportedChains'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = Math.min(100, p.supportedChains * 8);
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('crossOracleComparison.radar.reliability'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = p.reliability;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    ];
  }, [performanceData, selectedOracles, t]);

  const lineChartData = useMemo(() => {
    const maxLength = Math.max(...Object.values(priceHistory).map((arr) => arr.length));
    return Array.from({ length: maxLength }, (_, i) => {
      const point: any = { time: i };
      selectedOracles.forEach((provider) => {
        const history = priceHistory[provider] || [];
        point[oracleNames[provider]] = history[i];
      });
      return point;
    });
  }, [priceHistory, selectedOracles]);

  const toggleOracle = (provider: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    );
  };

  const handleQuickCompare = () => {
    setSelectedOracles([
      OracleProvider.CHAINLINK,
      OracleProvider.PYTH_NETWORK,
      OracleProvider.BAND_PROTOCOL,
    ]);
  };

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        if (prev.direction === 'asc') {
          return { field, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { field, direction: null };
        }
      }
      return { field, direction: 'asc' };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    if (sortConfig.direction === 'desc') {
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
    return null;
  };

  const sortedPriceData = useMemo(() => {
    if (!sortConfig.direction) return priceData;

    return [...priceData].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.field) {
        case 'name':
          aValue = oracleNames[a.provider];
          bValue = oracleNames[b.provider];
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'deviation':
          aValue = priceStats ? Math.abs((a.price - priceStats.avg) / priceStats.avg) * 100 : 0;
          bValue = priceStats ? Math.abs((b.price - priceStats.avg) / priceStats.avg) * 100 : 0;
          break;
        case 'confidence':
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
          break;
        case 'responseTime':
          aValue = a.responseTime;
          bValue = b.responseTime;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [priceData, sortConfig, priceStats]);

  const deviationAlerts = useMemo(() => {
    if (!priceStats || priceData.length < 2) return [];

    return priceData
      .map((data) => {
        const deviation = Math.abs((data.price - priceStats.avg) / priceStats.avg) * 100;
        if (deviation > deviationThreshold) {
          return {
            provider: data.provider,
            name: oracleNames[data.provider],
            deviation,
            price: data.price,
          };
        }
        return null;
      })
      .filter((alert): alert is NonNullable<typeof alert> => alert !== null);
  }, [priceData, priceStats, deviationThreshold]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('crossOracleComparison.title')}</h2>
          <p className="text-gray-500 mt-1">{t('crossOracleComparison.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {t('crossOracle.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchPrices}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? t('crossOracle.loading') : t('crossOracle.refresh')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              {t('crossOracleComparison.consistencyScore')}
            </p>
            <p className={`text-4xl font-bold ${getConsistencyColor(consistencyScore)}`}>
              {consistencyScore}
            </p>
            <p className="text-sm text-gray-600 mt-1">{getConsistencyLabel(consistencyScore)}</p>
          </div>
        </DashboardCard>

        {priceStats && (
          <>
            <MetricCard
              label={t('crossOracle.averagePrice')}
              value={`$${priceStats.avg.toFixed(2)}`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />
            <MetricCard
              label={t('crossOracle.priceRange')}
              value={`$${priceStats.range.toFixed(2)}`}
              subValue={`${((priceStats.range / priceStats.avg) * 100).toFixed(2)}%`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              }
            />
            <MetricCard
              label={t('crossOracle.standardDeviation')}
              value={`$${priceStats.stdDev.toFixed(2)}`}
              subValue={`${((priceStats.stdDev / priceStats.avg) * 100).toFixed(2)}%`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('crossOracle.selectSymbol')}>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title={t('crossOracle.selectOracles')}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.values(OracleProvider).map((provider) => (
                <button
                  key={provider}
                  onClick={() => toggleOracle(provider)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedOracles.includes(provider)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedOracles.includes(provider)
                      ? oracleColors[provider]
                      : undefined,
                  }}
                >
                  {oracleNames[provider]}
                </button>
              ))}
            </div>
            <button
              onClick={handleQuickCompare}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {t('crossOracleComparison.quickCompare') || '快速对比主流预言机'}
              </span>
            </button>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t('crossOracleComparison.deviationSettings') || '偏离阈值设置'}>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700">
            {t('crossOracleComparison.deviationThreshold') || '价格偏离预警阈值'}:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => setDeviationThreshold(parseFloat(e.target.value))}
              className="w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => setDeviationThreshold(parseFloat(e.target.value) || 1)}
              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </DashboardCard>

      {deviationAlerts.length > 0 && (
        <DashboardCard>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
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
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">
                  {t('crossOracleComparison.deviationWarning') || '价格偏离预警'}
                </h3>
                <div className="space-y-2">
                  {deviationAlerts.map((alert) => (
                    <div
                      key={alert.provider}
                      className="flex items-center gap-2 text-sm text-amber-700"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: oracleColors[alert.provider] }}
                      />
                      <span className="font-medium">{alert.name}</span>
                      <span>偏离 {alert.deviation.toFixed(3)}%</span>
                      <span className="text-amber-600">(${alert.price.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      )}

      <PriceDeviationHistoryChart
        priceHistory={priceHistory}
        selectedOracles={selectedOracles}
        oracleColors={oracleColors}
        oracleNames={oracleNames}
        chainlinkPrice={priceData.find((d) => d.provider === OracleProvider.CHAINLINK)?.price}
      />

      <DashboardCard title={t('crossOracleComparison.priceComparison')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.oracle')}
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.price')}
                    {getSortIcon('price')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('deviation')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.deviation')}
                    {getSortIcon('deviation')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('confidence')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.confidence')}
                    {getSortIcon('confidence')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('responseTime')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracleComparison.responseTime')}
                    {getSortIcon('responseTime')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPriceData.map((data) => {
                const deviation = priceStats
                  ? ((data.price - priceStats.avg) / priceStats.avg) * 100
                  : 0;
                const deviationColor =
                  Math.abs(deviation) < 0.5
                    ? 'text-green-600'
                    : Math.abs(deviation) < 1
                      ? 'text-yellow-600'
                      : 'text-red-600';

                return (
                  <tr key={data.provider} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: oracleColors[data.provider] }}
                        />
                        <span className="font-medium text-gray-900">
                          {oracleNames[data.provider]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-mono">
                      ${data.price.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap font-mono ${deviationColor}`}>
                      {deviation > 0 ? '+' : ''}
                      {deviation.toFixed(3)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {data.responseTime}ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('crossOracleComparison.priceChart')}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']} />
                <Bar dataKey="price" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title={t('crossOracleComparison.priceTrend')}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedOracles.map((provider) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={oracleNames[provider]}
                    stroke={oracleColors[provider]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t('crossOracleComparison.performanceComparison')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.oracle')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.avgResponseTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.updateFrequency')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.dataSources')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.supportedChains')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.reliability')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData
                .filter((p) => selectedOracles.includes(p.provider))
                .map((perf) => (
                  <tr key={perf.provider} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: oracleColors[perf.provider] }}
                        />
                        <span className="font-medium text-gray-900">
                          {oracleNames[perf.provider]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {perf.responseTime}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {perf.updateFrequency < 1
                        ? `${(perf.updateFrequency * 1000).toFixed(0)}ms`
                        : `${perf.updateFrequency}s`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {perf.dataSources}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {perf.supportedChains}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-medium">{perf.reliability}%</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('crossOracleComparison.radarChart')}>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              {selectedOracles.map((provider) => (
                <Radar
                  key={provider}
                  name={oracleNames[provider]}
                  dataKey={oracleNames[provider]}
                  stroke={oracleColors[provider]}
                  fill={oracleColors[provider]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('crossOracleComparison.autoRefresh')}>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {t('crossOracleComparison.enableAutoRefresh')}
            </span>
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
