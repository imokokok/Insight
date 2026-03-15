'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  ReferenceLine,
  Cell,
  Brush,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';
import { useTimeRange, SelectedTimeRange } from '@/contexts/TimeRangeContext';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DataQualityTrend');

export interface QualityDataPoint {
  timestamp: number;
  updateLatency: number;
  deviationFromMedian: number;
  isOutlier: boolean;
  isStale: boolean;
  heartbeatCompliance: number;
  accuracy?: number;
  availability?: number;
  consistency?: number;
}

export interface OracleQualityHistory {
  oracle: OracleProvider;
  data: QualityDataPoint[];
}

export interface DataQualityTrendProps {
  data: OracleQualityHistory[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  className?: string;
}

const DEFAULT_ORACLE_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLOR]: 'Tellor',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.marketOverview.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.marketOverview.band,
  [OracleProvider.UMA]: chartColors.marketOverview.uma,
  [OracleProvider.PYTH]: chartColors.oracle.pyth,
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: chartColors.oracle.dia,
  [OracleProvider.TELLOR]: chartColors.oracle.tellor,
  [OracleProvider.CHRONICLE]: chartColors.oracle.chronicle,
  [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
};

interface QualityMetrics {
  timestamp: string;
  rawTimestamp: number;
  updateLatency: Record<OracleProvider, number>;
  deviationFromMedian: Record<OracleProvider, number>;
  qualityScore: Record<OracleProvider, number>;
  isOutlier: Record<OracleProvider, boolean>;
  isStale: Record<OracleProvider, boolean>;
  heartbeatCompliance: Record<OracleProvider, number>;
  accuracy: Record<OracleProvider, number>;
  availability: Record<OracleProvider, number>;
  consistency: Record<OracleProvider, number>;
}

function calculateQualityScore(point: QualityDataPoint): number {
  let score = 100;

  score -= Math.min(point.updateLatency / 10, 30);
  score -= Math.min(point.deviationFromMedian * 10, 25);
  if (point.isOutlier) score -= 20;
  if (point.isStale) score -= 30;
  score -= (1 - point.heartbeatCompliance) * 15;

  return Math.max(0, Math.min(100, score));
}

function calculateOverallQualityScore(point: QualityDataPoint): number {
  const baseScore = calculateQualityScore(point);
  const accuracyWeight = point.accuracy !== undefined ? point.accuracy * 0.2 : 0;
  const availabilityWeight = point.availability !== undefined ? point.availability * 0.15 : 0;
  const consistencyWeight = point.consistency !== undefined ? point.consistency * 0.15 : 0;

  return Math.min(100, baseScore * 0.5 + accuracyWeight + availabilityWeight + consistencyWeight);
}

function getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

function getQualityColor(level: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (level) {
    case 'excellent':
      return semanticColors.success.DEFAULT;
    case 'good':
      return semanticColors.info.DEFAULT;
    case 'fair':
      return semanticColors.warning.DEFAULT;
    case 'poor':
      return semanticColors.danger.DEFAULT;
  }
}

