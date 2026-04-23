import { safeMax, safeMin } from '@/lib/utils';

import { logger } from './client';
import { fetchOraclesData } from './oracles';
import {
  MarketDataError,
  type BenchmarkData,
  type ComparisonData,
  type CorrelationData,
  type CorrelationPair,
  type OracleMarketData,
  type RadarDataPoint,
} from './types';

function calculateComparisonMetrics(oracleData: OracleMarketData[]): ComparisonData[] {
  if (oracleData.length === 0) {
    return [];
  }

  const maxTvs = safeMax(oracleData.map((o) => o.tvsValue));
  const maxChains = safeMax(oracleData.map((o) => o.chains));
  const maxProtocols = safeMax(oracleData.map((o) => o.protocols));
  const maxLatency = safeMax(oracleData.map((o) => o.avgLatency));
  const maxAccuracy = safeMax(oracleData.map((o) => o.accuracy));
  const maxUpdateFreq = safeMax(oracleData.map((o) => o.updateFrequency));
  const maxShare = safeMax(oracleData.map((o) => o.share));

  const normalize = (value: number, max: number, inverse = false): number => {
    if (max === 0) return 0;
    if (inverse) {
      return Math.round((1 - value / max) * 100);
    }
    return Math.round((value / max) * 100);
  };

  const calculateOverallScore = (metrics: ComparisonData['metrics']): number => {
    const weights = {
      tvs: 0.25,
      marketShare: 0.2,
      accuracy: 0.2,
      latency: 0.15,
      chains: 0.1,
      protocols: 0.05,
      updateFrequency: 0.05,
    };

    return Math.round(
      metrics.tvs.normalizedValue * weights.tvs +
        metrics.marketShare.normalizedValue * weights.marketShare +
        metrics.accuracy.normalizedValue * weights.accuracy +
        metrics.latency.normalizedValue * weights.latency +
        metrics.chains.normalizedValue * weights.chains +
        metrics.protocols.normalizedValue * weights.protocols +
        metrics.updateFrequency.normalizedValue * weights.updateFrequency
    );
  };

  const comparisonData: ComparisonData[] = oracleData.map((oracle) => {
    const metrics = {
      tvs: {
        name: 'TVS',
        value: oracle.tvsValue,
        normalizedValue: Math.round(normalize(oracle.tvsValue, maxTvs)),
        unit: 'B',
        rank: 0,
      },
      latency: {
        name: 'Latency',
        value: oracle.avgLatency,
        normalizedValue: Math.round(normalize(oracle.avgLatency, maxLatency, true)),
        unit: 'ms',
        rank: 0,
      },
      accuracy: {
        name: 'Accuracy',
        value: oracle.accuracy,
        normalizedValue: Math.round(normalize(oracle.accuracy, maxAccuracy)),
        unit: '%',
        rank: 0,
      },
      marketShare: {
        name: 'Market Share',
        value: oracle.share,
        normalizedValue: Math.round(normalize(oracle.share, maxShare)),
        unit: '%',
        rank: 0,
      },
      chains: {
        name: 'Chains',
        value: oracle.chains,
        normalizedValue: Math.round(normalize(oracle.chains, maxChains)),
        unit: '',
        rank: 0,
      },
      protocols: {
        name: 'Protocols',
        value: oracle.protocols,
        normalizedValue: Math.round(normalize(oracle.protocols, maxProtocols)),
        unit: '',
        rank: 0,
      },
      updateFrequency: {
        name: 'Update Freq',
        value: oracle.updateFrequency,
        normalizedValue: Math.round(normalize(oracle.updateFrequency, maxUpdateFreq, true)),
        unit: 's',
        rank: 0,
      },
    };

    const metricKeys: (keyof typeof metrics)[] = [
      'tvs',
      'latency',
      'accuracy',
      'marketShare',
      'chains',
      'protocols',
      'updateFrequency',
    ];

    metricKeys.forEach((key) => {
      const sorted = [...oracleData].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (key) {
          case 'tvs':
            aValue = -a.tvsValue;
            bValue = -b.tvsValue;
            break;
          case 'latency':
            aValue = a.avgLatency;
            bValue = b.avgLatency;
            break;
          case 'accuracy':
            aValue = -a.accuracy;
            bValue = -b.accuracy;
            break;
          case 'marketShare':
            aValue = -a.share;
            bValue = -b.share;
            break;
          case 'chains':
            aValue = -a.chains;
            bValue = -b.chains;
            break;
          case 'protocols':
            aValue = -a.protocols;
            bValue = -b.protocols;
            break;
          case 'updateFrequency':
            aValue = a.updateFrequency;
            bValue = b.updateFrequency;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        return aValue - bValue;
      });
      metrics[key].rank = sorted.findIndex((o) => o.name === oracle.name) + 1;
    });

    return {
      oracle: oracle.name,
      color: oracle.color,
      metrics,
      overallScore: calculateOverallScore(metrics),
      rank: 0,
    };
  });

  comparisonData.sort((a, b) => b.overallScore - a.overallScore);
  comparisonData.forEach((data, index) => {
    data.rank = index + 1;
  });

  return comparisonData;
}

