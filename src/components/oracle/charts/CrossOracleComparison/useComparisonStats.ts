import { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import {
  PriceComparisonData,
  PriceHistoryPoint,
  DeviationData,
  PriceDeviationDetail,
  OraclePerformance,
  oracleNames,
  oracleColors,
  defaultPerformanceData,
  symbols,
} from './crossOracleConfig';

interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  median: number;
}

interface ExtendedStats {
  maxDeviation: number;
  avgResponseTime: number;
  maxPriceOracle: DeviationData | undefined;
  minPriceOracle: DeviationData | undefined;
}

interface DeviationAlert {
  provider: OracleProvider;
  name: string;
  deviation: number;
  price: number;
}

interface DeviationChartData {
  name: string;
  deviation: number;
  color: string;
  price: number;
}

interface ChartDataItem {
  name: string;
  price: number;
  color: string;
}

interface RadarMetric {
  metric: string;
  [key: string]: string | number;
}

interface LineChartDataPoint {
  time: number;
  [key: string]: number | string | null;
}

interface ExportData {
  symbol: string;
  timestamp: string;
  oracles: Array<{
    provider: string;
    price: number;
    confidence?: number;
    responseTime: number;
    deviation: number;
  }>;
  statistics?: {
    avg: number;
    max: number;
    min: number;
    range: number;
    stdDev: number;
    median: number;
  };
}

interface UseComparisonStatsProps {
  priceData: PriceComparisonData[];
  priceHistory: Record<OracleProvider, PriceHistoryPoint[]>;
  selectedOracles: OracleProvider[];
  benchmarkOracle: OracleProvider;
  deviationThreshold: number;
  selectedSymbol: string;
  lastUpdated: Date;
}

interface UseComparisonStatsReturn {
  performanceData: OraclePerformance[];
  priceStats: PriceStats | null;
  deviationData: DeviationData[];
  deviationDetails: PriceDeviationDetail[];
  deviationChartData: DeviationChartData[];
  chartData: ChartDataItem[];
  radarData: RadarMetric[];
  lineChartData: LineChartDataPoint[];
  extendedStats: ExtendedStats | null;
  deviationAlerts: DeviationAlert[];
  consistencyScore: number;
  exportData: ExportData;
  getConsistencyLabel: (score: number) => string;
  getConsistencyColor: (score: number) => string;
  heatmapData: Array<{
    asset: string;
    oracle: string;
    deviation: number;
  }>;
}

export function useComparisonStats({
  priceData,
  priceHistory,
  selectedOracles,
  benchmarkOracle,
  deviationThreshold,
  selectedSymbol,
  lastUpdated,
}: UseComparisonStatsProps): UseComparisonStatsReturn {
  const t = useTranslations();

  const performanceData: OraclePerformance[] = useMemo(() => defaultPerformanceData, []);

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
    if (score >= 90) return t('consistency.excellent');
    if (score >= 70) return t('consistency.good');
    if (score >= 50) return t('consistency.fair');
    return t('consistency.poor');
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

    const benchmarkPrice =
      priceData.find((d) => d.provider === benchmarkOracle)?.price || priceStats.avg;

    return priceData
      .map((d, index) => {
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
      })
      .sort((a, b) => Math.abs(b.deviationFromAvg) - Math.abs(a.deviationFromAvg));
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

  const lineChartData = useMemo((): LineChartDataPoint[] => {
    const maxLength = Math.max(...Object.values(priceHistory).map((arr) => arr.length));
    return Array.from({ length: maxLength }, (_, i) => {
      const point: LineChartDataPoint = { time: i };
      selectedOracles.forEach((provider) => {
        const history = priceHistory[provider] || [];
        (point as Record<string, number | string | null>)[oracleNames[provider]] =
          history[i]?.price ?? null;
        (point as Record<string, number | string | null>)[`${oracleNames[provider]}_time`] =
          history[i]?.timestamp ?? null;
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
      statistics: priceStats ?? undefined,
    };
  }, [priceData, priceStats, selectedSymbol, lastUpdated]);

  const heatmapData = useMemo(() => {
    // 模拟多资产偏差数据
    const data: Array<{ asset: string; oracle: string; deviation: number }> = [];

    symbols.forEach((symbol) => {
      selectedOracles.forEach((provider) => {
        // 模拟不同资产在不同预言机间的偏差
        const baseDeviation = Math.random() * 2 - 1; // -1% 到 +1%
        const oracleSpecificFactor =
          provider === OracleProvider.PYTH || provider === OracleProvider.REDSTONE
            ? 0.3 // 高频预言机偏差更小
            : 0.8; // 标准预言机偏差较大

        data.push({
          asset: symbol,
          oracle: oracleNames[provider],
          deviation: Number((baseDeviation * oracleSpecificFactor).toFixed(3)),
        });
      });
    });

    return data;
  }, [selectedOracles]);

  return {
    performanceData,
    priceStats,
    deviationData,
    deviationDetails,
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
    heatmapData,
  };
}
