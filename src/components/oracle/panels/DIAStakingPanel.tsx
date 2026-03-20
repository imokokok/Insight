'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { StakingDetails } from '@/lib/oracles/dia';
import { DashboardCard } from '@/components/oracle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface DIAStakingPanelProps {
  stakingDetails: StakingDetails | undefined;
}

export function DIAStakingPanel({ stakingDetails }: DIAStakingPanelProps) {
  const t = useTranslations();
  const [stakeAmount, setStakeAmount] = useState<string>('1000');
  const [selectedLockPeriod, setSelectedLockPeriod] = useState<number>(30);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return `$${formatNumber(num)}`;
  };

  const calculateRewards = () => {
    const amount = parseFloat(stakeAmount) || 0;
    const apr = stakingDetails?.aprByPeriod[selectedLockPeriod] || 0;
    const yearlyReward = amount * (apr / 100);
    const dailyReward = yearlyReward / 365;
    const weeklyReward = dailyReward * 7;
    const monthlyReward = yearlyReward / 12;

    return {
      daily: dailyReward,
      weekly: weeklyReward,
      monthly: monthlyReward,
      yearly: yearlyReward,
    };
  };

  const getLockPeriodLabel = (days: number) => {
    if (days >= 365) return `${days / 365}${t('dia.staking.year')}`;
    if (days >= 30) return `${Math.floor(days / 30)}${t('dia.staking.month')}`;
    return `${days}${t('dia.staking.day')}`;
  };

  const rewards = calculateRewards();

  if (!stakingDetails) {
    return (
      <DashboardCard>
        <div className="p-6">
          <p className="text-gray-500 text-center">{t('dia.staking.noData')}</p>
        </div>
      </DashboardCard>
    );
  }

  const maxApr = Math.max(...Object.values(stakingDetails.aprByPeriod));
  const minApr = Math.min(...Object.values(stakingDetails.aprByPeriod));
  const aprRange = maxApr - minApr || 1;

  return (
    <div className="space-y-6">
      {/* Staking Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('dia.staking.totalStaked')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(stakingDetails.totalStaked)} DIA
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('dia.staking.totalValueLocked')}</p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('dia.staking.currentApr')}
          </p>
          <p className="text-2xl font-bold text-indigo-600">
            {stakingDetails.stakingApr.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('dia.staking.baseRate')}</p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('dia.staking.stakerCount')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(stakingDetails.stakerCount)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('dia.staking.activeStakers')}</p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('dia.staking.rewardPool')}
          </p>
          <p className="text-2xl font-bold text-success-600">
            {formatNumber(stakingDetails.rewardPool)} DIA
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('dia.staking.availableRewards')}</p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('dia.staking.rewardsDistributed')}
          </p>
          <p className="text-2xl font-bold text-primary-600">
            {formatNumber(stakingDetails.rewardsDistributed)} DIA
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('dia.staking.totalDistributed')}</p>
        </DashboardCard>
      </div>

      {/* Lock Period Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('dia.staking.lockPeriods')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stakingDetails.lockPeriods.map((period) => {
              const apr = stakingDetails.aprByPeriod[period];
              const isSelected = selectedLockPeriod === period;
              const aprPercentage = ((apr - minApr) / aprRange) * 100;

              return (
                <button
                  key={period}
                  onClick={() => setSelectedLockPeriod(period)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {getLockPeriodLabel(period)}
                  </p>
                  <p
                    className={`text-2xl font-bold ${isSelected ? 'text-indigo-600' : 'text-gray-900'}`}
                  >
                    {apr.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t('dia.staking.apr')}</p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${Math.max(10, aprPercentage)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t('dia.staking.minStakeAmount')}:{' '}
            <span className="font-medium text-gray-700">
              {formatNumber(stakingDetails.minStakeAmount)} DIA
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Staking Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('dia.staking.calculator')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calculator Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dia.staking.stakeAmount')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    min={stakingDetails.minStakeAmount}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t('dia.staking.enterAmount')}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    DIA
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('dia.staking.min')}: {formatNumber(stakingDetails.minStakeAmount)} DIA
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dia.staking.lockPeriod')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {stakingDetails.lockPeriods.map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedLockPeriod(period)}
                      className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                        selectedLockPeriod === period
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                      }`}
                    >
                      {getLockPeriodLabel(period)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700">
                  {t('dia.staking.selectedApr')}:{' '}
                  <span className="font-bold text-lg">
                    {stakingDetails.aprByPeriod[selectedLockPeriod].toFixed(2)}%
                  </span>
                </p>
              </div>
            </div>

            {/* Reward Estimates */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {t('dia.staking.estimatedRewards')}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <DashboardCard className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{t('dia.staking.daily')}</p>
                  <p className="text-lg font-bold text-gray-900">{rewards.daily.toFixed(4)} DIA</p>
                  <p className="text-xs text-gray-400 mt-1">~${(rewards.daily * 0.5).toFixed(2)}</p>
                </DashboardCard>
                <DashboardCard className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{t('dia.staking.weekly')}</p>
                  <p className="text-lg font-bold text-gray-900">{rewards.weekly.toFixed(4)} DIA</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ~${(rewards.weekly * 0.5).toFixed(2)}
                  </p>
                </DashboardCard>
                <DashboardCard className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{t('dia.staking.monthly')}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {rewards.monthly.toFixed(4)} DIA
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ~${(rewards.monthly * 0.5).toFixed(2)}
                  </p>
                </DashboardCard>
                <DashboardCard className="p-4 bg-indigo-50 border-indigo-200">
                  <p className="text-xs text-indigo-600 mb-1">{t('dia.staking.yearly')}</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {rewards.yearly.toFixed(4)} DIA
                  </p>
                  <p className="text-xs text-indigo-400 mt-1">
                    ~${(rewards.yearly * 0.5).toFixed(2)}
                  </p>
                </DashboardCard>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical APR Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('dia.staking.historicalApr')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Simple Line Chart using div bars */}
            <div className="h-48 flex items-end justify-between gap-1 px-2">
              {stakingDetails.historicalApr.map((data, index) => {
                const maxHistoricalApr = Math.max(
                  ...stakingDetails.historicalApr.map((d) => d.apr)
                );
                const minHistoricalApr = Math.min(
                  ...stakingDetails.historicalApr.map((d) => d.apr)
                );
                const historicalRange = maxHistoricalApr - minHistoricalApr || 1;
                const height = ((data.apr - minHistoricalApr) / historicalRange) * 80 + 20;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-indigo-500 rounded-t transition-all duration-300 group-hover:bg-indigo-600"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {data.apr.toFixed(2)}%
                        <br />
                        {new Date(data.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-gray-500 px-2">
              <span>
                {new Date(stakingDetails.historicalApr[0]?.timestamp || 0).toLocaleDateString()}
              </span>
              <span>
                {new Date(
                  stakingDetails.historicalApr[Math.floor(stakingDetails.historicalApr.length / 2)]
                    ?.timestamp || 0
                ).toLocaleDateString()}
              </span>
              <span>
                {new Date(
                  stakingDetails.historicalApr[stakingDetails.historicalApr.length - 1]
                    ?.timestamp || 0
                ).toLocaleDateString()}
              </span>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">{t('dia.staking.avgApr')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(
                    stakingDetails.historicalApr.reduce((sum, d) => sum + d.apr, 0) /
                    stakingDetails.historicalApr.length
                  ).toFixed(2)}
                  %
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">{t('dia.staking.maxApr')}</p>
                <p className="text-lg font-semibold text-success-600">
                  {Math.max(...stakingDetails.historicalApr.map((d) => d.apr)).toFixed(2)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">{t('dia.staking.minApr')}</p>
                <p className="text-lg font-semibold text-primary-600">
                  {Math.min(...stakingDetails.historicalApr.map((d) => d.apr)).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
