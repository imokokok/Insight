'use client';

import { useState, useMemo } from 'react';

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
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { TimelineChart, type TimelineEvent } from '@/components/oracle/charts/TimelineChart';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import {
  useBandRiskMetrics,
  useBandRiskTrend,
  useBandSecurityAuditEvents,
} from '@/hooks/oracles/band';
import type { RiskEvent } from '@/lib/oracles/bandProtocol';

const benchmarkData = [
  { metric: 'Decentralization', chainlink: 85, pyth: 68, band: 72, api3: 65 },
  { metric: 'Security', chainlink: 92, pyth: 82, band: 78, api3: 78 },
  { metric: 'Reliability', chainlink: 99.5, pyth: 97.0, band: 94.2, api3: 96.5 },
  { metric: 'Transparency', chainlink: 88, pyth: 85, band: 75, api3: 82 },
  { metric: 'Track Record', chainlink: 95, pyth: 72, band: 80, api3: 75 },
];

function getRiskFactors(t: (key: string, params?: Record<string, string | number | Date>) => string) {
  return [
    {
      category: t('band.bandProtocol.risk.riskFactors.smartContract.category'),
      level: 'medium',
      description: t('band.bandProtocol.risk.riskFactors.smartContract.description'),
      details: [
        t('band.bandProtocol.risk.riskFactors.smartContract.detail1'),
        t('band.bandProtocol.risk.riskFactors.smartContract.detail2'),
        t('band.bandProtocol.risk.riskFactors.smartContract.detail3'),
        t('band.bandProtocol.risk.riskFactors.smartContract.detail4'),
      ],
    },
    {
      category: t('band.bandProtocol.risk.riskFactors.oracle.category'),
      level: 'medium',
      description: t('band.bandProtocol.risk.riskFactors.oracle.description'),
      details: [
        t('band.bandProtocol.risk.riskFactors.oracle.detail1', { count: 72 }),
        t('band.bandProtocol.risk.riskFactors.oracle.detail2'),
        t('band.bandProtocol.risk.riskFactors.oracle.detail3'),
        t('band.bandProtocol.risk.riskFactors.oracle.detail4'),
      ],
    },
    {
      category: t('band.bandProtocol.risk.riskFactors.market.category'),
      level: 'medium',
      description: t('band.bandProtocol.risk.riskFactors.market.description'),
      details: [
        t('band.bandProtocol.risk.riskFactors.market.detail1'),
        t('band.bandProtocol.risk.riskFactors.market.detail2'),
        t('band.bandProtocol.risk.riskFactors.market.detail3'),
        t('band.bandProtocol.risk.riskFactors.market.detail4'),
      ],
    },
    {
      category: t('band.bandProtocol.risk.riskFactors.centralization.category'),
      level: 'medium',
      description: t('band.bandProtocol.risk.riskFactors.centralization.description'),
      details: [
        t('band.bandProtocol.risk.riskFactors.centralization.detail1', { count: 72 }),
        t('band.bandProtocol.risk.riskFactors.centralization.detail2'),
        t('band.bandProtocol.risk.riskFactors.centralization.detail3'),
        t('band.bandProtocol.risk.riskFactors.centralization.detail4'),
      ],
    },
    {
      category: t('band.bandProtocol.risk.riskFactors.regulatory.category'),
      level: 'low',
      description: t('band.bandProtocol.risk.riskFactors.regulatory.description'),
      details: [
        t('band.bandProtocol.risk.riskFactors.regulatory.detail1'),
        t('band.bandProtocol.risk.riskFactors.regulatory.detail2'),
        t('band.bandProtocol.risk.riskFactors.regulatory.detail3'),
        t('band.bandProtocol.risk.riskFactors.regulatory.detail4'),
      ],
    },
  ];
}

function convertRiskEventToTimelineEvent(event: RiskEvent): TimelineEvent {
  return {
    date: event.date,
    title: event.title,
    description: event.description,
    type: event.type,
  };
}

