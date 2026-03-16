'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';

interface StakingDistributionChartProps {
  validators: ValidatorInfo[];
  onSegmentClick?: (validator: ValidatorInfo) => void;
}

interface PieDataItem {
  name: string;
  value: number;
  percentage: number;
  validator: ValidatorInfo | null;
}

interface ConcentrationMetrics {
  nakamotoCoefficient: number;
  top3Percentage: number;
  top5Percentage: number;
  top10Percentage: number;
  herfindahlIndex: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 使用 chartColors.sequence 作为色板
 * 这些颜色已经过优化，确保色盲友好和高对比度
 */
const COLORS = chartColors.sequence;

/**
 * "其他"分类颜色
 * 使用中灰色，与主色板形成明显对比但不突兀
 */
const OTHERS_COLOR = baseColors.slate[500];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PieDataItem }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const CustomTooltip = ({ active, payload, t }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="rounded p-3"
        style={{
          backgroundColor: baseColors.gray[50],
          border: `1px solid ${baseColors.gray[200]}`,
          boxShadow: shadowColors.tooltip,
        }}
      >
        <p className="font-medium" style={{ color: baseColors.gray[900] }}>
          {data.name}
        </p>
        <p className="text-sm mt-1" style={{ color: baseColors.gray[600] }}>
          {t('stakingDistribution.stakeAmount')}: {formatNumber(data.value, true)} BAND
        </p>
        <p className="text-sm" style={{ color: baseColors.gray[600] }}>
          {t('stakingDistribution.ratio')}: {data.percentage.toFixed(2)}%
        </p>
        {data.validator && (
          <p className="text-xs mt-1" style={{ color: baseColors.gray[400] }}>
            {t('stakingDistribution.clickForDetails')}
          </p>
        )}
      </div>
    );
  }
  return null;
};

function calculateConcentrationMetrics(
  validators: ValidatorInfo[],
  totalStake: number
): ConcentrationMetrics {
  const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);

  const top3Stake = sortedValidators.slice(0, 3).reduce((sum, v) => sum + v.tokens, 0);
  const top5Stake = sortedValidators.slice(0, 5).reduce((sum, v) => sum + v.tokens, 0);
  const top10Stake = sortedValidators.slice(0, 10).reduce((sum, v) => sum + v.tokens, 0);

  const top3Percentage = (top3Stake / totalStake) * 100;
  const top5Percentage = (top5Stake / totalStake) * 100;
  const top10Percentage = (top10Stake / totalStake) * 100;

  let cumulativeStake = 0;
  let nakamotoCoefficient = 0;
  const targetStake = totalStake * 0.333;

  for (const validator of sortedValidators) {
    cumulativeStake += validator.tokens;
    nakamotoCoefficient++;
    if (cumulativeStake >= targetStake) {
      break;
    }
  }

  const percentages = validators.map((v) => (v.tokens / totalStake) * 100);
  const herfindahlIndex = percentages.reduce((sum, p) => sum + Math.pow(p, 2), 0);

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (nakamotoCoefficient <= 3 || top3Percentage >= 50) {
    riskLevel = 'critical';
  } else if (nakamotoCoefficient <= 5 || top3Percentage >= 40) {
    riskLevel = 'high';
  } else if (nakamotoCoefficient <= 7 || top3Percentage >= 33) {
    riskLevel = 'medium';
  }

  return {
    nakamotoCoefficient,
    top3Percentage,
    top5Percentage,
    top10Percentage,
    herfindahlIndex: Math.round(herfindahlIndex * 100) / 100,
    riskLevel,
  };
}

function getRiskLevelConfig(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const configs = {
    low: {
      label: t('stakingDistribution.riskLevel.low'),
      color: semanticColors.success.DEFAULT,
      bgColor: semanticColors.success.light,
      borderColor: semanticColors.success.light,
    },
    medium: {
      label: t('stakingDistribution.riskLevel.medium'),
      color: semanticColors.warning.DEFAULT,
      bgColor: semanticColors.warning.light,
      borderColor: semanticColors.warning.light,
    },
    high: {
      label: t('stakingDistribution.riskLevel.high'),
      color: semanticColors.warning.dark,
      bgColor: semanticColors.warning.light,
      borderColor: semanticColors.warning.light,
    },
    critical: {
      label: t('stakingDistribution.riskLevel.critical'),
      color: semanticColors.danger.DEFAULT,
      bgColor: semanticColors.danger.light,
      borderColor: semanticColors.danger.light,
    },
  };
  return configs[riskLevel];
}

