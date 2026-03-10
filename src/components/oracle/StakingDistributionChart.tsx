'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';
import { DashboardCard } from './DashboardCard';

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

const COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

const OTHERS_COLOR = '#94a3b8';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PieDataItem }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600 mt-1">质押量: {formatNumber(data.value, true)} BAND</p>
        <p className="text-sm text-gray-600">占比: {data.percentage.toFixed(2)}%</p>
        {data.validator && <p className="text-xs text-gray-400 mt-1">点击查看详情</p>}
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

function getRiskLevelConfig(riskLevel: 'low' | 'medium' | 'high' | 'critical') {
  const configs = {
    low: {
      label: '低风险',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
    },
    medium: {
      label: '中等风险',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200',
    },
    high: {
      label: '高风险',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-200',
    },
    critical: {
      label: '严重风险',
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
            name: '其他验证者',
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
  }, [validators]);

  const allPieData = othersData ? [...pieData, othersData] : pieData;

  const handlePieClick = (_data: PieSectorDataItem, index: number) => {
    if (index < pieData.length && onSegmentClick && pieData[index].validator) {
      onSegmentClick(pieData[index].validator!);
    }
  };

  const riskConfig = getRiskLevelConfig(metrics.riskLevel);

  return (
    <DashboardCard title="验证者质押分布">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">前10名验证者质押占比</h4>
              <span className="text-xs text-gray-500">
                总质押: {formatNumber(totalStake, true)} BAND
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
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`border-2 ${riskConfig.borderColor} ${riskConfig.bgColor} rounded-xl p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Nakamoto 系数</span>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${riskConfig.bgColor} ${riskConfig.color}`}
                >
                  {riskConfig.label}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${riskConfig.color}`}>
                  {metrics.nakamotoCoefficient}
                </span>
                <span className="text-sm text-gray-500 mb-2">个验证者</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                需要至少 {metrics.nakamotoCoefficient} 个验证者合作才能控制 33.3% 的质押量
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Top 3 占比</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.top3Percentage.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${
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
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Top 5 占比</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.top5Percentage.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${
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

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Herfindahl 指数</p>
                  <p className="text-xl font-bold text-gray-900">
                    {metrics.herfindahlIndex.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Top 10 占比</p>
                  <p className="text-xl font-bold text-gray-900">
                    {metrics.top10Percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                HHI 越低表示质押分布越分散（理想值 &lt; 1500）
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">验证者详情</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">排名</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">验证者</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">质押量</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">占比</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    累计占比
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
                            className="w-3 h-3 rounded-full"
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
                          className="w-3 h-3 rounded-full"
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
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
                <h4 className="text-sm font-semibold text-red-800">质押集中度警告</h4>
                <p className="text-sm text-red-700 mt-1">
                  当前网络质押高度集中，前 {metrics.nakamotoCoefficient} 个验证者即可控制超过 33.3%
                  的质押量。这可能导致网络安全性降低，建议关注质押分布变化。
                </p>
              </div>
            </div>
          </div>
        )}

        {metrics.riskLevel === 'high' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-orange-800">质押集中度提醒</h4>
                <p className="text-sm text-orange-700 mt-1">
                  网络质押分布存在一定集中风险，建议持续监控验证者质押变化情况。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">指标说明</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <span className="font-medium">Nakamoto 系数</span>: 需要多少验证者合作才能控制 33.3%
              质押量，数值越大越安全
            </li>
            <li>
              • <span className="font-medium">Herfindahl 指数 (HHI)</span>: 衡量质押集中度，低于
              1500 表示分散，高于 2500 表示高度集中
            </li>
            <li>
              • <span className="font-medium">Top N 占比</span>: 前 N 名验证者的质押总量占比，建议
              Top 3 不超过 33%
            </li>
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}

export type { StakingDistributionChartProps, ConcentrationMetrics };
