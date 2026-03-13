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
  Area,
} from 'recharts';
import { useI18n } from '@/lib/i18n/provider';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
} from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/lib/types/oracle';
import { DashboardCard, MetricCard } from './DashboardCard';
import { PriceDeviationHistoryChart } from './PriceDeviationHistoryChart';
import { createLogger } from '@/lib/utils/logger';
import { ComparisonReportExporter } from './ComparisonReportExporter';

const logger = createLogger('CrossOracleComparison');

type SortField = 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name';
type SortDirection = 'asc' | 'desc' | null;
type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
};

const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
};

const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#375BD2',
  [OracleProvider.BAND_PROTOCOL]: '#9B51E0',
  [OracleProvider.UMA]: '#FF6B6B',
  [OracleProvider.PYTH]: '#EC4899',
  [OracleProvider.API3]: '#10B981',
};

interface OraclePerformance {
  provider: OracleProvider;
  responseTime: number;
  updateFrequency: number;
  dataSources: number;
  supportedChains: number;
  reliability: number;
  accuracy: number;
  decentralization: number;
}

interface PriceComparisonData {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
  previousPrice?: number;
}

interface DeviationData {
  provider: OracleProvider;
  name: string;
  price: number;
  deviationPercent: number;
  deviationFromAvg: number;
  rank: number;
  responseTime: number;
  confidence?: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

interface PriceDeviationDetail {
  provider: OracleProvider;
  name: string;
  price: number;
  deviationFromAvg: number;
  deviationFromMedian: number;
  deviationFromBenchmark: number;
  rank: number;
}

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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: null });
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [benchmarkOracle, setBenchmarkOracle] = useState<OracleProvider>(OracleProvider.CHAINLINK);

  const symbols = ['BTC', 'ETH', 'SOL', 'USDC', 'LINK', 'AVAX', 'MATIC', 'ARB'];

  const performanceData: OraclePerformance[] = useMemo(
    () => [
      {
        provider: OracleProvider.CHAINLINK,
        responseTime: 85,
        updateFrequency: 30,
        dataSources: 350,
        supportedChains: 12,
        reliability: 99.8,
        accuracy: 99.5,
        decentralization: 95,
      },
      {
        provider: OracleProvider.PYTH,
        responseTime: 45,
        updateFrequency: 0.4,
        dataSources: 180,
        supportedChains: 8,
        reliability: 99.9,
        accuracy: 99.7,
        decentralization: 90,
      },
      {
        provider: OracleProvider.BAND_PROTOCOL,
        responseTime: 150,
        updateFrequency: 30,
        dataSources: 180,
        supportedChains: 8,
        reliability: 99.5,
        accuracy: 99.2,
        decentralization: 85,
      },
      {
        provider: OracleProvider.API3,
        responseTime: 180,
        updateFrequency: 60,
        dataSources: 168,
        supportedChains: 3,
        reliability: 99.7,
        accuracy: 99.4,
        decentralization: 80,
      },
      {
        provider: OracleProvider.UMA,
        responseTime: 300,
        updateFrequency: 120,
        dataSources: 50,
        supportedChains: 2,
        reliability: 99.5,
        accuracy: 98.8,
        decentralization: 88,
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

          const previousHistory = priceHistory[provider];
          const previousPrice = previousHistory?.[previousHistory.length - 1]?.price;

          return {
            provider,
            price: price.price,
            timestamp: price.timestamp,
            confidence: price.confidence,
            responseTime,
            previousPrice,
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

      setPriceData(validResults);
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
  }, [selectedSymbol, selectedOracles, priceHistory]);

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
        metric: '准确性',
        ...selectedPerformance.reduce(
          (acc, p) => {
            acc[oracleNames[p.provider]] = p.accuracy;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: '去中心化',
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

  const TrendIndicator = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') {
      return (
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
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
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
      <div className="flex items-center justify-between">
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

      {extendedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="最高价格"
            value={`$${priceStats?.max.toFixed(2)}`}
            subValue={extendedStats.maxPriceOracle?.name}
            icon={
              <svg
                className="w-5 h-5 text-green-500"
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
          <MetricCard
            label="最低价格"
            value={`$${priceStats?.min.toFixed(2)}`}
            subValue={extendedStats.minPriceOracle?.name}
            icon={
              <svg
                className="w-5 h-5 text-red-500"
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
          <MetricCard
            label="最大价格差异"
            value={`${extendedStats.maxDeviation.toFixed(3)}%`}
            subValue="偏离平均值"
            icon={
              <svg
                className="w-5 h-5 text-amber-500"
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
          <MetricCard
            label="平均响应时间"
            value={`${Math.round(extendedStats.avgResponseTime)}ms`}
            icon={
              <svg
                className="w-5 h-5 text-blue-500"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="选择交易对">
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
                {symbol}/USD
              </button>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title={`选择预言机 (已选 ${selectedOracles.length}/3)`}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.values(OracleProvider).map((provider) => (
                <button
                  key={provider}
                  onClick={() => toggleOracle(provider)}
                  disabled={!selectedOracles.includes(provider) && selectedOracles.length >= 3}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
                快速对比主流预言机
              </span>
            </button>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="偏离阈值设置">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700">价格偏离预警阈值:</label>
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
                <h3 className="text-sm font-semibold text-amber-800 mb-2">价格偏离预警</h3>
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

      {deviationData.length > 0 && (
        <DashboardCard title="差异分析面板">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      排名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      预言机
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      价格
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      偏离平均值
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      置信度
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      响应时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deviationData
                    .sort((a, b) => b.deviationPercent - a.deviationPercent)
                    .map((data) => (
                      <tr key={data.provider} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="font-medium text-gray-900">{data.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-mono">
                          ${data.price.toFixed(2)}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap font-mono ${
                            data.deviationFromAvg > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {data.deviationFromAvg > 0 ? '+' : ''}
                          {data.deviationFromAvg.toFixed(3)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {data.responseTime}ms
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </DashboardCard>
      )}

      {deviationChartData.length > 0 && (
        <DashboardCard title="价格差异可视化">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deviationChartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip
                  formatter={(value: any) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(3)}%`, '偏离平均值']}
                  labelFormatter={(label) =>
                    `${label} - $${deviationChartData.find((d) => d.name === label)?.price.toFixed(2)}`
                  }
                />
                <ReferenceLine x={0} stroke="#666" strokeWidth={2} />
                <Bar dataKey="deviation" radius={[4, 4, 4, 4]}>
                  {deviationChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.deviation >= 0 ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-gray-600">高于平均值</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-gray-600">低于平均值</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gray-600"></div>
              <span className="text-gray-600">零线（平均值）</span>
            </div>
          </div>
        </DashboardCard>
      )}

      <DashboardCard title="多预言机价格对比">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={() => ''} />
              <YAxis domain={['auto', 'auto']} tickFormatter={(value) => `$${value?.toFixed(2) || 0}`} />
              <Tooltip
                formatter={(value: any, name: any) => [`$${Number(value)?.toFixed(2) || 0}`, name]}
                labelFormatter={() => '价格历史'}
              />
              <Legend />
              {selectedOracles.map((provider) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={oracleNames[provider]}
                  stroke={oracleColors[provider]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
              <ReferenceLine
                y={priceStats?.avg}
                stroke="#666"
                strokeDasharray="3 3"
                label={{ value: '平均值', position: 'right' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <PriceDeviationHistoryChart
        priceHistory={Object.fromEntries(
          Object.entries(priceHistory).map(([k, v]) => [k, v.map((p) => p.price)])
        )}
        selectedOracles={selectedOracles}
        oracleColors={oracleColors}
        oracleNames={oracleNames}
        chainlinkPrice={priceData.find((d) => d.provider === OracleProvider.CHAINLINK)?.price}
      />

      <DashboardCard title="价格对比详情">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    预言机
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    价格
                    {getSortIcon('price')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('deviation')}
                >
                  <div className="flex items-center gap-1">
                    偏离度
                    {getSortIcon('deviation')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('confidence')}
                >
                  <div className="flex items-center gap-1">
                    置信度
                    {getSortIcon('confidence')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('responseTime')}
                >
                  <div className="flex items-center gap-1">
                    响应时间
                    {getSortIcon('responseTime')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  趋势
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
                    className={`hover:bg-gray-50 transition-colors ${
                      shouldHighlight ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: oracleColors[data.provider] }}
                        />
                        <span className="font-medium text-gray-900">
                          {oracleNames[data.provider]}
                        </span>
                        {shouldHighlight && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            高偏离
                          </span>
                        )}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TrendIndicator trend={trend} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="当前价格对比">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, '价格']} />
                <Bar dataKey="price" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="价格趋势对比">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={() => ''} />
                <YAxis domain={['auto', 'auto']} />
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
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="性能对比">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  预言机
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均响应时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新频率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数据源数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  支持链数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  可靠性
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  准确性
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-blue-600 font-medium">{perf.accuracy}%</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title="综合性能雷达图">
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

      <DashboardCard title="自动刷新设置">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">启用自动刷新</span>
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
