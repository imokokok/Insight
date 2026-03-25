'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TimelineChart,
  TimelineEvent,
} from '@/components/oracle/charts/TimelineChart';
import { chartColors } from '@/lib/config/colors';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Award,
  Info,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { API3RiskViewProps } from '../types';

// 历史风险事件
const historicalRiskEvents: TimelineEvent[] = [
  {
    date: '2024-02-20T10:30:00',
    title: 'API3 DAO 治理升级',
    description: '成功完成 DAO 治理机制升级，引入新的提案流程和投票权重计算机制，提升治理效率和安全性。',
    type: 'success',
  },
  {
    date: '2023-12-15T14:20:00',
    title: 'OEV Network 主网上线',
    description: 'OEV (Oracle Extractable Value) Network 正式在主网启动，为 dApps 提供 MEV 回收功能。',
    type: 'success',
  },
  {
    date: '2023-10-08T09:15:00',
    title: '安全审计报告发布',
    description: 'Quantstamp 完成 API3 核心合约的安全审计，发现并修复了 2 个低风险问题，无重大漏洞。',
    type: 'info',
  },
  {
    date: '2023-08-22T16:45:00',
    title: 'Airnode 部署里程碑',
    description: '全球 Airnode 部署数量突破 150 个，覆盖 30+ 个区块链网络，数据提供商生态持续扩展。',
    type: 'success',
  },
  {
    date: '2023-06-12T11:30:00',
    title: 'dAPI 价格延迟事件',
    description: '由于 Polygon 网络拥堵，部分 dAPI 价格更新延迟 3-5 分钟。团队迅速启用备用节点恢复服务。',
    type: 'warning',
  },
  {
    date: '2023-03-28T08:00:00',
    title: '质押池 v2 发布',
    description: 'API3 Staking Pool v2 正式上线，引入动态奖励机制和更灵活的质押策略。',
    type: 'success',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: '去中心化', api3: 85, pyth: 78, band: 65, chainlink: 95 },
  { metric: '安全性', api3: 88, pyth: 85, band: 72, chainlink: 98 },
  { metric: '可靠性', api3: 97.5, pyth: 97.5, band: 94.2, chainlink: 99.9 },
  { metric: '透明度', api3: 92, pyth: 88, band: 70, chainlink: 92 },
  { metric: '历史记录', api3: 75, pyth: 75, band: 82, chainlink: 98 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 85,
    max: 100,
    description: 'Based on Airnode operator diversity and geographic distribution',
    status: 'low',
    trend: 'up',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 88,
    max: 100,
    description: 'Based on audit history, bug bounty programs, and incident response',
    status: 'low',
    trend: 'stable',
  },
  {
    id: 'reliability',
    name: 'Network Reliability',
    value: 97.5,
    max: 100,
    description: 'Uptime and successful response rate over the last 30 days',
    status: 'low',
    trend: 'up',
  },
  {
    id: 'transparency',
    name: 'Transparency Score',
    value: 92,
    max: 100,
    description: 'Based on documentation quality and open-source availability',
    status: 'low',
    trend: 'stable',
  },
];

// 风险因素
const riskFactors = [
  {
    category: 'Smart Contract Risk',
    level: 'low',
    description: 'Multiple audits by Quantstamp and other leading security firms. Core contracts have been battle-tested since 2021.',
    details: [
      'Quantstamp audit completed Q4 2023',
      'Continuous monitoring through Code4rena',
      'Bug bounty program with $250K+ rewards paid',
      'No critical vulnerabilities found to date',
    ],
  },
  {
    category: 'Oracle Risk',
    level: 'low',
    description: 'First-party oracle architecture with direct data provider relationships and cryptographic attestations.',
    details: [
      '150+ Airnodes operated by data providers',
      'Direct API provider relationships (no middlemen)',
      'Cryptographic proof of data origin',
      'DAO-governed dAPI updates',
    ],
  },
  {
    category: 'Market Risk',
    level: 'medium',
    description: 'API3 token price volatility affects staking rewards and coverage pool value.',
    details: [
      'API3 price correlation with broader DeFi market',
      'Staking rewards subject to market conditions',
      'Coverage pool denominated in API3 tokens',
      'Treasury diversification ongoing',
    ],
  },
  {
    category: 'Regulatory Risk',
    level: 'medium',
    description: 'Potential regulatory changes affecting first-party oracle models and data provider relationships.',
    details: [
      'First-party model may face different regulatory treatment',
      'Data provider compliance requirements evolving',
      'DAO structure under regulatory scrutiny',
      'Active legal counsel monitoring developments',
    ],
  },
  {
    category: 'Adoption Risk',
    level: 'medium',
    description: 'Relatively newer protocol compared to established competitors, with smaller integration footprint.',
    details: [
      'Fewer total integrations than Chainlink',
      'Growing but smaller developer community',
      'First-party model requires education and trust building',
      'Strategic partnerships expanding rapidly',
    ],
  },
];

