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

// 历史风险事件
const historicalRiskEvents: TimelineEvent[] = [
  {
    date: '2024-01-15T10:30:00',
    title: '安全审计完成',
    description:
      'Chainlink 核心合约通过 Trail of Bits 和 OpenZeppelin 的联合安全审计，未发现重大漏洞。',
    type: 'success',
  },
  {
    date: '2023-11-08T14:20:00',
    title: '节点网络升级',
    description: '完成节点软件 v2.5.0 升级，引入新的共识机制和增强的故障恢复能力。',
    type: 'info',
  },
  {
    date: '2023-09-22T09:15:00',
    title: '潜在漏洞披露',
    description:
      '白帽黑客通过 Bug Bounty 计划报告了一个中等严重程度的漏洞。团队已在 48 小时内修复并部署补丁。',
    type: 'warning',
  },
  {
    date: '2023-07-14T16:45:00',
    title: '去中心化里程碑',
    description: '节点运营商数量突破 1000 个，分布在 45 个国家和地区。',
    type: 'success',
  },
  {
    date: '2023-05-03T11:30:00',
    title: '价格延迟事件',
    description: '由于以太坊网络拥堵，部分价格喂送出现 2-3 分钟延迟。触发自动故障转移机制。',
    type: 'warning',
  },
  {
    date: '2023-02-28T08:00:00',
    title: '质押合约发布',
    description: 'Chainlink Staking v0.2 正式上线，引入惩罚机制和更高的安全保证金要求。',
    type: 'success',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: '去中心化', chainlink: 95, pyth: 78, band: 65, api3: 70 },
  { metric: '安全性', chainlink: 98, pyth: 85, band: 72, api3: 80 },
  { metric: '可靠性', chainlink: 99.9, pyth: 97.5, band: 94.2, api3: 96.8 },
  { metric: '透明度', chainlink: 92, pyth: 88, band: 70, api3: 85 },
  { metric: '历史记录', chainlink: 98, pyth: 75, band: 82, api3: 78 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 95,
    max: 100,
    description: 'Based on node operator diversity and geographic distribution',
    status: 'low',
    trend: 'up',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 98,
    max: 100,
    description: 'Based on audit history, bug bounty programs, and incident response',
    status: 'low',
    trend: 'stable',
  },
  {
    id: 'reliability',
    name: 'Network Reliability',
    value: 99.9,
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
    description:
      'Multiple audits by leading security firms including Trail of Bits, OpenZeppelin, and CertiK. No critical vulnerabilities found in recent audits.',
    details: [
      'Trail of Bits audit completed Q1 2024',
      'OpenZeppelin continuous monitoring active',
      'Bug bounty program with $500K+ rewards paid',
    ],
  },
  {
    category: 'Oracle Risk',
    level: 'low',
    description: 'Decentralized node network with reputation system and economic incentives.',
    details: [
      '1000+ node operators across 45+ countries',
      'Reputation-based node selection algorithm',
      'Staking mechanism with slashing conditions',
    ],
  },
  {
    category: 'Market Risk',
    level: 'medium',
    description:
      'LINK token price volatility affects staking economics and network security budget.',
    details: [
      'LINK price correlation with market sentiment',
      'Staking rewards denominated in LINK',
      'Treasury diversification in progress',
    ],
  },
  {
    category: 'Regulatory Risk',
    level: 'medium',
    description: 'Potential regulatory changes in DeFi sector and oracle services classification.',
    details: [
      'Ongoing regulatory clarity discussions',
      'Compliance framework development',
      'Geographic node distribution mitigates jurisdiction risk',
    ],
  },
];

export function ChainlinkRiskView() {
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
              {t('chainlink.risk.metrics') || 'Risk Metrics'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('chainlink.risk.metricsDesc') ||
                'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('chainlink.risk.overallScore') || 'Overall'}: {overallScore.toFixed(1)}/100
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
            {t('chainlink.risk.benchmark') || 'Industry Benchmark Comparison'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.risk.benchmarkDesc') ||
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
                    name="Chainlink"
                    dataKey="chainlink"
                    stroke={chartColors.oracle.chainlink}
                    fill={chartColors.oracle.chainlink}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Pyth"
                    dataKey="pyth"
                    stroke={chartColors.oracle.pyth}
                    fill={chartColors.oracle.pyth}
                    fillOpacity={0.1}
                    strokeWidth={1.5}
                  />
                  <Radar
                    name="Band"
                    dataKey="band"
                    stroke={chartColors.oracle['band-protocol']}
                    fill={chartColors.oracle['band-protocol']}
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
              {t('chainlink.risk.comparison') || 'Detailed Comparison'}
            </h3>
            <div className="space-y-3">
              {benchmarkData.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.metric}</span>
                    <span className="font-medium text-gray-900">{item.chainlink}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${item.chainlink}%`,
                        backgroundColor: chartColors.oracle.chainlink,
                      }}
                    />
                    <div
                      className="rounded-full opacity-40"
                      style={{
                        width: `${item.pyth}%`,
                        backgroundColor: chartColors.oracle.pyth,
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
            {t('chainlink.risk.timeline') || 'Historical Risk Events'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.risk.timelineDesc') ||
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
              {t('chainlink.risk.eventDetails') || 'Event Details'}
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
                  {t('chainlink.risk.clickEvent') || 'Click an event to view details'}
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
            {t('chainlink.risk.factors') || 'Risk Factor Analysis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.risk.factorsDesc') || 'Detailed breakdown of identified risk categories'}
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
          <h3 className="text-sm font-semibold text-gray-900">{t('chainlink.risk.disclaimer')}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('chainlink.risk.disclaimerText')}
          </p>
        </div>
      </section>
    </div>
  );
}
