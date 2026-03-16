'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { DashboardCard, RiskScoreCard } from '@/components/oracle/common';
import {
  DataFreshnessIndicator,
  SecurityTimeline,
  MitigationMeasuresGrid,
} from '@/components/oracle/common';
import { RiskMetric, RiskEvent, MitigationMeasure } from '@/types/risk';
import {
  getScoreColor,
  getScoreBg,
  getScoreBarColor,
  getRiskLevel,
  getRiskLevelColor,
  calculateOverallScore,
  formatLatency,
} from '@/lib/utils/riskUtils';
import { chartColors } from '@/lib/config/colors';

interface DIARiskAssessmentPanelProps {
  className?: string;
}

// 四维度风险指标
const getRiskMetrics = (t: (key: string) => string): RiskMetric[] => [
  {
    name: 'decentralization',
    value: 78,
    maxValue: 100,
    status: 'good',
    description: t('panels.diaRiskAssessment.decentralizationMetricDesc'),
  },
  {
    name: 'security',
    value: 85,
    maxValue: 100,
    status: 'good',
    description: t('panels.diaRiskAssessment.securityMetricDesc'),
  },
  {
    name: 'stability',
    value: 88,
    maxValue: 100,
    status: 'good',
    description: t('panels.diaRiskAssessment.stabilityMetricDesc'),
  },
  {
    name: 'dataQuality',
    value: 86,
    maxValue: 100,
    status: 'good',
    description: t('panels.diaRiskAssessment.dataQualityMetricDesc'),
  },
];

// 安全事件时间线
const getRiskEvents = (t: (key: string) => string): RiskEvent[] => [
  {
    date: '2024-03-20',
    type: 'upgrade',
    title: t('panels.diaRiskAssessment.eventDIAUpgradeTitle'),
    description: t('panels.diaRiskAssessment.eventDIAUpgradeDesc'),
    status: 'resolved',
  },
  {
    date: '2024-02-15',
    type: 'response',
    title: t('panels.diaRiskAssessment.eventAnomalyResponseTitle'),
    description: t('panels.diaRiskAssessment.eventAnomalyResponseDesc'),
    status: 'resolved',
  },
  {
    date: '2024-01-10',
    type: 'maintenance',
    title: t('panels.diaRiskAssessment.eventBridgeMaintenanceTitle'),
    description: t('panels.diaRiskAssessment.eventBridgeMaintenanceDesc'),
    status: 'resolved',
  },
  {
    date: '2023-11-28',
    type: 'upgrade',
    title: t('panels.diaRiskAssessment.eventDashboardReleaseTitle'),
    description: t('panels.diaRiskAssessment.eventDashboardReleaseDesc'),
    status: 'resolved',
  },
];

// 风险缓解措施
const mitigationMeasures: MitigationMeasure[] = [
  { name: 'multiSourceAggregation', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'cryptographicVerification', type: 'technical', status: 'active', effectiveness: 88 },
  { name: 'anomalyDetection', type: 'technical', status: 'active', effectiveness: 85 },
  { name: 'decentralizedGovernance', type: 'governance', status: 'active', effectiveness: 82 },
  { name: 'continuousAuditing', type: 'operational', status: 'active', effectiveness: 90 },
  { name: 'incidentResponse', type: 'operational', status: 'active', effectiveness: 87 },
];

// 数据源可信度数据
const dataSourceCredibility = [
  { name: 'Binance', score: 96, type: 'exchange', weight: 25 },
  { name: 'Coinbase', score: 95, type: 'exchange', weight: 20 },
  { name: 'Uniswap', score: 92, type: 'defi', weight: 18 },
  { name: 'Kraken', score: 94, type: 'exchange', weight: 15 },
  { name: 'Curve', score: 90, type: 'defi', weight: 12 },
  { name: 'Balancer', score: 88, type: 'defi', weight: 10 },
];

// 数据源类型分布
const sourceTypeDistribution = [
  { name: 'exchange', value: 45, color: chartColors.recharts.primary },
  { name: 'defi', value: 35, color: chartColors.recharts.success },
  { name: 'aggregator', value: 20, color: chartColors.recharts.warning },
];

// 评分趋势数据
const scoreTrendData = [
  {
    date: '2024-01',
    overall: 80,
    decentralization: 75,
    security: 82,
    stability: 85,
    dataQuality: 82,
  },
  {
    date: '2024-02',
    overall: 82,
    decentralization: 76,
    security: 83,
    stability: 86,
    dataQuality: 83,
  },
  {
    date: '2024-03',
    overall: 83,
    decentralization: 77,
    security: 84,
    stability: 87,
    dataQuality: 84,
  },
  {
    date: '2024-04',
    overall: 84,
    decentralization: 77,
    security: 84,
    stability: 87,
    dataQuality: 85,
  },
  {
    date: '2024-05',
    overall: 85,
    decentralization: 78,
    security: 85,
    stability: 88,
    dataQuality: 85,
  },
  {
    date: '2024-06',
    overall: 84,
    decentralization: 78,
    security: 85,
    stability: 88,
    dataQuality: 86,
  },
];

