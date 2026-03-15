'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardCard } from './DashboardCard';
import {
  UMAClient,
  ValidatorEarningsAttribution,
  NetworkEarningsAttribution,
  EarningsSourceType,
  EarningsSourceLabels,
  ValidatorData,
} from '@/lib/oracles/uma';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ValidatorEarningsBreakdown');

// 导出类型定义
export interface ValidatorEarningsBreakdownProps {
  validators: ValidatorData[];
  selectedValidatorId?: string;
  onValidatorSelect?: (validatorId: string) => void;
}

export interface EarningsSourceBreakdown {
  type: 'base' | 'dispute' | 'other';
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export interface EfficiencyMetrics {
  earningsPerStaked: number;
  roi: number;
  yieldEfficiency: number;
  comparisonToNetwork: number;
}

// 收益来源颜色配置
const sourceColors: Record<EarningsSourceType, string> = {
  base: chartColors.recharts.primary,
  dispute: chartColors.recharts.warning,
  other: chartColors.recharts.success,
};

const sourceBgColors: Record<EarningsSourceType, string> = {
  base: 'bg-blue-50',
  dispute: 'bg-amber-50',
  other: 'bg-emerald-50',
};

const sourceTextColors: Record<EarningsSourceType, string> = {
  base: 'text-blue-600',
  dispute: 'text-amber-600',
  other: 'text-emerald-600',
};

// 趋势图标
function TrendIcon({ trend, value, t }: { trend: 'up' | 'down' | 'stable'; value: number; t: (key: string) => string }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        +{value}%
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-1 text-red-600 text-xs">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        {value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-gray-500 text-xs">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
      {t('common.stable')}
    </span>
  );
}

