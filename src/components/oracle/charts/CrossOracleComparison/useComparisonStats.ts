/* eslint-disable max-lines-per-function */
import { useMemo, useCallback } from 'react';

import { useTranslations } from '@/i18n';
import { OracleProvider } from '@/types/oracle';

import {
  type PriceComparisonData,
  type PriceHistoryPoint,
  type DeviationData,
  type PriceDeviationDetail,
  type OraclePerformance,
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

/**
 * 多维度一致性评分详情
 *
 * 评分模型权重分配：
 * - 价格一致性 (30%): 衡量各预言机价格偏离平均值的程度
 * - 更新频率一致性 (20%): 衡量预言机更新频率的一致性
 * - 历史可靠性 (25%): 基于历史数据的可靠性评分
 * - 数据源可信度 (15%): 数据源数量和质量的综合评估
 * - 响应时间稳定性 (10%): 响应时间的稳定性评估
 *
 * 权重配置说明：
 * 这些权重反映了各维度对整体数据质量的重要性。价格一致性权重最高(30%)，
 * 因为价格准确性是预言机最核心的指标；更新频率和历史可靠性分别占20%和25%，
 * 反映了实时性和稳定性的重要性；数据源可信度和响应时间稳定性占比较低(15%和10%)，
 * 因为它们更多是辅助性指标。
 *
 * 如需调整权重，请确保所有权重之和等于 1.0
 */
interface ConsistencyScoreDetail {
  priceConsistency: number;
  updateFrequencyConsistency: number;
  historicalReliability: number;
  dataSourceTrustworthiness: number;
  responseTimeStability: number;
  totalScore: number;
  breakdown: {
    priceConsistency: { score: number; weight: number; weighted: number };
    updateFrequencyConsistency: { score: number; weight: number; weighted: number };
    historicalReliability: { score: number; weight: number; weighted: number };
    dataSourceTrustworthiness: { score: number; weight: number; weighted: number };
    responseTimeStability: { score: number; weight: number; weighted: number };
  };
}

// 一致性评分权重配置
// 注意：所有权重之和必须等于 1.0
const SCORE_WEIGHTS = {
  /** 价格一致性权重 (30%) - 价格准确性是最核心的指标 */
  priceConsistency: 0.3,
  /** 更新频率一致性权重 (20%) - 反映数据实时性 */
  updateFrequencyConsistency: 0.2,
  /** 历史可靠性权重 (25%) - 基于历史数据的稳定性 */
  historicalReliability: 0.25,
  /** 数据源可信度权重 (15%) - 数据源数量和质量 */
  dataSourceTrustworthiness: 0.15,
  /** 响应时间稳定性权重 (10%) - 系统响应性能 */
  responseTimeStability: 0.1,
} as const;

// 验证权重之和是否为 1.0
const TOTAL_WEIGHT = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(TOTAL_WEIGHT - 1.0) > 0.001) {
  console.warn(`[useComparisonStats] 权重配置错误: 权重之和为 ${TOTAL_WEIGHT}，应为 1.0`);
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
  lastUpdated: Date | null;
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
  consistencyScoreDetail: ConsistencyScoreDetail;
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

  /**
   * 计算价格一致性评分 (权重: 30%)
   *
   * 算法说明：
   * 1. 计算价格的变异系数 (CV = 标准差/平均值 * 100)
   * 2. CV 越小表示价格越一致，评分越高
   * 3. 使用非线性映射，使小偏差获得更高分数
   *
   * @returns 0-100 的评分
   */
  const calculatePriceConsistencyScore = useCallback((): number => {
    if (priceData.length < 2) return 0;

    const prices = priceData.map((d) => d.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avg) * 100;

    // 使用指数衰减函数，CV < 1% 时分数接近满分，CV > 10% 时分数急剧下降
    const score = Math.max(0, Math.min(100, 100 * Math.exp(-cv / 3)));
    return Math.round(score * 100) / 100;
  }, [priceData]);

  /**
   * 计算更新频率一致性评分 (权重: 20%)
   *
   * 算法说明：
   * 1. 高频预言机 (Pyth, RedStone) 更新间隔 < 1秒，得分更高
   * 2. 标准预言机更新间隔 30分钟-2小时，得分适中
   * 3. 更新频率越一致，各预言机价格越同步
   *
   * @returns 0-100 的评分
   */
  const calculateUpdateFrequencyConsistencyScore = useCallback((): number => {
    const selectedPerformance = performanceData.filter((p) => selectedOracles.includes(p.provider));
    if (selectedPerformance.length < 2) return 0;

    // 计算更新频率的标准差（对数尺度，因为频率差异可能很大）
    const frequencies = selectedPerformance.map((p) => Math.log10(p.updateFrequency + 1));
    const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance =
      frequencies.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) / frequencies.length;
    const stdDevFreq = Math.sqrt(variance);

    // 计算平均更新频率得分（更新越快得分越高）
    const avgUpdateScore =
      selectedPerformance.reduce((sum, p) => {
        // 更新频率越低（秒数越小），得分越高
        const freqScore = Math.max(0, Math.min(100, 100 - Math.log10(p.updateFrequency + 1) * 20));
        return sum + freqScore;
      }, 0) / selectedPerformance.length;

    // 一致性得分：标准差越小，得分越高
    const consistencyBonus = Math.max(0, 100 - stdDevFreq * 30);

    // 综合得分：平均更新频率得分 (60%) + 一致性奖励 (40%)
    const score = avgUpdateScore * 0.6 + consistencyBonus * 0.4;
    return Math.round(score * 100) / 100;
  }, [performanceData, selectedOracles]);

  /**
   * 计算历史可靠性评分 (权重: 25%)
   *
   * 算法说明：
   * 1. 基于预言机历史准确率和可靠性数据
   * 2. 考虑价格历史数据的稳定性
   * 3. 结合预言机的 uptime 和历史偏差记录
   *
   * @returns 0-100 的评分
   */
  const calculateHistoricalReliabilityScore = useCallback((): number => {
    const selectedPerformance = performanceData.filter((p) => selectedOracles.includes(p.provider));
    if (selectedPerformance.length === 0) return 0;

    // 1. 基础可靠性得分：来自预言机配置的可靠性指标
    const avgReliability =
      selectedPerformance.reduce((sum, p) => sum + p.reliability, 0) / selectedPerformance.length;

    // 2. 准确率得分
    const avgAccuracy =
      selectedPerformance.reduce((sum, p) => sum + p.accuracy, 0) / selectedPerformance.length;

    // 3. 历史价格稳定性得分（基于价格历史数据）
    let historyStabilityScore = 100;
    selectedOracles.forEach((provider) => {
      const history = priceHistory[provider] || [];
      if (history.length >= 2) {
        // 计算价格变化率的标准差
        const changes: number[] = [];
        for (let i = 1; i < history.length; i++) {
          const change = Math.abs((history[i].price - history[i - 1].price) / history[i - 1].price);
          changes.push(change);
        }
        if (changes.length > 0) {
          const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
          // 变化率越小，稳定性越高
          historyStabilityScore = Math.min(
            historyStabilityScore,
            Math.max(0, 100 - avgChange * 1000)
          );
        }
      }
    });

    // 综合得分：可靠性 (40%) + 准确率 (30%) + 历史稳定性 (30%)
    const score = avgReliability * 0.4 + avgAccuracy * 0.3 + historyStabilityScore * 0.3;
    return Math.round(score * 100) / 100;
  }, [performanceData, selectedOracles, priceHistory]);

  /**
   * 计算数据源可信度评分 (权重: 15%)
   *
   * 算法说明：
   * 1. 数据源数量越多，可信度越高
   * 2. 去中心化程度越高，可信度越高
   * 3. 支持的链数量反映预言机的成熟度
   *
   * @returns 0-100 的评分
   */
  const calculateDataSourceTrustworthinessScore = useCallback((): number => {
    const selectedPerformance = performanceData.filter((p) => selectedOracles.includes(p.provider));
    if (selectedPerformance.length === 0) return 0;

    // 1. 数据源数量得分（归一化，假设最大 400 个数据源）
    const avgDataSources =
      selectedPerformance.reduce((sum, p) => sum + p.dataSources, 0) / selectedPerformance.length;
    const dataSourceScore = Math.min(100, (avgDataSources / 400) * 100);

    // 2. 去中心化得分
    const avgDecentralization =
      selectedPerformance.reduce((sum, p) => sum + p.decentralization, 0) /
      selectedPerformance.length;

    // 3. 支持链数量得分（归一化，假设最大 20 条链）
    const avgSupportedChains =
      selectedPerformance.reduce((sum, p) => sum + p.supportedChains, 0) /
      selectedPerformance.length;
    const chainSupportScore = Math.min(100, (avgSupportedChains / 20) * 100);

    // 综合得分：数据源 (40%) + 去中心化 (35%) + 链支持 (25%)
    const score = dataSourceScore * 0.4 + avgDecentralization * 0.35 + chainSupportScore * 0.25;
    return Math.round(score * 100) / 100;
  }, [performanceData, selectedOracles]);

  /**
   * 计算响应时间稳定性评分 (权重: 10%)
   *
   * 算法说明：
   * 1. 响应时间越短，用户体验越好
   * 2. 响应时间越稳定，系统越可靠
   * 3. 结合实时响应时间和历史配置数据
   *
   * @returns 0-100 的评分
   */
  const calculateResponseTimeStabilityScore = useCallback((): number => {
    if (priceData.length < 2) return 0;

    // 1. 实时响应时间得分
    const responseTimes = priceData.map((d) => d.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    // 响应时间越短得分越高（假设 500ms 为满分基准，3000ms 为最低分）
    const responseTimeScore = Math.max(0, Math.min(100, 100 - (avgResponseTime - 50) / 25));

    // 2. 响应时间稳定性（标准差越小越稳定）
    const variance =
      responseTimes.reduce((sum, rt) => sum + Math.pow(rt - avgResponseTime, 2), 0) /
      responseTimes.length;
    const stdDevRt = Math.sqrt(variance);

    // 标准差越小，稳定性得分越高
    const stabilityScore = Math.max(0, Math.min(100, 100 - stdDevRt / 10));

    // 3. 配置的响应时间一致性
    const selectedPerformance = performanceData.filter((p) => selectedOracles.includes(p.provider));
    const configResponseScore =
      selectedPerformance.length > 0
        ? selectedPerformance.reduce((sum, p) => {
            const score = Math.max(0, Math.min(100, 100 - p.responseTime / 5));
            return sum + score;
          }, 0) / selectedPerformance.length
        : 50;

    // 综合得分：实时响应 (40%) + 稳定性 (30%) + 配置一致性 (30%)
    const score = responseTimeScore * 0.4 + stabilityScore * 0.3 + configResponseScore * 0.3;
    return Math.round(score * 100) / 100;
  }, [priceData, performanceData, selectedOracles]);

  /**
   * 计算多维度综合一致性评分
   *
   * 评分维度及权重：
   * - 价格一致性 (30%): 基于价格变异系数
   * - 更新频率一致性 (20%): 基于更新频率的统一程度
   * - 历史可靠性 (25%): 基于历史准确率和稳定性
   * - 数据源可信度 (15%): 基于数据源数量和去中心化程度
   * - 响应时间稳定性 (10%): 基于响应时间和稳定性
   *
   * @returns 综合评分 (0-100)
   */
  const calculateConsistencyScore = useCallback((): number => {
    if (priceData.length < 2) return 0;

    const priceScore = calculatePriceConsistencyScore();
    const frequencyScore = calculateUpdateFrequencyConsistencyScore();
    const reliabilityScore = calculateHistoricalReliabilityScore();
    const trustScore = calculateDataSourceTrustworthinessScore();
    const stabilityScore = calculateResponseTimeStabilityScore();

    const totalScore =
      priceScore * SCORE_WEIGHTS.priceConsistency +
      frequencyScore * SCORE_WEIGHTS.updateFrequencyConsistency +
      reliabilityScore * SCORE_WEIGHTS.historicalReliability +
      trustScore * SCORE_WEIGHTS.dataSourceTrustworthiness +
      stabilityScore * SCORE_WEIGHTS.responseTimeStability;

    return Math.round(totalScore * 100) / 100;
  }, [
    priceData,
    calculatePriceConsistencyScore,
    calculateUpdateFrequencyConsistencyScore,
    calculateHistoricalReliabilityScore,
    calculateDataSourceTrustworthinessScore,
    calculateResponseTimeStabilityScore,
  ]);

  /**
   * 获取详细的评分明细
   * 用于调试和展示评分构成
   */
  const getConsistencyScoreDetail = useCallback((): ConsistencyScoreDetail => {
    const priceScore = calculatePriceConsistencyScore();
    const frequencyScore = calculateUpdateFrequencyConsistencyScore();
    const reliabilityScore = calculateHistoricalReliabilityScore();
    const trustScore = calculateDataSourceTrustworthinessScore();
    const stabilityScore = calculateResponseTimeStabilityScore();

    const totalScore =
      priceScore * SCORE_WEIGHTS.priceConsistency +
      frequencyScore * SCORE_WEIGHTS.updateFrequencyConsistency +
      reliabilityScore * SCORE_WEIGHTS.historicalReliability +
      trustScore * SCORE_WEIGHTS.dataSourceTrustworthiness +
      stabilityScore * SCORE_WEIGHTS.responseTimeStability;

    return {
      priceConsistency: priceScore,
      updateFrequencyConsistency: frequencyScore,
      historicalReliability: reliabilityScore,
      dataSourceTrustworthiness: trustScore,
      responseTimeStability: stabilityScore,
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown: {
        priceConsistency: {
          score: priceScore,
          weight: SCORE_WEIGHTS.priceConsistency,
          weighted: Math.round(priceScore * SCORE_WEIGHTS.priceConsistency * 100) / 100,
        },
        updateFrequencyConsistency: {
          score: frequencyScore,
          weight: SCORE_WEIGHTS.updateFrequencyConsistency,
          weighted:
            Math.round(frequencyScore * SCORE_WEIGHTS.updateFrequencyConsistency * 100) / 100,
        },
        historicalReliability: {
          score: reliabilityScore,
          weight: SCORE_WEIGHTS.historicalReliability,
          weighted: Math.round(reliabilityScore * SCORE_WEIGHTS.historicalReliability * 100) / 100,
        },
        dataSourceTrustworthiness: {
          score: trustScore,
          weight: SCORE_WEIGHTS.dataSourceTrustworthiness,
          weighted: Math.round(trustScore * SCORE_WEIGHTS.dataSourceTrustworthiness * 100) / 100,
        },
        responseTimeStability: {
          score: stabilityScore,
          weight: SCORE_WEIGHTS.responseTimeStability,
          weighted: Math.round(stabilityScore * SCORE_WEIGHTS.responseTimeStability * 100) / 100,
        },
      },
    };
  }, [
    calculatePriceConsistencyScore,
    calculateUpdateFrequencyConsistencyScore,
    calculateHistoricalReliabilityScore,
    calculateDataSourceTrustworthinessScore,
    calculateResponseTimeStabilityScore,
  ]);

  const consistencyScore = calculateConsistencyScore();

  const getConsistencyLabel = (score: number): string => {
    if (score >= 90) return t('consistency.excellent');
    if (score >= 70) return t('consistency.good');
    if (score >= 50) return t('consistency.fair');
    return t('consistency.poor');
  };

  const getConsistencyColor = (score: number): string => {
    if (score >= 90) return 'text-success-600';
    if (score >= 70) return 'text-primary-600';
    if (score >= 50) return 'text-warning-600';
    return 'text-danger-600';
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
      timestamp: lastUpdated ? lastUpdated.toISOString() : new Date().toISOString(),
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
    const data: Array<{ asset: string; oracle: string; deviation: number }> = [];

    const deterministicHash = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash;
    };

    const getSeededValue = (seed: number): number => {
      const normalized = Math.abs(seed % 1000) / 1000;
      return normalized * 2 - 1;
    };

    symbols.forEach((symbol, symbolIndex) => {
      selectedOracles.forEach((provider, providerIndex) => {
        const seed = deterministicHash(`${symbol}-${provider}`);
        const baseDeviation = getSeededValue(seed + symbolIndex * 100 + providerIndex);

        const oracleSpecificFactor =
          provider === OracleProvider.PYTH || provider === OracleProvider.REDSTONE ? 0.3 : 0.8;

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
    consistencyScoreDetail: getConsistencyScoreDetail(),
    exportData,
    getConsistencyLabel,
    getConsistencyColor,
    heatmapData,
  };
}
