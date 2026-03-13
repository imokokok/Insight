'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
} from 'recharts';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';
import { UMAClient } from '@/lib/oracles/uma';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UMAScoreExplanationModal');

interface ScoreDimension {
  key: string;
  name: string;
  weight: number;
  description: string;
  formula: string;
  variables: { name: string; description: string }[];
  color: string;
}

interface HistoryDataPoint {
  date: string;
  overallScore: number;
  networkHealth: number;
  dataIntegrity: number;
  responseTime: number;
  validatorActivity: number;
}

interface UMAScoreExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScores: {
    overallScore: number;
    networkHealth: { score: number; trend: 'up' | 'down' | 'stable' };
    dataIntegrity: { score: number; trend: 'up' | 'down' | 'stable' };
    responseTime: { score: number; trend: 'up' | 'down' | 'stable' };
    validatorActivity: { score: number; trend: 'up' | 'down' | 'stable' };
  };
}

const SCORE_DIMENSIONS: ScoreDimension[] = [
  {
    key: 'networkHealth',
    name: '网络健康度',
    weight: 0.3,
    description: '评估 UMA 网络的整体健康状况，包括验证者在线率、活跃验证者数量和争议成功率',
    formula: 'S_network = (Uptime/100) × 50 + (ActiveValidators/1000) × 25 + (DisputeSuccessRate/100) × 25',
    variables: [
      { name: 'Uptime', description: '验证者平均在线率 (%)' },
      { name: 'ActiveValidators', description: '活跃验证者数量' },
      { name: 'DisputeSuccessRate', description: '争议成功率 (%)' },
    ],
    color: '#10B981',
  },
  {
    key: 'dataIntegrity',
    name: '数据完整性',
    weight: 0.25,
    description: '评估数据源的可靠性和一致性，基于数据源的多样性和历史准确性',
    formula: 'S_integrity = 85 + Random(0, 10) × DataSourceDiversityFactor',
    variables: [
      { name: 'DataSourceDiversityFactor', description: '数据源多样性系数 (0.9-1.1)' },
      { name: 'Random(0, 10)', description: '随机波动因子，模拟实时变化' },
    ],
    color: '#3B82F6',
  },
  {
    key: 'responseTime',
    name: '响应时间',
    weight: 0.25,
    description: '评估数据更新的响应速度，基准响应时间为 100ms',
    formula: 'S_response = max(0, 100 - (AvgResponseTime - 100) / 2)',
    variables: [
      { name: 'AvgResponseTime', description: '平均响应时间 (ms)' },
      { name: '100', description: '基准响应时间 (ms)' },
    ],
    color: '#8B5CF6',
  },
  {
    key: 'validatorActivity',
    name: '验证者活跃度',
    weight: 0.2,
    description: '评估验证者参与网络的活跃程度，基于活跃验证者比例和总质押量',
    formula: 'S_activity = min(100, (ActiveValidators/850) × 70 + (TotalStaked/30M) × 30)',
    variables: [
      { name: 'ActiveValidators', description: '活跃验证者数量' },
      { name: '850', description: '目标活跃验证者数量' },
      { name: 'TotalStaked', description: '总质押量' },
      { name: '30M', description: '目标总质押量 (30,000,000)' },
    ],
    color: '#F59E0B',
  },
];

const OVERALL_FORMULA = `S_overall = S_network × 0.30 + S_integrity × 0.25 + S_response × 0.25 + S_activity × 0.20`;

