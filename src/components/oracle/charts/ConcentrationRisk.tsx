'use client';

import { useMemo } from 'react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors } from '@/lib/config/colors';

interface PublisherData {
  name: string;
  weight: number;
  submissions: number;
  reliability: number;
  status: 'active' | 'degraded' | 'inactive';
}

interface ConcentrationMetrics {
  diversityScore: number;
  herfindahlIndex: number;
  topPublisherWeight: number;
  singleFailureImpact: 'low' | 'medium' | 'high';
}

function generateMockPublishers(): PublisherData[] {
  return [
    { name: 'Publisher A', weight: 35, submissions: 1250, reliability: 99.2, status: 'active' },
    { name: 'Publisher B', weight: 25, submissions: 890, reliability: 98.5, status: 'active' },
    { name: 'Publisher C', weight: 20, submissions: 720, reliability: 97.8, status: 'active' },
    { name: 'Publisher D', weight: 12, submissions: 430, reliability: 96.5, status: 'active' },
    { name: 'Publisher E', weight: 5, submissions: 180, reliability: 94.2, status: 'degraded' },
    { name: 'Publisher F', weight: 3, submissions: 110, reliability: 92.0, status: 'active' },
  ];
}

function calculateConcentrationMetrics(publishers: PublisherData[]): ConcentrationMetrics {
  const herfindahlIndex = publishers.reduce((sum, p) => sum + Math.pow(p.weight, 2), 0);
  const topPublisherWeight = Math.max(...publishers.map((p) => p.weight));

  let diversityScore = 100;
  if (herfindahlIndex > 2500) {
    diversityScore = Math.max(0, 100 - (herfindahlIndex - 1000) / 25);
  } else if (herfindahlIndex > 1500) {
    diversityScore = Math.max(50, 100 - (herfindahlIndex - 1000) / 30);
  }

  let singleFailureImpact: 'low' | 'medium' | 'high' = 'low';
  if (topPublisherWeight >= 40) {
    singleFailureImpact = 'high';
  } else if (topPublisherWeight >= 25) {
    singleFailureImpact = 'medium';
  }

  return {
    diversityScore: Math.round(diversityScore),
    herfindahlIndex: Math.round(herfindahlIndex),
    topPublisherWeight,
    singleFailureImpact,
  };
}

const COLORS = [
  chartColors.recharts.purple,
  chartColors.recharts.primary,
  chartColors.recharts.success,
  chartColors.recharts.warning,
  chartColors.recharts.danger,
  chartColors.recharts.tick,
];

