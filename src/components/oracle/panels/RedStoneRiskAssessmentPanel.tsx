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

const mitigationMeasures = [
  { name: 'cryptographicVerification', type: 'technical', status: 'active', effectiveness: 95 },
  { name: 'permanentStorage', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'multiProviderAggregation', type: 'technical', status: 'active', effectiveness: 90 },
  { name: 'modularArchitecture', type: 'technical', status: 'active', effectiveness: 88 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 85 },
  { name: 'realTimeMonitoring', type: 'operational', status: 'active', effectiveness: 91 },
];

export function RedStoneRiskAssessmentPanel() {
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
        <DashboardCard title={t('redstone.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
            <div className="text-sm text-gray-500 mt-2">
              {t('redstone.riskAssessment.comprehensiveAssessment')}
            </div>
            <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}>
              {overallScore >= 90 ? t('redstone.riskAssessment.riskLevel.low') : overallScore >= 70 ? t('redstone.riskAssessment.riskLevel.medium') : t('redstone.riskAssessment.riskLevel.high')}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('redstone.riskAssessment.dimensionScores')} className="lg:col-span-2">
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
      <DashboardCard title={t('redstone.riskAssessment.riskMetrics')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('redstone.riskAssessment.providerConcentration')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('redstone.riskAssessment.topProvidersShare')}</span>
                <span className="font-medium text-gray-900">18.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('redstone.riskAssessment.top5ProvidersShare')}</span>
                <span className="font-medium text-gray-900">45.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('redstone.riskAssessment.giniCoefficient')}</span>
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

      {/* Security Timeline */}
      <DashboardCard title={t('redstone.riskAssessment.securityTimeline')}>
        <div className="space-y-4">
          {riskEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
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
                <span className={`px-2 py-1 rounded text-xs ${
                  event.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.status === 'resolved' ? t('redstone.riskAssessment.resolved') : t('redstone.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Modular Architecture Risk Assessment */}
      <DashboardCard title={t('redstone.riskAssessment.modularArchitecture')}>
        <div className="space-y-4">
          {[
            {
              component: 'Core Contracts',
              availability: 99.95,
              riskLevel: 'low',
              lastAudit: '2024-02',
            },
            {
              component: 'Data Provider Network',
              availability: 99.90,
              riskLevel: 'low',
              lastAudit: '2024-01',
            },
            {
              component: 'Arweave Storage',
              availability: 99.99,
              riskLevel: 'low',
              lastAudit: '2023-12',
            },
            {
              component: 'Price Feeds',
              availability: 99.92,
              riskLevel: 'low',
              lastAudit: '2024-03',
            },
          ].map((item) => (
            <div key={item.component} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    item.riskLevel === 'low'
                      ? 'bg-green-100 text-green-700'
                      : item.riskLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {t(`redstone.riskAssessment.riskLevel.${item.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Mitigation Measures */}
      <DashboardCard title={t('redstone.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  measure.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
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