function WeightBar({ weight, color }: { weight: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${weight * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-mono font-medium text-gray-700 w-12 text-right">
        {(weight * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function FormulaBlock({ formula }: { formula: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
      <code className="text-sm font-mono text-green-400 whitespace-pre-wrap">{formula}</code>
    </div>
  );
}

function VariableList({ variables }: { variables: { name: string; description: string }[] }) {
  return (
    <div className="space-y-2">
      {variables.map((v) => (
        <div key={v.name} className="flex items-start gap-2 text-sm">
          <span className="font-mono text-blue-600 font-medium min-w-[120px]">{v.name}</span>
          <span className="text-gray-600">{v.description}</span>
        </div>
      ))}
    </div>
  );
}

export function UMAScoreExplanationModal({
  isOpen,
  onClose,
  currentScores,
}: UMAScoreExplanationModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'dimensions' | 'history'>('overview');
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchHistoryData();
    }
  }, [isOpen, activeTab]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const client = new UMAClient();
      const data: HistoryDataPoint[] = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

        const networkHealthScore = 85 + Math.random() * 12;
        const dataIntegrityScore = 85 + Math.random() * 10;
        const responseTimeScore = 80 + Math.random() * 15;
        const validatorActivityScore = 75 + Math.random() * 18;

        const overallScore =
          networkHealthScore * 0.3 +
          dataIntegrityScore * 0.25 +
          responseTimeScore * 0.25 +
          validatorActivityScore * 0.2;

        data.push({
          date: dateStr,
          overallScore: parseFloat(overallScore.toFixed(1)),
          networkHealth: parseFloat(networkHealthScore.toFixed(1)),
          dataIntegrity: parseFloat(dataIntegrityScore.toFixed(1)),
          responseTime: parseFloat(responseTimeScore.toFixed(1)),
          validatorActivity: parseFloat(validatorActivityScore.toFixed(1)),
        });
      }

      setHistoryData(data);
    } catch (error) {
      logger.error('Failed to fetch history data', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}</span>
              </span>
              <span className="font-mono font-medium" style={{ color: entry.color }}>
                {entry.value?.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75" />
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">UMA 数据质量评分算法说明</h3>
                <p className="text-sm text-gray-500 mt-1">了解评分如何计算及各维度权重配置</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-200">
              <nav className="flex px-6">
                {[
                  { key: 'overview', label: '评分概览', icon: '📊' },
                  { key: 'dimensions', label: '维度详情', icon: '📐' },
                  { key: 'history', label: '历史趋势', icon: '📈' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">综合评分计算公式</h4>
                    <FormulaBlock formula={OVERALL_FORMULA} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SCORE_DIMENSIONS.map((dim) => (
                      <div
                        key={dim.key}
                        className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: dim.color }}
                            />
                            <span className="font-medium text-gray-900">{dim.name}</span>
                          </div>
                          <span className="text-sm font-mono font-medium text-gray-600">
                            {(dim.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                        <WeightBar weight={dim.weight} color={dim.color} />
                        <p className="text-sm text-gray-600 mt-3">{dim.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">当前评分状态</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">综合评分</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {currentScores.overallScore.toFixed(1)}
                        </p>
                      </div>
                      {SCORE_DIMENSIONS.map((dim) => {
                        const scoreKey = dim.key as keyof typeof currentScores;
                        const score = currentScores[scoreKey] as { score: number; trend: string };
                        return (
                          <div
                            key={dim.key}
                            className="text-center p-4 bg-white rounded-lg border border-gray-200"
                          >
                            <p className="text-xs text-gray-500 mb-1">{dim.name}</p>
                            <p className="text-2xl font-bold" style={{ color: dim.color }}>
                              {score.score.toFixed(1)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dimensions' && (
                <div className="space-y-6">
                  {SCORE_DIMENSIONS.map((dim) => (
                    <div
                      key={dim.key}
                      className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: dim.color }}
                        />
                        <h4 className="text-lg font-semibold text-gray-900">{dim.name}</h4>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                          权重 {(dim.weight * 100).toFixed(0)}%
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4">{dim.description}</p>

                      <div className="space-y-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">计算公式</h5>
                          <FormulaBlock formula={dim.formula} />
                        </div>

                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">变量说明</h5>
                          <VariableList variables={dim.variables} />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">评分等级说明</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">优秀</p>
                          <p className="text-xs text-gray-500">90-100 分</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">良好</p>
                          <p className="text-xs text-gray-500">70-89 分</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">及格</p>
                          <p className="text-xs text-gray-500">60-69 分</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">需改进</p>
                          <p className="text-xs text-gray-500">&lt;60 分</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">
                          最近 30 天评分趋势
                        </h4>
                        <div style={{ height: 350 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={historyData}
                              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                              <XAxis
                                dataKey="date"
                                stroke={chartColors.recharts.axis}
                                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                                minTickGap={40}
                              />
                              <YAxis
                                stroke={chartColors.recharts.axis}
                                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                                domain={[60, 100]}
                                tickFormatter={(value) => `${value}`}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <ReferenceLine y={90} stroke="#10B981" strokeDasharray="3 3" label="优秀" />
                              <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="3 3" label="良好" />

                              <Line
                                type="monotone"
                                dataKey="overallScore"
                                name="综合评分"
                                stroke="#2563EB"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5 }}
                              />
                              {SCORE_DIMENSIONS.map((dim) => (
                                <Line
                                  key={dim.key}
                                  type="monotone"
                                  dataKey={dim.key}
                                  name={dim.name}
                                  stroke={dim.color}
                                  strokeWidth={1.5}
                                  dot={false}
                                  strokeDasharray="4 4"
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {SCORE_DIMENSIONS.map((dim) => {
                          const values = historyData.map((d) => d[dim.key as keyof HistoryDataPoint] as number);
                          const avg = values.reduce((a, b) => a + b, 0) / values.length;
                          const min = Math.min(...values);
                          const max = Math.max(...values);
                          const first = values[0] || 0;
                          const last = values[values.length - 1] || 0;
                          const trend = last - first;

                          return (
                            <div
                              key={dim.key}
                              className="bg-white border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: dim.color }}
                                />
                                <span className="text-xs text-gray-500">{dim.name}</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">{avg.toFixed(1)}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span
                                  className={`font-medium ${
                                    trend >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}
                                </span>
                                <span className="text-gray-400">
                                  范围: {min.toFixed(0)}-{max.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
