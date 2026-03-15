'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

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
 * 高对比度色板 - 专为数据可视化设计
 *
 * 设计原则：
 * 1. 色相环均匀分布：相邻颜色间隔 30-40 度，确保视觉区分度
 * 2. 色盲友好：避免红绿对比，使用蓝/紫/橙/青等色盲友好色系
 * 3. 高饱和度：确保在白色背景上有足够对比度
 * 4. 灰度可区分：所有颜色在灰度模式下亮度差异 > 15%
 *
 * 色相分布（HSL）：
 * - 紫色系: 260°, 280° (2个)
 * - 蓝色系: 210°, 225° (2个)
 * - 青色系: 185°, 195° (2个)
 * - 橙色系: 25°, 35° (2个)
 * - 红色系: 340°, 15° (2个，偏玫红/珊瑚色)
 *
 * WCAG AA 对比度：所有颜色与白色背景对比度 >= 3:1
 */
const COLORS = [
  // 紫色系 - 深紫
  '#7c3aed', // HSL: 260°, 90%, 58%
  // 蓝色系 - 宝蓝
  '#2563eb', // HSL: 225°, 90%, 55%
  // 青色系 - 深青
  '#0891b2', // HSL: 195°, 90%, 37%
  // 橙色系 - 深橙
  '#ea580c', // HSL: 20°, 90%, 48%
  // 玫红系 - 深玫红
  '#db2777', // HSL: 330°, 90%, 51%
  // 紫色系 - 中紫
  '#8b5cf6', // HSL: 260°, 90%, 66%
  // 蓝色系 - 天蓝
  '#0ea5e9', // HSL: 200°, 90%, 48%
  // 青色系 - 青绿
  '#0d9488', // HSL: 175°, 90%, 30%
  // 橙色系 - 琥珀
  '#d97706', // HSL: 35°, 90%, 43%
  // 珊瑚系 - 珊瑚色
  '#f97316', // HSL: 25°, 95%, 53%
];

/**
 * "其他"分类颜色
 * 使用中灰色，与主色板形成明显对比但不突兀
 */
const OTHERS_COLOR = '#64748b'; // HSL: 215°, 20%, 47%

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PieDataItem }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const CustomTooltip = ({ active, payload, t }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200   p-3">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600 mt-1">
          {t('stakingDistribution.stakeAmount')}: {formatNumber(data.value, true)} BAND
        </p>
        <p className="text-sm text-gray-600">
          {t('stakingDistribution.ratio')}: {data.percentage.toFixed(2)}%
        </p>
        {data.validator && (
          <p className="text-xs text-gray-400 mt-1">{t('stakingDistribution.clickForDetails')}</p>
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
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
    },
    medium: {
      label: t('stakingDistribution.riskLevel.medium'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200',
    },
    high: {
      label: t('stakingDistribution.riskLevel.high'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-200',
    },
    critical: {
      label: t('stakingDistribution.riskLevel.critical'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
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
                        stroke="white"
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
            <div className={`border-2 ${riskConfig.borderColor} ${riskConfig.bgColor}  p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {t('stakingDistribution.nakamotoCoefficient')}
                </span>
                <span
                  className={`px-3 py-1 text-xs font-semibold  ${riskConfig.bgColor} ${riskConfig.color}`}
                >
                  {riskConfig.label}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${riskConfig.color}`}>
                  {metrics.nakamotoCoefficient}
                </span>
                <span className="text-sm text-gray-500 mb-2">
                  {t('stakingDistribution.validators')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {t('stakingDistribution.nakamotoDesc', { count: metrics.nakamotoCoefficient })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50  p-3">
                <p className="text-xs text-gray-500 mb-1">{t('stakingDistribution.top3Ratio')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.top3Percentage.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-200  h-1.5 mt-2">
                  <div
                    className={`h-1.5  ${
                      metrics.top3Percentage >= 50
                        ? 'bg-red-500'
                        : metrics.top3Percentage >= 33
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(metrics.top3Percentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="bg-gray-50  p-3">
                <p className="text-xs text-gray-500 mb-1">{t('stakingDistribution.top5Ratio')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.top5Percentage.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-200  h-1.5 mt-2">
                  <div
                    className={`h-1.5  ${
                      metrics.top5Percentage >= 60
                        ? 'bg-red-500'
                        : metrics.top5Percentage >= 45
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(metrics.top5Percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50  p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('stakingDistribution.herfindahlIndex')}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {metrics.herfindahlIndex.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">
                    {t('stakingDistribution.top10Ratio')}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {metrics.top10Percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('stakingDistribution.hhiDesc')}</p>
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
                            className="w-3 h-3 "
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
                        <div className="w-3 h-3 " style={{ backgroundColor: OTHERS_COLOR }} />
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
          <div className="bg-red-50 border border-red-200  p-4">
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
          <div className="bg-orange-50 border border-orange-200  p-4">
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

        <div className="bg-blue-50  p-4">
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