export function StakingDistributionChart({
  validators,
  onSegmentClick,
}: StakingDistributionChartProps) {
  const { t } = useI18n();

  const { pieData, totalStake, metrics, othersData } = useMemo(() => {
    const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);
    const total = sortedValidators.reduce((sum, v) => sum + v.tokens, 0);
    const top10 = sortedValidators.slice(0, 10);
    const othersStake = sortedValidators.slice(10).reduce((sum, v) => sum + v.tokens, 0);

    const data: PieDataItem[] = top10.map((validator) => ({
      name: validator.moniker,
      value: validator.tokens,
      percentage: (validator.tokens / total) * 100,
      validator,
    }));

    const others: PieDataItem | null =
      othersStake > 0
        ? {
            name: t('stakingDistribution.othersValidators'),
            value: othersStake,
            percentage: (othersStake / total) * 100,
            validator: null,
          }
        : null;

    const concentrationMetrics = calculateConcentrationMetrics(validators, total);

    return {
      pieData: data,
      totalStake: total,
      metrics: concentrationMetrics,
      othersData: others,
    };
  }, [validators, t]);

  const allPieData = othersData ? [...pieData, othersData] : pieData;

  const handlePieClick = (_data: PieSectorDataItem, index: number) => {
    if (index < pieData.length && onSegmentClick && pieData[index].validator) {
      onSegmentClick(pieData[index].validator!);
    }
  };

  const riskConfig = getRiskLevelConfig(metrics.riskLevel, t);

  return (
    <DashboardCard title={t('stakingDistribution.title')}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">
                {t('stakingDistribution.top10StakeRatio')}
              </h4>
              <span className="text-xs text-gray-500">
                {t('stakingDistribution.totalStake')}: {formatNumber(totalStake, true)} BAND
              </span>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handlePieClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {allPieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index < COLORS.length ? COLORS[index] : OTHERS_COLOR}
                        stroke={baseColors.gray[50]}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip t={t} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="rounded p-4"
              style={{
                borderWidth: 2,
                borderColor: riskConfig.borderColor,
                backgroundColor: riskConfig.bgColor,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: baseColors.gray[700] }}>
                  {t('stakingDistribution.nakamotoCoefficient')}
                </span>
                <span
                  className="px-3 py-1 text-xs font-semibold rounded"
                  style={{ backgroundColor: riskConfig.bgColor, color: riskConfig.color }}
                >
                  {riskConfig.label}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold" style={{ color: riskConfig.color }}>
                  {metrics.nakamotoCoefficient}
                </span>
                <span className="text-sm mb-2" style={{ color: baseColors.gray[500] }}>
                  {t('stakingDistribution.validators')}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: baseColors.gray[600] }}>
                {t('stakingDistribution.nakamotoDesc', { count: metrics.nakamotoCoefficient })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded p-3" style={{ backgroundColor: baseColors.gray[50] }}>
                <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
                  {t('stakingDistribution.top3Ratio')}
                </p>
                <p className="text-xl font-bold" style={{ color: baseColors.gray[900] }}>
                  {metrics.top3Percentage.toFixed(1)}%
                </p>
                <div
                  className="w-full rounded h-1.5 mt-2"
                  style={{ backgroundColor: baseColors.gray[200] }}
                >
                  <div
                    className="h-1.5 rounded"
                    style={{
                      width: `${Math.min(metrics.top3Percentage, 100)}%`,
                      backgroundColor:
                        metrics.top3Percentage >= 50
                          ? semanticColors.danger.DEFAULT
                          : metrics.top3Percentage >= 33
                            ? semanticColors.warning.DEFAULT
                            : semanticColors.success.DEFAULT,
                    }}
                  />
                </div>
              </div>
              <div className="rounded p-3" style={{ backgroundColor: baseColors.gray[50] }}>
                <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
                  {t('stakingDistribution.top5Ratio')}
                </p>
                <p className="text-xl font-bold" style={{ color: baseColors.gray[900] }}>
                  {metrics.top5Percentage.toFixed(1)}%
                </p>
                <div
                  className="w-full rounded h-1.5 mt-2"
                  style={{ backgroundColor: baseColors.gray[200] }}
                >
                  <div
                    className="h-1.5 rounded"
                    style={{
                      width: `${Math.min(metrics.top5Percentage, 100)}%`,
                      backgroundColor:
                        metrics.top5Percentage >= 60
                          ? semanticColors.danger.DEFAULT
                          : metrics.top5Percentage >= 45
                            ? semanticColors.warning.DEFAULT
                            : semanticColors.success.DEFAULT,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded p-3" style={{ backgroundColor: baseColors.gray[50] }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
                    {t('stakingDistribution.herfindahlIndex')}
                  </p>
                  <p className="text-xl font-bold" style={{ color: baseColors.gray[900] }}>
                    {metrics.herfindahlIndex.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
                    {t('stakingDistribution.top10Ratio')}
                  </p>
                  <p className="text-xl font-bold" style={{ color: baseColors.gray[900] }}>
                    {metrics.top10Percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: baseColors.gray[400] }}>
                {t('stakingDistribution.hhiDesc')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('stakingDistribution.validatorDetails')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                    {t('stakingDistribution.rank')}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                    {t('stakingDistribution.validator')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('stakingDistribution.stakeAmount')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('stakingDistribution.ratio')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('stakingDistribution.cumulativeRatio')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pieData.map((item, index) => {
                  const cumulativePercentage = pieData
                    .slice(0, index + 1)
                    .reduce((sum, v) => sum + v.percentage, 0);

                  return (
                    <tr
                      key={item.validator!.operatorAddress}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onSegmentClick?.(item.validator!)}
                    >
                      <td className="py-2.5 px-3">
                        <span className="text-sm font-medium text-gray-600">
                          #{item.validator!.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-2.5 px-3">
                        <span className="text-sm text-gray-900">
                          {formatNumber(item.value, true)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">BAND</span>
                      </td>
                      <td className="text-right py-2.5 px-3">
                        <span className="text-sm text-gray-600">{item.percentage.toFixed(2)}%</span>
                      </td>
                      <td className="text-right py-2.5 px-3">
                        <span
                          className={`text-sm font-medium ${
                            cumulativePercentage >= 33.3 ? 'text-orange-600' : 'text-gray-600'
                          }`}
                        >
                          {cumulativePercentage.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {othersData && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-2.5 px-3">
                      <span className="text-sm text-gray-400">-</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: OTHERS_COLOR }}
                        />
                        <span className="text-sm text-gray-500">{othersData.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span className="text-sm text-gray-500">
                        {formatNumber(othersData.value, true)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">BAND</span>
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span className="text-sm text-gray-500">
                        {othersData.percentage.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span className="text-sm text-gray-500">100%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {metrics.riskLevel === 'critical' && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800">
                  {t('stakingDistribution.concentrationWarning')}
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  {t('stakingDistribution.concentrationWarningDesc', {
                    count: metrics.nakamotoCoefficient,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {metrics.riskLevel === 'high' && (
          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-orange-800">
                  {t('stakingDistribution.concentrationReminder')}
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  {t('stakingDistribution.concentrationReminderDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {t('stakingDistribution.metricsExplanation')}
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <span className="font-medium">{t('stakingDistribution.nakamotoExplanation')}</span>
            </li>
            <li>
              • <span className="font-medium">{t('stakingDistribution.hhiExplanation')}</span>
            </li>
            <li>
              • <span className="font-medium">{t('stakingDistribution.topNExplanation')}</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}

export type { StakingDistributionChartProps, ConcentrationMetrics };