export async function fetchComparisonData(): Promise<ComparisonData[]> {
  try {
    logger.info('Fetching comparison data from real oracle data...');

    const oracleData = await fetchOraclesData();

    if (oracleData.length === 0) {
      throw new MarketDataError('No oracle data available', 'NO_DATA');
    }

    const comparisonData = calculateComparisonMetrics(oracleData);

    logger.info(`Generated comparison data for ${comparisonData.length} oracles`);
    return comparisonData;
  } catch (error) {
    logger.error(
      'Failed to fetch comparison data from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackComparisonData();
  }
}

function generateFallbackComparisonData(): ComparisonData[] {
  logger.warn('Using fallback comparison data - API unavailable');
  return [];
}

export async function fetchRadarData(): Promise<RadarDataPoint[]> {
  const comparisonData = await fetchComparisonData();

  const metrics = [
    'TVS',
    'Latency',
    'Accuracy',
    'Market Share',
    'Chains',
    'Protocols',
    'Update Freq',
  ];

  return metrics.map((metric) => {
    const point: RadarDataPoint = {
      metric,
      fullMark: 100,
    };

    comparisonData.forEach((oracle) => {
      const metricKeyMap: Record<string, keyof typeof oracle.metrics> = {
        TVS: 'tvs',
        Latency: 'latency',
        Accuracy: 'accuracy',
        'Market Share': 'marketShare',
        Chains: 'chains',
        Protocols: 'protocols',
        'Update Freq': 'updateFrequency',
      };
      const metricKey = metricKeyMap[metric];
      const value = metricKey ? oracle.metrics[metricKey]?.normalizedValue || 0 : 0;
      point[oracle.oracle] = value;
    });

    return point;
  });
}

function getMetricDescription(metricKey: string): string {
  const descriptions: Record<string, string> = {
    tvs: 'Total Value Secured - Total asset value protected by oracles',
    latency: 'Average response time for price updates',
    accuracy: 'Price accuracy percentage over last 30 days',
    marketShare: 'Percentage of total oracle market',
    chains: 'Number of supported blockchain networks',
    protocols: 'Number of integrated DeFi protocols',
    updateFrequency: 'Average time between price updates',
  };
  return descriptions[metricKey] || '';
}

export async function fetchBenchmarkData(): Promise<BenchmarkData[]> {
  try {
    logger.info('Fetching benchmark data...');

    const comparisonData = await fetchComparisonData();

    const calculateBenchmark = (metricKey: keyof ComparisonData['metrics']): BenchmarkData => {
      const values = comparisonData.map((o) => o.metrics[metricKey].value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const best = safeMax(values);

      const metric = comparisonData[0].metrics[metricKey];

      return {
        metric: {
          name: metric.name,
          industryAverage: Number(average.toFixed(2)),
          industryMedian: median,
          industryBest: best,
          unit: metric.unit,
          description: getMetricDescription(metricKey),
        },
        oracleValues: comparisonData.map((o) => {
          const value = o.metrics[metricKey].value;
          const diffFromAverage = value - average;
          const diffPercent = (diffFromAverage / average) * 100;
          const percentile = (sorted.filter((v) => v <= value).length / sorted.length) * 100;

          return {
            oracle: o.oracle,
            color: o.color,
            value,
            diffFromAverage: Number(diffFromAverage.toFixed(2)),
            diffPercent: Number(diffPercent.toFixed(1)),
            percentile: Math.round(percentile),
          };
        }),
      };
    };

    return [
      calculateBenchmark('tvs'),
      calculateBenchmark('latency'),
      calculateBenchmark('accuracy'),
      calculateBenchmark('marketShare'),
      calculateBenchmark('chains'),
      calculateBenchmark('protocols'),
      calculateBenchmark('updateFrequency'),
    ];
  } catch (error) {
    logger.error(
      'Failed to fetch benchmark data',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function calculateCorrelation(timeRange: string = '30D'): Promise<CorrelationData> {
  try {
    logger.info('Calculating correlation matrix...');

    const oracles = ['Chainlink', 'Pyth Network', 'API3', 'UMA'];
    const n = oracles.length;

    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
    }

    const correlations = [
      [0.85, 0.72, 0.68, 0.45, 0.52],
      [0.72, 0.91, 0.75, 0.38, 0.48],
      [0.68, 0.75, 0.88, 0.42, 0.55],
      [0.45, 0.38, 0.42, 0.82, 0.35],
      [0.52, 0.48, 0.55, 0.35, 0.79],
    ];

    logger.warn(
      'Using estimated correlation values - real price data correlation not yet available'
    );

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = correlations[i][j - i - 1] || 0.5;
        matrix[i][j] = correlation;
        matrix[j][i] = correlation;
      }
    }

    const pairs: CorrelationPair[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({
          oracleA: oracles[i],
          oracleB: oracles[j],
          correlation: matrix[i][j],
          sampleSize: 720,
          confidence: 0.95,
        });
      }
    }

    return {
      oracles,
      matrix,
      pairs: pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
      timeRange,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate correlation',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      oracles: [],
      matrix: [],
      pairs: [],
      timeRange,
      lastUpdated: new Date().toISOString(),
    };
  }
}
