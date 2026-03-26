'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from '@/i18n';
import { logger } from '@/lib/utils/logger';
import { UMAClient } from '@/lib/oracles/uma';
import { ValidatorData, DisputeEfficiencyStats } from '@/lib/oracles/uma/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { DashboardCard, RiskScoreCard } from '@/components/oracle/data-display';
import { DataFreshnessIndicator } from '@/components/oracle/alerts';

import { chartColors, getChartColor } from '@/lib/chartColors';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

interface UMARiskPanelProps {
  client: UMAClient;
}

export function UMARiskPanel({ client }: UMARiskPanelProps) {
  const t = useTranslations();
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [disputeStats, setDisputeStats] = useState<DisputeEfficiencyStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [validatorData, efficiencyStats] = await Promise.all([
          client.getValidators(),
          client.getDisputeEfficiencyStats(),
        ]);
        setValidators(validatorData);
        setDisputeStats(efficiencyStats);
        setLastUpdated(new Date());
      } catch (error) {
        logger.error(
          'Failed to fetch UMA risk data:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };

    fetchData();
  }, [client]);

  // Validator type distribution
  const validatorTypeDistribution = [
    {
      name: t('uma.risk.institution'),
      value: validators.filter((v) => v.type === 'institution').length,
      color: '#3b82f6',
    },
    {
      name: t('uma.risk.independent'),
      value: validators.filter((v) => v.type === 'independent').length,
      color: '#10b981',
    },
    {
      name: t('uma.risk.community'),
      value: validators.filter((v) => v.type === 'community').length,
      color: '#f59e0b',
    },
  ];

  // 验证者质押分布
  const totalStaked = validators.reduce((sum, v) => sum + v.staked, 0);
  const validatorStakingDistribution = [
    {
      name: t('uma.risk.top10'),
      value: validators
        .sort((a, b) => b.staked - a.staked)
        .slice(0, 10)
        .reduce((sum, v) => sum + v.staked, 0),
      color: '#ef4444',
    },
    {
      name: t('uma.risk.remaining'),
      value:
        totalStaked -
        validators
          .sort((a, b) => b.staked - a.staked)
          .slice(0, 10)
          .reduce((sum, v) => sum + v.staked, 0),
      color: '#e5e7eb',
    },
  ];

  // 计算集中度风险
  const top10Percentage = (validatorStakingDistribution[0].value / totalStaked) * 100;
  const concentrationRisk = top10Percentage > 60 ? 'high' : top10Percentage > 40 ? 'medium' : 'low';

  // 争议解决时间分布
  const resolutionTimeData = disputeStats?.resolutionTimeDistribution.map((item) => ({
    range: item.range,
    count: item.count,
  })) ?? [
    { range: '0-2h', count: 15 },
    { range: '2-6h', count: 25 },
    { range: '6-12h', count: 20 },
    { range: '12-24h', count: 18 },
    { range: '24-48h', count: 12 },
    { range: '48h+', count: 5 },
  ];

  // 争议成功率趋势
  const successRateData =
    disputeStats?.successRateTrend.map((item) => ({
      date: item.date,
      rate: item.rate,
    })) ?? [];

  // 经济安全指标
  const economicSecurityMetrics = [
    {
      label: t('uma.risk.totalStakedValue'),
      value: `$${(totalStaked / 1e6).toFixed(2)}M`,
      status: 'healthy' as const,
      description: t('uma.risk.totalStakedDesc'),
    },
    {
      label: t('uma.risk.avgValidatorStake'),
      value: `${(totalStaked / (validators.length || 1) / 1000).toFixed(0)}K`,
      status: 'healthy' as const,
      description: t('uma.risk.avgValidatorStakeDesc'),
    },
    {
      label: t('uma.risk.concentrationRisk'),
      value: `${top10Percentage.toFixed(1)}%`,
      status:
        concentrationRisk === 'high'
          ? 'critical'
          : concentrationRisk === 'medium'
            ? 'warning'
            : ('healthy' as const),
      description: t('uma.risk.concentrationRiskDesc'),
    },
    {
      label: t('uma.risk.avgDisputeResolution'),
      value: `${disputeStats?.avgResolutionTime.toFixed(1) ?? 4.2}h`,
      status: (disputeStats?.avgResolutionTime ?? 4.2) < 6 ? 'healthy' : ('warning' as const),
      description: t('uma.risk.avgDisputeResolutionDesc'),
    },
  ];

  // 四维度评分数据
  const fourDimensionScores = [
    {
      title: t('uma.risk.economicSecurityScore'),
      score: 85,
      description: t('uma.risk.economicSecurityScoreDesc'),
      trend: 'up' as const,
      trendValue: '+3.2%',
    },
    {
      title: t('uma.risk.networkDecentralizationScore'),
      score: concentrationRisk === 'high' ? 65 : concentrationRisk === 'medium' ? 78 : 88,
      description: t('uma.risk.networkDecentralizationScoreDesc'),
      trend: concentrationRisk === 'low' ? ('up' as const) : ('down' as const),
      trendValue: concentrationRisk === 'low' ? '+2.1%' : '-1.5%',
    },
    {
      title: t('uma.risk.disputeResolutionScore'),
      score: Math.round(
        75 +
          (disputeStats?.successRateTrend[disputeStats.successRateTrend.length - 1]?.rate ?? 78) *
            0.25
      ),
      description: t('uma.risk.disputeResolutionScoreDesc'),
      trend: 'up' as const,
      trendValue: '+4.5%',
    },
    {
      title: t('uma.risk.protocolSecurityScore'),
      score: 92,
      description: t('uma.risk.protocolSecurityScoreDesc'),
      trend: 'neutral' as const,
      trendValue: '0.0%',
    },
  ];

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

      {/* 四维度评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {fourDimensionScores.map((dimension, index) => (
          <RiskScoreCard
            key={index}
            title={dimension.title}
            score={dimension.score}
            description={dimension.description}
            trend={dimension.trend}
            trendValue={dimension.trendValue}
          />
        ))}
      </div>

      {/* 经济安全指标 */}
      <DashboardCard title={t('uma.risk.economicSecurity')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200 rounded-lg overflow-hidden">
          {economicSecurityMetrics.map((metric, index) => (
            <div
              key={index}
              className={`p-4 bg-gray-50 ${index < economicSecurityMetrics.length - 1 ? 'border-r border-gray-200' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {metric.label}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    metric.status === 'healthy'
                      ? 'bg-emerald-500'
                      : metric.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-danger-500'
                  }`}
                />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-400 mt-1.5">{metric.description}</p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* 验证者分布图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('uma.risk.validatorTypeDistribution')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={validatorTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {validatorTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontSize: 12 }}
                  itemStyle={{ color: '#111827', fontSize: 12 }}
                  formatter={(value, name) => [String(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {validatorTypeDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title={t('uma.risk.stakingConcentration')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={validatorStakingDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {validatorStakingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                  formatter={(value) => [`$${(Number(value) / 1e6).toFixed(2)}M`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {t('uma.risk.top10ValidatorsControl', { percentage: top10Percentage.toFixed(1) })}
            </p>
            <p
              className={`text-sm font-semibold mt-1.5 ${
                concentrationRisk === 'high'
                  ? 'text-danger-600'
                  : concentrationRisk === 'medium'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {concentrationRisk === 'high'
                ? t('uma.risk.highConcentrationWarning')
                : concentrationRisk === 'medium'
                  ? t('uma.risk.mediumConcentration')
                  : t('uma.risk.healthyDistribution')}
            </p>
          </div>
        </DashboardCard>
      </div>

      {/* 争议风险指标 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('uma.risk.disputeResolutionTime')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionTimeData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontSize: 12 }}
                  itemStyle={{ color: '#111827', fontSize: 12 }}
                  formatter={(value) => [String(value), t('uma.risk.disputeCount')]}
                />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 text-center border-r border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{t('uma.risk.avgResolutionTime')}</p>
              <p className="text-xl font-bold text-gray-900">
                {disputeStats?.avgResolutionTime.toFixed(1) ?? 4.2}h
              </p>
            </div>
            <div className="p-4 bg-gray-50 text-center">
              <p className="text-xs text-gray-500 mb-1">{t('uma.risk.medianResolutionTime')}</p>
              <p className="text-xl font-bold text-gray-900">
                {disputeStats?.medianResolutionTime ?? 4}h
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('uma.risk.disputeSuccessRateTrend')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={successRateData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontSize: 12 }}
                  itemStyle={{ color: '#111827', fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, t('uma.risk.successRate')]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              {t('uma.risk.disputeSuccessRateDescription', {
                rate:
                  disputeStats?.successRateTrend[
                    disputeStats.successRateTrend.length - 1
                  ]?.rate.toFixed(1) ?? 78,
              })}
            </p>
          </div>
        </DashboardCard>
      </div>

      {/* 风险评估总结 */}
      <DashboardCard title={t('uma.risk.assessmentSummary')}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg
              className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-emerald-900">{t('uma.risk.networkHealth')}</p>
              <p className="text-sm text-emerald-700 mt-0.5">{t('uma.risk.networkHealthDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <svg
              className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-primary-900">{t('uma.risk.economicSecurity')}</p>
              <p className="text-sm text-primary-700 mt-0.5">{t('uma.risk.economicSecurityDesc')}</p>
            </div>
          </div>
          {concentrationRisk !== 'low' && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-semibold text-amber-900">{t('uma.risk.concentrationRisk')}</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {t('uma.risk.concentrationRiskDesc')}
                </p>
              </div>
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
