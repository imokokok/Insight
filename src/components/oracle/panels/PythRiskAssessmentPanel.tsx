'use client';

import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';

interface RiskMetric {
  name: string;
  value: number;
  maxValue: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

interface RiskEvent {
  date: string;
  type: 'upgrade' | 'vulnerability' | 'response' | 'maintenance';
  title: string;
  description: string;
  status: 'resolved' | 'monitoring';
}

const riskMetrics: RiskMetric[] = [
  {
    name: 'decentralization',
    value: 88,
    maxValue: 100,
    status: 'good',
    description: '90+ publishers across multiple institutions with distributed stake',
  },
  {
    name: 'security',
    value: 92,
    maxValue: 100,
    status: 'good',
    description: 'Cryptographic verification with staking slashing conditions',
  },
  {
    name: 'stability',
    value: 96,
    maxValue: 100,
    status: 'good',
    description: '99.9% uptime with sub-second price updates',
  },
  {
    name: 'dataQuality',
    value: 94,
    maxValue: 100,
    status: 'good',
    description: 'High-frequency updates with confidence intervals',
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

const mitigationMeasures = [
  { name: 'publisherStaking', type: 'technical', status: 'active', effectiveness: 94 },
  { name: 'confidenceIntervals', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'multiSourceAggregation', type: 'technical', status: 'active', effectiveness: 90 },
  { name: 'slashingConditions', type: 'governance', status: 'active', effectiveness: 88 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 85 },
  { name: 'realTimeMonitoring', type: 'operational', status: 'active', effectiveness: 93 },
];

export function PythRiskAssessmentPanel() {
  const { t } = useI18n();

  const overallScore = Math.round(
    riskMetrics.reduce((sum, metric) => sum + metric.value, 0) / riskMetrics.length
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'upgrade':
        return 'bg-blue-100 text-blue-700';
      case 'vulnerability':
        return 'bg-red-100 text-red-700';
      case 'response':
        return 'bg-green-100 text-green-700';
      case 'maintenance':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title={t('pyth.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
            <div className="text-sm text-gray-500 mt-2">
              {t('pyth.riskAssessment.comprehensiveAssessment')}
            </div>
            <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}>
              {overallScore >= 90 ? t('pyth.riskAssessment.riskLevel.low') : overallScore >= 70 ? t('pyth.riskAssessment.riskLevel.medium') : t('pyth.riskAssessment.riskLevel.high')}
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
                    className={`h-full rounded-full ${
                      metric.value >= 90 ? 'bg-green-500' : metric.value >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Risk Metrics Detail */}
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
                <span className="text-gray-600">{t('pyth.riskAssessment.top10PublishersShare')}</span>
                <span className="font-medium text-gray-900">42.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.giniCoefficient')}</span>
                <span className="font-medium text-green-600">0.38</span>
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
                <span className="font-medium text-green-600">~400ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.confidenceInterval')}</span>
                <span className="font-medium text-green-600">±0.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('pyth.riskAssessment.priceFeeds')}</span>
                <span className="font-medium text-green-600">500+</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Security Timeline */}
      <DashboardCard title={t('pyth.riskAssessment.securityTimeline')}>
        <div className="space-y-4">
          {riskEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
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
                <span className={`px-2 py-1 rounded text-xs ${
                  event.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.status === 'resolved' ? t('pyth.riskAssessment.resolved') : t('pyth.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Cross-Chain Risk Assessment */}
      <DashboardCard title={t('pyth.riskAssessment.crossChainRisk')}>
        <div className="space-y-4">
          {[
            {
              chain: 'Solana',
              availability: 99.95,
              latency: 400,
              riskLevel: 'low',
            },
            {
              chain: 'Ethereum',
              availability: 99.90,
              latency: 12000,
              riskLevel: 'low',
            },
            {
              chain: 'Arbitrum',
              availability: 99.92,
              latency: 2000,
              riskLevel: 'low',
            },
            {
              chain: 'Base',
              availability: 99.88,
              latency: 1500,
              riskLevel: 'low',
            },
          ].map((chain) => (
            <div key={chain.chain} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900 w-24">{chain.chain}</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${chain.availability}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{chain.availability}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {chain.latency < 1000 ? `${chain.latency}ms` : `${(chain.latency / 1000).toFixed(1)}s`}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    chain.riskLevel === 'low'
                      ? 'bg-green-100 text-green-700'
                      : chain.riskLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {t(`pyth.riskAssessment.riskLevel.${chain.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Mitigation Measures */}
      <DashboardCard title={t('pyth.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  measure.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
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