export function API3RiskView({
  staking,
  airnodeStats,
  dapiCoverage,
  isLoading,
}: API3RiskViewProps) {
  const t = useTranslations();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-emerald-600';
      case 'medium':
        return 'text-amber-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-emerald-50';
      case 'medium':
        return 'bg-amber-50';
      case 'high':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  // 计算综合风险评分
  const overallScore = riskMetrics.reduce((sum, m) => sum + m.value, 0) / riskMetrics.length;

  return (
    <div className="space-y-8">
      {/* 风险指标统计 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('api3.risk.metrics') || 'Risk Metrics'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('api3.risk.metricsDesc') || 'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('api3.risk.overallScore') || 'Overall'}: {overallScore.toFixed(1)}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {riskMetrics.map((metric) => (
            <div key={metric.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{metric.name}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
                <span className="text-sm text-gray-400">/ {metric.max}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${(metric.value / metric.max) * 100}%`,
                    backgroundColor: metric.value >= 95 ? '#10b981' : metric.value >= 80 ? '#3b82f6' : '#f59e0b',
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{metric.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 行业基准对比 */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.risk.benchmark') || 'Industry Benchmark Comparison'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.risk.benchmarkDesc') || 'Performance comparison against other leading oracle providers'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 雷达图 */}
          <div className="lg:col-span-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={benchmarkData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Radar
                    name="API3"
                    dataKey="api3"
                    stroke={chartColors.oracle.api3}
                    fill={chartColors.oracle.api3}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Chainlink"
                    dataKey="chainlink"
                    stroke={chartColors.oracle.chainlink}
                    fill={chartColors.oracle.chainlink}
                    fillOpacity={0.1}
                    strokeWidth={1.5}
                  />
                  <Radar
                    name="Pyth"
                    dataKey="pyth"
                    stroke={chartColors.oracle.pyth}
                    fill={chartColors.oracle.pyth}
                    fillOpacity={0.1}
                    strokeWidth={1.5}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 对比表格 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">{t('api3.risk.comparison') || 'Detailed Comparison'}</h3>
            <div className="space-y-3">
              {benchmarkData.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.metric}</span>
                    <span className="font-medium text-gray-900">{item.api3}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${item.api3}%`,
                        backgroundColor: chartColors.oracle.api3,
                      }}
                    />
                    <div
                      className="rounded-full opacity-40"
                      style={{
                        width: `${item.chainlink}%`,
                        backgroundColor: chartColors.oracle.chainlink,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 历史风险事件时间线 */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.risk.timeline') || 'Historical Risk Events'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.risk.timelineDesc') || 'Security audits, incidents and upgrades over the past 24 months'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 时间线 */}
          <div className="lg:col-span-2">
            <TimelineChart
              events={historicalRiskEvents}
              onEventClick={(event) => setSelectedEvent(event)}
              showDateLabels={true}
              compact={false}
            />
          </div>

          {/* 事件详情 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('api3.risk.eventDetails') || 'Event Details'}
            </h3>
            {selectedEvent ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <div className="flex items-start gap-3">
                  {selectedEvent.type === 'success' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  {selectedEvent.type === 'warning' && (
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                  )}
                  {selectedEvent.type === 'info' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  {selectedEvent.type === 'error' && (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{selectedEvent.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedEvent.date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedEvent.description}</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t('api3.risk.clickEvent') || 'Click an event to view details'}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 风险因素 */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.risk.factors') || 'Risk Factor Analysis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.risk.factorsDesc') || 'Detailed breakdown of identified risk categories'}
          </p>
        </div>

        <div className="space-y-2">
          {riskFactors.map((factor, index) => (
            <div
              key={index}
              className="border-b border-gray-100 last:border-0"
            >
              <button
                onClick={() => setExpandedFactor(expandedFactor === index ? null : index)}
                className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-md"
              >
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getRiskBgColor(factor.level)} ${getRiskColor(factor.level)}`}>
                    {factor.level.charAt(0).toUpperCase() + factor.level.slice(1)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{factor.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 hidden sm:block max-w-xs truncate">
                    {factor.description}
                  </span>
                  {expandedFactor === index ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
              {expandedFactor === index && (
                <div className="pb-4 px-2">
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">{factor.description}</p>
                  <ul className="space-y-2">
                    {factor.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-start gap-2 text-sm text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 免责声明 */}
      <section className="flex items-start gap-4 py-2">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('api3.risk.disclaimer') || 'Risk Disclaimer'}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('api3.risk.disclaimerText') || 'The risk assessment provided is for informational purposes only and should not be considered as investment advice. Cryptocurrency investments carry significant risks, including potential loss of capital. Please conduct your own research and consult with financial advisors before making investment decisions.'}
          </p>
        </div>
      </section>
    </div>
  );
}
