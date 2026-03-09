'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BandProtocolClient, ValidatorInfo, NetworkStats } from '@/lib/oracles/bandProtocol';

// 风险等级类型
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Slash 事件类型
interface SlashEvent {
  id: string;
  timestamp: number;
  validator: string;
  validatorAddress: string;
  reason: 'downtime' | 'double_sign' | 'malicious' | 'other';
  reasonDescription: string;
  amount: number;
  tokensBurned: number;
  responseTime: number; // 响应时间（分钟）
  impact: 'low' | 'medium' | 'high';
  resolved: boolean;
}

// 风险等级配置
const riskLevelConfig: Record<
  RiskLevel,
  {
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    label: string;
    icon: string;
  }
> = {
  low: {
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    label: '低风险',
    icon: '✓',
  },
  medium: {
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    label: '中风险',
    icon: '!',
  },
  high: {
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    label: '高风险',
    icon: '⚠',
  },
  critical: {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    label: '严重风险',
    icon: '✕',
  },
};

// 模拟 Slash 事件数据
const mockSlashEvents: SlashEvent[] = [
  {
    id: 'slash-001',
    timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前
    validator: 'Band Foundation',
    validatorAddress: 'bandvaloper1abc123...',
    reason: 'downtime',
    reasonDescription: '连续错过100+区块',
    amount: 5000,
    tokensBurned: 500,
    responseTime: 45,
    impact: 'low',
    resolved: true,
  },
  {
    id: 'slash-002',
    timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60天前
    validator: 'Cosmostation',
    validatorAddress: 'bandvaloper1def456...',
    reason: 'double_sign',
    reasonDescription: '检测到双重签名行为',
    amount: 25000,
    tokensBurned: 2500,
    responseTime: 12,
    impact: 'high',
    resolved: true,
  },
  {
    id: 'slash-003',
    timestamp: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90天前
    validator: 'Stake.fish',
    validatorAddress: 'bandvaloper1ghi789...',
    reason: 'downtime',
    reasonDescription: '节点离线超过24小时',
    amount: 8000,
    tokensBurned: 800,
    responseTime: 180,
    impact: 'medium',
    resolved: true,
  },
  {
    id: 'slash-004',
    timestamp: Date.now() - 120 * 24 * 60 * 60 * 1000, // 120天前
    validator: 'Figment',
    validatorAddress: 'bandvaloper1jkl012...',
    reason: 'malicious',
    reasonDescription: '异常数据提交行为',
    amount: 15000,
    tokensBurned: 1500,
    responseTime: 30,
    impact: 'high',
    resolved: true,
  },
  {
    id: 'slash-005',
    timestamp: Date.now() - 180 * 24 * 60 * 60 * 1000, // 180天前
    validator: 'Blockdaemon',
    validatorAddress: 'bandvaloper1mno345...',
    reason: 'downtime',
    reasonDescription: '共识参与率低于阈值',
    amount: 3000,
    tokensBurned: 300,
    responseTime: 60,
    impact: 'low',
    resolved: true,
  },
];

// 风险缓解措施
const mitigationMeasures = [
  {
    id: 'mm-001',
    category: '验证者多元化',
    title: '增加验证者数量',
    description: '鼓励更多独立验证者加入网络，降低集中度风险',
    priority: 'high',
    status: 'in_progress',
  },
  {
    id: 'mm-002',
    category: '验证者多元化',
    title: '地理分布优化',
    description: '确保验证者节点分布在不同地理区域，降低区域性风险',
    priority: 'medium',
    status: 'completed',
  },
  {
    id: 'mm-003',
    category: '数据安全',
    title: '多源数据验证',
    description: '实施多数据源交叉验证机制，防止单点数据操纵',
    priority: 'high',
    status: 'completed',
  },
  {
    id: 'mm-004',
    category: '数据安全',
    title: '价格偏差监控',
    description: '实时监控预言机价格与市场价格偏差，设置自动警报',
    priority: 'high',
    status: 'in_progress',
  },
  {
    id: 'mm-005',
    category: '基础设施',
    title: '冗余节点部署',
    description: '关键验证者部署冗余节点，确保高可用性',
    priority: 'medium',
    status: 'completed',
  },
  {
    id: 'mm-006',
    category: '治理机制',
    title: '紧急暂停机制',
    description: '建立去中心化紧急暂停机制，应对极端情况',
    priority: 'medium',
    status: 'pending',
  },
];

