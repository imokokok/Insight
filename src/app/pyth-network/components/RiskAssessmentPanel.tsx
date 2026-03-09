'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ==================== 类型定义 ====================

type RiskLevel = 'low' | 'medium' | 'high';

interface RiskMetric {
  id: string;
  name: string;
  description: string;
  score: number; // 0-100
  level: RiskLevel;
  value: string;
  trend: 'up' | 'down' | 'stable';
  details: {
    label: string;
    value: string;
  }[];
}

interface SecurityEvent {
  id: string;
  date: string;
  type: 'upgrade' | 'vulnerability' | 'response' | 'maintenance';
  title: string;
  description: string;
  impact: string;
  responseTime: string;
  status: 'resolved' | 'monitoring' | 'ongoing';
}

interface MitigationMeasure {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'pending' | 'planned';
  category: 'technical' | 'operational' | 'governance';
  effectiveness: number; // 0-100
}

interface RiskData {
  overallScore: number;
  overallLevel: RiskLevel;
  scoreTrend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  metrics: RiskMetric[];
  subScores: {
    dataQuality: number;
    publisherReliability: number;
    networkSecurity: number;
    confidenceAccuracy: number;
  };
  events: SecurityEvent[];
  mitigations: MitigationMeasure[];
}

// ==================== 模拟数据 ====================

const mockRiskData: RiskData = {
  overallScore: 82,
  overallLevel: 'low',
  scoreTrend: 'up',
  lastUpdated: new Date().toISOString(),
  metrics: [
    {
      id: 'publisher-concentration',
      name: '发布者集中度风险',
      description: '评估第一方发布者的分布集中程度',
      score: 72,
      level: 'medium',
      value: '前10发布者占比 58%',
      trend: 'stable',
      details: [
        { label: '前10发布者占比', value: '58%' },
        { label: '前20发布者占比', value: '78%' },
        { label: '活跃发布者总数', value: '95' },
        { label: '新发布者(30天)', value: '+8' },
      ],
    },
    {
      id: 'confidence-accuracy',
      name: '置信区间准确性',
      description: '评估置信区间对真实价格波动的预测能力',
      score: 88,
      level: 'low',
      value: '准确率 94.2%',
      trend: 'up',
      details: [
        { label: '预测准确率', value: '94.2%' },
        { label: '平均置信区间', value: '18 bps' },
        { label: '异常检测率', value: '99.7%' },
        { label: '误报率', value: '0.3%' },
      ],
    },
    {
      id: 'data-availability',
      name: '数据可用性风险',
      description: '评估价格馈送的持续可用性和更新稳定性',
      score: 91,
      level: 'low',
      value: '可用性 99.98%',
      trend: 'stable',
      details: [
        { label: '系统可用性', value: '99.98%' },
        { label: '平均更新延迟', value: '380ms' },
        { label: '故障转移时间', value: '< 1s' },
        { label: '冗余覆盖率', value: '3.5x' },
      ],
    },
  ],
  subScores: {
    dataQuality: 86,
    publisherReliability: 79,
    networkSecurity: 88,
    confidenceAccuracy: 82,
  },
  events: [
    {
      id: '1',
      date: '2024-02-15',
      type: 'upgrade',
      title: '置信区间算法优化',
      description: '升级置信区间计算算法，提升异常检测精度',
      impact: '正向',
      responseTime: '计划内',
      status: 'resolved',
    },
    {
      id: '2',
      date: '2024-01-28',
      type: 'vulnerability',
      title: '价格偏差检测触发',
      description: '检测到某发布者价格偏差超过置信区间阈值，自动暂停该发布者',
      impact: '低',
      responseTime: '45秒',
      status: 'resolved',
    },
    {
      id: '3',
      date: '2024-01-10',
      type: 'response',
      title: '发布者离线快速响应',
      description: '2个主要发布者同时离线，系统自动切换至备用数据源',
      impact: '无',
      responseTime: '12秒',
      status: 'resolved',
    },
    {
      id: '4',
      date: '2023-12-20',
      type: 'maintenance',
      title: '安全审计完成',
      description: '通过第三方安全公司全面审计，修复2个低风险问题',
      impact: '正向',
      responseTime: '1周',
      status: 'resolved',
    },
    {
      id: '5',
      date: '2023-11-15',
      type: 'upgrade',
      title: '多链部署扩展',
      description: '完成5条新链的预言机部署，提升网络冗余度',
      impact: '正向',
      responseTime: '计划内',
      status: 'resolved',
    },
  ],
  mitigations: [
    {
      id: '1',
      title: '置信区间机制',
      description: '每个价格更新附带置信区间，量化价格不确定性',
      status: 'active',
      category: 'technical',
      effectiveness: 95,
    },
    {
      id: '2',
      title: '发布者质押机制',
      description: '发布者需质押PYTH代币，作恶将被罚没',
      status: 'active',
      category: 'governance',
      effectiveness: 88,
    },
    {
      id: '3',
      title: '聚合算法冗余',
      description: '多种聚合算法并行运行，确保数据一致性',
      status: 'active',
      category: 'technical',
      effectiveness: 92,
    },
    {
      id: '4',
      title: '实时异常检测',
      description: 'AI驱动的异常检测系统，实时监控价格偏差',
      status: 'active',
      category: 'technical',
      effectiveness: 90,
    },
    {
      id: '5',
      title: '跨链数据验证',
      description: '多条链上数据交叉验证，防止单点故障',
      status: 'active',
      category: 'operational',
      effectiveness: 85,
    },
    {
      id: '6',
      title: '去中心化治理',
      description: '重大参数变更需通过DAO投票',
      status: 'pending',
      category: 'governance',
      effectiveness: 78,
    },
  ],
};

