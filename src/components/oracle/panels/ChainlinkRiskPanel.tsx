'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  DashboardCard,
  DataFreshnessIndicator,
  RiskScoreCard,
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
} from '@/lib/utils/riskUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// 模拟历史评分数据
const generateScoreTrendData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      score: 92 + Math.random() * 6 - 2,
      decentralization: 90 + Math.random() * 4 - 2,
      security: 93 + Math.random() * 4 - 2,
      stability: 96 + Math.random() * 4 - 2,
      dataQuality: 94 + Math.random() * 4 - 2,
    });
  }
  return data;
};

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

const mitigationMeasures: MitigationMeasure[] = [
  { name: 'multiNodeConsensus', type: 'technical', status: 'active', effectiveness: 95 },
  { name: 'anomalyDetection', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'nodeStaking', type: 'operational', status: 'active', effectiveness: 88 },
  { name: 'crossChainRedundancy', type: 'technical', status: 'active', effectiveness: 90 },
  { name: 'securityAudit', type: 'governance', status: 'active', effectiveness: 94 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 85 },
];

export function ChainlinkRiskPanel() {
  const { t } = useI18n();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // 动态生成风险指标数据
  const riskMetrics: RiskMetric[] = useMemo(
    () => [
      {
        name: 'decentralization',
        value: Math.round(90 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: 'Node distribution across 5 regions with 1,847+ independent operators',
      },
      {
        name: 'security',
        value: Math.round(93 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: 'Multi-layer security with staking mechanism and slashing conditions',
      },
      {
        name: 'stability',
        value: Math.round(96 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: '99.9% uptime with robust failover mechanisms',
      },
      {
        name: 'dataQuality',
        value: Math.round(94 + Math.random() * 4),
        maxValue: 100,
        status: 'good',
        description: 'High-quality data with multiple source aggregation',
      },
    ],
    [lastUpdated]
  );

  const overallScore = calculateOverallScore(riskMetrics);
  const riskLevel = getRiskLevel(overallScore);
  const scoreTrendData = useMemo(() => generateScoreTrendData(), []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    // 模拟数据刷新
    setTimeout(() => {
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
        <DashboardCard title={t('chainlink.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
            <div className="text-sm text-gray-500 mt-2">
              {t('chainlink.riskAssessment.comprehensiveAssessment')}
            </div>
            <div
              className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}
            >
              {t(`chainlink.riskAssessment.riskLevel.${riskLevel}`)}
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
      <DashboardCard title={t('chainlink.riskAssessment.scoreTrend')}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                formatter={(value: number) => [value.toFixed(1), '']}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name={t('chainlink.riskAssessment.overallScore')}
              />
              <Line
                type="monotone"
                dataKey="decentralization"
                stroke="#10b981"
                strokeWidth={1}
                dot={false}
                strokeDasharray="5 5"
                name={t('chainlink.riskAssessment.decentralization')}
              />
              <Line
                type="monotone"
                dataKey="security"
                stroke="#f59e0b"
                strokeWidth={1}
                dot={false}
                strokeDasharray="5 5"
                name={t('chainlink.riskAssessment.security')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-blue-500"></span>
            <span className="text-sm text-gray-600">{t('chainlink.riskAssessment.overallScore')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-green-500 border-dashed"></span>
            <span className="text-sm text-gray-600">{t('chainlink.riskAssessment.decentralization')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-yellow-500 border-dashed"></span>
            <span className="text-sm text-gray-600">{t('chainlink.riskAssessment.security')}</span>
          </div>
        </div>
      </DashboardCard>

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
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(event.status)}`}>
                  {event.status === 'resolved'
                    ? t('chainlink.riskAssessment.resolved')
                    : t('chainlink.riskAssessment.monitoring')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('chainlink.riskAssessment.serviceLevelRisk')}>
        <div className="space-y-4">
          {[
            { service: 'CCIP', availability: 99.97, incidents: 0, riskLevel: 'low' as const },
            { service: 'Data Feeds', availability: 99.99, incidents: 1, riskLevel: 'low' as const },
            { service: 'Functions', availability: 99.95, incidents: 0, riskLevel: 'low' as const },
            { service: 'Automation', availability: 99.98, incidents: 0, riskLevel: 'low' as const },
            { service: 'VRF', availability: 99.96, incidents: 0, riskLevel: 'low' as const },
            { service: 'Proof of Reserve', availability: 99.99, incidents: 0, riskLevel: 'low' as const },
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
                <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(service.riskLevel)}`}>
                  {t(`chainlink.riskAssessment.riskLevel.${service.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

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

      <DashboardCard title={t('chainlink.riskAssessment.mitigationMeasures')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigationMeasures.map((measure) => (
            <div key={measure.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{measure.type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getMeasureStatusColor(measure.status)}`}>
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
