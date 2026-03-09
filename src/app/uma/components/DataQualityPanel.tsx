'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// 数据质量状态类型
type QualityStatus = 'excellent' | 'good' | 'warning' | 'poor';

// 模拟数据质量数据
const mockDataQuality = {
  // 核心指标
  validationAccuracy: 96.5, // 验证准确率
  validatorParticipation: 82, // 验证者参与度
  disputeRate: 2.3, // 争议率
  consistencyScore: 94, // 数据一致性评分

  // 历史趋势数据（最近7天）
  accuracyTrend: [94.2, 95.1, 95.8, 96.0, 96.2, 96.4, 96.5],
  participationTrend: [78, 79, 80, 81, 81, 82, 82],
  disputeTrend: [3.2, 3.0, 2.8, 2.6, 2.5, 2.4, 2.3],
  consistencyTrend: [91, 92, 92, 93, 93, 94, 94],

  // 状态
  status: 'excellent' as QualityStatus,
  lastUpdated: new Date(),
};

// 质量状态配置
const statusConfig = {
  excellent: {
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgGradient: 'from-green-50 to-green-100',
    label: '优秀',
    pulseColor: 'bg-green-400',
  },
  good: {
    color: 'blue',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgGradient: 'from-blue-50 to-blue-100',
    label: '良好',
    pulseColor: 'bg-blue-400',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgGradient: 'from-yellow-50 to-yellow-100',
    label: '警告',
    pulseColor: 'bg-yellow-400',
  },
  poor: {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgGradient: 'from-red-50 to-red-100',
    label: '需改进',
    pulseColor: 'bg-red-400',
  },
};

// 质量状态指示器组件
function QualityStatusIndicator({ status }: { status: QualityStatus }) {
  const config = statusConfig[status];

  return (
    <div className={`bg-white border ${config.borderColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">数据质量状态</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`relative flex h-4 w-4`}>
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${config.bgColor}`}
                ></span>
              </span>
            </div>
            <span className={`text-2xl font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">实时监控中 • 最后检查: 刚刚</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${config.bgGradient}`}>
          <svg
            className={`w-8 h-8 ${config.textColor}`}
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
        </div>
      </div>
    </div>
  );
}

// 进度条组件
function ProgressBar({
  value,
  max = 100,
  color = 'purple',
  showPercentage = true,
  size = 'md',
}: {
  value: number;
  max?: number;
  color?: 'purple' | 'green' | 'blue' | 'yellow' | 'red';
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorClasses = {
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">0%</span>
          <span className="text-xs font-medium text-gray-600">{percentage.toFixed(1)}%</span>
          <span className="text-xs text-gray-400">{max}%</span>
        </div>
      )}
    </div>
  );
}

