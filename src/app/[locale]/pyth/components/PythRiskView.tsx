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

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import { type TimelineEvent, type RiskMetric, type RiskFactor } from '../types';

export function PythRiskView({ isLoading }: { isLoading?: boolean }) {
  const t = useTranslations();
  const tPyth = useTranslations('pyth');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);

  const historicalRiskEvents: TimelineEvent[] = [
    {
      date: '2024-02-15T10:30:00',
      title: tPyth('riskEvents.securityAuditComplete.title'),
      description: tPyth('riskEvents.securityAuditComplete.description'),
      type: 'success',
    },
    {
      date: '2023-12-08T14:20:00',
      title: tPyth('riskEvents.mainnetUpgrade.title'),
      description: tPyth('riskEvents.mainnetUpgrade.description'),
      type: 'info',
    },
    {
      date: '2023-10-22T09:15:00',
      title: tPyth('riskEvents.priceDelay.title'),
      description: tPyth('riskEvents.priceDelay.description'),
      type: 'warning',
    },
    {
      date: '2023-08-14T16:45:00',
      title: tPyth('riskEvents.publisherMilestone.title'),
      description: tPyth('riskEvents.publisherMilestone.description'),
      type: 'success',
    },
    {
      date: '2023-05-03T11:30:00',
      title: tPyth('riskEvents.crossChainExpansion.title'),
      description: tPyth('riskEvents.crossChainExpansion.description'),
      type: 'success',
    },
  ];

  const benchmarkData = [
    {
      metric: tPyth('benchmarkMetrics.decentralization'),
      pyth: 85,
      chainlink: 95,
      band: 65,
      api3: 70,
    },
    { metric: tPyth('benchmarkMetrics.security'), pyth: 92, chainlink: 98, band: 72, api3: 80 },
    {
      metric: tPyth('benchmarkMetrics.reliability'),
      pyth: 97.5,
      chainlink: 99.9,
      band: 94.2,
      api3: 96.8,
    },
    { metric: tPyth('benchmarkMetrics.transparency'), pyth: 88, chainlink: 92, band: 70, api3: 85 },
    { metric: tPyth('benchmarkMetrics.trackRecord'), pyth: 75, chainlink: 98, band: 82, api3: 78 },
  ];

  const riskMetrics: RiskMetric[] = [
    {
      id: 'decentralization',
      name: tPyth('riskMetricNames.decentralization'),
      value: 85,
      max: 100,
      description: tPyth('riskMetricDescriptions.decentralization'),
      status: 'medium',
      trend: 'up',
    },
    {
      id: 'security',
      name: tPyth('riskMetricNames.security'),
      value: 92,
      max: 100,
      description: tPyth('riskMetricDescriptions.security'),
      status: 'low',
      trend: 'stable',
    },
    {
      id: 'reliability',
      name: tPyth('riskMetricNames.reliability'),
      value: 97.5,
      max: 100,
      description: tPyth('riskMetricDescriptions.reliability'),
      status: 'low',
      trend: 'up',
    },
    {
      id: 'transparency',
      name: tPyth('riskMetricNames.transparency'),
      value: 88,
      max: 100,
      description: tPyth('riskMetricDescriptions.transparency'),
      status: 'low',
      trend: 'stable',
    },
  ];

  const riskFactors: RiskFactor[] = [
    {
      category: tPyth('riskFactorCategories.smartContract'),
      level: 'low',
      description: tPyth('riskFactorDescriptions.smartContract'),
      details: [
        tPyth('riskFactorDetails.otterSecAudit'),
        tPyth('riskFactorDetails.neodymeMonitoring'),
        tPyth('riskFactorDetails.openSourceContracts'),
      ],
    },
    {
      category: tPyth('riskFactorCategories.oracle'),
      level: 'medium',
      description: tPyth('riskFactorDescriptions.oracle'),
      details: [
        tPyth('riskFactorDetails.firstPartyPublishers'),
        tPyth('riskFactorDetails.publisherStaking'),
        tPyth('riskFactorDetails.consensusAggregation'),
      ],
    },
    {
      category: tPyth('riskFactorCategories.network'),
      level: 'medium',
      description: tPyth('riskFactorDescriptions.network'),
      details: [
        tPyth('riskFactorDetails.solanaDependency'),
        tPyth('riskFactorDetails.wormholeBridge'),
        tPyth('riskFactorDetails.backupPaths'),
      ],
    },
    {
      category: tPyth('riskFactorCategories.market'),
      level: 'low',
      description: tPyth('riskFactorDescriptions.market'),
      details: [
        tPyth('riskFactorDetails.pythGovernance'),
        tPyth('riskFactorDetails.stakingRewards'),
        tPyth('riskFactorDetails.treasuryDiversification'),
      ],
    },
  ];

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
            <h2 className="text-lg font-semibold text-gray-900">{tPyth('risk.metrics')}</h2>
            <p className="text-sm text-gray-500 mt-1">{tPyth('risk.metricsDesc')}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {tPyth('risk.overallScore')}: {overallScore.toFixed(1)}/100
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
                      metric.value >= 95 ? '#10b981' : metric.value >= 80 ? '#8b5cf6' : '#f59e0b',
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
          <h2 className="text-lg font-semibold text-gray-900">{tPyth('risk.benchmark')}</h2>
          <p className="text-sm text-gray-500 mt-1">{tPyth('risk.benchmarkDesc')}</p>
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
            <h3 className="text-sm font-medium text-gray-700">{tPyth('risk.comparison')}</h3>
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
          <h2 className="text-lg font-semibold text-gray-900">{tPyth('risk.timeline')}</h2>
          <p className="text-sm text-gray-500 mt-1">{tPyth('risk.timelineDesc')}</p>
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
            <h3 className="text-sm font-medium text-gray-700 mb-4">{tPyth('risk.eventDetails')}</h3>
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
                <p className="text-sm text-gray-500">{tPyth('risk.clickEvent')}</p>
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
          <h2 className="text-lg font-semibold text-gray-900">{tPyth('risk.factors')}</h2>
          <p className="text-sm text-gray-500 mt-1">{tPyth('risk.factorsDesc')}</p>
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
                    {tPyth(`riskLevelLabels.${factor.level}`)}
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
        <Info className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{tPyth('risk.disclaimer')}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {tPyth('risk.disclaimerText')}
          </p>
        </div>
      </section>
    </div>
  );
}