// 饼图组件
function EarningsPieChart({
  data,
  size = 160,
}: {
  data: { type: EarningsSourceType; value: number; percentage: number }[];
  size?: number;
}) {
  const { t } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  let currentAngle = 0;
  const segments = data.map((item) => {
    const angle = (item.percentage / 100) * 360;
    const segment = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    };
    currentAngle += angle;
    return segment;
  });

  const createArcPath = (startAngle: number, endAngle: number, radius: number = size * 0.4) => {
    const center = size / 2;
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArcPath(segment.startAngle, segment.endAngle)}
            fill={sourceColors[segment.type]}
            className="transition-all duration-200 cursor-pointer"
            style={{
              opacity: hoveredIndex === index ? 1 : hoveredIndex !== null ? 0.5 : 0.9,
              transform: hoveredIndex === index ? `scale(1.05)` : 'scale(1)',
              transformOrigin: 'center',
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
        {/* 中心空白 */}
        <circle cx={size / 2} cy={size / 2} r={size * 0.22} fill="white" />
      </svg>

      {/* 图例 */}
      <div className="mt-4 space-y-2 w-full">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm cursor-pointer"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: sourceColors[segment.type] }}
              />
              <span className="text-gray-600">{t(EarningsSourceLabels[segment.type])}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{segment.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 柱状图组件 - 收益历史趋势
function EarningsHistoryChart({
  data,
  height = 180,
  t,
}: {
  data: ValidatorEarningsAttribution['history'];
  height?: number;
  t: (key: string) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        {t('common.noData')}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.total));
  const displayData = data.slice(-14); // 显示最近14天

  return (
    <div className="h-full">
      <div className="h-48 relative">
        {/* 网格线 */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-gray-100 h-0" />
          ))}
        </div>

        {/* 堆叠柱状图 */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
          {displayData.map((item, index) => {
            const baseHeight = (item.base / maxValue) * 100;
            const disputeHeight = (item.dispute / maxValue) * 100;
            const otherHeight = (item.other / maxValue) * 100;

            return (
              <div
                key={index}
                className="flex-1 flex flex-col justify-end items-center group relative"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                  <div>{item.date}</div>
                  <div>
                    {t('validator.base')}: {item.base.toFixed(2)}
                  </div>
                  <div>
                    {t('validator.dispute')}: {item.dispute.toFixed(2)}
                  </div>
                  <div>
                    {t('validator.other')}: {item.other.toFixed(2)}
                  </div>
                  <div className="border-t border-gray-600 mt-1 pt-1">
                    {t('validator.total')}: {item.total.toFixed(2)}
                  </div>
                </div>

                {/* 堆叠柱 */}
                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-emerald-500 -sm transition-all duration-200"
                    style={{ height: `${otherHeight}%` }}
                  />
                  <div
                    className="w-full bg-amber-500 transition-all duration-200"
                    style={{ height: `${disputeHeight}%` }}
                  />
                  <div
                    className="w-full bg-blue-500 transition-all duration-200"
                    style={{ height: `${baseHeight}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X轴标签 */}
      <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
        <span>{displayData[0]?.date}</span>
        <span>{displayData[Math.floor(displayData.length / 2)]?.date}</span>
        <span>{displayData[displayData.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// 效率指标卡片
function EfficiencyMetricCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendValue,
  t,
}: {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  t: (key: string) => string;
}) {
  return (
    <div className="bg-gray-50  p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {trend && trendValue !== undefined && (
        <div className="mt-2">
          <TrendIcon trend={trend} value={trendValue} t={t} />
        </div>
      )}
    </div>
  );
}

// 主组件
export function ValidatorEarningsBreakdown({
  validators,
  selectedValidatorId,
  onValidatorSelect,
}: ValidatorEarningsBreakdownProps) {
  const { t } = useI18n();
  const [selectedValidator, setSelectedValidator] = useState<string>(
    selectedValidatorId || validators[0]?.id || ''
  );
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [attribution, setAttribution] = useState<ValidatorEarningsAttribution | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkEarningsAttribution | null>(null);
  const [loading, setLoading] = useState(true);

  const umaClient = new UMAClient();

  const fetchData = useCallback(async () => {
    if (!selectedValidator) return;

    setLoading(true);
    try {
      const [attributionData, networkData] = await Promise.all([
        umaClient.getValidatorEarningsAttribution(selectedValidator, period),
        umaClient.getNetworkEarningsAttribution(),
      ]);
      setAttribution(attributionData);
      setNetworkStats(networkData);
    } catch (error) {
      logger.error(
        'Failed to fetch earnings attribution',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
    }
  }, [selectedValidator, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedValidatorId) {
      setSelectedValidator(selectedValidatorId);
    }
  }, [selectedValidatorId]);

  const handleValidatorChange = (validatorId: string) => {
    setSelectedValidator(validatorId);
    onValidatorSelect?.(validatorId);
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const periodLabels: Record<typeof period, string> = {
    daily: t('common.daily'),
    weekly: t('common.weekly'),
    monthly: t('common.monthly'),
    yearly: t('common.yearly'),
  };

  if (loading) {
    return (
      <DashboardCard title={t('validator.earningsAttribution')}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin  h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-gray-500 text-sm">{t('common.loading')}</p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  if (!attribution || !networkStats) {
    return (
      <DashboardCard title={t('validator.earningsAttribution')}>
        <div className="flex items-center justify-center h-64 text-gray-400">
          {t('common.noData')}
        </div>
      </DashboardCard>
    );
  }

  const pieChartData = attribution.sources.map((s) => ({
    type: s.type,
    value: s.amount,
    percentage: s.percentage,
  }));

  return (
    <DashboardCard title={t('validator.validatorEarningsAttribution')}>
      <div className="space-y-6">
        {/* 控制栏 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('validator.selectValidator')}
            </label>
            <select
              value={selectedValidator}
              onChange={(e) => handleValidatorChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              {validators.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({t(`validator.type.${v.type}`)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('validator.timePeriod')}
            </label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2.5 text-sm font-medium  transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 总收益概览 */}
        <div className="bg-gray-100 border border-gray-200  p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{attribution.validatorName}</h3>
              <p className="text-sm text-gray-500">
                {periodLabels[period]}
                {t('validator.totalEarnings')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                {formatNumber(attribution.totalEarnings)}
              </p>
              <p className="text-sm text-gray-500">UMA</p>
            </div>
          </div>

          {/* 收益来源分布 */}
          <div className="grid grid-cols-3 gap-4">
            {attribution.sources.map((source) => (
              <div key={source.type} className={`${sourceBgColors[source.type]}  p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${sourceTextColors[source.type]}`}>
                    {EarningsSourceLabels[source.type]}
                  </span>
                  <TrendIcon trend={source.trend} value={source.trendValue} t={t} />
                </div>
                <p className={`text-lg font-bold ${sourceTextColors[source.type]}`}>
                  {formatNumber(source.amount)}
                </p>
                <p className="text-xs text-gray-500">{source.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* 效率指标 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('validator.efficiencyMetrics')}
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <EfficiencyMetricCard
              title={t('validator.earningsPerStaked')}
              value={formatNumber(attribution.efficiency.earningsPerStaked, 6)}
              unit="UMA"
              subtitle={t('validator.earningsPerStakedSubtitle')}
              t={t}
            />
            <EfficiencyMetricCard
              title={t('validator.roi')}
              value={formatNumber(attribution.efficiency.roi)}
              unit="%"
              subtitle={t('validator.annualYield')}
              trend={
                attribution.efficiency.roi > networkStats.networkEfficiency.avgRoi ? 'up' : 'down'
              }
              trendValue={Math.abs(attribution.efficiency.comparisonToNetwork)}
              t={t}
            />
            <EfficiencyMetricCard
              title={t('validator.yieldEfficiency')}
              value={formatNumber(attribution.efficiency.yieldEfficiency)}
              unit="/100"
              subtitle={t('validator.relativeToBenchmark')}
              t={t}
            />
            <EfficiencyMetricCard
              title={t('validator.networkComparison')}
              value={attribution.efficiency.comparisonToNetwork > 0 ? '+' : ''}
              subtitle={`${formatNumber(attribution.efficiency.comparisonToNetwork)}% ${t('validator.relativeToAverage')}`}
              trend={attribution.efficiency.comparisonToNetwork > 0 ? 'up' : 'down'}
              trendValue={Math.abs(attribution.efficiency.comparisonToNetwork)}
              t={t}
            />
          </div>
        </div>

        {/* 可视化图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 收益来源分布饼图 */}
          <div className="bg-white border border-gray-200  p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900">
                {t('validator.earningsDistribution')}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('validator.earningsDistributionDesc')}
              </p>
            </div>
            <EarningsPieChart data={pieChartData} />
          </div>

          {/* 收益历史趋势 */}
          <div className="bg-white border border-gray-200  p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900">
                {t('validator.earningsHistory')}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">{t('validator.earningsHistoryDesc')}</p>
            </div>
            <EarningsHistoryChart data={attribution.history} t={t} />
          </div>
        </div>

        {/* 网络对比 */}
        <div className="bg-gray-50  p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('validator.networkAvgComparison')}
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">
                {t('validator.networkAvgEarningsPerStaked')}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(networkStats.networkEfficiency.avgEarningsPerStaked, 6)}
              </p>
              <p className="text-xs text-gray-400">UMA</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">{t('validator.networkAvgRoi')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(networkStats.networkEfficiency.avgRoi)}
              </p>
              <p className="text-xs text-gray-400">%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">{t('validator.networkAvgEfficiency')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatNumber(networkStats.networkEfficiency.avgYieldEfficiency)}
              </p>
              <p className="text-xs text-gray-400">/100</p>
            </div>
          </div>
        </div>

        {/* 效率排名 */}
        <div className="border border-gray-200  p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('validator.top5EfficiencyRanking')}
          </h4>
          <div className="space-y-3">
            {networkStats.topPerformers.map((performer, index) => (
              <div
                key={performer.validatorId}
                className={`flex items-center justify-between p-3  ${
                  performer.validatorId === selectedValidator
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6  text-xs font-semibold ${
                      index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {performer.efficiencyRank}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {performer.validatorName}
                  </span>
                  {performer.validatorId === selectedValidator && (
                    <span className="text-xs text-blue-600 font-medium">{t('common.current')}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(performer.earningsPerStaked, 6)} UMA/{t('common.unit')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default ValidatorEarningsBreakdown;