// 验证准确性监控组件
function ValidationAccuracyMonitor({ accuracy, trend }: { accuracy: number; trend: number[] }) {
  // 计算趋势方向
  const trendDirection = trend[trend.length - 1] > trend[trend.length - 2] ? 'up' : 'down';
  const trendValue = Math.abs(trend[trend.length - 1] - trend[trend.length - 2]);

  // 生成SVG路径
  const maxValue = Math.max(...trend);
  const minValue = Math.min(...trend);
  const range = maxValue - minValue || 1;
  const points = trend
    .map((value, index) => {
      const x = (index / (trend.length - 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">验证准确性</p>
          <p className="text-gray-500 text-xs mt-0.5">验证结果准确率监控</p>
        </div>
        <div className="p-2 bg-green-50 rounded-lg">
          <svg
            className="w-5 h-5 text-green-600"
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
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold text-gray-900">{accuracy.toFixed(1)}</span>
        <span className="text-xl text-gray-500">%</span>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
            trendDirection === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <span>{trendDirection === 'up' ? '↑' : '↓'}</span>
          <span>{trendValue.toFixed(1)}%</span>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="h-16 w-full">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="100" cy={100 - ((accuracy - minValue) / range) * 100} r="4" fill="#10b981" />
        </svg>
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>7天前</span>
        <span>今天</span>
      </div>
    </div>
  );
}

// 验证者参与度统计组件
function ValidatorParticipationStats({
  participation,
  trend,
}: {
  participation: number;
  trend: number[];
}) {
  // 计算趋势
  const trendDirection = trend[trend.length - 1] > trend[trend.length - 2] ? 'up' : 'down';
  const trendValue = Math.abs(trend[trend.length - 1] - trend[trend.length - 2]);

  // 获取状态颜色
  const getStatusColor = (value: number) => {
    if (value >= 90) return 'green';
    if (value >= 70) return 'blue';
    if (value >= 50) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor(participation);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">验证者参与度</p>
          <p className="text-gray-500 text-xs mt-0.5">活跃验证者参与比例</p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold text-gray-900">{participation}</span>
        <span className="text-xl text-gray-500">%</span>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
            trendDirection === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <span>{trendDirection === 'up' ? '↑' : '↓'}</span>
          <span>{trendValue.toFixed(0)}%</span>
        </div>
      </div>

      {/* 进度条 */}
      <ProgressBar value={participation} color={statusColor} size="lg" />

      {/* 状态标签 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-${statusColor}-500`} />
          <span className="text-xs text-gray-500">
            {participation >= 90
              ? '参与度优秀'
              : participation >= 70
                ? '参与度良好'
                : participation >= 50
                  ? '参与度一般'
                  : '需要关注'}
          </span>
        </div>
        <span className="text-xs text-gray-400">目标: 90%</span>
      </div>
    </div>
  );
}

// 争议率分析组件
function DisputeRateAnalysis({ disputeRate, trend }: { disputeRate: number; trend: number[] }) {
  // 计算趋势
  const trendDirection = trend[trend.length - 1] < trend[trend.length - 2] ? 'up' : 'down';
  const trendValue = Math.abs(trend[trend.length - 1] - trend[trend.length - 2]);

  // 生成SVG路径（反转，因为争议率越低越好）
  const maxValue = Math.max(...trend);
  const minValue = Math.min(...trend);
  const range = maxValue - minValue || 1;
  const points = trend
    .map((value, index) => {
      const x = (index / (trend.length - 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  // 获取状态颜色
  const getStatusColor = (rate: number) => {
    if (rate <= 1) return 'green';
    if (rate <= 3) return 'blue';
    if (rate <= 5) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor(disputeRate);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">争议率分析</p>
          <p className="text-gray-500 text-xs mt-0.5">验证争议比例趋势</p>
        </div>
        <div className="p-2 bg-yellow-50 rounded-lg">
          <svg
            className="w-5 h-5 text-yellow-600"
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
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold text-gray-900">{disputeRate.toFixed(1)}</span>
        <span className="text-xl text-gray-500">%</span>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
            trendDirection === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <span>{trendDirection === 'up' ? '↓' : '↑'}</span>
          <span>{trendValue.toFixed(1)}%</span>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="h-16 w-full">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={
              statusColor === 'green' ? '#10b981' : statusColor === 'blue' ? '#3b82f6' : '#f59e0b'
            }
            strokeWidth="3"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="100"
            cy={100 - ((disputeRate - minValue) / range) * 100}
            r="4"
            fill={
              statusColor === 'green' ? '#10b981' : statusColor === 'blue' ? '#3b82f6' : '#f59e0b'
            }
          />
        </svg>
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>7天前</span>
        <span>今天</span>
      </div>
    </div>
  );
}

// 数据一致性评分组件
function ConsistencyScore({ score, trend }: { score: number; trend: number[] }) {
  // 计算趋势
  const trendDirection = trend[trend.length - 1] > trend[trend.length - 2] ? 'up' : 'down';
  const trendValue = Math.abs(trend[trend.length - 1] - trend[trend.length - 2]);

  // 获取状态颜色和描述
  const getStatusInfo = (s: number) => {
    if (s >= 90) return { color: 'text-green-600', bgColor: 'bg-green-500', label: '优秀' };
    if (s >= 80) return { color: 'text-blue-600', bgColor: 'bg-blue-500', label: '良好' };
    if (s >= 60) return { color: 'text-yellow-600', bgColor: 'bg-yellow-500', label: '一般' };
    return { color: 'text-red-600', bgColor: 'bg-red-500', label: '需改进' };
  };

  const statusInfo = getStatusInfo(score);

  // 环形进度条计算
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">数据一致性评分</p>
          <p className="text-gray-500 text-xs mt-0.5">综合数据质量评估</p>
        </div>
        <div className="p-2 bg-purple-50 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
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
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          {/* 环形进度条 */}
          <svg className="w-32 h-32 transform -rotate-90">
            {/* 背景圆环 */}
            <circle cx="64" cy="64" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            {/* 进度圆环 */}
            <circle
              cx="64"
              cy="64"
              r="40"
              fill="none"
              stroke={
                statusInfo.bgColor === 'bg-green-500'
                  ? '#10b981'
                  : statusInfo.bgColor === 'bg-blue-500'
                    ? '#3b82f6'
                    : statusInfo.bgColor === 'bg-yellow-500'
                      ? '#f59e0b'
                      : '#ef4444'
              }
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* 中心文字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${statusInfo.color}`}>{score}</span>
            <span className="text-xs text-gray-400">分</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
              trendDirection === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}
          >
            <span>{trendDirection === 'up' ? '↑' : '↓'}</span>
            <span>{trendValue.toFixed(0)}</span>
          </div>
        </div>
        <span className="text-xs text-gray-400">满分: 100</span>
      </div>
    </div>
  );
}

// 主组件
export function DataQualityPanel() {
  const [dataQuality, setDataQuality] = useState(mockDataQuality);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setDataQuality((prev) => {
      // 轻微波动数据
      const fluctuation = () => (Math.random() - 0.5) * 0.5;

      const newAccuracy = Math.min(100, Math.max(90, prev.validationAccuracy + fluctuation()));
      const newParticipation = Math.min(
        100,
        Math.max(50, prev.validatorParticipation + fluctuation() * 2)
      );
      const newDisputeRate = Math.max(0, Math.min(10, prev.disputeRate + fluctuation() * 0.3));
      const newConsistency = Math.min(100, Math.max(70, prev.consistencyScore + fluctuation()));

      // 更新趋势数据
      const newAccuracyTrend = [...prev.accuracyTrend.slice(1), newAccuracy];
      const newParticipationTrend = [...prev.participationTrend.slice(1), newParticipation];
      const newDisputeTrend = [...prev.disputeTrend.slice(1), newDisputeRate];
      const newConsistencyTrend = [...prev.consistencyTrend.slice(1), newConsistency];

      // 确定状态
      let status: QualityStatus = 'good';
      if (newAccuracy >= 95 && newConsistency >= 90) {
        status = 'excellent';
      } else if (newAccuracy < 90 || newConsistency < 80) {
        status = 'warning';
      } else if (newAccuracy < 85 || newConsistency < 70) {
        status = 'poor';
      }

      return {
        ...prev,
        validationAccuracy: newAccuracy,
        validatorParticipation: newParticipation,
        disputeRate: newDisputeRate,
        consistencyScore: newConsistency,
        accuracyTrend: newAccuracyTrend,
        participationTrend: newParticipationTrend,
        disputeTrend: newDisputeTrend,
        consistencyTrend: newConsistencyTrend,
        status,
        lastUpdated: new Date(),
      };
    });
  }, []);

  // 定时更新数据（每30秒）
  useEffect(() => {
    intervalRef.current = setInterval(simulateDataUpdate, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate]);

  return (
    <div className="space-y-6">
      {/* 顶部：数据质量状态指示器 */}
      <QualityStatusIndicator status={dataQuality.status} />

      {/* 核心指标卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ValidationAccuracyMonitor
          accuracy={dataQuality.validationAccuracy}
          trend={dataQuality.accuracyTrend}
        />
        <ValidatorParticipationStats
          participation={dataQuality.validatorParticipation}
          trend={dataQuality.participationTrend}
        />
        <DisputeRateAnalysis
          disputeRate={dataQuality.disputeRate}
          trend={dataQuality.disputeTrend}
        />
        <ConsistencyScore
          score={dataQuality.consistencyScore}
          trend={dataQuality.consistencyTrend}
        />
      </div>
    </div>
  );
}
