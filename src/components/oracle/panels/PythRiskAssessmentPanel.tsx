'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  DashboardCard,
  DataFreshnessIndicator,
  DataSourceCredibility,
} from '@/components/oracle/common';
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
  formatLatency,
} from '@/lib/utils/riskUtils';

// 模拟第一方数据源
const generateFirstPartySources = () => [
  {
    id: '1',
    name: 'Jane Street',
    accuracy: 98,
    responseSpeed: 95,
    consistency: 97,
    availability: 99,
    contribution: 15.2,
  },
  {
    id: '2',
    name: 'Jump Crypto',
    accuracy: 97,
    responseSpeed: 96,
    consistency: 96,
    availability: 98,
    contribution: 12.8,
  },
  {
    id: '3',
    name: 'Wintermute',
    accuracy: 96,
    responseSpeed: 94,
    consistency: 95,
    availability: 97,
    contribution: 10.5,
  },
  {
    id: '4',
    name: 'Cumberland',
    accuracy: 95,
    responseSpeed: 93,
    consistency: 96,
    availability: 98,
    contribution: 8.3,
  },
  {
    id: '5',
    name: 'Alameda Research',
    accuracy: 94,
    responseSpeed: 92,
    consistency: 94,
    availability: 96,
    contribution: 6.7,
  },
];

const riskEvents: RiskEvent[] = [
  {
    date: '2024-03-10',
    type: 'upgrade',
    title: 'Publisher Staking Enhancement',
    description: 'Improved staking mechanism for publisher accountability',
    status: 'resolved',
  },
  {
    date: '2024-02-15',
    type: 'maintenance',
    title: 'Solana Network Optimization',
    description: 'Routine optimization for Solana network performance',
    status: 'resolved',
  },
  {
    date: '2024-01-25',
    type: 'response',
    title: 'Price Deviation Handling',
    description: 'Rapid response to market volatility with confidence interval adjustments',
    status: 'resolved',
  },
  {
    date: '2023-12-05',
    type: 'upgrade',
    title: 'Cross-Chain Expansion',
    description: 'Added support for additional EVM chains',
    status: 'resolved',
  },
];

const mitigationMeasures: MitigationMeasure[] = [
  { name: 'publisherStaking', type: 'technical', status: 'active', effectiveness: 94 },
  { name: 'confidenceIntervals', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'multiSourceAggregation', type: 'technical', status: 'active', effectiveness: 90 },
  { name: 'slashingConditions', type: 'governance', status: 'active', effectiveness: 88 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 85 },
  { name: 'realTimeMonitoring', type: 'operational', status: 'active', effectiveness: 93 },
];

export function PythRiskAssessmentPanel() {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // 动态生成风险指标数据
  const riskMetrics: RiskMetric[] = useMemo(
    () => [
      {
        name: 'decentralization',
        value: Math.round(86 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: '90+ publishers across multiple institutions with distributed stake',
      },
      {
        name: 'security',
        value: Math.round(90 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: 'Cryptographic verification with staking slashing conditions',
      },
      {
        name: 'stability',
        value: Math.round(94 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: '99.9% uptime with sub-second price updates',
      },
      {
        name: 'dataQuality',
        value: Math.round(92 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: 'High-frequency updates with confidence intervals',
      },
    ],
    [lastUpdated]
  );

  const overallScore = calculateOverallScore(riskMetrics);
  const riskLevel = getRiskLevel(overallScore);
  const firstPartySources = useMemo(() => generateFirstPartySources(), []);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    refreshTimerRef.current = setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1000);
  }, []);

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
        <DashboardCard title={t('pyth.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {t('pyth.riskAssessment.comprehensiveAssessment')}
            </div>
            <div
              className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}
            >
              {t(`pyth.riskAssessment.riskLevel.${riskLevel}`)}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('pyth.riskAssessment.dimensionScores')} className="lg:col-span-2">
          <div className="space-y-4">
            {riskMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {t(`pyth.riskAssessment.${metric.name}`)}
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

      {/* 第一方数据源可信度评分卡片 */}
      <DataSourceCredibility sources={firstPartySources} className="w-full" />

      <DashboardCard title={t('pyth.riskAssessment.riskMetrics')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('pyth.riskAssessment.publisherConcentration')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.topPublishersShare')}</span>
                <span className="font-medium text-gray-900">15.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('pyth.riskAssessment.top10PublishersShare')}
                </span>
                <span className="font-medium text-gray-900">42.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.giniCoefficient')}</span>
                <span className="font-medium text-success-600">0.38</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('pyth.riskAssessment.dataQuality')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.updateFrequency')}</span>
                <span className="font-medium text-success-600">~400ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.confidenceInterval')}</span>
                <span className="font-medium text-success-600">±0.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.priceFeeds')}</span>
                <span className="font-medium text-success-600">500+</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title={t('pyth.riskAssessment.securityTimeline')}>
        <div className="space-y-4">
          {riskEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex-shrink-0 w-24 text-xs text-gray-500">{event.date}</div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getEventTypeColor(event.type)}`}>
                  {t(`pyth.riskAssessment.eventTypes.${event.type}`)}
                </span>
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              </div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(event.status)}`}>
                  {event.status === 'resolved'
                    ? t('pyth.riskAssessment.resolved')
                    : t('pyth.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('pyth.riskAssessment.crossChainRisk')}>
        <div className="space-y-4">
          {[
            { chain: 'Solana', availability: 99.95, latency: 400, riskLevel: 'low' as const },
            { chain: 'Ethereum', availability: 99.9, latency: 12000, riskLevel: 'low' as const },
            { chain: 'Arbitrum', availability: 99.92, latency: 2000, riskLevel: 'low' as const },
            { chain: 'Base', availability: 99.88, latency: 1500, riskLevel: 'low' as const },
          ].map((chain) => (
            <div
              key={chain.chain}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900 w-24">{chain.chain}</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success-500 rounded-full"
                    style={{ width: `${chain.availability}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{chain.availability}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{formatLatency(chain.latency)}</span>
                <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(chain.riskLevel)}`}>
                  {t(`pyth.riskAssessment.riskLevel.${chain.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('pyth.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${getMeasureStatusColor(measure.status)}`}
                >
                  {t(`pyth.riskAssessment.${measure.status}`)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-900">
                {t(`pyth.riskAssessment.${measure.name}`)}
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-grow h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
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
