'use client';

import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
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

interface BandRiskAssessmentPanelProps {
  client?: BandProtocolClient;
}

const riskMetrics: RiskMetric[] = [
  {
    name: 'decentralization',
    value: 82,
    maxValue: 100,
    status: 'good',
    description: '90+ validators across Cosmos ecosystem with delegated proof-of-stake',
  },
  {
    name: 'security',
    value: 88,
    maxValue: 100,
    status: 'good',
    description: 'Tendermint consensus with cryptographic verification',
  },
  {
    name: 'stability',
    value: 91,
    maxValue: 100,
    status: 'good',
    description: '99.5% uptime with reliable block production',
  },
  {
    name: 'dataQuality',
    value: 89,
    maxValue: 100,
    status: 'good',
    description: 'Multi-source aggregation with IBC cross-chain support',
  },
];

const riskEvents: RiskEvent[] = [
  {
    date: '2024-03-15',
    type: 'upgrade',
    title: 'BandChain V2.5 Upgrade',
    description: 'Enhanced oracle script execution and improved gas efficiency',
    status: 'resolved',
  },
  {
    date: '2024-02-01',
    type: 'maintenance',
    title: 'Validator Set Optimization',
    description: 'Routine validator performance optimization',
    status: 'resolved',
  },
  {
    date: '2024-01-10',
    type: 'response',
    title: 'IBC Channel Recovery',
    description: 'Swift response to IBC channel temporary disruption',
    status: 'resolved',
  },
  {
    date: '2023-12-20',
    type: 'upgrade',
    title: 'Oracle Script Expansion',
    description: 'Added support for new data source types',
    status: 'resolved',
  },
];

const mitigationMeasures: MitigationMeasure[] = [
  { name: 'tendermintConsensus', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'validatorSlashing', type: 'technical', status: 'active', effectiveness: 88 },
  { name: 'multiSourceAggregation', type: 'technical', status: 'active', effectiveness: 87 },
  { name: 'ibcSecurity', type: 'technical', status: 'active', effectiveness: 85 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 84 },
  { name: 'continuousMonitoring', type: 'operational', status: 'active', effectiveness: 90 },
];

export function BandRiskAssessmentPanel({ client }: BandRiskAssessmentPanelProps) {
  const { t } = useI18n();
  const overallScore = calculateOverallScore(riskMetrics);
  const riskLevel = getRiskLevel(overallScore);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title={t('band.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
            <div className="text-sm text-gray-500 mt-2">
              {t('band.riskAssessment.comprehensiveAssessment')}
            </div>
            <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}>
              {t(`band.riskAssessment.riskLevel.${riskLevel}`)}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('band.riskAssessment.dimensionScores')} className="lg:col-span-2">
          <div className="space-y-4">
            {riskMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {t(`band.riskAssessment.${metric.name}`)}
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

      <DashboardCard title={t('band.riskAssessment.riskMetrics')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('band.riskAssessment.validatorConcentration')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.topValidatorsShare')}</span>
                <span className="font-medium text-gray-900">22.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.top10ValidatorsShare')}</span>
                <span className="font-medium text-gray-900">48.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.giniCoefficient')}</span>
                <span className="font-medium text-yellow-600">0.45</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('band.riskAssessment.ibcMetrics')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.connectedChains')}</span>
                <span className="font-medium text-green-600">15+</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.ibcRelayers')}</span>
                <span className="font-medium text-green-600">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.oracleScripts')}</span>
                <span className="font-medium text-green-600">200+</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title={t('band.riskAssessment.securityTimeline')}>
        <div className="space-y-4">
          {riskEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="flex-shrink-0 w-24 text-xs text-gray-500">{event.date}</div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getEventTypeColor(event.type)}`}>
                  {t(`band.riskAssessment.eventTypes.${event.type}`)}
                </span>
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              </div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(event.status)}`}>
                  {event.status === 'resolved' ? t('band.riskAssessment.resolved') : t('band.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('band.riskAssessment.crossChainRisk')}>
        <div className="space-y-4">
          {[
            { chain: 'Cosmos Hub', availability: 99.90, latency: 3000, riskLevel: 'low' as const },
            { chain: 'Osmosis', availability: 99.85, latency: 2500, riskLevel: 'low' as const },
            { chain: 'Juno', availability: 99.80, latency: 4000, riskLevel: 'low' as const },
            { chain: 'Evmos', availability: 99.75, latency: 5000, riskLevel: 'low' as const },
          ].map((chain) => (
            <div key={chain.chain} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900 w-32">{chain.chain}</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${chain.availability}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{chain.availability}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{formatLatency(chain.latency)}</span>
                <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(chain.riskLevel)}`}>
                  {t(`band.riskAssessment.riskLevel.${chain.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('band.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getMeasureStatusColor(measure.status)}`}>
                  {t(`band.riskAssessment.${measure.status}`)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-900">
                {t(`band.riskAssessment.${measure.name}`)}
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
