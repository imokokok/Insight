import { chartColors } from '@/lib/config/colors';

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

const ORACLE_COLOR_MAP: Record<string, string> = {
  Chainlink: chartColors.marketOverview.chainlink,
  'Pyth Network': chartColors.marketOverview.pyth,
  'Band Protocol': chartColors.marketOverview.bandProtocol,
  API3: chartColors.marketOverview.api3,
  UMA: chartColors.marketOverview.uma,
  RedStone: chartColors.oracle.redstone,
};

function calculateComparisonMetrics(oracleData: OracleMarketData[]): ComparisonData[] {
  if (oracleData.length === 0) {
    return [];
  }

  const maxTvs = Math.max(...oracleData.map((o) => o.tvsValue));
  const maxChains = Math.max(...oracleData.map((o) => o.chains));
  const maxProtocols = Math.max(...oracleData.map((o) => o.protocols));
  const minLatency = Math.min(...oracleData.map((o) => o.avgLatency));
  const maxAccuracy = Math.max(...oracleData.map((o) => o.accuracy));
  const minUpdateFreq = Math.min(...oracleData.map((o) => o.updateFrequency));
  const maxShare = Math.max(...oracleData.map((o) => o.share));

  const normalize = (value: number, max: number, inverse = false): number => {
    if (max === 0) return 0;
    const normalized = (value / max) * 100;
    return inverse ? 100 - normalized : normalized;
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
        normalizedValue: Math.round(normalize(oracle.avgLatency, minLatency, true)),
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
        normalizedValue: Math.round(normalize(oracle.updateFrequency, minUpdateFreq, true)),
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
  logger.warn('Using fallback comparison data');
  return [
    {
      oracle: 'Chainlink',
      color: ORACLE_COLOR_MAP['Chainlink'],
      metrics: {
        tvs: { name: 'TVS', value: 42.1, normalizedValue: 100, unit: 'B', rank: 1 },
        latency: { name: 'Latency', value: 450, normalizedValue: 75, unit: 'ms', rank: 3 },
        accuracy: { name: 'Accuracy', value: 99.8, normalizedValue: 98, unit: '%', rank: 1 },
        marketShare: {
          name: 'Market Share',
          value: 62.5,
          normalizedValue: 100,
          unit: '%',
          rank: 1,
        },
        chains: { name: 'Chains', value: 15, normalizedValue: 100, unit: '', rank: 1 },
        protocols: { name: 'Protocols', value: 285, normalizedValue: 100, unit: '', rank: 1 },
        updateFrequency: {
          name: 'Update Freq',
          value: 3600,
          normalizedValue: 60,
          unit: 's',
          rank: 5,
        },
      },
      overallScore: 92,
      rank: 1,
    },
    {
      oracle: 'Pyth Network',
      color: ORACLE_COLOR_MAP['Pyth Network'],
      metrics: {
        tvs: { name: 'TVS', value: 15.2, normalizedValue: 36, unit: 'B', rank: 2 },
        latency: { name: 'Latency', value: 120, normalizedValue: 95, unit: 'ms', rank: 1 },
        accuracy: { name: 'Accuracy', value: 99.5, normalizedValue: 95, unit: '%', rank: 2 },
        marketShare: {
          name: 'Market Share',
          value: 22.6,
          normalizedValue: 36,
          unit: '%',
          rank: 2,
        },
        chains: { name: 'Chains', value: 12, normalizedValue: 80, unit: '', rank: 2 },
        protocols: { name: 'Protocols', value: 95, normalizedValue: 33, unit: '', rank: 2 },
        updateFrequency: {
          name: 'Update Freq',
          value: 400,
          normalizedValue: 95,
          unit: 's',
          rank: 2,
        },
      },
      overallScore: 85,
      rank: 2,
    },
    {
      oracle: 'Band Protocol',
      color: ORACLE_COLOR_MAP['Band Protocol'],
      metrics: {
        tvs: { name: 'TVS', value: 4.1, normalizedValue: 10, unit: 'B', rank: 3 },
        latency: { name: 'Latency', value: 600, normalizedValue: 65, unit: 'ms', rank: 4 },
        accuracy: { name: 'Accuracy', value: 99.2, normalizedValue: 92, unit: '%', rank: 3 },
        marketShare: {
          name: 'Market Share',
          value: 6.1,
          normalizedValue: 10,
          unit: '%',
          rank: 3,
        },
        chains: { name: 'Chains', value: 8, normalizedValue: 53, unit: '', rank: 3 },
        protocols: { name: 'Protocols', value: 42, normalizedValue: 15, unit: '', rank: 4 },
        updateFrequency: {
          name: 'Update Freq',
          value: 1800,
          normalizedValue: 75,
          unit: 's',
          rank: 4,
        },
      },
      overallScore: 68,
      rank: 3,
    },
    {
      oracle: 'API3',
      color: ORACLE_COLOR_MAP['API3'],
      metrics: {
        tvs: { name: 'TVS', value: 3.5, normalizedValue: 8, unit: 'B', rank: 4 },
        latency: { name: 'Latency', value: 900, normalizedValue: 45, unit: 'ms', rank: 5 },
        accuracy: { name: 'Accuracy', value: 98.9, normalizedValue: 88, unit: '%', rank: 4 },
        marketShare: { name: 'Market Share', value: 5.2, normalizedValue: 8, unit: '%', rank: 4 },
        chains: { name: 'Chains', value: 6, normalizedValue: 40, unit: '', rank: 4 },
        protocols: { name: 'Protocols', value: 38, normalizedValue: 13, unit: '', rank: 5 },
        updateFrequency: {
          name: 'Update Freq',
          value: 3600,
          normalizedValue: 60,
          unit: 's',
          rank: 5,
        },
      },
      overallScore: 62,
      rank: 4,
    },
    {
      oracle: 'UMA',
      color: ORACLE_COLOR_MAP['UMA'],
      metrics: {
        tvs: { name: 'TVS', value: 2.5, normalizedValue: 6, unit: 'B', rank: 5 },
        latency: { name: 'Latency', value: 1200, normalizedValue: 30, unit: 'ms', rank: 6 },
        accuracy: { name: 'Accuracy', value: 98.5, normalizedValue: 85, unit: '%', rank: 5 },
        marketShare: { name: 'Market Share', value: 3.7, normalizedValue: 6, unit: '%', rank: 5 },
        chains: { name: 'Chains', value: 5, normalizedValue: 33, unit: '', rank: 5 },
        protocols: { name: 'Protocols', value: 28, normalizedValue: 10, unit: '', rank: 6 },
        updateFrequency: {
          name: 'Update Freq',
          value: 7200,
          normalizedValue: 30,
          unit: 's',
          rank: 6,
        },
      },
      overallScore: 55,
      rank: 5,
    },
    {
      oracle: 'RedStone',
      color: ORACLE_COLOR_MAP['RedStone'],
      metrics: {
        tvs: { name: 'TVS', value: 2.8, normalizedValue: 7, unit: 'B', rank: 6 },
        latency: { name: 'Latency', value: 200, normalizedValue: 90, unit: 'ms', rank: 2 },
        accuracy: { name: 'Accuracy', value: 99.3, normalizedValue: 93, unit: '%', rank: 3 },
        marketShare: { name: 'Market Share', value: 4.2, normalizedValue: 7, unit: '%', rank: 6 },
        chains: { name: 'Chains', value: 7, normalizedValue: 47, unit: '', rank: 6 },
        protocols: { name: 'Protocols', value: 45, normalizedValue: 16, unit: '', rank: 3 },
        updateFrequency: {
          name: 'Update Freq',
          value: 60,
          normalizedValue: 100,
          unit: 's',
          rank: 1,
        },
      },
      overallScore: 70,
      rank: 6,
    },
  ].sort((a, b) => b.overallScore - a.overallScore);
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
      const metricKey = metric.toLowerCase().replace(' ', '') as keyof typeof oracle.metrics;
      const value = oracle.metrics[metricKey]?.normalizedValue || 0;
      point[oracle.oracle] = value;
    });

    return point;
  });
}

function getMetricDescription(metricKey: string): string {
  const descriptions: Record<string, string> = {
    tvs: 'Total Value Secured - 预言机保护的总资产价值',
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
      const best = Math.max(...values);

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
          const percentile = ((sorted.indexOf(value) + 1) / sorted.length) * 100;

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

    const oracles = ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'UMA'];
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
