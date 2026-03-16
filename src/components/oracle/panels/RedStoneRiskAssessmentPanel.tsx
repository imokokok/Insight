'use client';

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard, DataFreshnessIndicator } from '@/components/oracle/common';
import { RiskMetric, RiskEvent, MitigationMeasure } from '@/types/risk';
import {
  getScoreColor,
  getScoreBg,
  getScoreBarColor,
  getEventTypeColor,
  getRiskLevel,
  getRiskLevelColor,
  calculateOverallScore,
  getStatusColor,
  getMeasureStatusColor,
} from '@/lib/utils/riskUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { chartColors } from '@/lib/config/colors';

const riskMetrics: RiskMetric[] = [
  {
    name: 'decentralization',
    value: 85,
    maxValue: 100,
    status: 'good',
    description: '25+ data providers with distributed data streams',
  },
  {
    name: 'security',
    value: 90,
    maxValue: 100,
    status: 'good',
    description: 'Cryptographic signatures with Arweave permanent storage',
  },
  {
    name: 'stability',
    value: 94,
    maxValue: 100,
    status: 'good',
    description: '99.9% uptime with modular data delivery',
  },
  {
    name: 'dataQuality',
    value: 92,
    maxValue: 100,
    status: 'good',
    description: 'Multi-source aggregation with freshness scoring',
  },
];

const riskEvents: RiskEvent[] = [
  {
    date: '2024-03-20',
    type: 'upgrade',
    title: 'Data Streams V2 Launch',
    description: 'Enhanced data stream protocol with improved efficiency',
    status: 'resolved',
  },
  {
    date: '2024-02-10',
    type: 'maintenance',
    title: 'Provider Network Expansion',
    description: 'Added new data providers to increase decentralization',
    status: 'resolved',
  },
  {
    date: '2024-01-15',
    type: 'response',
    title: 'Market Volatility Handling',
    description: 'Successfully handled high market volatility with accurate price delivery',
    status: 'resolved',
  },
  {
    date: '2023-11-20',
    type: 'upgrade',
    title: 'Arweave Integration',
    description: 'Integrated permanent data storage on Arweave',
    status: 'resolved',
  },
];

const mitigationMeasures: MitigationMeasure[] = [
  { name: 'cryptographicVerification', type: 'technical', status: 'active', effectiveness: 95 },
  { name: 'permanentStorage', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'multiProviderAggregation', type: 'technical', status: 'active', effectiveness: 90 },
  { name: 'modularArchitecture', type: 'technical', status: 'active', effectiveness: 88 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 85 },
  { name: 'realTimeMonitoring', type: 'operational', status: 'active', effectiveness: 91 },
];

// 评分趋势数据
const scoreTrendData = [
  { date: '2024-01', score: 88 },
  { date: '2024-02', score: 89 },
  { date: '2024-03', score: 90 },
  { date: '2024-04', score: 89 },
  { date: '2024-05', score: 91 },
  { date: '2024-06', score: 90 },
];

export function RedStoneRiskAssessmentPanel() {
  const { t } = useI18n();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const overallScore = calculateOverallScore(riskMetrics);
  const riskLevel = getRiskLevel(overallScore);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    refreshTimerRef.current = setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* 数据新鲜度指示器 */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        thresholdMinutes={5}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard
          title={t('redstone.riskAssessment.overallRiskScore')}
          className="lg:col-span-1"
        >
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {t('redstone.riskAssessment.comprehensiveAssessment')}
            </div>
            <div
              className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}
            >
              {t(`redstone.riskAssessment.riskLevel.${riskLevel}`)}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title={t('redstone.riskAssessment.dimensionScores')}
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {riskMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {t(`redstone.riskAssessment.${metric.name}`)}
                  </span>
                  <span className={`text-sm font-bold ${getScoreColor(metric.value)}`}>
                    {metric.value}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreBarColor(metric.value)}`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* 评分趋势图表 */}
      <DashboardCard title={t('redstone.riskAssessment.scoreTrend')}>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="date"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                domain={[80, 100]}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: `1px solid ${chartColors.recharts.grid}`,
                  borderRadius: '4px',
                }}
                formatter={(value) => [`${value}`, t('redstone.riskAssessment.score')]}
              />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label="Excellent" />
              <Line
                type="monotone"
                dataKey="score"
                stroke={chartColors.oracle.redstone}
                strokeWidth={2}
                dot={{ fill: chartColors.oracle.redstone, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('redstone.riskAssessment.riskMetrics')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('redstone.riskAssessment.providerConcentration')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('redstone.riskAssessment.topProvidersShare')}
                </span>
                <span className="font-medium text-gray-900">18.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('redstone.riskAssessment.top5ProvidersShare')}
                </span>
                <span className="font-medium text-gray-900">45.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('redstone.riskAssessment.giniCoefficient')}
                </span>
                <span className="font-medium text-green-600">0.41</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('redstone.riskAssessment.dataStreamMetrics')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('redstone.riskAssessment.activeStreams')}</span>
                <span className="font-medium text-green-600">1,250+</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('redstone.riskAssessment.freshnessScore')}</span>
                <span className="font-medium text-green-600">98.5/100</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('redstone.riskAssessment.avgUpdateTime')}</span>
                <span className="font-medium text-green-600">~60s</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title={t('redstone.riskAssessment.securityTimeline')}>
        <div className="space-y-4">
          {riskEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex-shrink-0 w-24 text-xs text-gray-500">{event.date}</div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getEventTypeColor(event.type)}`}>
                  {t(`redstone.riskAssessment.eventTypes.${event.type}`)}
                </span>
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              </div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(event.status)}`}>
                  {event.status === 'resolved'
                    ? t('redstone.riskAssessment.resolved')
                    : t('redstone.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('redstone.riskAssessment.modularArchitecture')}>
        <div className="space-y-4">
          {[
            {
              component: 'Core Contracts',
              availability: 99.95,
              riskLevel: 'low' as const,
              lastAudit: '2024-02',
            },
            {
              component: 'Data Provider Network',
              availability: 99.9,
              riskLevel: 'low' as const,
              lastAudit: '2024-01',
            },
            {
              component: 'Arweave Storage',
              availability: 99.99,
              riskLevel: 'low' as const,
              lastAudit: '2023-12',
            },
            {
              component: 'Price Feeds',
              availability: 99.92,
              riskLevel: 'low' as const,
              lastAudit: '2024-03',
            },
          ].map((item) => (
            <div
              key={item.component}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900 w-40">{item.component}</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${item.availability}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{item.availability}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {t('redstone.riskAssessment.lastAudit')}: {item.lastAudit}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(item.riskLevel)}`}>
                  {t(`redstone.riskAssessment.riskLevel.${item.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('redstone.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${getMeasureStatusColor(measure.status)}`}
                >
                  {t(`redstone.riskAssessment.${measure.status}`)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-900">
                {t(`redstone.riskAssessment.${measure.name}`)}
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-grow h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${measure.effectiveness}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{measure.effectiveness}%</span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
