'use client';

import { useState } from 'react';

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
import { CoveragePoolDashboard } from '@/components/oracle/panels/CoveragePoolDashboard';
import {
  useAPI3CoveragePoolDetails,
  useAPI3CoveragePoolClaims,
  useAPI3StakerRewards,
} from '@/hooks/oracles/api3';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import { type API3RiskViewProps } from '../types';

// 历史风险事件翻译键
const historicalRiskEventKeys = [
  {
    date: '2024-02-20T10:30:00',
    titleKey: 'api3.riskView.events.governance.title',
    descriptionKey: 'api3.riskView.events.governance.description',
    type: 'success' as const,
  },
  {
    date: '2023-12-15T14:20:00',
    titleKey: 'api3.riskView.events.oevMainnet.title',
    descriptionKey: 'api3.riskView.events.oevMainnet.description',
    type: 'success' as const,
  },
  {
    date: '2023-10-08T09:15:00',
    titleKey: 'api3.riskView.events.audit.title',
    descriptionKey: 'api3.riskView.events.audit.description',
    type: 'info' as const,
  },
  {
    date: '2023-08-22T16:45:00',
    titleKey: 'api3.riskView.events.airnodeMilestone.title',
    descriptionKey: 'api3.riskView.events.airnodeMilestone.description',
    type: 'success' as const,
  },
  {
    date: '2023-06-12T11:30:00',
    titleKey: 'api3.riskView.events.priceDelay.title',
    descriptionKey: 'api3.riskView.events.priceDelay.description',
    type: 'warning' as const,
  },
  {
    date: '2023-03-28T08:00:00',
    titleKey: 'api3.riskView.events.stakingV2.title',
    descriptionKey: 'api3.riskView.events.stakingV2.description',
    type: 'success' as const,
  },
];

// 行业基准对比数据
const getBenchmarkData = (t: (key: string) => string) => [
  {
    metric: t('api3.riskView.benchmark.decentralization'),
    api3: 85,
    pyth: 78,
    band: 65,
    chainlink: 95,
  },
  { metric: t('api3.riskView.benchmark.security'), api3: 88, pyth: 85, band: 72, chainlink: 98 },
  {
    metric: t('api3.riskView.benchmark.reliability'),
    api3: 97.5,
    pyth: 97.5,
    band: 94.2,
    chainlink: 99.9,
  },
  {
    metric: t('api3.riskView.benchmark.transparency'),
    api3: 92,
    pyth: 88,
    band: 70,
    chainlink: 92,
  },
  { metric: t('api3.riskView.benchmark.trackRecord'), api3: 75, pyth: 75, band: 82, chainlink: 98 },
];

// 风险指标
const riskMetrics = [
  {
    id: 'decentralization',
    nameKey: 'api3.riskView.metrics.decentralization.name',
    descKey: 'api3.riskView.metrics.decentralization.description',
    value: 85,
    max: 100,
    status: 'low',
    trend: 'up',
  },
  {
    id: 'security',
    nameKey: 'api3.riskView.metrics.security.name',
    descKey: 'api3.riskView.metrics.security.description',
    value: 88,
    max: 100,
    status: 'low',
    trend: 'stable',
  },
  {
    id: 'reliability',
    nameKey: 'api3.riskView.metrics.reliability.name',
    descKey: 'api3.riskView.metrics.reliability.description',
    value: 97.5,
    max: 100,
    status: 'low',
    trend: 'up',
  },
  {
    id: 'transparency',
    nameKey: 'api3.riskView.metrics.transparency.name',
    descKey: 'api3.riskView.metrics.transparency.description',
    value: 92,
    max: 100,
    status: 'low',
    trend: 'stable',
  },
];