// ==================== 工具函数 ====================

const getRiskLevelConfig = (level: RiskLevel) => {
  const configs = {
    low: {
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      bgColorLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      gradient: 'from-emerald-500 to-emerald-600',
      label: '低风险',
    },
    medium: {
      color: 'amber',
      bgColor: 'bg-amber-500',
      bgColorLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      gradient: 'from-amber-500 to-amber-600',
      label: '中风险',
    },
    high: {
      color: 'rose',
      bgColor: 'bg-rose-500',
      bgColorLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      gradient: 'from-rose-500 to-rose-600',
      label: '高风险',
    },
  };
  return configs[level];
};

const getEventTypeConfig = (type: SecurityEvent['type']) => {
  const configs = {
    upgrade: { color: 'blue', label: '升级', icon: '↑' },
    vulnerability: { color: 'rose', label: '漏洞', icon: '!' },
    response: { color: 'emerald', label: '响应', icon: '✓' },
    maintenance: { color: 'amber', label: '维护', icon: '🔧' },
  };
  return configs[type];
};

const getStatusConfig = (status: MitigationMeasure['status']) => {
  const configs = {
    active: { color: 'emerald', label: '已激活' },
    pending: { color: 'amber', label: '待部署' },
    planned: { color: 'slate', label: '计划中' },
  };
  return configs[status];
};

const getCategoryConfig = (category: MitigationMeasure['category']) => {
  const configs = {
    technical: { label: '技术', color: 'blue' },
    operational: { label: '运营', color: 'purple' },
    governance: { label: '治理', color: 'amber' },
  };
  return configs[category];
};

// ==================== 子组件 ====================

// 环形仪表盘组件
function CircularGauge({
  score,
  level,
  trend,
  size = 200,
}: {
  score: number;
  level: RiskLevel;
  trend: 'up' | 'down' | 'stable';
  size?: number;
}) {
  const config = getRiskLevelConfig(level);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* 背景圆环 */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200"
          />
          {/* 进度圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${config.textColor} transition-all duration-1000 ease-out`}
          />
        </svg>
        {/* 中心内容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900">{score}</span>
          <span className="text-sm text-gray-600">/ 100</span>
        </div>
      </div>
      {/* 底部信息 */}
      <div className="flex items-center gap-3 mt-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColorLight} ${config.textColor} border ${config.borderColor}`}
        >
          {config.label}
        </span>
        <div className="flex items-center gap-1" title="评分趋势">
          {getTrendIcon()}
        </div>
      </div>
    </div>
  );
}

