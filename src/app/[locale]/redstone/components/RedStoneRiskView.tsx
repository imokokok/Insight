'use client';

import { useState } from 'react';

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
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { TimelineChart, type TimelineEvent } from '@/components/oracle/charts/TimelineChart';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import { type RedStoneRiskViewProps } from '../types';

// 历史风险事件
const historicalRiskEvents: TimelineEvent[] = [
  {
    date: '2024-02-20T10:00:00',
    title: '安全审计完成',
    description:
      'RedStone 核心合约通过 Certora 形式化验证和 OpenZeppelin 安全审计，未发现重大漏洞。',
    type: 'success',
  },
  {
    date: '2024-01-15T14:30:00',
    title: '数据流协议升级',
    description: '发布 RedStone Core v2.0，引入更高效的数据压缩算法和更低的 gas 成本。',
    type: 'info',
  },
  {
    date: '2023-12-08T09:20:00',
    title: '节点网络扩展',
    description: '节点运营商数量突破 150 个，覆盖 30+ 个国家和地区，去中心化程度显著提升。',
    type: 'success',
  },
  {
    date: '2023-10-22T16:45:00',
    title: '价格偏差事件',
    description:
      '由于极端市场波动，部分资产价格喂送出现短暂偏差。团队迅速响应并在 15 分钟内恢复正常。',
    type: 'warning',
  },
  {
    date: '2023-08-14T11:30:00',
    title: '主网上线里程碑',
    description: 'RedStone 正式在以太坊主网上线，为 DeFi 协议提供去中心化数据喂送服务。',
    type: 'success',
  },
  {
    date: '2023-06-03T08:00:00',
    title: '测试网漏洞修复',
    description: '白帽黑客通过 Bug Bounty 计划报告了一个低严重程度的漏洞，已在测试网阶段修复。',
    type: 'info',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: '去中心化', redstone: 85, chainlink: 95, pyth: 78, band: 65 },
  { metric: '安全性', redstone: 90, chainlink: 98, pyth: 85, band: 72 },
  { metric: '可靠性', redstone: 96.5, chainlink: 99.9, pyth: 97.5, band: 94.2 },
  { metric: '透明度', redstone: 88, chainlink: 92, pyth: 88, band: 70 },
  { metric: '历史记录', redstone: 72, chainlink: 98, pyth: 75, band: 82 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 85,
    max: 100,
    description: 'Based on node operator diversity and geographic distribution',
    status: 'low',
    trend: 'up',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 90,
    max: 100,
    description: 'Based on audit history, bug bounty programs, and incident response',
    status: 'low',
    trend: 'stable',
  },
  {
    id: 'reliability',
    name: 'Network Reliability',
    value: 96.5,
    max: 100,
    description: 'Uptime and successful response rate over the last 30 days',
    status: 'low',
    trend: 'up',
  },
  {
    id: 'transparency',
    name: 'Transparency Score',
    value: 88,
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
    description:
      'Multiple audits by leading security firms including Certora and OpenZeppelin. No critical vulnerabilities found.',
    details: [
      'Certora formal verification completed Q1 2024',
      'OpenZeppelin security audit passed',
      'Bug bounty program with Immunefi active',
    ],
  },
  {
    category: 'Oracle Risk',
    level: 'low',
    description:
      'Decentralized node network with reputation system and economic incentives through staking.',
    details: [
      '150+ node operators across 30+ countries',
      'Pull-based oracle model reduces attack surface',
      'Staking mechanism with slashing conditions',
    ],
  },
  {
    category: 'Market Risk',
    level: 'medium',
    description:
      'Newer protocol with shorter track record compared to established oracles. Token economics still evolving.',
    details: [
      'Protocol launched in 2023, limited historical data',
      'RSG token price volatility affects staking',
      'Growing but smaller ecosystem than competitors',
    ],
  },
  {
    category: 'Regulatory Risk',
    level: 'medium',
    description:
      'Potential regulatory changes in DeFi sector and emerging oracle services classification.',
    details: [
      'Ongoing regulatory clarity discussions',
      'Compliance framework in development',
      'Geographic node distribution mitigates jurisdiction risk',
    ],
  },
];

export function RedStoneRiskView({ isLoading }: RedStoneRiskViewProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="h-1.5 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 风险指标统计 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.risk.metrics') || 'Risk Metrics'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('redstone.risk.metricsDesc') ||
                'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('redstone.risk.overallScore') || 'Overall'}: {overallScore.toFixed(1)}/100
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
                    backgroundColor:
                      metric.value >= 95 ? '#10b981' : metric.value >= 80 ? '#3b82f6' : '#f59e0b',
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
            {t('redstone.risk.benchmark') || 'Industry Benchmark Comparison'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.risk.benchmarkDesc') ||
              'Performance comparison against other leading oracle providers'}
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
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Radar
                    name="RedStone"
                    dataKey="redstone"
                    stroke={chartColors.oracle.redstone}
                    fill={chartColors.oracle.redstone}
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
            <h3 className="text-sm font-medium text-gray-700">
              {t('redstone.risk.comparison') || 'Detailed Comparison'}
            </h3>
            <div className="space-y-3">
              {benchmarkData.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.metric}</span>
                    <span className="font-medium text-gray-900">{item.redstone}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${item.redstone}%`,
                        backgroundColor: chartColors.oracle.redstone,
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
            {t('redstone.risk.timeline') || 'Historical Risk Events'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.risk.timelineDesc') ||
              'Security audits, incidents and upgrades over the past 24 months'}
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
              {t('redstone.risk.eventDetails') || 'Event Details'}
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
                <p className="text-sm text-gray-500">
                  {t('redstone.risk.clickEvent') || 'Click an event to view details'}
                </p>
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
            {t('redstone.risk.factors') || 'Risk Factor Analysis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.risk.factorsDesc') || 'Detailed breakdown of identified risk categories'}
          </p>
        </div>

        <div className="space-y-2">
          {riskFactors.map((factor, index) => (
            <div key={index} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedFactor(expandedFactor === index ? null : index)}
                className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-md"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getRiskBgColor(factor.level)} ${getRiskColor(factor.level)}`}
                  >
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
                      <li
                        key={detailIndex}
                        className="flex items-start gap-2 text-sm text-gray-500"
                      >
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
          <h3 className="text-sm font-semibold text-gray-900">{t('redstone.risk.disclaimer')}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('redstone.risk.disclaimerText')}
          </p>
        </div>
      </section>
    </div>
  );
}