export function ConcentrationRisk() {
  const t = useTranslations();
  const publishers = useMemo(() => generateMockPublishers(), []);
  const metrics = useMemo(() => calculateConcentrationMetrics(publishers), [publishers]);

  const getDiversityLevel = (score: number): { label: string; color: string } => {
    if (score >= 80)
      return { label: t('concentrationRisk.diversityLevel.excellent'), color: 'text-success-600' };
    if (score >= 60)
      return { label: t('concentrationRisk.diversityLevel.good'), color: 'text-primary-600' };
    if (score >= 40)
      return { label: t('concentrationRisk.diversityLevel.fair'), color: 'text-warning-600' };
    return { label: t('concentrationRisk.diversityLevel.poor'), color: 'text-danger-600' };
  };

  const getImpactLevel = (
    impact: 'low' | 'medium' | 'high'
  ): {
    label: string;
    color: string;
    bgColor: string;
  } => {
    switch (impact) {
      case 'low':
        return {
          label: t('concentrationRisk.impactLevel.low'),
          color: 'text-success-600',
          bgColor: 'bg-success-100',
        };
      case 'medium':
        return {
          label: t('concentrationRisk.impactLevel.medium'),
          color: 'text-warning-600',
          bgColor: 'bg-warning-100',
        };
      case 'high':
        return {
          label: t('concentrationRisk.impactLevel.high'),
          color: 'text-danger-600',
          bgColor: 'bg-danger-100',
        };
    }
  };

  const getStatusLabel = (status: 'active' | 'degraded' | 'inactive'): string => {
    switch (status) {
      case 'active':
        return t('concentrationRisk.status.active');
      case 'degraded':
        return t('concentrationRisk.status.degraded');
      case 'inactive':
        return t('concentrationRisk.status.inactive');
    }
  };

  const getImpactDescription = (impact: 'low' | 'medium' | 'high'): string => {
    const impactKey = impact === 'high' ? 'high' : impact === 'medium' ? 'medium' : 'low';
    return `${t('concentrationRisk.impactDescription.prefix')}${t(`concentrationRisk.impactDescription.${impactKey}`)}${t('concentrationRisk.impactDescription.suffix')}`;
  };

  const diversityLevel = getDiversityLevel(metrics.diversityScore);
  const impactLevel = getImpactLevel(metrics.singleFailureImpact);

  const pieData = publishers.map((p) => ({
    name: p.name,
    value: p.weight,
  }));

  return (
    <DashboardCard title={t('concentrationRisk.title')}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">
                {t('concentrationRisk.publisherWeightDistribution')}
              </h4>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={{ stroke: chartColors.recharts.axis, strokeWidth: 1 }}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [`${value}%`, t('concentrationRisk.weight')]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: `1px solid ${baseColors.gray[200]}`,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50  p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('concentrationRisk.diversityScore')}
                </span>
                <span className={`text-sm font-medium ${diversityLevel.color}`}>
                  {diversityLevel.label}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${diversityLevel.color}`}>
                  {metrics.diversityScore}
                </span>
                <span className="text-sm text-gray-500 mb-1">/100</span>
              </div>
              <div className="w-full bg-gray-200  h-2 mt-2">
                <div
                  className={`h-2  ${
                    metrics.diversityScore >= 80
                      ? 'bg-success-500'
                      : metrics.diversityScore >= 60
                        ? 'bg-primary-500'
                        : metrics.diversityScore >= 40
                          ? 'bg-warning-500'
                          : 'bg-danger-500'
                  }`}
                  style={{ width: `${metrics.diversityScore}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50  p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {t('concentrationRisk.herfindahlIndex')}
                </p>
                <p className="text-lg font-bold text-gray-900">{metrics.herfindahlIndex}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('concentrationRisk.herfindahlIndexDesc')}
                </p>
              </div>
              <div className="bg-gray-50  p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {t('concentrationRisk.maxPublisherWeight')}
                </p>
                <p className="text-lg font-bold text-gray-900">{metrics.topPublisherWeight}%</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('concentrationRisk.maxPublisherWeightDesc')}
                </p>
              </div>
            </div>

            <div className="bg-gray-50  p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('concentrationRisk.singlePublisherFailureImpact')}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium  ${impactLevel.bgColor} ${impactLevel.color}`}
                >
                  {impactLevel.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {getImpactDescription(metrics.singleFailureImpact)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('concentrationRisk.publisherDetails')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                    {t('concentrationRisk.table.name')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('concentrationRisk.table.weight')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('concentrationRisk.table.submissions')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('concentrationRisk.table.reliability')}
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">
                    {t('concentrationRisk.table.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {publishers.map((publisher, index) => (
                  <tr key={publisher.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 "
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-900">{publisher.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-900">
                      {publisher.weight}%
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-600">
                      {publisher.submissions.toLocaleString()}
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-600">
                      {publisher.reliability}%
                    </td>
                    <td className="text-center py-2 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium  ${
                          publisher.status === 'active'
                            ? 'bg-success-100 text-success-700'
                            : publisher.status === 'degraded'
                              ? 'bg-warning-100 text-warning-700'
                              : 'bg-danger-100 text-danger-700'
                        }`}
                      >
                        {getStatusLabel(publisher.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-primary-50  p-4">
          <h4 className="text-sm font-medium text-primary-900 mb-2">
            {t('concentrationRisk.riskExplanation.title')}
          </h4>
          <ul className="text-sm text-primary-800 space-y-1">
            <li>• {t('concentrationRisk.riskExplanation.item1')}</li>
            <li>• {t('concentrationRisk.riskExplanation.item2')}</li>
            <li>• {t('concentrationRisk.riskExplanation.item3')}</li>
            <li>• {t('concentrationRisk.riskExplanation.item4')}</li>
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