export function DataQualityTrend({
  data,
  oracleNames: customOracleNames,
  className,
}: DataQualityTrendProps) {
  const { t } = useI18n();
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(
    data.map((d) => d.oracle)
  );
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [showRadarChart, setShowRadarChart] = useState(true);
  const [showRanking, setShowRanking] = useState(true);

  const { selectedTimeRange, registerTimeRangeCallback, unregisterTimeRangeCallback, syncEnabled } =
    useTimeRange();
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);

  const allTimestamps = useMemo(() => {
    const timestamps = new Set<number>();
    data.forEach((oracle) => {
      oracle.data.forEach((point) => timestamps.add(point.timestamp));
    });
    return Array.from(timestamps).sort((a, b) => a - b);
  }, [data]);

  const chartData = useMemo(() => {
    return allTimestamps.map((timestamp) => {
      const point: any = {
        timestamp: new Date(timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rawTimestamp: timestamp,
      };

      data.forEach((oracle) => {
        const dataPoint = oracle.data.find((d) => d.timestamp === timestamp);
        if (dataPoint) {
          point[`latency_${oracle.oracle}`] = dataPoint.updateLatency;
          point[`deviation_${oracle.oracle}`] = dataPoint.deviationFromMedian;
          point[`score_${oracle.oracle}`] = calculateQualityScore(dataPoint);
          point[`overallScore_${oracle.oracle}`] = calculateOverallQualityScore(dataPoint);
          point[`outlier_${oracle.oracle}`] = dataPoint.isOutlier;
          point[`stale_${oracle.oracle}`] = dataPoint.isStale;
          point[`heartbeat_${oracle.oracle}`] = dataPoint.heartbeatCompliance * 100;
          point[`accuracy_${oracle.oracle}`] = dataPoint.accuracy ?? 95;
          point[`availability_${oracle.oracle}`] = dataPoint.availability ?? 99;
          point[`consistency_${oracle.oracle}`] = dataPoint.consistency ?? 90;
        } else {
          point[`latency_${oracle.oracle}`] = null;
          point[`deviation_${oracle.oracle}`] = null;
          point[`score_${oracle.oracle}`] = null;
          point[`overallScore_${oracle.oracle}`] = null;
          point[`outlier_${oracle.oracle}`] = false;
          point[`stale_${oracle.oracle}`] = false;
          point[`heartbeat_${oracle.oracle}`] = null;
          point[`accuracy_${oracle.oracle}`] = null;
          point[`availability_${oracle.oracle}`] = null;
          point[`consistency_${oracle.oracle}`] = null;
        }
      });

      return point;
    });
  }, [allTimestamps, data]);

  // 计算统计数据
  const stats = useMemo(() => {
    const result: Record<
      OracleProvider,
      {
        avgScore: number;
        minScore: number;
        maxScore: number;
        avgLatency: number;
        outlierRate: number;
        staleRate: number;
        avgHeartbeat: number;
        trend: 'improving' | 'stable' | 'declining';
        avgAccuracy: number;
        avgAvailability: number;
        avgConsistency: number;
        overallScore: number;
      }
    > = {} as any;

    data.forEach((oracle) => {
      if (oracle.data.length === 0) return;

      const scores = oracle.data.map((d) => calculateQualityScore(d));
      const overallScores = oracle.data.map((d) => calculateOverallQualityScore(d));
      const latencies = oracle.data.map((d) => d.updateLatency);
      const heartbeats = oracle.data.map((d) => d.heartbeatCompliance);
      const accuracies = oracle.data.map((d) => d.accuracy ?? 95);
      const availabilities = oracle.data.map((d) => d.availability ?? 99);
      const consistencies = oracle.data.map((d) => d.consistency ?? 90);
      const outliers = oracle.data.filter((d) => d.isOutlier).length;
      const stale = oracle.data.filter((d) => d.isStale).length;

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const firstHalfAvg =
        scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
          Math.floor(scores.length / 2) || avgScore;
      const secondHalfAvg =
        scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
          (scores.length - Math.floor(scores.length / 2)) || avgScore;

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (secondHalfAvg > firstHalfAvg + 5) trend = 'improving';
      else if (secondHalfAvg < firstHalfAvg - 5) trend = 'declining';

      result[oracle.oracle] = {
        avgScore,
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        outlierRate: (outliers / oracle.data.length) * 100,
        staleRate: (stale / oracle.data.length) * 100,
        avgHeartbeat: (heartbeats.reduce((a, b) => a + b, 0) / heartbeats.length) * 100,
        trend,
        avgAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
        avgAvailability: availabilities.reduce((a, b) => a + b, 0) / availabilities.length,
        avgConsistency: consistencies.reduce((a, b) => a + b, 0) / consistencies.length,
        overallScore: overallScores.reduce((a, b) => a + b, 0) / overallScores.length,
      };
    });

    return result;
  }, [data]);

  // 质量排名数据
  const rankingData = useMemo(() => {
    return Object.entries(stats)
      .map(([provider, stat]) => ({
        provider: provider as OracleProvider,
        name: oracleNames[provider as OracleProvider],
        overallScore: stat.overallScore,
        avgScore: stat.avgScore,
        avgAccuracy: stat.avgAccuracy,
        avgAvailability: stat.avgAvailability,
        avgConsistency: stat.avgConsistency,
        avgLatency: stat.avgLatency,
        outlierRate: stat.outlierRate,
        staleRate: stat.staleRate,
        trend: stat.trend,
        color: ORACLE_COLORS[provider as OracleProvider],
      }))
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [stats, oracleNames]);

  // 雷达图数据
  const radarData = useMemo(() => {
    const dimensions = ['准确性', '可用性', '一致性', '响应速度', '心跳合规', '基础质量'];

    return dimensions.map((dimension) => {
      const dataPoint: any = { metric: dimension };

      rankingData.forEach((item) => {
        const stat = stats[item.provider];
        if (!stat) return;

        switch (dimension) {
          case '准确性':
            dataPoint[item.name] = stat.avgAccuracy;
            break;
          case '可用性':
            dataPoint[item.name] = stat.avgAvailability;
            break;
          case '一致性':
            dataPoint[item.name] = stat.avgConsistency;
            break;
          case '响应速度':
            dataPoint[item.name] = Math.max(0, 100 - stat.avgLatency / 5);
            break;
          case '心跳合规':
            dataPoint[item.name] = stat.avgHeartbeat;
            break;
          case '基础质量':
            dataPoint[item.name] = stat.avgScore;
            break;
        }
      });

      return dataPoint;
    });
  }, [rankingData, stats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-4 border border-gray-200 min-w-[240px]" style={{ boxShadow: shadowColors.tooltip }}>
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-2">
          {selectedOracles.map((oracle) => {
            const score = payload.find((p: any) => p.dataKey === `score_${oracle}`)?.value;
            if (score === null || score === undefined) return null;

            const latency = payload.find((p: any) => p.dataKey === `latency_${oracle}`)?.value;
            const deviation = payload.find((p: any) => p.dataKey === `deviation_${oracle}`)?.value;
            const isOutlier = payload.find((p: any) => p.dataKey === `outlier_${oracle}`)?.value;
            const isStale = payload.find((p: any) => p.dataKey === `stale_${oracle}`)?.value;

            return (
              <div key={oracle} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium" style={{ color: ORACLE_COLORS[oracle] }}>
                    {oracleNames[oracle]}
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: getQualityColor(getQualityLevel(score)) }}
                  >
                    {score.toFixed(1)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>延迟:</span>
                    <span>{latency?.toFixed(0) || '-'}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>偏离:</span>
                    <span>{deviation?.toFixed(4) || '-'}%</span>
                  </div>
                  {(isOutlier || isStale) && (
                    <div className="flex gap-2 mt-1">
                      {isOutlier && (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: semanticColors.danger.light, color: semanticColors.danger.text }}>
                          异常值
                        </span>
                      )}
                      {isStale && (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: semanticColors.warning.light, color: semanticColors.warning.text }}>
                          过期
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      setBrushStartIndex(range.startIndex);
      setBrushEndIndex(range.endIndex);
    }
  }, []);

  useEffect(() => {
    if (!syncEnabled || !selectedTimeRange || chartData.length === 0) return;

    const { startTime, endTime } = selectedTimeRange;

    setIsSyncing(true);

    const startIndex = chartData.findIndex((d) => d.rawTimestamp >= startTime);
    const endIndex = chartData.findIndex((d) => d.rawTimestamp >= endTime);

    if (startIndex !== -1 && endIndex !== -1) {
      const targetStartIndex = Math.max(0, startIndex);
      const targetEndIndex = Math.min(chartData.length - 1, endIndex);

      requestAnimationFrame(() => {
        setBrushStartIndex(targetStartIndex);
        setBrushEndIndex(targetEndIndex);

        setTimeout(() => {
          setIsSyncing(false);
        }, 300);
      });
    } else {
      setIsSyncing(false);
    }
  }, [selectedTimeRange, chartData, syncEnabled]);

  useEffect(() => {
    const handleTimeRangeChange = (range: SelectedTimeRange) => {
      logger.info('DataQualityTrend received time range change', { range });
    };

    registerTimeRangeCallback(handleTimeRangeChange);
    return () => unregisterTimeRangeCallback(handleTimeRangeChange);
  }, [registerTimeRangeCallback, unregisterTimeRangeCallback]);

  return (
    <div className={`space-y-6 ${className}`}>
      <DashboardCard title="数据质量趋势分析">
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">时间范围:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="text-sm border border-gray-200  px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">1小时</option>
                <option value="6h">6小时</option>
                <option value="24h">24小时</option>
                <option value="7d">7天</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">选择预言机:</span>
              {data.map((oracle) => (
                <label key={oracle.oracle} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOracles.includes(oracle.oracle)}
                    onChange={() => toggleOracle(oracle.oracle)}
                    className="w-4 h-4 rounded focus:ring-blue-500"
                    style={{ accentColor: ORACLE_COLORS[oracle.oracle] }}
                  />
                  <span className="text-sm text-gray-700">{oracleNames[oracle.oracle]}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRadarChart}
                  onChange={(e) => setShowRadarChart(e.target.checked)}
                  className="w-4 h-4 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">显示雷达图</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRanking}
                  onChange={(e) => setShowRanking(e.target.checked)}
                  className="w-4 h-4 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">显示排名</span>
              </label>
            </div>
          </div>

          {/* Quality Score Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">质量评分趋势</h4>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    dataKey="timestamp"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    minTickGap={40}
                  />
                  <YAxis
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={90} stroke={semanticColors.success.DEFAULT} strokeDasharray="3 3" label="优秀" />
                  <ReferenceLine y={75} stroke={chartColors.recharts.primary} strokeDasharray="3 3" label="良好" />
                  <ReferenceLine y={60} stroke={semanticColors.warning.DEFAULT} strokeDasharray="3 3" label="及格" />

                  {selectedOracles.map((oracle) => (
                    <Line
                      key={oracle}
                      type="monotone"
                      dataKey={`score_${oracle}`}
                      stroke={ORACLE_COLORS[oracle]}
                      strokeWidth={2}
                      dot={false}
                      name={`${oracleNames[oracle]} 质量分`}
                    />
                  ))}

                  <Brush
                    dataKey="timestamp"
                    height={25}
                    stroke={chartColors.recharts.primaryLight}
                    fill={chartColors.recharts.backgroundLight}
                    tickFormatter={() => ''}
                    onChange={handleBrushChange}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.map((oracle) => {
              const stat = stats[oracle.oracle];
              if (!stat) return null;

              const qualityLevel = getQualityLevel(stat.avgScore);

              return (
                <div
                  key={oracle.oracle}
                  className="bg-gray-100 border border-gray-200 p-4 border-2"
                  style={{ borderColor: `${ORACLE_COLORS[oracle.oracle]}30` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3"
                      style={{ backgroundColor: ORACLE_COLORS[oracle.oracle] }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {oracleNames[oracle.oracle]}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">平均质量分</p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: getQualityColor(qualityLevel) }}
                      >
                        {stat.avgScore.toFixed(1)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">范围:</span>
                        <span className="ml-1 font-medium">
                          {stat.minScore.toFixed(0)}-{stat.maxScore.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">趋势:</span>
                        <span
                          className={`ml-1 font-medium ${
                            stat.trend === 'improving'
                              ? 'text-green-600'
                              : stat.trend === 'declining'
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {stat.trend === 'improving'
                            ? '↑ 改善'
                            : stat.trend === 'declining'
                              ? '↓ 下降'
                              : '→ 稳定'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">平均延迟</span>
                        <span className="font-medium">{stat.avgLatency.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">异常率</span>
                        <span
                          className={`font-medium ${
                            stat.outlierRate > 5 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {stat.outlierRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">过期率</span>
                        <span
                          className={`font-medium ${
                            stat.staleRate > 2 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {stat.staleRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">心跳合规</span>
                        <span className="font-medium">{stat.avgHeartbeat.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardCard>

      {/* 质量排名 */}
      {showRanking && rankingData.length > 0 && (
        <DashboardCard title="质量排名">
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
                    综合评分
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    基础质量
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    准确性
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    可用性
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    一致性
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    趋势
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rankingData.map((item) => (
                  <tr key={item.provider} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold ${
                          item.rank === 1
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.rank === 2
                              ? 'bg-gray-100 text-gray-800'
                              : item.rank === 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 mr-2" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-lg font-bold"
                        style={{ color: getQualityColor(getQualityLevel(item.overallScore)) }}
                      >
                        {item.overallScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {item.avgScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {item.avgAccuracy.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {item.avgAvailability.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {item.avgConsistency.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center text-sm ${
                          item.trend === 'improving'
                            ? 'text-green-600'
                            : item.trend === 'declining'
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {item.trend === 'improving'
                          ? '↑ 改善'
                          : item.trend === 'declining'
                            ? '↓ 下降'
                            : '→ 稳定'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}

      {/* 雷达图对比 */}
      {showRadarChart && radarData.length > 0 && (
        <DashboardCard title="多维度质量对比">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {selectedOracles.map((oracle) => (
                  <Radar
                    key={oracle}
                    name={oracleNames[oracle]}
                    dataKey={oracleNames[oracle]}
                    stroke={ORACLE_COLORS[oracle]}
                    fill={ORACLE_COLORS[oracle]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">维度说明:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                • <strong>准确性</strong>: 价格准确度评分
              </div>
              <div>
                • <strong>可用性</strong>: 服务可用性百分比
              </div>
              <div>
                • <strong>一致性</strong>: 数据一致性评分
              </div>
              <div>
                • <strong>响应速度</strong>: 数据更新延迟
              </div>
              <div>
                • <strong>心跳合规</strong>: 更新频率合规率
              </div>
              <div>
                • <strong>基础质量</strong>: 综合基础质量分
              </div>
            </div>
          </div>
        </DashboardCard>
      )}

      <DashboardCard title="更新延迟对比">
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="timestamp"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={40}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip />
              <Legend />

              {selectedOracles.map((oracle) => (
                <Line
                  key={oracle}
                  type="monotone"
                  dataKey={`latency_${oracle}`}
                  stroke={ORACLE_COLORS[oracle]}
                  strokeWidth={1.5}
                  dot={false}
                  name={`${oracleNames[oracle]} 延迟`}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="价格偏离中位数">
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="timestamp"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={40}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${(value * 100).toFixed(2)}%`}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke={chartColors.recharts.secondaryAxis} strokeDasharray="3 3" />

              {selectedOracles.map((oracle) => (
                <Line
                  key={oracle}
                  type="monotone"
                  dataKey={`deviation_${oracle}`}
                  stroke={ORACLE_COLORS[oracle]}
                  strokeWidth={1.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isOutlier = payload[`outlier_${oracle}`];
                    if (isOutlier) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={semanticColors.danger.DEFAULT}
                          stroke={baseColors.gray[50]}
                          strokeWidth={2}
                        />
                      );
                    }
                    return <></>;
                  }}
                  name={`${oracleNames[oracle]} 偏离`}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="心跳合规率">
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="timestamp"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={40}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine y={95} stroke={semanticColors.success.DEFAULT} strokeDasharray="3 3" label="目标" />

              {selectedOracles.map((oracle) => (
                <Line
                  key={oracle}
                  type="step"
                  dataKey={`heartbeat_${oracle}`}
                  stroke={ORACLE_COLORS[oracle]}
                  strokeWidth={2}
                  dot={false}
                  name={`${oracleNames[oracle]} 合规率`}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="数据质量评分说明">
        <div className="text-sm text-blue-800 space-y-2">
          <p>质量评分基于以下维度计算 (满分100分):</p>
          <ul className="space-y-1 ml-4">
            <li>
              • <strong>更新延迟</strong>: 数据更新所需时间，延迟越高扣分越多 (最高-30分)
            </li>
            <li>
              • <strong>价格偏离</strong>: 与中位数的偏差程度，偏离越大扣分越多 (最高-25分)
            </li>
            <li>
              • <strong>异常值检测</strong>: 被识别为统计异常值 (-20分)
            </li>
            <li>
              • <strong>数据过期</strong>: 超过预期更新周期 (-30分)
            </li>
            <li>
              • <strong>心跳合规</strong>: 按预期频率更新的比例 (最高-15分)
            </li>
          </ul>
          <div className="flex gap-4 mt-3 pt-3 border-t border-blue-200">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3" style={{ backgroundColor: semanticColors.success.DEFAULT }} />
              <span>优秀 (90-100)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3" style={{ backgroundColor: semanticColors.info.DEFAULT }} />
              <span>良好 (75-89)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3" style={{ backgroundColor: semanticColors.warning.DEFAULT }} />
              <span>及格 (60-74)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3" style={{ backgroundColor: semanticColors.danger.DEFAULT }} />
              <span>不及格 (&lt;60)</span>
            </span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
