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
    value: 92,
    maxValue: 100,
    status: 'good',
    description: 'Node distribution across 5 regions with 1,847+ independent operators',
  },
  {
    name: 'security',
    value: 95,
    maxValue: 100,
    status: 'good',
    description: 'Multi-layer security with staking mechanism and slashing conditions',
  },
  {
    name: 'stability',
    value: 98,
    maxValue: 100,
    status: 'good',
    description: '99.9% uptime with robust failover mechanisms',
  },
  {
    name: 'dataQuality',
    value: 96,
    maxValue: 100,
    status: 'good',
    description: 'High-quality data with multiple source aggregation',
  },
];

const riskEvents: RiskEvent[] = [
  {
    date: '2024-03-15',
    type: 'upgrade',
    title: 'Staking v0.2 Upgrade',
    description: 'Successfully migrated to new staking contract with enhanced security features',
    status: 'resolved',
  },
  {
    date: '2024-02-28',
    type: 'maintenance',
    title: 'Node Software Update',
    description: 'Routine maintenance to improve node performance and reliability',
    status: 'resolved',
  },
  {
    date: '2024-01-20',
    type: 'response',
    title: 'Price Deviation Response',
    description: 'Rapid response to market volatility ensuring accurate price feeds',
    status: 'resolved',
  },
  {
    date: '2023-12-10',
    type: 'upgrade',
    title: 'CCIP Launch',
    description: 'Cross-Chain Interoperability Protocol successfully deployed',
    status: 'resolved',
  },
];

const mitigationMeasures = [
  { name: 'multiNodeConsensus', type: 'technical', status: 'active', effectiveness: 95 },
  { name: 'anomalyDetection', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'nodeStaking', type: 'operational', status: 'active', effectiveness: 88 },
  { name: 'crossChainRedundancy', type: 'technical', status: 'active', effectiveness: 90 },
  { name: 'securityAudit', type: 'governance', status: 'active', effectiveness: 94 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 85 },
];

export function ChainlinkRiskPanel() {
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
        <DashboardCard title={t('chainlink.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
            <div className="text-sm text-gray-500 mt-2">
              {t('chainlink.riskAssessment.comprehensiveAssessment')}
            </div>
            <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}>
              {overallScore >= 90 ? t('chainlink.riskAssessment.riskLevel.low') : overallScore >= 70 ? t('chainlink.riskAssessment.riskLevel.medium') : t('chainlink.riskAssessment.riskLevel.high')}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.riskAssessment.dimensionScores')} className="lg:col-span-2">
          <div className="space-y-4">
            {riskMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {t(`chainlink.riskAssessment.${metric.name}`)}
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
      <DashboardCard title={t('chainlink.riskAssessment.riskMetrics')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('chainlink.riskAssessment.nodeConcentration')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.topNodesShare')}</span>
                <span className="font-medium text-gray-900">12.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.top50NodesShare')}</span>
                <span className="font-medium text-gray-900">38.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.giniCoefficient')}</span>
                <span className="font-medium text-green-600">0.42</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('chainlink.riskAssessment.singlePointFailure')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.criticalNodeRedundancy')}</span>
                <span className="font-medium text-green-600">3x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.dataSourceDiversity')}</span>
                <span className="font-medium text-green-600">15+ sources</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.failoverTime')}</span>
                <span className="font-medium text-green-600">&lt; 30s</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Security Timeline */}
      <DashboardCard title={t('chainlink.riskAssessment.securityTimeline')}>
        <div className="space-y-4">
          {riskEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="flex-shrink-0 w-24 text-xs text-gray-500">{event.date}</div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getEventTypeColor(event.type)}`}>
                  {t(`chainlink.riskAssessment.eventTypes.${event.type}`)}
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
                  {event.status === 'resolved' ? t('chainlink.riskAssessment.resolved') : t('chainlink.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Service-Level Risk Assessment */}
      <DashboardCard title={t('chainlink.riskAssessment.serviceLevelRisk')}>
        <div className="space-y-4">
          {[
            {
              service: 'CCIP',
              availability: 99.97,
              incidents: 0,
              riskLevel: 'low',
              lastIncident: 'N/A',
            },
            {
              service: 'Data Feeds',
              availability: 99.99,
              incidents: 1,
              riskLevel: 'low',
              lastIncident: '2024-01-20',
            },
            {
              service: 'Functions',
              availability: 99.95,
              incidents: 0,
              riskLevel: 'low',
              lastIncident: 'N/A',
            },
            {
              service: 'Automation',
              availability: 99.98,
              incidents: 0,
              riskLevel: 'low',
              lastIncident: 'N/A',
            },
            {
              service: 'VRF',
              availability: 99.96,
              incidents: 0,
              riskLevel: 'low',
              lastIncident: 'N/A',
            },
            {
              service: 'Proof of Reserve',
              availability: 99.99,
              incidents: 0,
              riskLevel: 'low',
              lastIncident: 'N/A',
            },
          ].map((service) => (
            <div key={service.service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900 w-32">{service.service}</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${service.availability}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{service.availability}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {service.incidents > 0 ? `${service.incidents} incidents` : 'No incidents'}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    service.riskLevel === 'low'
                      ? 'bg-green-100 text-green-700'
                      : service.riskLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {t(`chainlink.riskAssessment.riskLevel.${service.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Service-Specific Risk Factors */}
      <DashboardCard title={t('chainlink.riskAssessment.serviceRiskFactors')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t('chainlink.riskAssessment.ccipRisks')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.rmnCoverage')}</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.rateLimiting')}</span>
                <span className="font-medium text-green-600">Enabled</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.circuitBreakers')}</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t('chainlink.riskAssessment.vrfRisks')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.cryptographicSecurity')}</span>
                <span className="font-medium text-green-600">256-bit</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.onChainVerification')}</span>
                <span className="font-medium text-green-600">100%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('chainlink.riskAssessment.blockHashDependency')}</span>
                <span className="font-medium text-yellow-600">Medium</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Mitigation Measures */}
      <DashboardCard title={t('chainlink.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  measure.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {t(`chainlink.riskAssessment.${measure.status}`)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-900">
                {t(`chainlink.riskAssessment.${measure.name}`)}
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-grow h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
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
