'use client';

import { useState, useMemo } from 'react';

import {
  Coins,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
  Calculator,
  PieChart,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type BandProtocolStakingViewProps } from '../types';

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

export function BandProtocolStakingView({
  stakingInfo,
  stakingDistribution,
  isLoading,
}: BandProtocolStakingViewProps) {
  const t = useTranslations();
  const [rewardAmount, setRewardAmount] = useState<string>('1000');
  const [rewardDuration, setRewardDuration] = useState<string>('365');

  const rewardCalculation = useMemo(() => {
    const amount = parseFloat(rewardAmount) || 0;
    const duration = parseInt(rewardDuration) || 0;
    const apr = stakingInfo?.stakingAPR || 12;
    const dailyRate = apr / 100 / 365;
    const estimatedReward = amount * dailyRate * duration;
    const apy = (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;

    return {
      principal: amount,
      duration,
      estimatedReward: Number(estimatedReward.toFixed(4)),
      apy: Number(apy.toFixed(2)),
    };
  }, [rewardAmount, rewardDuration, stakingInfo?.stakingAPR]);

  const metrics = [
    {
      label: t('band.bandProtocol.staking.totalStaked'),
      value: stakingInfo ? `${formatNumber(stakingInfo.totalStaked)} BAND` : '85M BAND',
      subLabel: t('band.bandProtocol.staking.ofTotalSupply'),
      icon: Coins,
    },
    {
      label: t('band.bandProtocol.staking.stakingApr'),
      value: stakingInfo ? `${stakingInfo.stakingAPR.toFixed(2)}%` : '12.5%',
      subLabel: t('band.bandProtocol.staking.annualReturn'),
      icon: TrendingUp,
    },
    {
      label: t('band.bandProtocol.staking.inflationRate'),
      value: stakingInfo ? `${stakingInfo.inflation.toFixed(2)}%` : '8.5%',
      subLabel: t('band.bandProtocol.staking.annual'),
      icon: TrendingUp,
    },
    {
      label: t('band.bandProtocol.staking.unbondingPeriod'),
      value: stakingInfo ? `${stakingInfo.unbondingPeriod}` : '21',
      subLabel: t('band.bandProtocol.staking.days'),
      icon: Clock,
    },
  ];

  const stakingParams = [
    {
      label: t('band.bandProtocol.staking.minStake'),
      value: stakingInfo ? `${stakingInfo.minStake} BAND` : '100 BAND',
      desc: t('band.bandProtocol.staking.minStakeDesc'),
    },
    {
      label: t('band.bandProtocol.validators.slashing'),
      value: stakingInfo ? `${(stakingInfo.slashingRate * 100).toFixed(1)}%` : '5%',
      desc: t('band.bandProtocol.validators.slashingDesc'),
    },
    {
      label: t('band.bandProtocol.staking.communityPool'),
      value: stakingInfo ? `${formatNumber(stakingInfo.communityPool)} BAND` : '550K BAND',
      desc: t('band.bandProtocol.staking.communityPoolDesc'),
    },
  ];

  const distributionColors = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

  const totalPercentage = stakingDistribution.reduce((sum, d) => sum + d.percentage, 0);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                  {metric.value}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">{metric.subLabel}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('band.bandProtocol.staking.stakingDistribution')}
            </h3>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                {stakingDistribution.map((item, index) => {
                  const prevPercentage = stakingDistribution
                    .slice(0, index)
                    .reduce((sum, d) => sum + d.percentage, 0);
                  const startAngle = (prevPercentage / totalPercentage) * 360;
                  const endAngle = ((prevPercentage + item.percentage) / totalPercentage) * 360;

                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);

                  const x1 = 18 + 16 * Math.cos(startRad);
                  const y1 = 18 + 16 * Math.sin(startRad);
                  const x2 = 18 + 16 * Math.cos(endRad);
                  const y2 = 18 + 16 * Math.sin(endRad);

                  const largeArc = item.percentage > 50 ? 1 : 0;

                  return (
                    <path
                      key={index}
                      d={`M 18 18 L ${x1} ${y1} A 16 16 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={distributionColors[index % distributionColors.length]}
                      className="hover:opacity-80 transition-opacity"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="flex-1 space-y-2">
              {stakingDistribution.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: distributionColors[index] }}
                    />
                    <span className="text-gray-600">{item.range}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.percentage.toFixed(1)}%</span>
                    <span className="text-gray-400 text-xs">({item.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {stakingDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: distributionColors[index] }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.range}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {item.count} {t('band.bandProtocol.staking.validators')}
                    </span>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: distributionColors[index],
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('band.bandProtocol.staking.rewardCalculator') || 'Reward Calculator'}
            </h3>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                {t('band.bandProtocol.staking.stakeAmount') || 'Stake Amount (BAND)'}
              </label>
              <input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="1000"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                {t('band.bandProtocol.staking.stakingDuration') || 'Staking Duration (days)'}
              </label>
              <input
                type="number"
                value={rewardDuration}
                onChange={(e) => setRewardDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="365"
                min="1"
                max="365"
              />
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('band.bandProtocol.staking.estimatedReward') || 'Estimated Reward'}
              </span>
              <span className="text-lg font-semibold text-purple-600">
                {rewardCalculation.estimatedReward.toFixed(4)} BAND
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('band.bandProtocol.staking.apy') || 'APY'}
              </span>
              <span className="text-lg font-semibold text-purple-600">
                {rewardCalculation.apy.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('band.bandProtocol.staking.totalValue') || 'Total Value'}
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {(rewardCalculation.principal + rewardCalculation.estimatedReward).toFixed(4)} BAND
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-purple-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('band.bandProtocol.staking.stakingInfo')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stakingParams.map((param, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">{param.label}</p>
              <p className="text-xl font-semibold text-gray-900 mb-1">{param.value}</p>
              <p className="text-xs text-gray-400">{param.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                {t('band.bandProtocol.staking.riskWarning') || 'Staking Risk Warning'}
              </h4>
              <p className="text-sm text-amber-700">
                {t('band.bandProtocol.staking.riskWarningText') ||
                  'Staking involves risks including slashing for validator misbehavior. The unbonding period is 21 days, during which your tokens are locked and cannot be transferred. Please stake responsibly.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