// 风险因素
const riskFactors = [
  {
    id: 'smartContract',
    categoryKey: 'api3.riskView.factors.smartContract.category',
    level: 'low',
    descriptionKey: 'api3.riskView.factors.smartContract.description',
    detailKeys: [
      'api3.riskView.factors.smartContract.detail1',
      'api3.riskView.factors.smartContract.detail2',
      'api3.riskView.factors.smartContract.detail3',
      'api3.riskView.factors.smartContract.detail4',
    ],
  },
  {
    id: 'oracle',
    categoryKey: 'api3.riskView.factors.oracle.category',
    level: 'low',
    descriptionKey: 'api3.riskView.factors.oracle.description',
    detailKeys: [
      'api3.riskView.factors.oracle.detail1',
      'api3.riskView.factors.oracle.detail2',
      'api3.riskView.factors.oracle.detail3',
      'api3.riskView.factors.oracle.detail4',
    ],
  },
  {
    id: 'market',
    categoryKey: 'api3.riskView.factors.market.category',
    level: 'medium',
    descriptionKey: 'api3.riskView.factors.market.description',
    detailKeys: [
      'api3.riskView.factors.market.detail1',
      'api3.riskView.factors.market.detail2',
      'api3.riskView.factors.market.detail3',
      'api3.riskView.factors.market.detail4',
    ],
  },
  {
    id: 'regulatory',
    categoryKey: 'api3.riskView.factors.regulatory.category',
    level: 'medium',
    descriptionKey: 'api3.riskView.factors.regulatory.description',
    detailKeys: [
      'api3.riskView.factors.regulatory.detail1',
      'api3.riskView.factors.regulatory.detail2',
      'api3.riskView.factors.regulatory.detail3',
      'api3.riskView.factors.regulatory.detail4',
    ],
  },
  {
    id: 'adoption',
    categoryKey: 'api3.riskView.factors.adoption.category',
    level: 'medium',
    descriptionKey: 'api3.riskView.factors.adoption.description',
    detailKeys: [
      'api3.riskView.factors.adoption.detail1',
      'api3.riskView.factors.adoption.detail2',
      'api3.riskView.factors.adoption.detail3',
      'api3.riskView.factors.adoption.detail4',
    ],
  },
];

export function API3RiskView({ isLoading }: API3RiskViewProps) {
  const t = useTranslations();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);

  const benchmarkData = getBenchmarkData(t);

  const translatedRiskEvents: TimelineEvent[] = historicalRiskEventKeys.map((event) => ({
    date: event.date,
    type: event.type,
    title: t(event.titleKey),
    description: t(event.descriptionKey),
  }));

  const { coveragePoolDetails } = useAPI3CoveragePoolDetails(!isLoading);
  const { claims } = useAPI3CoveragePoolClaims(undefined, !isLoading);
  const { stakerRewards } = useAPI3StakerRewards(undefined, !isLoading);

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
      <CoveragePoolDashboard
        coveragePoolDetails={coveragePoolDetails}
        claims={claims}
        stakerRewards={stakerRewards}
        isLoading={isLoading}
      />

      <div className="border-t border-gray-200" />

      {/* 风险指标统计 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('api3.risk.metrics')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('api3.risk.metricsDesc')}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('api3.risk.overallScore')}: {overallScore.toFixed(1)}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {riskMetrics.map((metric) => (
            <div key={metric.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t(metric.nameKey)}</span>
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
              <p className="text-xs text-gray-400 leading-relaxed">{t(metric.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 行业基准对比 */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('api3.risk.benchmark')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('api3.risk.benchmarkDesc')}</p>
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
            <h3 className="text-sm font-medium text-gray-700">{t('api3.risk.comparison')}</h3>
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
          <h2 className="text-lg font-semibold text-gray-900">{t('api3.risk.timeline')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('api3.risk.timelineDesc')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 时间线 */}
          <div className="lg:col-span-2">
            <TimelineChart
              events={translatedRiskEvents}
              onEventClick={(event) => setSelectedEvent(event)}
              showDateLabels={true}
              compact={false}
            />
          </div>

          {/* 事件详情 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('api3.risk.eventDetails')}
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
                <p className="text-sm text-gray-500">{t('api3.risk.clickEvent')}</p>
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
          <h2 className="text-lg font-semibold text-gray-900">{t('api3.risk.factors')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('api3.risk.factorsDesc')}</p>
        </div>

        <div className="space-y-2">
          {riskFactors.map((factor, index) => (
            <div key={factor.id} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedFactor(expandedFactor === index ? null : index)}
                className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-md"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getRiskBgColor(factor.level)} ${getRiskColor(factor.level)}`}
                  >
                    {t(`api3.riskView.level.${factor.level}`)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{t(factor.categoryKey)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 hidden sm:block max-w-xs truncate">
                    {t(factor.descriptionKey)}
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
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    {t(factor.descriptionKey)}
                  </p>
                  <ul className="space-y-2">
                    {factor.detailKeys.map((detailKey, detailIndex) => (
                      <li
                        key={detailIndex}
                        className="flex items-start gap-2 text-sm text-gray-500"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                        <span>{t(detailKey)}</span>
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
          <h3 className="text-sm font-semibold text-gray-900">{t('api3.risk.disclaimer')}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('api3.risk.disclaimerText')}
          </p>
        </div>
      </section>
    </div>
  );
}
