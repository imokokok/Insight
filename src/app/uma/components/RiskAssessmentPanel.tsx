'use client';

import { useState, useMemo } from 'react';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import StatCard from '@/components/StatCard';

// 风险等级类型
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// 安全事件类型
interface SecurityEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'upgrade' | 'adjustment' | 'addition' | 'incident';
}

// 风险指标类型
interface RiskMetric {
  id: string;
  name: string;
  value: string;
  level: RiskLevel;
  description: string;
  trend: 'improving' | 'stable' | 'worsening';
}

// 风险缓解措施类型
interface RiskMitigation {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'planned' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

// 模拟风险数据
const mockRiskData = {
  overallScore: 72,
  riskLevel: 'medium' as RiskLevel,
  lastAssessment: new Date(),
};

// 风险指标数据
const mockRiskMetrics: RiskMetric[] = [
  {
    id: 'validator-concentration',
    name: '验证者集中度风险',
    value: '中低',
    level: 'low',
    description: '前10节点占35%，前50占62%',
    trend: 'stable',
  },
  {
    id: 'dispute-mechanism',
    name: '争议机制健康度',
    value: '良好',
    level: 'low',
    description: '争议响应时间正常，无积压案件',
    trend: 'improving',
  },
  {
    id: 'data-manipulation',
    name: '数据操纵风险',
    value: '低',
    level: 'low',
    description: '数据完整性检查通过，无异常',
    trend: 'stable',
  },
];

// 安全事件数据
const mockSecurityEvents: SecurityEvent[] = [
  {
    id: '1',
    date: '2024-01',
    title: '争议响应优化升级',
    description: '优化争议处理流程，将平均响应时间缩短30%',
    type: 'upgrade',
  },
  {
    id: '2',
    date: '2023-11',
    title: '验证者奖励调整',
    description: '调整验证者激励机制，提高网络参与度',
    type: 'adjustment',
  },
  {
    id: '3',
    date: '2023-08',
    title: '新验证者加入',
    description: '新增15个验证者节点，增强网络去中心化程度',
    type: 'addition',
  },
];

// 风险缓解措施数据
const mockMitigations: RiskMitigation[] = [
  {
    id: '1',
    title: '多节点验证机制',
    description: '实施多节点交叉验证，降低单点故障风险',
    status: 'active',
    priority: 'high',
  },
  {
    id: '2',
    title: '实时监控预警',
    description: '24/7实时监控系统，异常情况自动预警',
    status: 'active',
    priority: 'high',
  },
  {
    id: '3',
    title: '验证者激励优化',
    description: '优化验证者奖励分配，鼓励更多节点参与',
    status: 'planned',
    priority: 'medium',
  },
  {
    id: '4',
    title: '争议处理自动化',
    description: '引入AI辅助争议处理，提高效率',
    status: 'planned',
    priority: 'medium',
  },
  {
    id: '5',
    title: '季度安全审计',
    description: '定期进行第三方安全审计',
    status: 'completed',
    priority: 'high',
  },
];

// 风险等级配置
const riskLevelConfig = {
  low: {
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgGradient: 'from-green-50 to-green-100',
    label: '低风险',
    scoreColor: '#10b981',
  },
  medium: {
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgGradient: 'from-yellow-50 to-yellow-100',
    label: '中风险',
    scoreColor: '#f59e0b',
  },
  high: {
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgGradient: 'from-orange-50 to-orange-100',
    label: '高风险',
    scoreColor: '#f97316',
  },
  critical: {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgGradient: 'from-red-50 to-red-100',
    label: '极高风险',
    scoreColor: '#ef4444',
  },
};

// 整体风险评分组件
function OverallRiskScore({ score, level }: { score: number; level: RiskLevel }) {
  const config = riskLevelConfig[level];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">整体风险评分</p>
          <p className="text-gray-400 text-xs">综合评估网络风险状况</p>
        </div>
        <div className={`p-2 bg-gray-100 rounded-lg`}>
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative">
          {/* 背景圆环 */}
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            {/* 进度圆环 */}
            <circle
              cx="80"
              cy="80"
              r="45"
              fill="none"
              stroke={config.scoreColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* 中心文字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">{score}</span>
            <span className="text-xs text-gray-500 mt-1">分</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <span className={`relative flex h-3 w-3`}>
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}
          ></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${config.bgColor}`}></span>
        </span>
        <span className={`text-lg font-semibold ${config.textColor}`}>{config.label}</span>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        最后评估: {mockRiskData.lastAssessment.toLocaleDateString('zh-CN')}
      </p>
    </div>
  );
}

// 风险指标详情组件
function RiskMetricCard({ metric }: { metric: RiskMetric }) {
  const config = riskLevelConfig[metric.level];

  const trendIcon = {
    improving: '↗',
    stable: '→',
    worsening: '↘',
  };

  const trendColor = {
    improving: 'text-green-600',
    stable: 'text-gray-500',
    worsening: 'text-red-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-900 font-semibold">{metric.name}</span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 ${config.textColor}`}
            >
              {metric.value}
            </span>
          </div>
          <p className="text-sm text-gray-500">{metric.description}</p>
        </div>
        <div className={`flex items-center gap-1 ${trendColor[metric.trend]}`}>
          <span className="text-lg">{trendIcon[metric.trend]}</span>
        </div>
      </div>
    </div>
  );
}