// 跨链覆盖风险数据
const crossChainRiskData = [
  {
    chain: 'Ethereum',
    availability: 99.95,
    latency: 1200,
    riskLevel: 'low' as const,
    coverage: 100,
  },
  { chain: 'Polygon', availability: 99.9, latency: 2000, riskLevel: 'low' as const, coverage: 95 },
  {
    chain: 'Arbitrum',
    availability: 99.85,
    latency: 1500,
    riskLevel: 'low' as const,
    coverage: 90,
  },
  { chain: 'Optimism', availability: 99.8, latency: 1800, riskLevel: 'low' as const, coverage: 88 },
  { chain: 'BSC', availability: 99.75, latency: 3000, riskLevel: 'low' as const, coverage: 85 },
  {
    chain: 'Avalanche',
    availability: 99.7,
    latency: 2500,
    riskLevel: 'low' as const,
    coverage: 82,
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

export function DIARiskAssessmentPanel({ className = '' }: DIARiskAssessmentPanelProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const riskMetrics = getRiskMetrics(t);
  const riskEvents = getRiskEvents(t);
  const overallScore = calculateOverallScore(riskMetrics);
  const riskLevel = getRiskLevel(overallScore);

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  const chartData = useMemo(() => scoreTrendData, []);
  const avgCredibility = useMemo(() => {
    const total = dataSourceCredibility.reduce((sum, s) => sum + s.score * s.weight, 0);
    const weightSum = dataSourceCredibility.reduce((sum, s) => sum + s.weight, 0);
    return Math.round(total / weightSum);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. 综合风险概览 */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        thresholdMinutes={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title={t('dia.riskAssessment.overallRiskScore')} className="lg:col-span-1">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {t('dia.riskAssessment.comprehensiveAssessment')}
            </div>
            <div
              className={`mt-4 inline-flex items-center px-3 py-1 text-sm font-medium ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}
            >
              {t(`dia.riskAssessment.riskLevel.${riskLevel}`)}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('dia.riskAssessment.dimensionScores')} className="lg:col-span-2">
          <div className="space-y-4">
            {riskMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {t(`dia.riskAssessment.${metric.name}`)}
                  </span>
                  <span className={`text-sm font-bold ${getScoreColor(metric.value)}`}>
                    {metric.value}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full ${getScoreBarColor(metric.value)}`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* 2. 四维度评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskScoreCard
          title={t('dia.riskAssessment.decentralization')}
          score={riskMetrics[0].value}
          description={t('dia.riskAssessment.decentralizationDesc')}
          trend="up"
          trendValue="+3"
        />
        <RiskScoreCard
          title={t('dia.riskAssessment.security')}
          score={riskMetrics[1].value}
          description={t('dia.riskAssessment.securityDesc')}
          trend="up"
          trendValue="+2"
        />
        <RiskScoreCard
          title={t('dia.riskAssessment.stability')}
          score={riskMetrics[2].value}
          description={t('dia.riskAssessment.stabilityDesc')}
          trend="neutral"
          trendValue="0"
        />
        <RiskScoreCard
          title={t('dia.riskAssessment.dataQuality')}
          score={riskMetrics[3].value}
          description={t('dia.riskAssessment.dataQualityDesc')}
          trend="up"
          trendValue="+1"
        />
      </div>

      {/* 3. 数据源可信度评分 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('dia.riskAssessment.dataSourceCredibility')}>
          <div className="space-y-4">
            {/* 平均可信度 */}
            <div className="flex items-center justify-between p-4 bg-gray-50">
              <div>
                <p className="text-sm text-gray-600">{t('dia.riskAssessment.avgCredibility')}</p>
                <p className={`text-3xl font-bold ${getScoreColor(avgCredibility)}`}>
                  {avgCredibility}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('dia.riskAssessment.totalSources')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dataSourceCredibility.length}
                </p>
              </div>
            </div>
            {/* 各数据源评分 */}
            <div className="space-y-3">
              {dataSourceCredibility.map((source) => (
                <div key={source.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-24">{source.name}</span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600">
                      {t(`dia.dataSourceType.${source.type}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full ${getScoreBarColor(source.score)}`}
                        style={{ width: `${source.score}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold w-10 text-right ${getScoreColor(source.score)}`}
                    >
                      {source.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* 数据源类型分布 */}
        <DashboardCard title={t('dia.riskAssessment.sourceTypeDistribution')}>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sourceTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value}%`,
                    t(`dia.dataSourceType.${String(name)}`),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            {sourceTypeDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">
                  {t(`dia.dataSourceType.${item.name}`)} ({item.value}%)
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* 4. 数据聚合风险分析 */}
      <DashboardCard title={t('dia.riskAssessment.aggregationRiskAnalysis')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 数据源集中度 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('dia.riskAssessment.sourceConcentration')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.topSourceShare')}</span>
                <span className="font-medium text-gray-900">25%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.top3SourcesShare')}</span>
                <span className="font-medium text-gray-900">63%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.herfindahlIndex')}</span>
                <span className="font-medium text-yellow-600">0.18</span>
              </div>
            </div>
          </div>

          {/* 异常数据源检测 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('dia.riskAssessment.anomalyDetection')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.anomalies24h')}</span>
                <span className="font-medium text-green-600">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.suspendedSources')}</span>
                <span className="font-medium text-green-600">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.detectionAccuracy')}</span>
                <span className="font-medium text-green-600">98.5%</span>
              </div>
            </div>
          </div>

          {/* 数据一致性 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('dia.riskAssessment.dataConsistency')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.consistencyScore')}</span>
                <span className="font-medium text-green-600">96.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.deviationThreshold')}</span>
                <span className="font-medium text-gray-900">&lt; 0.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('dia.riskAssessment.conflictResolution')}</span>
                <span className="font-medium text-green-600">&lt; 2s</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* 5. 安全事件时间线 */}
      <SecurityTimeline events={riskEvents} />

      {/* 6. 跨链覆盖风险评估 */}
      <DashboardCard title={t('dia.riskAssessment.crossChainRisk')}>
        <div className="space-y-4">
          {crossChainRiskData.map((chain) => (
            <div key={chain.chain} className="flex items-center justify-between p-3 bg-gray-50">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-sm font-medium text-gray-900 w-28">{chain.chain}</span>
                <div className="w-32 h-2 bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${chain.availability}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-20">{chain.availability}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20">{formatLatency(chain.latency)}</span>
                <span className="text-sm text-gray-600 w-20">
                  {t('dia.riskAssessment.coverage')}: {chain.coverage}%
                </span>
                <span className={`px-2 py-1 text-xs ${getRiskLevelColor(chain.riskLevel)}`}>
                  {t(`dia.riskAssessment.riskLevel.${chain.riskLevel}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* 评分趋势图表 */}
      <DashboardCard title={t('dia.riskAssessment.scoreTrend')}>
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="overall"
                stroke={chartColors.recharts.primary}
                fillOpacity={1}
                fill="url(#colorOverall)"
                strokeWidth={2}
                name={t('dia.riskAssessment.overall')}
              />
              <Area
                type="monotone"
                dataKey="security"
                stroke={chartColors.recharts.success}
                fillOpacity={1}
                fill="url(#colorSecurity)"
                strokeWidth={2}
                name={t('dia.riskAssessment.security')}
              />
              <Line
                type="monotone"
                dataKey="decentralization"
                stroke={chartColors.recharts.warning}
                strokeWidth={2}
                dot={false}
                name={t('dia.riskAssessment.decentralization')}
              />
              <Line
                type="monotone"
                dataKey="stability"
                stroke={chartColors.recharts.cyan}
                strokeWidth={2}
                dot={false}
                name={t('dia.riskAssessment.stability')}
              />
              <Line
                type="monotone"
                dataKey="dataQuality"
                stroke={chartColors.recharts.purple}
                strokeWidth={2}
                dot={false}
                name={t('dia.riskAssessment.dataQuality')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.primary }} />
            <span className="text-xs text-gray-600">{t('dia.riskAssessment.overall')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.success }} />
            <span className="text-xs text-gray-600">{t('dia.riskAssessment.security')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.warning }} />
            <span className="text-xs text-gray-600">
              {t('dia.riskAssessment.decentralization')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.cyan }} />
            <span className="text-xs text-gray-600">{t('dia.riskAssessment.stability')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ backgroundColor: chartColors.recharts.purple }} />
            <span className="text-xs text-gray-600">{t('dia.riskAssessment.dataQuality')}</span>
          </div>
        </div>
      </DashboardCard>

      {/* 7. 风险缓解措施 */}
      <MitigationMeasuresGrid measures={mitigationMeasures} />
    </div>
  );
}

export default DIARiskAssessmentPanel;
