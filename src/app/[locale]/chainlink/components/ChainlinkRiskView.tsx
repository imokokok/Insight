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
    title: 'securityAuditComplete',
    description: 'securityAuditCompleteDesc',
    type: 'success',
  },
  {
    date: '2023-11-08T14:20:00',
    title: 'nodeNetworkUpgrade',
    description: 'nodeNetworkUpgradeDesc',
    type: 'info',
  },
  {
    date: '2023-09-22T09:15:00',
    title: 'vulnerabilityDisclosure',
    description: 'vulnerabilityDisclosureDesc',
    type: 'warning',
  },
  {
    date: '2023-07-14T16:45:00',
    title: 'decentralizationMilestone',
    description: 'decentralizationMilestoneDesc',
    type: 'success',
  },
  {
    date: '2023-05-03T11:30:00',
    title: 'priceDelayEvent',
    description: 'priceDelayEventDesc',
    type: 'warning',
  },
  {
    date: '2023-02-28T08:00:00',
    title: 'stakingContractRelease',
    description: 'stakingContractReleaseDesc',
    type: 'success',
  },
];

// 行业基准对比数据
const benchmarkData = [
  { metric: 'decentralization', chainlink: 95, pyth: 78, band: 65, api3: 70 },
  { metric: 'security', chainlink: 98, pyth: 85, band: 72, api3: 80 },
  { metric: 'reliability', chainlink: 99.9, pyth: 97.5, band: 94.2, api3: 96.8 },
  { metric: 'transparency', chainlink: 92, pyth: 88, band: 70, api3: 85 },
  { metric: 'history', chainlink: 98, pyth: 75, band: 82, api3: 78 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    nameKey: 'riskMetrics.decentralization.name',
    descKey: 'riskMetrics.decentralization.description',
    value: 95,
    max: 100,
    status: 'low',
    trend: 'up',
  },
  {
    id: 'security',
    nameKey: 'riskMetrics.security.name',
    descKey: 'riskMetrics.security.description',
    value: 98,
    max: 100,
    status: 'low',
    trend: 'stable',
  },
  {
    id: 'reliability',
    nameKey: 'riskMetrics.reliability.name',
    descKey: 'riskMetrics.reliability.description',
    value: 99.9,
    max: 100,
    status: 'low',
    trend: 'up',
  },
  {
    id: 'transparency',
    nameKey: 'riskMetrics.transparency.name',
    descKey: 'riskMetrics.transparency.description',
    value: 92,
    max: 100,
    status: 'low',
    trend: 'stable',
  },
];

// 风险因素
const riskFactors = [
  {
    categoryKey: 'riskFactors.smartContract.title',
    level: 'low',
    descKey: 'riskFactors.smartContract.description',
    detailKeys: [
      'riskFactors.smartContract.detail1',
      'riskFactors.smartContract.detail2',
      'riskFactors.smartContract.detail3',
    ],
  },
  {
    categoryKey: 'riskFactors.oracle.title',
    level: 'low',
    descKey: 'riskFactors.oracle.description',
    detailKeys: [
      'riskFactors.oracle.detail1',
      'riskFactors.oracle.detail2',
      'riskFactors.oracle.detail3',
    ],
  },
  {
    categoryKey: 'riskFactors.market.title',
    level: 'medium',
    descKey: 'riskFactors.market.description',
    detailKeys: [
      'riskFactors.market.detail1',
      'riskFactors.market.detail2',
      'riskFactors.market.detail3',
    ],
  },
  {
    categoryKey: 'riskFactors.regulatory.title',
    level: 'medium',
    descKey: 'riskFactors.regulatory.description',
    detailKeys: [
      'riskFactors.regulatory.detail1',
      'riskFactors.regulatory.detail2',
      'riskFactors.regulatory.detail3',
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
              {t('chainlink.risk.metrics')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('chainlink.risk.metricsDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('chainlink.risk.overallScore')}: {overallScore.toFixed(1)}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {riskMetrics.map((metric) => (
            <div key={metric.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t(`chainlink.${metric.nameKey}`)}</span>
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
              <p className="text-xs text-gray-400 leading-relaxed">
                {t(`chainlink.${metric.descKey}`)}
              </p>
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
            {t('chainlink.risk.benchmark')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.risk.benchmarkDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 雷达图 */}
          <div className="lg:col-span-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={benchmarkData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => t(`chainlink.benchmark.${value}`)}
                  />
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
              {t('chainlink.risk.comparison')}
            </h3>
            <div className="space-y-3">
              {benchmarkData.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t(`chainlink.benchmark.${item.metric}`)}</span>
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
            {t('chainlink.risk.timeline')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.risk.timelineDesc')}
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
              {t('chainlink.risk.eventDetails')}
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
                    <h4 className="text-sm font-medium text-gray-900">
                      {t(`chainlink.riskEvents.${selectedEvent.title}`)}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(selectedEvent.date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t(`chainlink.riskEvents.${selectedEvent.description}`)}
                </p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {t('chainlink.risk.clickEvent')}
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
            {t('chainlink.risk.factors')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.risk.factorsDesc')}
          </p>
        </div>

        <div className="space-y-2">
          {riskFactors.map((factor, index) => {
            const isExpanded = expandedFactor === index;
            const contentId = `risk-factor-content-${index}`;

            return (
              <div key={index} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => setExpandedFactor(expandedFactor === index ? null : index)}
                  className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-md"
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedFactor(expandedFactor === index ? null : index);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getRiskBgColor(factor.level)} ${getRiskColor(factor.level)}`}
                    >
                      {factor.level.charAt(0).toUpperCase() + factor.level.slice(1)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {t(`chainlink.${factor.categoryKey}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:block max-w-xs truncate">
                      {t(`chainlink.${factor.descKey}`)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div id={contentId} className="pb-4 px-2">
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {t(`chainlink.${factor.descKey}`)}
                    </p>
                    <ul className="space-y-2">
                      {factor.detailKeys.map((detailKey, detailIndex) => (
                        <li
                          key={detailIndex}
                          className="flex items-start gap-2 text-sm text-gray-500"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                          <span>{t(`chainlink.${detailKey}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
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
