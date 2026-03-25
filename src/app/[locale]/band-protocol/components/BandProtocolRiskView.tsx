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
  Info,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// 历史风险事件
const historicalRiskEvents: TimelineEvent[] = [
  {
    date: '2024-02-20T10:30:00',
    title: '安全审计完成',
    description: 'Band Protocol 核心合约通过 CertiK 和 PeckShield 的联合安全审计，未发现重大漏洞。',
    type: 'success',
  },
  {
    date: '2023-12-15T14:20:00',
    title: '主网升级 v2.5',
    description: '完成 BandChain 主网升级，引入新的预言机脚本执行环境和优化的 Gas 费用模型。',
    type: 'info',
  },
  {
    date: '2023-10-08T09:15:00',
    title: '验证者节点扩展',
    description: '验证者节点数量增加至 72 个，分布在 25 个国家和地区，提升网络去中心化程度。',
    type: 'success',
  },
  {
    date: '2023-08-22T16:45:00',
    title: '价格延迟事件',
    description: '由于网络拥堵，部分价格喂送出现 3-5 分钟延迟。团队优化了数据聚合算法以提升响应速度。',
    type: 'warning',
  },
  {
    date: '2023-06-10T11:30:00',
    title: '新数据源集成',
    description: '成功集成 15 个新的机构级数据源，提升价格数据的准确性和抗操纵能力。',
    type: 'success',
  },
  {
    date: '2023-04-05T08:00:00',
    title: '质押机制优化',
    description: '更新验证者质押要求，引入动态惩罚机制以增强网络安全性。',
    type: 'info',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: '去中心化', chainlink: 95, pyth: 78, band: 72, api3: 70 },
  { metric: '安全性', chainlink: 98, pyth: 85, band: 78, api3: 80 },
  { metric: '可靠性', chainlink: 99.9, pyth: 97.5, band: 94.2, api3: 96.8 },
  { metric: '透明度', chainlink: 92, pyth: 88, band: 75, api3: 85 },
  { metric: '历史记录', chainlink: 98, pyth: 75, band: 80, api3: 78 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 72,
    max: 100,
    description: 'Based on validator diversity and geographic distribution across 25+ countries',
    status: 'medium',
    trend: 'up',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 78,
    max: 100,
    description: 'Based on audit history, bug bounty programs, and incident response',
    status: 'medium',
    trend: 'stable',
  },
  {
    id: 'reliability',
    name: 'Network Reliability',
    value: 94.2,
    max: 100,
    description: 'Uptime and successful response rate over the last 30 days',
    status: 'low',
    trend: 'up',
  },
  {
    id: 'transparency',
    name: 'Transparency Score',
    value: 75,
    max: 100,
    description: 'Based on documentation quality and open-source availability',
    status: 'medium',
    trend: 'stable',
  },
];

// 风险因素
const riskFactors = [
  {
    category: 'Smart Contract Risk',
    level: 'medium',
    description: 'Audited by CertiK and PeckShield with no critical vulnerabilities found. Continuous monitoring active.',
    details: [
      'CertiK audit completed Q1 2024',
      'PeckShield security review passed',
      'Bug bounty program with $200K+ rewards',
      'Multi-sig governance for contract upgrades',
    ],
  },
  {
    category: 'Oracle Risk',
    level: 'medium',
    description: 'Decentralized validator network with economic incentives and slashing mechanisms.',
    details: [
      '72 validators across 25+ countries',
      'BFT consensus with 2/3+ threshold',
      'Token staking with slashing conditions',
      'Data source diversity from 15+ providers',
    ],
  },
  {
    category: 'Market Risk',
    level: 'medium',
    description: 'BAND token price volatility affects staking economics and network security budget.',
    details: [
      'BAND price correlation with market sentiment',
      'Staking rewards denominated in BAND',
      'Validator rewards tied to token value',
      'Treasury management in progress',
    ],
  },
  {
    category: 'Centralization Risk',
    level: 'medium',
    description: 'Validator set is permissioned, with top validators holding significant stake concentration.',
    details: [
      'Permissioned validator set (72 active)',
      'Top 10 validators control ~45% stake',
      'Geographic concentration in Asia (~40%)',
      'Ongoing efforts to diversify validator base',
    ],
  },
  {
    category: 'Regulatory Risk',
    level: 'low',
    description: 'Potential regulatory changes in DeFi sector and oracle services classification.',
    details: [
      'Ongoing regulatory clarity discussions',
      'Compliance framework development',
      'Geographic node distribution mitigates risk',
      'Legal team monitoring global regulations',
    ],
  },
];

export function BandProtocolRiskView() {
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
              {t('bandProtocol.risk.metrics') || 'Risk Metrics'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('bandProtocol.risk.metricsDesc') || 'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('bandProtocol.risk.overallScore') || 'Overall'}: {overallScore.toFixed(1)}/100
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
            {t('bandProtocol.risk.benchmark') || 'Industry Benchmark Comparison'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('bandProtocol.risk.benchmarkDesc') || 'Performance comparison against other leading oracle providers'}
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
                    name="Band Protocol"
                    dataKey="band"
                    stroke={chartColors.oracle['band-protocol']}
                    fill={chartColors.oracle['band-protocol']}
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
            <h3 className="text-sm font-medium text-gray-700">{t('bandProtocol.risk.comparison') || 'Detailed Comparison'}</h3>
            <div className="space-y-3">
              {benchmarkData.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.metric}</span>
                    <span className="font-medium text-gray-900">{item.band}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${item.band}%`,
                        backgroundColor: chartColors.oracle['band-protocol'],
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
            {t('bandProtocol.risk.timeline') || 'Historical Risk Events'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('bandProtocol.risk.timelineDesc') || 'Security audits, incidents and upgrades over the past 24 months'}
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
              {t('bandProtocol.risk.eventDetails') || 'Event Details'}
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
                <p className="text-sm text-gray-500">{t('bandProtocol.risk.clickEvent') || 'Click an event to view details'}</p>
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
            {t('bandProtocol.risk.factors') || 'Risk Factor Analysis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('bandProtocol.risk.factorsDesc') || 'Detailed breakdown of identified risk categories'}
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
          <h3 className="text-sm font-semibold text-gray-900">{t('bandProtocol.risk.disclaimer') || 'Risk Disclaimer'}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('bandProtocol.risk.disclaimerText') || 'The risk assessments provided are for informational purposes only and should not be considered as financial advice. Cryptocurrency investments carry significant risks including potential loss of capital. Past performance does not guarantee future results. Please conduct your own research and consult with qualified financial advisors before making investment decisions.'}
          </p>
        </div>
      </section>
    </div>
  );
}
