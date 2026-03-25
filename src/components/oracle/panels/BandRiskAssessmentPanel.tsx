'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useTranslations } from '@/i18n';
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
import {
  DataFreshnessIndicator,
  SecurityTimeline,
  MitigationMeasuresGrid,
} from '@/components/oracle/common';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { chartColors } from '@/lib/config/colors';


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

// Score trend data for the chart
const scoreTrendData = [
  {
    date: '2024-01',
    overall: 82,
    decentralization: 80,
    security: 85,
    stability: 88,
    dataQuality: 84,
  },
  {
    date: '2024-02',
    overall: 84,
    decentralization: 81,
    security: 86,
    stability: 89,
    dataQuality: 85,
  },
  {
    date: '2024-03',
    overall: 85,
    decentralization: 81,
    security: 87,
    stability: 90,
    dataQuality: 86,
  },
  {
    date: '2024-04',
    overall: 86,
    decentralization: 82,
    security: 87,
    stability: 90,
    dataQuality: 87,
  },
  {
    date: '2024-05',
    overall: 87,
    decentralization: 82,
    security: 88,
    stability: 91,
    dataQuality: 88,
  },
  {
    date: '2024-06',
    overall: 87,
    decentralization: 82,
    security: 88,
    stability: 91,
    dataQuality: 89,
  },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded border border-gray-200 shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
              <span className="font-bold" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function BandRiskAssessmentPanel({ client }: BandRiskAssessmentPanelProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const overallScore = calculateOverallScore(riskMetrics);
  const riskLevel = getRiskLevel(overallScore);

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  const chartData = useMemo(() => scoreTrendData, []);

  return (
    <div className="space-y-6">
      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        thresholdMinutes={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title={t('band.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {t('band.riskAssessment.comprehensiveAssessment')}
            </div>
            <div
              className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}
            >
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

      {/* Score Trend Chart */}
      <DashboardCard title={t('band.riskAssessment.scoreTrend')}>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.recharts.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.recharts.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.recharts.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.recharts.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="date"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                domain={[70, 100]}
                tickFormatter={(value) => `${value}`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="overall"
                stroke={chartColors.recharts.primary}
                fillOpacity={1}
                fill="url(#colorOverall)"
                strokeWidth={2}
                name={t('band.riskAssessment.overall')}
              />
              <Area
                type="monotone"
                dataKey="security"
                stroke={chartColors.recharts.success}
                fillOpacity={1}
                fill="url(#colorSecurity)"
                strokeWidth={2}
                name={t('band.riskAssessment.security')}
              />
              <Line
                type="monotone"
                dataKey="decentralization"
                stroke={chartColors.recharts.warning}
                strokeWidth={2}
                dot={false}
                name={t('band.riskAssessment.decentralization')}
              />
              <Line
                type="monotone"
                dataKey="stability"
                stroke={chartColors.recharts.cyan}
                strokeWidth={2}
                dot={false}
                name={t('band.riskAssessment.stability')}
              />
              <Line
                type="monotone"
                dataKey="dataQuality"
                stroke={chartColors.recharts.purple}
                strokeWidth={2}
                dot={false}
                name={t('band.riskAssessment.dataQuality')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.primary }}
            />
            <span className="text-xs text-gray-600">{t('band.riskAssessment.overall')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.success }}
            />
            <span className="text-xs text-gray-600">{t('band.riskAssessment.security')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.warning }}
            />
            <span className="text-xs text-gray-600">
              {t('band.riskAssessment.decentralization')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.cyan }}
            />
            <span className="text-xs text-gray-600">{t('band.riskAssessment.stability')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.purple }}
            />
            <span className="text-xs text-gray-600">{t('band.riskAssessment.dataQuality')}</span>
          </div>
        </div>
      </DashboardCard>

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
                <span className="text-gray-600">
                  {t('band.riskAssessment.top10ValidatorsShare')}
                </span>
                <span className="font-medium text-gray-900">48.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.giniCoefficient')}</span>
                <span className="font-medium text-warning-600">0.45</span>
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
                <span className="font-medium text-success-600">15+</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.ibcRelayers')}</span>
                <span className="font-medium text-success-600">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('band.riskAssessment.oracleScripts')}</span>
                <span className="font-medium text-success-600">200+</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Security Timeline */}
      <SecurityTimeline events={riskEvents} />

      <DashboardCard title={t('band.riskAssessment.crossChainRisk')}>
        <div className="space-y-4">
          {[
            { chain: 'Cosmos Hub', availability: 99.9, latency: 3000, riskLevel: 'low' as const },
            { chain: 'Osmosis', availability: 99.85, latency: 2500, riskLevel: 'low' as const },
            { chain: 'Juno', availability: 99.8, latency: 4000, riskLevel: 'low' as const },
            { chain: 'Evmos', availability: 99.75, latency: 5000, riskLevel: 'low' as const },
          ].map((chain) => (
            <div
              key={chain.chain}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900 w-32">{chain.chain}</span>
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
                  {t(`band.riskAssessment.riskLevel.${chain.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Mitigation Measures Grid */}
      <MitigationMeasuresGrid measures={mitigationMeasures} />
    </div>
  );
}
