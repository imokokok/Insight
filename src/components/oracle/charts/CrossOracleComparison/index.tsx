'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Cell,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import { useI18n } from '@/lib/i18n/provider';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { DashboardCard, FlatStatItem, FlatSection } from '../../common/DashboardCard';
import { PriceDeviationHistoryChart } from '../PriceDeviationHistoryChart';
import { createLogger } from '@/lib/utils/logger';
import { ComparisonReportExporter } from '@/components/oracle/forms/ComparisonReportExporter';
import { chartColors, semanticColors } from '@/lib/config/colors';
import {
  oracleClients,
  oracleNames,
  oracleColors,
  symbols,
  defaultPerformanceData,
  PriceComparisonData,
  PriceHistoryPoint,
  DeviationData,
  PriceDeviationDetail,
  OraclePerformance,
  TimeWindow,
} from './crossOracleConfig';
import { useSorting } from './useSorting';
import { TrendIndicator } from './TrendIndicator';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';

const logger = createLogger('CrossOracleComparison');

export function CrossOracleComparison() {
  const { t } = useI18n();
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

  const performanceData: OraclePerformance[] = useMemo(() => defaultPerformanceData, []);

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
        const prevDataMap = new Map(prevData.map(d => [d.provider, d.price]));
        const resultsWithPrevious = validResults.map(result => ({
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

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const median =
      sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)];

    return { avg, max, min, range, stdDev, median };
  }, [priceData]);

  const deviationData = useMemo((): DeviationData[] => {
    if (!priceStats || priceData.length === 0) return [];

    const data = priceData.map((d) => {
      const deviationFromAvg = ((d.price - priceStats.avg) / priceStats.avg) * 100;
      const deviationPercent = Math.abs(deviationFromAvg);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (d.previousPrice) {
        const priceChange = ((d.price - d.previousPrice) / d.previousPrice) * 100;
        if (priceChange > 0.01) trend = 'up';
        else if (priceChange < -0.01) trend = 'down';
      }

      return {
        provider: d.provider,
        name: oracleNames[d.provider],
        price: d.price,
        deviationPercent,
        deviationFromAvg,
        responseTime: d.responseTime,
        confidence: d.confidence,
        color: oracleColors[d.provider],
        trend,
        rank: 0,
      };
    });

    const sortedByDeviation = [...data].sort((a, b) => b.deviationPercent - a.deviationPercent);
    sortedByDeviation.forEach((item, index) => {
      const originalItem = data.find((d) => d.provider === item.provider);
      if (originalItem) originalItem.rank = index + 1;
    });

    return data;
  }, [priceData, priceStats]);

  const deviationDetails = useMemo((): PriceDeviationDetail[] => {
    if (!priceStats || priceData.length === 0) return [];

    const benchmarkPrice = priceData.find((d) => d.provider === benchmarkOracle)?.price || priceStats.avg;

    return priceData.map((d, index) => {
      const deviationFromAvg = ((d.price - priceStats.avg) / priceStats.avg) * 100;
      const deviationFromMedian = ((d.price - priceStats.median) / priceStats.median) * 100;
      const deviationFromBenchmark = ((d.price - benchmarkPrice) / benchmarkPrice) * 100;

      return {
        provider: d.provider,
        name: oracleNames[d.provider],
        price: d.price,
        deviationFromAvg,
        deviationFromMedian,
        deviationFromBenchmark,
        rank: index + 1,
      };
    }).sort((a, b) => Math.abs(b.deviationFromAvg) - Math.abs(a.deviationFromAvg));
  }, [priceData, priceStats, benchmarkOracle]);

  const deviationChartData = useMemo(() => {
    return deviationData.map((d) => ({
      name: d.name,
      deviation: d.deviationFromAvg,
      color: d.color,
      price: d.price,
    }));
  }, [deviationData]);

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
      {
        metric: t('crossOracle.metrics.accuracy'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = p.accuracy;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('crossOracle.metrics.decentralization'),
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = p.decentralization;
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
      const point: Record<string, number | string> = { time: i };
      selectedOracles.forEach((provider) => {
        const history = priceHistory[provider] || [];
        point[oracleNames[provider]] = history[i]?.price ?? null;
        point[`${oracleNames[provider]}_time`] = history[i]?.timestamp ?? null;
      });
      return point;
    });
  }, [priceHistory, selectedOracles]);

  const extendedStats = useMemo(() => {
    if (!priceStats || deviationData.length === 0) return null;

    const maxDeviation = Math.max(...deviationData.map((d) => d.deviationPercent));
    const avgResponseTime =
      deviationData.reduce((sum, d) => sum + d.responseTime, 0) / deviationData.length;
    const maxPriceOracle = deviationData.find((d) => d.price === priceStats.max);
    const minPriceOracle = deviationData.find((d) => d.price === priceStats.min);

    return {
      maxDeviation,
      avgResponseTime,
      maxPriceOracle,
      minPriceOracle,
    };
  }, [priceStats, deviationData]);

  const { handleSort, getSortIcon, sortedPriceData } = useSorting(priceData, priceStats);

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

  const exportData = useMemo(() => {
    return {
      symbol: selectedSymbol,
      timestamp: lastUpdated.toISOString(),
      oracles: priceData.map((d) => ({
        provider: oracleNames[d.provider],
        price: d.price,
        confidence: d.confidence,
        responseTime: d.responseTime,
        deviation: priceStats ? ((d.price - priceStats.avg) / priceStats.avg) * 100 : 0,
      })),
      statistics: priceStats,
    };
  }, [priceData, priceStats, selectedSymbol, lastUpdated]);

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
            chartRef={chartRef}
            fileName={`cross-oracle-comparison-${selectedSymbol}-${lastUpdated.toISOString().split('T')[0]}`}
          />
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
                    strokeLinecap="round"
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
                    strokeLinecap="round"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
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
                  strokeLinecap="round"
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      <div className="py-4 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.selectTradingPair')}</h3>
            <div className="flex flex-wrap gap-2">
              {symbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedSymbol === symbol
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {symbol}/USD
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.selectOraclesTitle')} ({selectedOracles.length}/3)</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {getOracleProvidersSortedByMarketCap().map((provider) => (
                <button
                  key={provider}
                  onClick={() => toggleOracle(provider)}
                  disabled={!selectedOracles.includes(provider) && selectedOracles.length >= 3}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {t('crossOracleComparison.quickCompare')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700">{t('crossOracle.priceDeviationThreshold')}</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => setDeviationThreshold(parseFloat(e.target.value))}
              className="w-32 h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-blue-600"
            />
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => setDeviationThreshold(parseFloat(e.target.value) || 1)}
              className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {deviationAlerts.length > 0 && (
        <div className="py-4 border-b border-amber-100">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
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
              <h3 className="text-sm font-semibold text-amber-800 mb-2">{t('crossOracle.priceDeviationAlert')}</h3>
              <div className="space-y-1.5">
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
                    <span>{t('crossOracleComparison.deviation')} {alert.deviation.toFixed(3)}%</span>
                    <span className="text-amber-600">(${alert.price.toFixed(2)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {deviationData.length > 0 && (
        <div className="py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.differenceAnalysisPanel')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('crossOracle.oraclePerformanceRanking.rank')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('crossOracle.oracle')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('crossOracle.price')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('crossOracle.stats.deviationFromAverage')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('crossOracle.confidence')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('crossOracleComparison.avgResponseTime')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {deviationData
                  .sort((a, b) => b.deviationPercent - a.deviationPercent)
                  .map((data) => (
                    <tr key={data.provider} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                            data.rank === 1
                              ? 'bg-red-100 text-red-800'
                              : data.rank === 2
                                ? 'bg-orange-100 text-orange-800'
                                : data.rank === 3
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {data.rank}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-2.5 h-2.5 rounded-full mr-2"
                            style={{ backgroundColor: data.color }}
                          />
                          <span className="font-medium text-gray-900">{data.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900 font-mono">
                        ${data.price.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-2 whitespace-nowrap font-mono ${
                          data.deviationFromAvg > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {data.deviationFromAvg > 0 ? '+' : ''}
                        {data.deviationFromAvg.toFixed(3)}%
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {data.responseTime}ms
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deviationChartData.length > 0 && (
        <div className="py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.priceDifferenceVisualization')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deviationChartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(3)}%`, t('crossOracle.stats.deviationFromAverage')]}
                  labelFormatter={(label) =>
                    `${label} - $${deviationChartData.find((d) => d.name === label)?.price.toFixed(2)}`
                  }
                />
                <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1} />
                <Bar dataKey="deviation" radius={[2, 2, 2, 2]}>
                  {deviationChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.deviation >= 0 ? chartColors.recharts.success : chartColors.recharts.danger}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-500"></div>
              <span className="text-gray-600">{t('crossOracle.aboveAverage')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span className="text-gray-600">{t('crossOracle.belowAverage')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-gray-600"></div>
              <span className="text-gray-600">{t('crossOracle.zeroLineAverage')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.multiOraclePriceComparison')}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lineChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="time" tickFormatter={() => ''} />
              <YAxis domain={['auto', 'auto']} tickFormatter={(value) => `$${value?.toFixed(2) || 0}`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: any, name: any) => [`$${Number(value)?.toFixed(2) || 0}`, name]}
                labelFormatter={() => t('crossOracle.priceHistory')}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {selectedOracles.map((provider) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={oracleNames[provider]}
                  stroke={oracleColors[provider]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              ))}
              <ReferenceLine
                y={priceStats?.avg}
                stroke="#9ca3af"
                strokeDasharray="3 3"
                label={{ value: t('crossOracle.average'), position: 'right', fontSize: 10 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <PriceDeviationHistoryChart
        priceHistory={Object.fromEntries(
          Object.entries(priceHistory).map(([k, v]) => [k, v.map((p) => p.price)])
        )}
        selectedOracles={selectedOracles}
        oracleColors={oracleColors}
        oracleNames={oracleNames}
        chainlinkPrice={priceData.find((d) => d.provider === OracleProvider.CHAINLINK)?.price}
      />

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.priceComparisonDetails')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.oracle')}
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.price')}
                    {getSortIcon('price')}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('deviation')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.deviation')}
                    {getSortIcon('deviation')}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('confidence')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracle.confidence')}
                    {getSortIcon('confidence')}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('responseTime')}
                >
                  <div className="flex items-center gap-1">
                    {t('crossOracleComparison.avgResponseTime')}
                    {getSortIcon('responseTime')}
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.trend')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPriceData.map((data) => {
                const deviation = priceStats
                  ? ((data.price - priceStats.avg) / priceStats.avg) * 100
                  : 0;
                const deviationAbs = Math.abs(deviation);
                const deviationColor =
                  deviationAbs < 0.5
                    ? 'text-green-600'
                    : deviationAbs < 1
                      ? 'text-yellow-600'
                      : 'text-red-600';

                const shouldHighlight = deviationAbs > 1;
                const trendData = deviationData.find((d) => d.provider === data.provider);
                const trend = trendData?.trend || 'stable';

                return (
                  <tr
                    key={data.provider}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      shouldHighlight ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: oracleColors[data.provider] }}
                        />
                        <span className="font-medium text-gray-900">
                          {oracleNames[data.provider]}
                        </span>
                        {shouldHighlight && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            {t('crossOracleComparison.highDeviation')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-900 font-mono">
                      ${data.price.toFixed(2)}
                    </td>
                    <td className={`px-3 py-2.5 whitespace-nowrap font-mono ${deviationColor}`}>
                      {deviation > 0 ? '+' : ''}
                      {deviation.toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                      {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                      {data.responseTime}ms
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <TrendIndicator trend={trend} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.currentPriceComparison')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `$${Number(value).toFixed(0)}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, t('crossOracle.price')]} />
                <Bar dataKey="price" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.priceTrendComparison')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="time" tickFormatter={() => ''} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedOracles.map((provider) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={oracleNames[provider]}
                    stroke={oracleColors[provider]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.performanceComparison')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.oracle')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.stats.avgResponseTime')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.dataQualityScoreCard.metrics.updateFrequency')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.dataSources')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracleComparison.supportedChains')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.dataQualityScoreCard.dimensions.reliability')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.metrics.accuracy')}
                </th>
              </tr>
            </thead>
            <tbody>
              {performanceData
                .filter((p) => selectedOracles.includes(p.provider))
                .map((perf) => (
                  <tr key={perf.provider} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: oracleColors[perf.provider] }}
                        />
                        <span className="font-medium text-gray-900">
                          {oracleNames[perf.provider]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                      {perf.responseTime}ms
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                      {perf.updateFrequency < 1
                        ? `${(perf.updateFrequency * 1000).toFixed(0)}ms`
                        : `${perf.updateFrequency}s`}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                      {perf.dataSources}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                      {perf.supportedChains}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-green-600 font-medium">{perf.reliability}%</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-blue-600 font-medium">{perf.accuracy}%</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crossOracle.comprehensivePerformanceRadar')}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 60, left: 60, bottom: 10 }}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              {selectedOracles.map((provider) => (
                <Radar
                  key={provider}
                  name={oracleNames[provider]}
                  dataKey={oracleNames[provider]}
                  stroke={oracleColors[provider]}
                  fill={oracleColors[provider]}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('crossOracle.enableAutoRefresh')}</span>
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
