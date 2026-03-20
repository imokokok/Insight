'use client';

import { useState, useEffect } from 'react';
import { DashboardCard } from './DashboardCard';
import { UMAClient, DisputeAmountDistributionStats } from '@/lib/oracles/uma';
import { useTranslations } from 'next-intl';
import { createLogger } from '@/lib/utils/logger';
import { chartColors } from '@/lib/config/colors';

const logger = createLogger('DisputeAmountDistribution');

// 格式化金额显示
function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

// 统计卡片组件
function StatCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
}: {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}) {
  const trendColors = {
    up: 'text-success-600',
    down: 'text-danger-600',
    stable: 'text-gray-500',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <div className="bg-white border border-gray-200  p-5 hover:border-gray-300 transition-colors duration-200">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-gray-900 text-2xl font-bold">{value}</p>
      {subValue && <p className="text-gray-500 text-sm mt-1">{subValue}</p>}
      {trend && trendValue && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColors[trend]}`}>
          <span>{trendIcons[trend]}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

// 金额分布直方图
function AmountDistributionHistogram({
  amountRanges,
}: {
  amountRanges: DisputeAmountDistributionStats['amountRanges'];
}) {
  const t = useTranslations();
  const maxCount = Math.max(...amountRanges.map((r) => r.count));

  return (
    <DashboardCard title={t('uma.disputeResolution.amountDistribution') || '争议金额分布'}>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-2 h-48">
          {amountRanges.map((range, index) => {
            const height = maxCount > 0 ? (range.count / maxCount) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-40">
                  <div
                    className="w-full bg-primary-500  transition-all duration-300 hover:bg-primary-600 relative group cursor-pointer"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                      <div>数量: {range.count}</div>
                      <div>平均奖励: {formatAmount(range.avgReward)} UMA</div>
                      <div>ROI: {range.roi.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{range.range}</span>
              </div>
            );
          })}
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary-500 rounded"></div>
            <span className="text-sm text-gray-600">争议数量</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// 奖励效率指标卡片
function EfficiencyMetricsCard({
  efficiency,
  totalResolved,
}: {
  efficiency: DisputeAmountDistributionStats['efficiency'];
  totalResolved: number;
}) {
  const t = useTranslations();

  const metrics = [
    {
      label: t('uma.disputeResolution.avgRewardToStakeRatio') || '平均奖励/质押比例',
      value: `${(efficiency.avgRewardToStakeRatio * 100).toFixed(1)}%`,
      description: '每单位质押获得的奖励比例',
      color: 'blue',
    },
    {
      label: t('uma.disputeResolution.avgRoi') || '平均 ROI',
      value: `${efficiency.avgRoi.toFixed(1)}%`,
      description: '投资回报率',
      color: 'green',
    },
    {
      label: t('uma.disputeResolution.highEfficiencyCount') || '高效争议',
      value: efficiency.highEfficiencyCount.toString(),
      subValue:
        totalResolved > 0
          ? `${((efficiency.highEfficiencyCount / totalResolved) * 100).toFixed(1)}%`
          : '0%',
      description: 'ROI > 50% 的争议数量',
      color: 'purple',
    },
    {
      label: t('uma.disputeResolution.lowEfficiencyCount') || '低效争议',
      value: efficiency.lowEfficiencyCount.toString(),
      subValue:
        totalResolved > 0
          ? `${((efficiency.lowEfficiencyCount / totalResolved) * 100).toFixed(1)}%`
          : '0%',
      description: 'ROI < 10% 的争议数量',
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; light: string }> = {
    blue: { bg: 'bg-primary-500', text: 'text-primary-600', light: 'bg-primary-50' },
    green: { bg: 'bg-success-500', text: 'text-success-600', light: 'bg-success-50' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
    orange: { bg: 'bg-warning-500', text: 'text-warning-600', light: 'bg-warning-50' },
  };

  return (
    <DashboardCard title={t('uma.disputeResolution.efficiencyMetrics') || '奖励效率指标'}>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => {
          const colors = colorClasses[metric.color];
          return (
            <div
              key={index}
              className={`${colors.light}  p-4 border border-transparent hover:border-gray-200 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 ${colors.bg}  mt-2`}></div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs mb-1">{metric.label}</p>
                  <p className={`text-xl font-bold ${colors.text}`}>{metric.value}</p>
                  {metric.subValue && (
                    <p className="text-xs text-gray-500 mt-0.5">{metric.subValue}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

// 金额趋势图
function AmountTrendChart({
  amountTrends,
}: {
  amountTrends: DisputeAmountDistributionStats['amountTrends'];
}) {
  const t = useTranslations();

  const maxStake = Math.max(...amountTrends.map((d) => d.avgStake));
  const maxReward = Math.max(...amountTrends.map((d) => d.avgReward));
  const maxValue = Math.max(maxStake, maxReward);

  if (maxValue === 0) {
    return (
      <DashboardCard title={t('uma.disputeResolution.amountTrend') || '金额趋势'}>
        <div className="flex items-center justify-center h-48 text-gray-500">暂无数据</div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={t('uma.disputeResolution.amountTrend') || '金额趋势'}>
      <div className="space-y-4">
        {/* 图例 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary-500 "></div>
            <span className="text-sm text-gray-600">
              {t('uma.disputeResolution.avgStake') || '平均质押'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success-500 "></div>
            <span className="text-sm text-gray-600">
              {t('uma.disputeResolution.avgReward') || '平均奖励'}
            </span>
          </div>
        </div>

        {/* 趋势图 */}
        <div className="h-48 relative">
          <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-b border-gray-100 h-0" />
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="stakeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity="0.3" />
                <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="rewardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={chartColors.recharts.success} stopOpacity="0.3" />
                <stop offset="100%" stopColor={chartColors.recharts.success} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 质押金额区域 */}
            <path
              d={`M 0 ${((maxValue - amountTrends[0].avgStake) / maxValue) * 100}% 
                  ${amountTrends
                    .map((point, index) => {
                      const x = (index / (amountTrends.length - 1)) * 100;
                      const y = ((maxValue - point.avgStake) / maxValue) * 100;
                      return `L ${x}% ${y}%`;
                    })
                    .join(' ')} 
                  L 100% 100% L 0 100% Z`}
              fill="url(#stakeGradient)"
            />

            {/* 奖励金额区域 */}
            <path
              d={`M 0 ${((maxValue - amountTrends[0].avgReward) / maxValue) * 100}% 
                  ${amountTrends
                    .map((point, index) => {
                      const x = (index / (amountTrends.length - 1)) * 100;
                      const y = ((maxValue - point.avgReward) / maxValue) * 100;
                      return `L ${x}% ${y}%`;
                    })
                    .join(' ')} 
                  L 100% 100% L 0 100% Z`}
              fill="url(#rewardGradient)"
            />

            {/* 质押金额线 */}
            <path
              d={`M 0 ${((maxValue - amountTrends[0].avgStake) / maxValue) * 100}% 
                  ${amountTrends
                    .map((point, index) => {
                      const x = (index / (amountTrends.length - 1)) * 100;
                      const y = ((maxValue - point.avgStake) / maxValue) * 100;
                      return `L ${x}% ${y}%`;
                    })
                    .join(' ')}`}
              fill="none"
              stroke={chartColors.recharts.primary}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* 奖励金额线 */}
            <path
              d={`M 0 ${((maxValue - amountTrends[0].avgReward) / maxValue) * 100}% 
                  ${amountTrends
                    .map((point, index) => {
                      const x = (index / (amountTrends.length - 1)) * 100;
                      const y = ((maxValue - point.avgReward) / maxValue) * 100;
                      return `L ${x}% ${y}%`;
                    })
                    .join(' ')}`}
              fill="none"
              stroke={chartColors.recharts.success}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* 数据点 */}
            {amountTrends.map((point, index) => {
              const x = (index / (amountTrends.length - 1)) * 100;
              const yStake = ((maxValue - point.avgStake) / maxValue) * 100;
              const yReward = ((maxValue - point.avgReward) / maxValue) * 100;
              return (
                <g key={index}>
                  <circle
                    cx={`${x}%`}
                    cy={`${yStake}%`}
                    r="3"
                    fill={chartColors.recharts.primary}
                    className="cursor-pointer hover:r-5 transition-all"
                  >
                    <title>质押: {formatAmount(point.avgStake)} UMA</title>
                  </circle>
                  <circle
                    cx={`${x}%`}
                    cy={`${yReward}%`}
                    r="3"
                    fill={chartColors.recharts.success}
                    className="cursor-pointer hover:r-5 transition-all"
                  >
                    <title>奖励: {formatAmount(point.avgReward)} UMA</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        {/* X轴标签 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {amountTrends
            .filter((_, i) => i % 2 === 0)
            .map((point, index) => (
              <span key={index}>{point.date}</span>
            ))}
        </div>
      </div>
    </DashboardCard>
  );
}

// 主组件
export function DisputeAmountDistribution() {
  const t = useTranslations();
  const [stats, setStats] = useState<DisputeAmountDistributionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new UMAClient();
        const data = await client.getDisputeAmountDistributionStats();
        setStats(data);
      } catch (error) {
        logger.error(
          'Failed to fetch dispute amount distribution stats',
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <DashboardCard title={t('uma.disputeResolution.amountDistribution') || '争议金额分布分析'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin  h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </DashboardCard>
    );
  }

  // 计算已解决争议总数
  const totalResolved = stats.efficiency.highEfficiencyCount + stats.efficiency.lowEfficiencyCount;

  return (
    <div className="space-y-6">
      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('uma.disputeResolution.avgStakeAmount') || '平均质押金额'}
          value={`${formatAmount(stats.avgStakeAmount)} UMA`}
          subValue={`中位数: ${formatAmount(stats.medianStakeAmount)}`}
        />
        <StatCard
          label={t('uma.disputeResolution.avgRewardAmount') || '平均奖励金额'}
          value={`${formatAmount(stats.avgRewardAmount)} UMA`}
          subValue={`中位数: ${formatAmount(stats.medianRewardAmount)}`}
        />
        <StatCard
          label={t('uma.disputeResolution.avgTotalValue') || '平均总价值'}
          value={`${formatAmount(stats.avgTotalValue)} UMA`}
        />
        <StatCard
          label={t('uma.disputeResolution.totalStakeAmount') || '总质押金额'}
          value={`${formatAmount(stats.totalStakeAmount)} UMA`}
          subValue={`总奖励: ${formatAmount(stats.totalRewardAmount)}`}
        />
      </div>

      {/* 金额分布直方图和效率指标 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AmountDistributionHistogram amountRanges={stats.amountRanges} />
        <EfficiencyMetricsCard efficiency={stats.efficiency} totalResolved={totalResolved} />
      </div>

      {/* 金额趋势图 */}
      <AmountTrendChart amountTrends={stats.amountTrends} />
    </div>
  );
}