// 风险指标卡片
function RiskMetricCard({ metric }: { metric: RiskMetric }) {
  const config = getRiskLevelConfig(metric.level);

  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up':
        return <span className="text-emerald-600">↑</span>;
      case 'down':
        return <span className="text-rose-600">↓</span>;
      default:
        return <span className="text-gray-600">→</span>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-all duration-200">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-gray-900 font-semibold">{metric.name}</h4>
          <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
        </div>
        <div
          className={`px-2 py-1 rounded-lg ${config.bgColorLight} ${config.textColor} text-xs font-medium`}
        >
          {config.label}
        </div>
      </div>

      {/* 主要指标 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
          {getTrendIcon()}
        </div>
        {/* 进度条 */}
        <div className="flex-1 mx-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
              style={{ width: `${metric.score}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">风险评分</span>
            <span className={`text-xs font-medium ${config.textColor}`}>{metric.score}/100</span>
          </div>
        </div>
      </div>

      {/* 详细数据 */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
        {metric.details.map((detail, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{detail.label}</span>
            <span className="text-sm font-medium text-gray-900">{detail.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 子评分组件
function SubScoreCard({
  title,
  score,
  icon,
}: {
  title: string;
  score: number;
  icon: React.ReactNode;
}) {
  const getColorClass = (s: number) => {
    if (s >= 80) return 'text-emerald-600';
    if (s >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
      <div className="p-2 bg-gray-100 rounded-lg text-gray-600">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-600">{title}</p>
        <p className={`text-lg font-bold ${getColorClass(score)}`}>{score}</p>
      </div>
    </div>
  );
}

// 置信区间分析图表
function ConfidenceAnalysisChart() {
  const confidenceData = [
    { range: '< 10 bps', count: 45, accuracy: 96.5 },
    { range: '10-20 bps', count: 38, accuracy: 94.2 },
    { range: '20-30 bps', count: 22, accuracy: 91.8 },
    { range: '30-50 bps', count: 12, accuracy: 88.5 },
    { range: '> 50 bps', count: 8, accuracy: 82.3 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">置信区间分布分析</h3>
          <p className="text-gray-500 text-xs mt-0.5">价格馈送置信区间与预测准确率关系</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={confidenceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              yAxisId="count"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              label={{ value: 'Feed Count', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }}
            />
            <YAxis
              yAxisId="accuracy"
              orientation="right"
              domain={[80, 100]}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#9CA3AF' } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
                    <p className="text-gray-900 font-medium text-sm">Confidence: {data.range}</p>
                    <p className="text-gray-600 text-xs mt-1">Feeds: {data.count}</p>
                    <p className="text-gray-600 text-xs">Accuracy: {data.accuracy}%</p>
                  </div>
                );
              }}
            />
            <ReferenceLine yAxisId="accuracy" y={90} stroke="#10B981" strokeDasharray="3 3" />
            <Bar yAxisId="count" dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
        <p className="text-xs text-violet-700">
          <span className="font-semibold">洞察：</span>
          置信区间与预测准确率呈负相关。低置信区间（&lt; 20 bps）的价格馈送具有更高的预测准确率（&gt; 94%）。
        </p>
      </div>
    </div>
  );
}

// 安全事件时间线
function SecurityTimeline({ events }: { events: SecurityEvent[] }) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-900 font-semibold">历史安全事件</h3>
          <p className="text-xs text-gray-600 mt-1">过去12个月的安全记录</p>
        </div>
        <div className="p-2 bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* 事件列表 */}
        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const typeConfig = getEventTypeConfig(event.type);

            return (
              <div key={event.id} className="relative pl-10">
                {/* 时间点 */}
                <div
                  className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-white ${
                    event.type === 'vulnerability'
                      ? 'bg-rose-500'
                      : event.type === 'upgrade'
                        ? 'bg-blue-500'
                        : 'bg-emerald-500'
                  }`}
                />

                {/* 事件卡片 */}
                <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          event.type === 'vulnerability'
                            ? 'bg-rose-50 text-rose-600'
                            : event.type === 'upgrade'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {typeConfig.label}
                      </span>
                      <span className="text-xs text-gray-500">{event.date}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        event.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {event.status === 'resolved' ? '已解决' : '监控中'}
                    </span>
                  </div>

                  <h4 className="text-sm font-medium text-gray-900 mb-1">{event.title}</h4>
                  <p className="text-xs text-gray-600 mb-3">{event.description}</p>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">影响:</span>
                      <span
                        className={
                          event.impact === '无'
                            ? 'text-emerald-600'
                            : event.impact === '低'
                              ? 'text-amber-600'
                              : event.impact === '中'
                                ? 'text-orange-600'
                                : 'text-blue-600'
                        }
                      >
                        {event.impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">响应:</span>
                      <span className="text-gray-900">{event.responseTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 风险缓解措施面板
function MitigationPanel({ mitigations }: { mitigations: MitigationMeasure[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-900 font-semibold">风险缓解措施</h3>
          <p className="text-xs text-gray-600 mt-1">当前部署的安全措施</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">生效中:</span>
          <span className="text-sm font-semibold text-emerald-600">
            {mitigations.filter((m) => m.status === 'active').length}/{mitigations.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {mitigations.map((measure) => {
          const statusConfig = getStatusConfig(measure.status);
          const categoryConfig = getCategoryConfig(measure.category);

          return (
            <div
              key={measure.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              {/* 状态指示器 */}
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  measure.status === 'active'
                    ? 'bg-emerald-500'
                    : measure.status === 'pending'
                      ? 'bg-amber-500'
                      : 'bg-gray-500'
                }`}
              />

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{measure.title}</h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        measure.status === 'active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : measure.status === 'pending'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-2">{measure.description}</p>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      measure.category === 'technical'
                        ? 'bg-blue-50 text-blue-600'
                        : measure.category === 'operational'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {categoryConfig.label}
                  </span>

                  {/* 有效性进度条 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">有效性</span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          measure.effectiveness >= 90
                            ? 'bg-emerald-500'
                            : measure.effectiveness >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${measure.effectiveness}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-900 w-8">{measure.effectiveness}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 置信区间说明卡片
function ConfidenceIntervalExplanation() {
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-100 rounded-lg">
          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h4 className="text-gray-900 font-semibold text-sm">Pyth 置信区间风险管理</h4>
          <p className="text-gray-600 text-xs mt-1">
            Pyth 独特的置信区间机制为每个价格更新提供不确定性量化，帮助 DeFi 协议做出更明智的风险决策。
            当置信区间扩大时，表示市场不确定性增加，协议可以相应调整风险参数。
          </p>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center">
              <div className="text-lg font-bold text-violet-600">94.2%</div>
              <div className="text-xs text-gray-500">预测准确率</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-violet-600">18 bps</div>
              <div className="text-xs text-gray-500">平均置信区间</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-violet-600">&lt; 1s</div>
              <div className="text-xs text-gray-500">异常响应时间</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function RiskAssessmentPanel() {
  const [riskData, setRiskData] = useState<RiskData>(mockRiskData);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟数据更新
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRiskData((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
      }));
    }, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 顶部：整体风险评分 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 环形仪表盘 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 font-semibold">整体风险评分</h3>
              <p className="text-xs text-gray-600 mt-1">综合安全评估</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-center py-4">
            <CircularGauge
              score={riskData.overallScore}
              level={riskData.overallLevel}
              trend={riskData.scoreTrend}
              size={180}
            />
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500">
              最后更新: {new Date(riskData.lastUpdated).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {/* 子评分 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 font-semibold">维度子评分</h3>
              <p className="text-xs text-gray-600 mt-1">各维度安全评分详情</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <SubScoreCard
              title="数据质量"
              score={riskData.subScores.dataQuality}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <SubScoreCard
              title="发布者可靠性"
              score={riskData.subScores.publisherReliability}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
            />
            <SubScoreCard
              title="网络安全"
              score={riskData.subScores.networkSecurity}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              }
            />
            <SubScoreCard
              title="置信准确性"
              score={riskData.subScores.confidenceAccuracy}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              }
            />
          </div>

          {/* 风险说明 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">风险等级说明</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <span className="text-emerald-600 font-medium">低风险 (80-100)</span>
                  <p className="text-gray-500">网络运行稳定，风险可控</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div>
                  <span className="text-amber-600 font-medium">中风险 (60-79)</span>
                  <p className="text-gray-500">需要关注，建议监控</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div>
                  <span className="text-rose-600 font-medium">高风险 (0-59)</span>
                  <p className="text-gray-500">需要立即采取措施</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 风险指标仪表板 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-semibold">风险指标详情</h3>
          <span className="text-xs text-gray-600">实时评估</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {riskData.metrics.map((metric) => (
            <RiskMetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* 置信区间分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConfidenceAnalysisChart />
        <ConfidenceIntervalExplanation />
      </div>

      {/* 底部：时间线和缓解措施 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityTimeline events={riskData.events} />
        <MitigationPanel mitigations={riskData.mitigations} />
      </div>
    </div>
  );
}

export default RiskAssessmentPanel;
