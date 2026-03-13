'use client';

import { useMemo, useState } from 'react';
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
} from 'recharts';
import { OracleProvider } from '@/lib/types/oracle';
import { DashboardCard } from './DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';

export interface QualityDataPoint {
  timestamp: number;
  updateLatency: number;
  deviationFromMedian: number;
  isOutlier: boolean;
  isStale: boolean;
  heartbeatCompliance: number;
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
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#375BD2',
  [OracleProvider.BAND_PROTOCOL]: '#9B51E0',
  [OracleProvider.UMA]: '#FF6B6B',
  [OracleProvider.PYTH_NETWORK]: '#EC4899',
  [OracleProvider.API3]: '#10B981',
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

function getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

function getQualityColor(level: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (level) {
    case 'excellent':
      return '#10B981';
    case 'good':
      return '#3B82F6';
    case 'fair':
      return '#F59E0B';
    case 'poor':
      return '#EF4444';
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
          point[`outlier_${oracle.oracle}`] = dataPoint.isOutlier;
          point[`stale_${oracle.oracle}`] = dataPoint.isStale;
          point[`heartbeat_${oracle.oracle}`] = dataPoint.heartbeatCompliance * 100;
        } else {
          point[`latency_${oracle.oracle}`] = null;
          point[`deviation_${oracle.oracle}`] = null;
          point[`score_${oracle.oracle}`] = null;
          point[`outlier_${oracle.oracle}`] = false;
          point[`stale_${oracle.oracle}`] = false;
          point[`heartbeat_${oracle.oracle}`] = null;
        }
      });

      return point;
    });
  }, [allTimestamps, data]);

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
      }
    > = {} as any;

    data.forEach((oracle) => {
      if (oracle.data.length === 0) return;

      const scores = oracle.data.map((d) => calculateQualityScore(d));
      const latencies = oracle.data.map((d) => d.updateLatency);
      const heartbeats = oracle.data.map((d) => d.heartbeatCompliance);
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
      };
    });

    return result;
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[240px]">
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
                        <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          异常值
                        </span>
                      )}
                      {isStale && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
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

  return (
    <div className="space-y-6">
      <DashboardCard title="数据质量趋势分析" className={className}>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">时间范围:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <ReferenceLine y={90} stroke="#10B981" strokeDasharray="3 3" label="优秀" />
                  <ReferenceLine y={75} stroke="#3B82F6" strokeDasharray="3 3" label="良好" />
                  <ReferenceLine y={60} stroke="#F59E0B" strokeDasharray="3 3" label="及格" />

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
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border-2"
                  style={{ borderColor: `${ORACLE_COLORS[oracle.oracle]}30` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
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

          {/* Update Latency Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">更新延迟对比</h4>
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
          </div>

          {/* Deviation Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">价格偏离中位数</h4>
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
                  <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />

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
                              fill="#EF4444"
                              stroke="#fff"
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
          </div>

          {/* Heartbeat Compliance Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">心跳合规率</h4>
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
                  <ReferenceLine y={95} stroke="#10B981" strokeDasharray="3 3" label="目标" />

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
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">数据质量评分说明</h4>
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
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span>优秀 (90-100)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>良好 (75-89)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>及格 (60-74)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>不及格 (&lt;60)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