// 最佳实践建议
const bestPractices = [
  {
    id: 'bp-001',
    title: '委托分散化',
    description: '将代币委托给多个验证者，避免过度集中在单一验证者',
    icon: 'split',
  },
  {
    id: 'bp-002',
    title: '定期监控验证者表现',
    description: '定期检查验证者的在线率、佣金率和历史表现',
    icon: 'chart',
  },
  {
    id: 'bp-003',
    title: '关注治理参与',
    description: '积极参与网络治理投票，确保网络发展方向符合预期',
    icon: 'vote',
  },
  {
    id: 'bp-004',
    title: '风险评估更新',
    description: '定期查看风险评估报告，了解最新风险状况',
    icon: 'shield',
  },
];

// 风险评分卡片组件
function RiskScoreCard({
  title,
  score,
  maxScore,
  level,
  description,
  details,
}: {
  title: string;
  score: number;
  maxScore: number;
  level: RiskLevel;
  description: string;
  details: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
}) {
  const config = riskLevelConfig[level];
  const percentage = (score / maxScore) * 100;

  return (
    <div
      className={`bg-white border ${config.borderColor} rounded-xl p-5 hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full ${config.bgColor} bg-opacity-10`}>
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
      </div>

      {/* 评分进度条 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {score.toFixed(1)}
            <span className="text-sm text-gray-400 font-normal">/{maxScore}</span>
          </span>
          <span className={`text-lg ${config.textColor}`}>{config.icon}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.bgColor} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 详细指标 */}
      <div className="space-y-2 pt-3 border-t border-gray-100">
        {details.map((detail, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{detail.label}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900">{detail.value}</span>
              {detail.trend && (
                <span
                  className={`text-xs ${
                    detail.trend === 'up'
                      ? 'text-red-500'
                      : detail.trend === 'down'
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`}
                >
                  {detail.trend === 'up' ? '↑' : detail.trend === 'down' ? '↓' : '→'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 验证者集中度风险仪表板组件
function ValidatorConcentrationDashboard({
  validators,
  networkStats,
}: {
  validators: ValidatorInfo[];
  networkStats: NetworkStats | null;
}) {
  const metrics = useMemo(() => {
    if (!validators.length || !networkStats) {
      return {
        top10Percentage: 0,
        giniCoefficient: 0,
        nakamotoCoefficient: 0,
      };
    }

    const totalTokens = networkStats.bondedTokens;
    const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);

    // 计算前10验证者占比
    const top10Tokens = sortedValidators.slice(0, 10).reduce((sum, v) => sum + v.tokens, 0);
    const top10Percentage = (top10Tokens / totalTokens) * 100;

    // 计算基尼系数
    const n = sortedValidators.length;
    const tokens = sortedValidators.map((v) => v.tokens);
    const sumTokens = tokens.reduce((a, b) => a + b, 0);
    let sumAbsoluteDifferences = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumAbsoluteDifferences += Math.abs(tokens[i] - tokens[j]);
      }
    }
    const giniCoefficient = sumAbsoluteDifferences / (2 * n * n * (sumTokens / n));

    // 计算中本聪系数（控制33%质押需要的最小验证者数）
    let accumulatedTokens = 0;
    let nakamotoCoefficient = 0;
    const threshold = totalTokens * 0.33;
    for (const validator of sortedValidators) {
      accumulatedTokens += validator.tokens;
      nakamotoCoefficient++;
      if (accumulatedTokens >= threshold) break;
    }

    return {
      top10Percentage,
      giniCoefficient,
      nakamotoCoefficient,
    };
  }, [validators, networkStats]);

  const getRiskLevel = (percentage: number): RiskLevel => {
    if (percentage > 70) return 'critical';
    if (percentage > 50) return 'high';
    if (percentage > 30) return 'medium';
    return 'low';
  };

  const level = getRiskLevel(metrics.top10Percentage);
  const config = riskLevelConfig[level];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">验证者集中度风险</h3>
          <p className="text-xs text-gray-500 mt-1">前10验证者质押占比</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full ${config.bgColor} bg-opacity-10`}>
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
      </div>

      {/* 主要指标 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{metrics.top10Percentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">前10占比</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{metrics.nakamotoCoefficient}</p>
          <p className="text-xs text-gray-500 mt-1">中本聪系数</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{metrics.giniCoefficient.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">基尼系数</p>
        </div>
      </div>

      {/* 验证者分布条形图 */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-2">前10验证者质押分布</p>
        {validators.slice(0, 10).map((validator, index) => {
          const percentage = networkStats
            ? (validator.tokens / networkStats.bondedTokens) * 100
            : 0;
          return (
            <div key={validator.operatorAddress} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6">{index + 1}</span>
              <span className="text-xs text-gray-700 w-24 truncate">{validator.moniker}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${percentage * 3}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-12 text-right">
                {percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 单点故障风险组件
function SinglePointOfFailureDashboard({ validators }: { validators: ValidatorInfo[] }) {
  const metrics = useMemo(() => {
    const criticalValidators = validators.filter((v) => v.uptime < 99).length;
    const avgUptime = validators.length
      ? validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length
      : 0;

    // 计算风险评分 (0-100)
    const uptimeRisk = Math.max(0, (100 - avgUptime) * 5);
    const concentrationRisk = validators.length < 50 ? (50 - validators.length) * 2 : 0;
    const score = Math.min(100, uptimeRisk + concentrationRisk);

    let dependencyRisk: RiskLevel = 'low';
    if (score > 70) dependencyRisk = 'critical';
    else if (score > 50) dependencyRisk = 'high';
    else if (score > 25) dependencyRisk = 'medium';

    return {
      score,
      criticalValidators,
      dependencyRisk,
      avgUptime,
    };
  }, [validators]);

  const config = riskLevelConfig[metrics.dependencyRisk];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">单点故障风险</h3>
          <p className="text-xs text-gray-500 mt-1">网络基础设施韧性评估</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full ${config.bgColor} bg-opacity-10`}>
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
      </div>

      {/* 风险评分 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-bold text-gray-900">{metrics.score.toFixed(0)}</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.bgColor} transition-all duration-500`}
            style={{ width: `${metrics.score}%` }}
          />
        </div>
      </div>

      {/* 关键指标 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm text-gray-600">高风险验证者</span>
          </div>
          <span
            className={`text-sm font-semibold ${metrics.criticalValidators > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {metrics.criticalValidators} 个
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">平均在线率</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {metrics.avgUptime.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-sm text-gray-600">活跃验证者</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{validators.length}</span>
        </div>
      </div>
    </div>
  );
}

// 数据操纵风险组件
function DataManipulationDashboard() {
  const getInitialMetrics = useCallback(
    () => ({
      score: 25,
      oracleDeviation: 0.5,
      staleDataRisk: 'low' as RiskLevel,
      lastUpdate: Date.now(),
    }),
    []
  );

  const [metrics, setMetrics] = useState(getInitialMetrics);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        oracleDeviation: 0.3 + Math.random() * 0.4,
        lastUpdate: Date.now(),
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const config = riskLevelConfig[metrics.staleDataRisk];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">数据操纵风险</h3>
          <p className="text-xs text-gray-500 mt-1">预言机数据完整性评估</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full ${config.bgColor} bg-opacity-10`}>
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
      </div>

      {/* 风险评分 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-bold text-gray-900">{metrics.score}</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.bgColor} transition-all duration-500`}
            style={{ width: `${metrics.score}%` }}
          />
        </div>
      </div>

      {/* 关键指标 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            <span className="text-sm text-gray-600">价格偏差率</span>
          </div>
          <span className="text-sm font-semibold text-green-600">
            {metrics.oracleDeviation.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">数据新鲜度</span>
          </div>
          <span className="text-sm font-semibold text-green-600">实时</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-sm text-gray-600">验证机制</span>
          </div>
          <span className="text-sm font-semibold text-purple-600">多重签名</span>
        </div>
      </div>
    </div>
  );
}

// Slash 事件时间线组件
function SlashEventTimeline({ events }: { events: SlashEvent[] }) {
  const [filter, setFilter] = useState<'all' | 'downtime' | 'double_sign' | 'malicious'>('all');
  const getCurrentTime = useCallback(() => Date.now(), []);
  const [currentTime, setCurrentTime] = useState<number>(getCurrentTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => e.reason === filter);
  }, [events, filter]);

  const getReasonLabel = (reason: SlashEvent['reason']) => {
    const labels: Record<string, string> = {
      downtime: '离线惩罚',
      double_sign: '双重签名',
      malicious: '恶意行为',
      other: '其他',
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: SlashEvent['reason']) => {
    const colors: Record<string, string> = {
      downtime: 'bg-yellow-100 text-yellow-700',
      double_sign: 'bg-red-100 text-red-700',
      malicious: 'bg-purple-100 text-purple-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[reason] || colors.other;
  };

  const getImpactColor = (impact: SlashEvent['impact']) => {
    const colors: Record<string, string> = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return colors[impact];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const days = Math.floor((currentTime - timestamp) / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days}天前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  };

  // 计算统计数据
  const stats = useMemo(() => {
    const totalAmount = events.reduce((sum, e) => sum + e.amount, 0);
    const totalBurned = events.reduce((sum, e) => sum + e.tokensBurned, 0);
    const avgResponseTime = events.length
      ? events.reduce((sum, e) => sum + e.responseTime, 0) / events.length
      : 0;
    return { totalAmount, totalBurned, avgResponseTime };
  }, [events]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* 标题和筛选 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">历史 Slash 事件</h3>
          <p className="text-xs text-gray-500 mt-1">过去180天内的惩罚事件记录</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'downtime', 'double_sign', 'malicious'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '全部' : getReasonLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-lg font-bold text-purple-700">{stats.totalAmount.toLocaleString()}</p>
          <p className="text-xs text-purple-600">总惩罚金额 (BAND)</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-700">{stats.totalBurned.toLocaleString()}</p>
          <p className="text-xs text-red-600">代币销毁 (BAND)</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-700">{stats.avgResponseTime.toFixed(0)}m</p>
          <p className="text-xs text-blue-600">平均响应时间</p>
        </div>
      </div>

      {/* 时间线 */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {filteredEvents.map((event) => (
          <div key={event.id} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:pb-0">
            {/* 时间线节点 */}
            <div
              className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 border-white ${
                event.impact === 'high'
                  ? 'bg-red-500'
                  : event.impact === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ transform: 'translateX(-50%)' }}
            />

            {/* 事件内容 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getReasonColor(event.reason)}`}
                  >
                    {getReasonLabel(event.reason)}
                  </span>
                  <span className={`ml-2 text-xs font-medium ${getImpactColor(event.impact)}`}>
                    影响: {event.impact === 'high' ? '高' : event.impact === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{formatTimeAgo(event.timestamp)}</span>
              </div>

              <p className="text-sm font-medium text-gray-900 mb-1">{event.validator}</p>
              <p className="text-xs text-gray-500 mb-2">{event.reasonDescription}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-gray-600">
                  惩罚:{' '}
                  <span className="font-semibold text-red-600">
                    {event.amount.toLocaleString()} BAND
                  </span>
                </span>
                <span className="text-gray-600">
                  销毁:{' '}
                  <span className="font-semibold text-orange-600">
                    {event.tokensBurned.toLocaleString()} BAND
                  </span>
                </span>
                <span className="text-gray-600">
                  响应:{' '}
                  <span className="font-semibold text-blue-600">{event.responseTime}分钟</span>
                </span>
                {event.resolved && (
                  <span className="flex items-center gap-1 text-green-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    已解决
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">{formatDate(event.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 风险缓解措施组件
function MitigationMeasuresPanel() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(mitigationMeasures.map((m) => m.category));
    return Array.from(cats);
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: '已完成',
      in_progress: '进行中',
      pending: '待开始',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-green-600 bg-green-50',
    };
    return colors[priority] || colors.low;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">风险缓解措施</h3>
          <p className="text-xs text-gray-500 mt-1">已实施和计划中的风险缓解策略</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            完成度:{' '}
            <span className="font-semibold text-purple-600">
              {Math.round(
                (mitigationMeasures.filter((m) => m.status === 'completed').length /
                  mitigationMeasures.length) *
                  100
              )}
              %
            </span>
          </span>
        </div>
      </div>

      {/* 分类展示 */}
      <div className="space-y-3">
        {categories.map((category) => {
          const measures = mitigationMeasures.filter((m) => m.category === category);
          const completedCount = measures.filter((m) => m.status === 'completed').length;
          const isExpanded = expandedCategory === category;

          return (
            <div key={category} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{category}</span>
                  <span className="text-xs text-gray-500">
                    {completedCount}/{measures.length} 已完成
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isExpanded && (
                <div className="p-3 space-y-3">
                  {measures.map((measure) => (
                    <div
                      key={measure.id}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{measure.title}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(measure.priority)}`}
                          >
                            {measure.priority === 'high'
                              ? '高优先级'
                              : measure.priority === 'medium'
                                ? '中优先级'
                                : '低优先级'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{measure.description}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(measure.status)}`}
                      >
                        {getStatusLabel(measure.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 最佳实践建议组件
function BestPracticesPanel() {
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      split: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      chart: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      vote: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      shield: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    };
    return icons[iconName] || icons.shield;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900">最佳实践建议</h3>
        <p className="text-xs text-gray-500 mt-1">降低风险的推荐操作</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bestPractices.map((practice) => (
          <div
            key={practice.id}
            className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100"
          >
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              {getIcon(practice.icon)}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">{practice.title}</h4>
              <p className="text-xs text-gray-600">{practice.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 综合风险评分组件
function OverallRiskScore({
  validatorConcentration,
  singlePointOfFailure,
  dataManipulation,
}: {
  validatorConcentration: number;
  singlePointOfFailure: number;
  dataManipulation: number;
}) {
  const overallScore = useMemo(() => {
    return Math.round((validatorConcentration + singlePointOfFailure + dataManipulation) / 3);
  }, [validatorConcentration, singlePointOfFailure, dataManipulation]);

  const getOverallRiskLevel = (score: number): RiskLevel => {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  const level = getOverallRiskLevel(overallScore);
  const config = riskLevelConfig[level];

  return (
    <div className={`bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">综合风险评估</h2>
          <p className="text-purple-200 text-sm">基于多维度指标计算</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold">{overallScore}</div>
          <div className="text-sm text-purple-200">/100</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 bg-purple-900 bg-opacity-50 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} text-white`}>
          {config.label}
        </span>
        <span className="text-purple-200 text-sm">
          {level === 'low'
            ? '网络风险较低，保持当前监控水平'
            : level === 'medium'
              ? '存在中等风险，建议关注相关指标'
              : level === 'high'
                ? '风险较高，建议采取缓解措施'
                : '严重风险，需要立即采取行动'}
        </span>
      </div>

      {/* 分项得分 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-semibold">{validatorConcentration.toFixed(0)}</p>
          <p className="text-xs text-purple-200">集中度风险</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{singlePointOfFailure.toFixed(0)}</p>
          <p className="text-xs text-purple-200">单点故障</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{dataManipulation.toFixed(0)}</p>
          <p className="text-xs text-purple-200">数据操纵</p>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function RiskAssessmentPanel() {
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const clientRef = useState(() => new BandProtocolClient())[0];

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [validatorsData, statsData] = await Promise.all([
        clientRef.getValidators(50),
        clientRef.getNetworkStats(),
      ]);
      setValidators(validatorsData);
      setNetworkStats(statsData);
    } catch (error) {
      console.error('Failed to fetch risk assessment data:', error);
    } finally {
      setLoading(false);
    }
  }, [clientRef]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 计算风险分数
  const riskScores = useMemo(() => {
    if (!validators.length || !networkStats) {
      return {
        validatorConcentration: 50,
        singlePointOfFailure: 30,
        dataManipulation: 25,
      };
    }

    // 计算验证者集中度风险分数
    const totalTokens = networkStats.bondedTokens;
    const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);
    const top10Tokens = sortedValidators.slice(0, 10).reduce((sum, v) => sum + v.tokens, 0);
    const top10Percentage = (top10Tokens / totalTokens) * 100;
    const concentrationScore = Math.min(100, top10Percentage * 1.2);

    // 计算单点故障风险分数
    const criticalValidators = validators.filter((v) => v.uptime < 99).length;
    const spofScore = Math.min(100, criticalValidators * 15 + (validators.length < 50 ? 20 : 0));

    // 数据操纵风险分数（模拟）
    const manipulationScore = 25;

    return {
      validatorConcentration: concentrationScore,
      singlePointOfFailure: spofScore,
      dataManipulation: manipulationScore,
    };
  }, [validators, networkStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">加载风险评估数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 综合风险评分 */}
      <OverallRiskScore
        validatorConcentration={riskScores.validatorConcentration}
        singlePointOfFailure={riskScores.singlePointOfFailure}
        dataManipulation={riskScores.dataManipulation}
      />

      {/* 风险指标仪表板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ValidatorConcentrationDashboard validators={validators} networkStats={networkStats} />
        <SinglePointOfFailureDashboard validators={validators} />
        <DataManipulationDashboard />
      </div>

      {/* 风险评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskScoreCard
          title="验证者集中度风险"
          score={riskScores.validatorConcentration}
          maxScore={100}
          level={
            riskScores.validatorConcentration > 70
              ? 'critical'
              : riskScores.validatorConcentration > 50
                ? 'high'
                : riskScores.validatorConcentration > 30
                  ? 'medium'
                  : 'low'
          }
          description="前10验证者控制份额过高可能导致中心化风险"
          details={[
            {
              label: '前10占比',
              value: `${(riskScores.validatorConcentration / 1.2).toFixed(1)}%`,
              trend: 'up',
            },
            { label: '建议阈值', value: '< 50%' },
            { label: '趋势', value: '稳定' },
          ]}
        />
        <RiskScoreCard
          title="单点故障风险"
          score={riskScores.singlePointOfFailure}
          maxScore={100}
          level={
            riskScores.singlePointOfFailure > 70
              ? 'critical'
              : riskScores.singlePointOfFailure > 50
                ? 'high'
                : riskScores.singlePointOfFailure > 25
                  ? 'medium'
                  : 'low'
          }
          description="关键验证者故障可能影响网络稳定性"
          details={[
            {
              label: '高风险节点',
              value: `${Math.floor(riskScores.singlePointOfFailure / 15)} 个`,
              trend: 'down',
            },
            { label: '平均在线率', value: '99.7%' },
            { label: '冗余度', value: '良好' },
          ]}
        />
        <RiskScoreCard
          title="数据操纵风险"
          score={riskScores.dataManipulation}
          maxScore={100}
          level={
            riskScores.dataManipulation > 70
              ? 'critical'
              : riskScores.dataManipulation > 50
                ? 'high'
                : riskScores.dataManipulation > 25
                  ? 'medium'
                  : 'low'
          }
          description="预言机数据被恶意操纵的可能性评估"
          details={[
            { label: '价格偏差', value: '< 0.5%', trend: 'down' },
            { label: '验证机制', value: '多重签名' },
            { label: '数据源', value: '200+' },
          ]}
        />
      </div>

      {/* Slash 事件时间线和缓解措施 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SlashEventTimeline events={mockSlashEvents} />
        <MitigationMeasuresPanel />
      </div>

      {/* 最佳实践建议 */}
      <BestPracticesPanel />
    </div>
  );
}