// 安全事件时间线组件
function SecurityTimeline({ events }: { events: SecurityEvent[] }) {
  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string }> = {
      upgrade: {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: '升级',
      },
      adjustment: {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: '调整',
      },
      addition: {
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: '新增',
      },
      incident: {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: '事件',
      },
    };
    return configs[type] || configs.upgrade;
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const typeConfig = getTypeConfig(event.type);
        return (
          <div key={event.id} className="flex gap-4">
            {/* 时间线 */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`} />
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-2" />
              )}
            </div>
            {/* 内容 */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">{event.date}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}
                >
                  {typeConfig.label}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{event.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 风险缓解措施组件
function RiskMitigationList({ mitigations }: { mitigations: RiskMitigation[] }) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string }> = {
      active: {
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: '进行中',
      },
      planned: {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: '计划中',
      },
      completed: {
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: '已完成',
      },
    };
    return configs[status] || configs.planned;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="space-y-3">
      {mitigations.map((mitigation) => {
        const statusConfig = getStatusConfig(mitigation.status);
        return (
          <div
            key={mitigation.id}
            className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow duration-200"
          >
            {/* 状态指示器 */}
            <div className="flex-shrink-0 mt-0.5">
              {mitigation.status === 'completed' ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : mitigation.status === 'active' ? (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{mitigation.title}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{mitigation.description}</p>
            </div>

            {/* 优先级 */}
            <div className="flex-shrink-0">
              <span className={`text-xs font-medium ${getPriorityColor(mitigation.priority)}`}>
                {mitigation.priority === 'high' ? '高' : mitigation.priority === 'medium' ? '中' : '低'}优先级
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 主组件
export function RiskAssessmentPanel() {
  const [riskMetrics] = useState<RiskMetric[]>(mockRiskMetrics);
  const [securityEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [mitigations] = useState<RiskMitigation[]>(mockMitigations);

  // 计算统计数据
  const activeMitigations = mitigations.filter((m) => m.status === 'active').length;
  const completedMitigations = mitigations.filter((m) => m.status === 'completed').length;
  const highPriorityCount = mitigations.filter((m) => m.priority === 'high').length;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="整体风险评分"
          value={mockRiskData.overallScore}
          suffix="分"
          trend={5}
          trendDirection="up"
          trendLabel="vs 上月"
          accentColor="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
        <StatCard
          title="进行中措施"
          value={activeMitigations}
          suffix="项"
          trend={0}
          trendDirection="neutral"
          trendLabel="vs 上周"
          accentColor="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="已完成措施"
          value={completedMitigations}
          suffix="项"
          trend={20}
          trendDirection="up"
          trendLabel="vs 上月"
          accentColor="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="高优先级"
          value={highPriorityCount}
          suffix="项"
          trend={-1}
          trendDirection="down"
          trendLabel="vs 上周"
          accentColor="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        />
      </div>

      {/* 风险评分和指标详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 整体风险评分 */}
        <OverallRiskScore score={mockRiskData.overallScore} level={mockRiskData.riskLevel} />

        {/* 风险指标详情 */}
        <div className="lg:col-span-2">
          <AdvancedCard variant="glass" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle className="text-gray-900">风险指标详情</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="space-y-3">
                {riskMetrics.map((metric) => (
                  <RiskMetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </AdvancedCardContent>
          </AdvancedCard>
        </div>
      </div>

      {/* 安全事件时间线和风险缓解措施 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 安全事件时间线 */}
        <AdvancedCard variant="glass" hoverable={false}>
          <AdvancedCardHeader>
            <div className="flex items-center justify-between">
              <AdvancedCardTitle className="text-gray-900">安全事件时间线</AdvancedCardTitle>
              <span className="text-xs text-gray-500">最近3个月</span>
            </div>
          </AdvancedCardHeader>
          <AdvancedCardContent>
            <SecurityTimeline events={securityEvents} />
          </AdvancedCardContent>
        </AdvancedCard>

        {/* 风险缓解措施 */}
        <AdvancedCard variant="glass" hoverable={false}>
          <AdvancedCardHeader>
            <div className="flex items-center justify-between">
              <AdvancedCardTitle className="text-gray-900">风险缓解措施</AdvancedCardTitle>
              <span className="text-xs text-gray-500">共 {mitigations.length} 项</span>
            </div>
          </AdvancedCardHeader>
          <AdvancedCardContent>
            <RiskMitigationList mitigations={mitigations} />
          </AdvancedCardContent>
        </AdvancedCard>
      </div>
    </div>
  );
}