export function BandProtocolRiskView() {
  const t = useTranslations();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);

  const {
    riskMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = useBandRiskMetrics();

  const { riskTrend, isLoading: isLoadingTrend } = useBandRiskTrend({ days: 30 });

  const { events: securityEvents, isLoading: isLoadingEvents } = useBandSecurityAuditEvents();

  const isLoading = isLoadingMetrics || isLoadingTrend || isLoadingEvents;

  const historicalRiskEvents = useMemo(() => {
    return securityEvents.map(convertRiskEventToTimelineEvent);
  }, [securityEvents]);

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

  const metricsDisplay = useMemo(() => {
    if (!riskMetrics) {
      return [
        {
          id: 'decentralization',
          name: t('band.bandProtocol.risk.metricsDisplay.decentralization.name'),
          value: 72,
          max: 100,
          description: t('band.bandProtocol.risk.metricsDisplay.decentralization.description'),
          status: 'medium',
          trend: 'up',
        },
        {
          id: 'security',
          name: t('band.bandProtocol.risk.metricsDisplay.security.name'),
          value: 78,
          max: 100,
          description: t('band.bandProtocol.risk.metricsDisplay.security.description'),
          status: 'medium',
          trend: 'stable',
        },
        {
          id: 'reliability',
          name: t('band.bandProtocol.risk.metricsDisplay.reliability.name'),
          value: 94.2,
          max: 100,
          description: t('band.bandProtocol.risk.metricsDisplay.reliability.description'),
          status: 'low',
          trend: 'up',
        },
        {
          id: 'transparency',
          name: t('band.bandProtocol.risk.metricsDisplay.transparency.name'),
          value: 75,
          max: 100,
          description: t('band.bandProtocol.risk.metricsDisplay.transparency.description'),
          status: 'medium',
          trend: 'stable',
        },
      ];
    }

    return [
      {
        id: 'decentralization',
        name: t('band.bandProtocol.risk.metricsDisplay.decentralization.name'),
        value: riskMetrics.decentralizationScore,
        max: 100,
        description: `Gini: ${riskMetrics.giniCoefficient.toFixed(3)} | Nakamoto: ${riskMetrics.nakamotoCoefficient} | Top 10: ${riskMetrics.top10ValidatorsShare.toFixed(1)}%`,
        status: riskMetrics.decentralizationScore >= 80 ? 'low' : riskMetrics.decentralizationScore >= 60 ? 'medium' : 'high',
        trend: 'up',
      },
      {
        id: 'security',
        name: t('band.bandProtocol.risk.metricsDisplay.security.name'),
        value: riskMetrics.securityScore,
        max: 100,
        description: t('band.bandProtocol.risk.metricsDisplay.security.description'),
        status: riskMetrics.securityScore >= 80 ? 'low' : riskMetrics.securityScore >= 60 ? 'medium' : 'high',
        trend: 'stable',
      },
      {
        id: 'reliability',
        name: t('band.bandProtocol.risk.metricsDisplay.reliability.name'),
        value: riskMetrics.reliabilityScore,
        max: 100,
        description: t('band.bandProtocol.risk.metricsDisplay.reliability.description'),
        status: riskMetrics.reliabilityScore >= 95 ? 'low' : riskMetrics.reliabilityScore >= 85 ? 'medium' : 'high',
        trend: 'up',
      },
      {
        id: 'transparency',
        name: t('band.bandProtocol.risk.metricsDisplay.transparency.name'),
        value: riskMetrics.transparencyScore,
        max: 100,
        description: t('band.bandProtocol.risk.metricsDisplay.transparency.description'),
        status: riskMetrics.transparencyScore >= 80 ? 'low' : riskMetrics.transparencyScore >= 60 ? 'medium' : 'high',
        trend: 'stable',
      },
    ];
  }, [riskMetrics, t]);

  const overallScore = riskMetrics?.overallScore ?? 
    metricsDisplay.reduce((sum, m) => sum + m.value, 0) / metricsDisplay.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">
          {t('band.bandProtocol.risk.loading') || 'Loading risk metrics...'}
        </span>
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="flex items-center justify-center py-16">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <span className="ml-3 text-gray-600">
          {t('band.bandProtocol.risk.loadError') || 'Failed to load risk metrics'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('band.bandProtocol.risk.metrics') || 'Risk Metrics'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('band.bandProtocol.risk.metricsDesc') ||
                'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('band.bandProtocol.risk.overallScore') || 'Overall'}: {overallScore.toFixed(1)}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsDisplay.map((metric) => (
            <div key={metric.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{metric.name}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{metric.value.toFixed(1)}</span>
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

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('band.bandProtocol.risk.trendTitle') || 'Risk Score Trend (30 Days)'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('band.bandProtocol.risk.trendDesc') || 'Historical risk score changes over the past 30 days'}
          </p>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={riskTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name={t('band.bandProtocol.risk.overall') || 'Overall'}
                stroke={chartColors.oracle['band-protocol']}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="decentralization"
                name={t('band.bandProtocol.riskAssessment.decentralization') || 'Decentralization'}
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="security"
                name={t('band.bandProtocol.riskAssessment.security') || 'Security'}
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="reliability"
                name={t('band.bandProtocol.riskAssessment.stability') || 'Reliability'}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('band.bandProtocol.risk.benchmark') || 'Industry Benchmark Comparison'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('band.bandProtocol.risk.benchmarkDesc') ||
              'Performance comparison against other leading oracle providers'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">
              {t('band.bandProtocol.risk.comparison') || 'Detailed Comparison'}
            </h3>
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

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('band.bandProtocol.risk.timeline') || 'Historical Risk Events'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('band.bandProtocol.risk.timelineDesc') ||
              'Security audits, incidents and upgrades over the past 24 months'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TimelineChart
              events={historicalRiskEvents}
              onEventClick={(event) => setSelectedEvent(event)}
              showDateLabels={true}
              compact={false}
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('band.bandProtocol.risk.eventDetails') || 'Event Details'}
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
                {securityEvents.find((e) => e.title === selectedEvent.title)?.source && (
                  <a
                    href={securityEvents.find((e) => e.title === selectedEvent.title)?.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('band.bandProtocol.risk.viewSource') || 'View Source'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {t('band.bandProtocol.risk.clickEvent') || 'Click an event to view details'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('band.bandProtocol.risk.factors') || 'Risk Factor Analysis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('band.bandProtocol.risk.factorsDesc') ||
              'Detailed breakdown of identified risk categories'}
          </p>
        </div>

        <div className="space-y-2">
          {getRiskFactors(t).map((factor, index) => (
            <div key={index} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedFactor(expandedFactor === index ? null : index)}
                className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-md"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getRiskBgColor(factor.level)} ${getRiskColor(factor.level)}`}
                  >
                    {t(`band.bandProtocol.risk.level.${factor.level}`)}
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

      <div className="border-t border-gray-200" />

      <section className="flex items-start gap-4 py-2">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('band.bandProtocol.risk.disclaimer') || 'Risk Disclaimer'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('band.bandProtocol.risk.disclaimerText') ||
              'The risk assessments provided are for informational purposes only and should not be considered as financial advice. Cryptocurrency investments carry significant risks including potential loss of capital. Past performance does not guarantee future results. Please conduct your own research and consult with qualified financial advisors before making investment decisions.'}
          </p>
        </div>
      </section>
    </div>
  );
}
