'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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
import { TimelineEvent, RiskMetric, RiskFactor } from '../types';

// 历史风险事件
const historicalRiskEvents: TimelineEvent[] = [
  {
    date: '2024-02-15T10:30:00',
    title: '安全审计完成',
    description: 'Pyth Network 核心合约通过 OtterSec 和 Neodyme 的联合安全审计，未发现重大漏洞。',
    type: 'success',
  },
  {
    date: '2023-12-08T14:20:00',
    title: '主网升级完成',
    description: '完成 Pythnet 升级，引入新的共识机制和增强的数据验证能力。',
    type: 'info',
  },
  {
    date: '2023-10-22T09:15:00',
    title: '价格延迟事件',
    description: '由于 Solana 网络拥堵，部分价格喂送出现 5-10 秒延迟。团队已优化数据分发路径。',
    type: 'warning',
  },
  {
    date: '2023-08-14T16:45:00',
    title: '发布者里程碑',
    description: '第一方数据发布者数量突破 80 家，包括顶级交易所和做市商。',
    type: 'success',
  },
  {
    date: '2023-05-03T11:30:00',
    title: '跨链扩展',
    description: '通过 Wormhole 支持扩展到 20+ 条区块链网络。',
    type: 'success',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: '去中心化', pyth: 85, chainlink: 95, band: 65, api3: 70 },
  { metric: '安全性', pyth: 92, chainlink: 98, band: 72, api3: 80 },
  { metric: '可靠性', pyth: 97.5, chainlink: 99.9, band: 94.2, api3: 96.8 },
  { metric: '透明度', pyth: 88, chainlink: 92, band: 70, api3: 85 },
  { metric: '历史记录', pyth: 75, chainlink: 98, band: 82, api3: 78 },
];

// 风险指标
const riskMetrics: RiskMetric[] = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 85,
    max: 100,
    description: 'Based on publisher diversity and geographic distribution',
    status: 'medium',
    trend: 'up',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 92,
    max: 100,
    description: 'Based on audit history and incident response',
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
    value: 88,
    max: 100,
    description: 'Based on documentation quality and data availability',
    status: 'low',
    trend: 'stable',
  },
];

// 风险因素
const riskFactors: RiskFactor[] = [
  {
    category: 'Smart Contract Risk',
    level: 'low',
    description: 'Multiple audits by leading security firms including OtterSec and Neodyme. No critical vulnerabilities found.',
    details: [
      'OtterSec audit completed Q1 2024',
      'Neodyme continuous monitoring active',
      'Open source contracts for community review',
    ],
  },
  {
    category: 'Oracle Risk',
    level: 'medium',
    description: 'First-party data model with 80+ publishers. Relies on publisher reputation and staking.',
    details: [
      '80+ first-party data publishers',
      'Publisher staking mechanism',
      'Consensus-based price aggregation',
    ],
  },
  {
    category: 'Network Risk',
    level: 'medium',
    description: 'Built on Solana, subject to network congestion and downtime risks.',
    details: [
      'Solana network dependency',
      'Wormhole bridge for cross-chain',
      'Backup data paths in development',
    ],
  },
  {
    category: 'Market Risk',
    level: 'low',
    description: 'PYTH token used for governance and staking. Price volatility affects staking economics.',
    details: [
      'PYTH token governance rights',
      'Staking rewards in PYTH',
      'Treasury diversification planned',
    ],
  },
];

export function PythRiskView({ isLoading }: { isLoading?: boolean }) {
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
              {t('pyth.risk.metrics') || 'Risk Metrics'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('pyth.risk.metricsDesc') || 'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('pyth.risk.overallScore') || 'Overall'}: {overallScore.toFixed(1)}/100
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
                    backgroundColor: metric.value >= 95 ? '#10b981' : metric.value >= 80 ? '#8b5cf6' : '#f59e0b',
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
            {t('pyth.risk.benchmark') || 'Industry Benchmark Comparison'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('pyth.risk.benchmarkDesc') || 'Performance comparison against other leading oracle providers'}
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
                    name="Pyth"
                    dataKey="pyth"
                    stroke={chartColors.oracle.pyth}
                    fill={chartColors.oracle.pyth}
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
            <h3 className="text-sm font-medium text-gray-700">{t('pyth.risk.comparison') || 'Detailed Comparison'}</h3>
            <div className="space-y-3">
              {benchmarkData.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.metric}</span>
                    <span className="font-medium text-gray-900">{item.pyth}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div
                      className="rounded-full"
                      style={{
                        width: `${item.pyth}%`,
                        backgroundColor: chartColors.oracle.pyth,
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
            {t('pyth.risk.timeline') || 'Historical Risk Events'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('pyth.risk.timelineDesc') || 'Security audits, incidents and upgrades over the past 24 months'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 时间线 */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-6">
                {historicalRiskEvents.map((event, index) => (
                  <div
                    key={index}
                    className="relative flex items-start gap-4 cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="relative z-10">
                      {event.type === 'success' && (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                      {event.type === 'warning' && (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                      {event.type === 'info' && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Info className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{event.title}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 事件详情 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('pyth.risk.eventDetails') || 'Event Details'}
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
                <p className="text-sm text-gray-500">{t('pyth.risk.clickEvent') || 'Click an event to view details'}</p>
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
            {t('pyth.risk.factors') || 'Risk Factor Analysis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('pyth.risk.factorsDesc') || 'Detailed breakdown of identified risk categories'}
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
        <Info className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('pyth.risk.disclaimer') || 'Disclaimer'}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('pyth.risk.disclaimerText') || 'Risk assessments are based on publicly available information and historical data. They do not constitute financial advice. Always conduct your own research before making investment decisions.'}
          </p>
        </div>
      </section>
    </div>
  );
}
