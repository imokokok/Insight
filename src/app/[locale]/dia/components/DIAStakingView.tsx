'use client';

import { Coins, TrendingUp, Users, Gift, Lock, Clock, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import { StakingCalculator } from '@/components/oracle/charts/StakingCalculator';
import { useDIAStaking, useDIAStakingDetails } from '@/hooks';
import { useTranslations } from '@/i18n';

// Fixed base timestamp for deterministic mock data
const BASE_TIMESTAMP = 1704067200000; // 2024-01-01 00:00:00 UTC

export function DIAStakingView() {
  const t = useTranslations();
  const { staking, isLoading: stakingLoading } = useDIAStaking();
  const { stakingDetails, isLoading: detailsLoading } = useDIAStakingDetails();

  const isLoading = stakingLoading || detailsLoading;

  // 锁定期选项
  const lockPeriods = stakingDetails?.lockPeriods ?? [30, 90, 180, 365];
  const aprByPeriod = stakingDetails?.aprByPeriod ?? {
    30: 8.5,
    90: 12.0,
    180: 18.5,
    365: 25.0,
  };

  // 历史 APR 数据 - 使用固定时间戳
  const historicalApr = stakingDetails?.historicalApr ?? [
    { timestamp: BASE_TIMESTAMP - 90 * 24 * 60 * 60 * 1000, apr: 15.2 },
    { timestamp: BASE_TIMESTAMP - 60 * 24 * 60 * 60 * 1000, apr: 16.8 },
    { timestamp: BASE_TIMESTAMP - 30 * 24 * 60 * 60 * 1000, apr: 18.5 },
    { timestamp: BASE_TIMESTAMP - 14 * 24 * 60 * 60 * 1000, apr: 19.2 },
    { timestamp: BASE_TIMESTAMP - 7 * 24 * 60 * 60 * 1000, apr: 20.5 },
    { timestamp: BASE_TIMESTAMP, apr: staking?.stakingApr ?? 21.0 },
  ];

  // 格式化历史数据用于图表
  const chartData = historicalApr.map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    apr: point.apr,
  }));

  const maxApr = Math.max(...Object.values(aprByPeriod));

  return (
    <div className="space-y-6">
      {/* 质押统计 - 简洁行布局 */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <Coins className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('dia.staking.totalStaked')}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '-' : `${((staking?.totalStaked ?? 0) / 1e6).toFixed(2)}M DIA`}
              </p>
              <span className="text-xs text-emerald-600 font-medium">+5.2%</span>
            </div>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200 hidden sm:block" />
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('dia.staking.stakingApr')}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '-' : `${(staking?.stakingApr ?? 0).toFixed(2)}%`}
              </p>
              <span className="text-xs text-emerald-600 font-medium">+0.3%</span>
            </div>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200 hidden sm:block" />
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('dia.staking.stakerCount')}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '-' : (staking?.stakerCount ?? 0).toLocaleString()}
              </p>
              <span className="text-xs text-emerald-600 font-medium">+12</span>
            </div>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200 hidden sm:block" />
        <div className="flex items-center gap-3">
          <Gift className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('dia.staking.rewardsDistributed')}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '-' : `${((staking?.rewardPool ?? 0) / 1e6).toFixed(2)}M DIA`}
              </p>
              <span className="text-xs text-emerald-600 font-medium">+8.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 质押详情 - 两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：基本信息 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('dia.staking.details')}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.staking.minStakeAmount')}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {isLoading
                    ? '-'
                    : `${(stakingDetails?.minStakeAmount ?? 1000).toLocaleString()} DIA`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.staking.unbondingPeriod')}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">14 {t('dia.staking.days')}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.staking.compounding')}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{t('dia.staking.auto')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：锁定期 APR 进度条 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('dia.staking.lockPeriods')}
          </h4>
          <div className="space-y-3">
            {lockPeriods.map((period) => {
              const apr = aprByPeriod[period] ?? 0;
              const percentage = (apr / maxApr) * 100;

              return (
                <div key={period} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {period} {t('dia.staking.days')}
                    </span>
                    <span className="font-semibold text-indigo-600">{apr.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 历史 APR 趋势 - 面积图 */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('dia.staking.historicalApr')}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{t('dia.staking.aprTrendDesc')}</p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, 'APR']}
              />
              <Area
                type="monotone"
                dataKey="apr"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorApr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 质押计算器 */}
      <div className="border-t border-gray-200 pt-8">
        <StakingCalculator tokenSymbol="DIA" tokenPrice={0.85} minStake={100} maxStake={1000000} />
      </div>
    </div>
  );
}
