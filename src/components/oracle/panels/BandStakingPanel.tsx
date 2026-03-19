'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardCard, MetricCard } from '@/components/oracle/common/DashboardCard';
import { Wallet, Percent, Users, TrendingUp, Clock, Award, PiggyBank } from 'lucide-react';

interface BandStakingPanelProps {
  client: BandProtocolClient;
}

interface StakingStats {
  totalStaked: number;
  stakingApr: number;
  stakingRatio: number;
  totalValidators: number;
  activeValidators: number;
  jailedValidators: number;
  inflationRate: number;
  communityPool: number;
}

interface StakingTier {
  tier: string;
  minStake: number;
  maxStake: number;
  validatorCount: number;
  percentage: number;
}

interface ValidatorStaking {
  address: string;
  moniker: string;
  stakedAmount: number;
  commission: number;
  uptime: number;
  rank: number;
}

export function BandStakingPanel({ client }: BandStakingPanelProps) {
  const t = useTranslations();
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [stakingTiers, setStakingTiers] = useState<StakingTier[]>([]);
  const [topValidators, setTopValidators] = useState<ValidatorStaking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStakingData = async () => {
      try {
        const networkStats = await client.getNetworkStats();
        const validators = await client.getValidators(20);

        const mockStats: StakingStats = {
          totalStaked: networkStats.bondedTokens,
          stakingApr: 8.5 + Math.random() * 2,
          stakingRatio: networkStats.stakingRatio,
          totalValidators: networkStats.totalValidators,
          activeValidators: networkStats.activeValidators,
          jailedValidators: 3,
          inflationRate: networkStats.inflationRate,
          communityPool: networkStats.communityPool,
        };

        const tiers: StakingTier[] = [
          {
            tier: 'Whale',
            minStake: 5000000,
            maxStake: 15000000,
            validatorCount: validators.filter((v) => v.tokens >= 5000000).length,
            percentage: 0,
          },
          {
            tier: 'Large',
            minStake: 1000000,
            maxStake: 5000000,
            validatorCount: validators.filter((v) => v.tokens >= 1000000 && v.tokens < 5000000)
              .length,
            percentage: 0,
          },
          {
            tier: 'Medium',
            minStake: 500000,
            maxStake: 1000000,
            validatorCount: validators.filter((v) => v.tokens >= 500000 && v.tokens < 1000000)
              .length,
            percentage: 0,
          },
          {
            tier: 'Small',
            minStake: 0,
            maxStake: 500000,
            validatorCount: validators.filter((v) => v.tokens < 500000).length,
            percentage: 0,
          },
        ];

        tiers.forEach((tier) => {
          tier.percentage = (tier.validatorCount / validators.length) * 100;
        });

        const topVals: ValidatorStaking[] = validators.slice(0, 10).map((v, i) => ({
          address: v.operatorAddress,
          moniker: v.moniker,
          stakedAmount: v.tokens,
          commission: v.commissionRate * 100,
          uptime: v.uptime,
          rank: i + 1,
        }));

        setStats(mockStats);
        setStakingTiers(tiers);
        setTopValidators(topVals);
      } catch (error) {
        console.error('Failed to fetch staking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStakingData();
  }, [client]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return (
      <DashboardCard>
        <p className="text-gray-500 text-center">Failed to load staking data</p>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staking Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('band.staking.totalStaked')}
          value={`${formatNumber(stats.totalStaked)} BAND`}
          subValue={`${stats.stakingRatio.toFixed(2)}% ${t('band.staking.ofTotalSupply')}`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.staking.stakingApr')}
          value={`${stats.stakingApr.toFixed(2)}%`}
          subValue={t('band.staking.annualReturn')}
          icon={<Percent className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.staking.activeValidators')}
          value={stats.activeValidators.toString()}
          subValue={`${t('band.staking.outOf')} ${stats.totalValidators} ${t('band.staking.total')}`}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.staking.inflationRate')}
          value={`${stats.inflationRate.toFixed(2)}%`}
          subValue={t('band.staking.annual')}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Staking Tiers Distribution */}
      <DashboardCard title={t('band.staking.stakingDistribution')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stakingTiers.map((tier) => (
            <div key={tier.tier} className="bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {t(`band.staking.tier.${tier.tier.toLowerCase()}`)}
                </span>
                <span className="text-xs text-gray-500">
                  {tier.validatorCount} {t('band.staking.validators')}
                </span>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatNumber(tier.minStake)}</span>
                  <span>{formatNumber(tier.maxStake)} BAND</span>
                </div>
                <div className="w-full bg-gray-200 h-2">
                  <div className="bg-purple-500 h-2" style={{ width: `${tier.percentage}%` }} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {tier.percentage.toFixed(1)}% {t('band.staking.ofNetwork')}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Top Validators by Stake */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('band.staking.topValidators')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.staking.rank')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.staking.validator')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.staking.stakedAmount')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.staking.commission')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.staking.uptime')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topValidators.map((validator, index) => (
                  <tr
                    key={validator.address}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium ${
                          validator.rank <= 3
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {validator.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{validator.moniker}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {validator.address.slice(0, 16)}...
                        </p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(validator.stakedAmount)} BAND
                      </p>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {validator.commission.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`text-sm font-medium ${
                          validator.uptime >= 99
                            ? 'text-green-600'
                            : validator.uptime >= 95
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {validator.uptime.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Staking Info */}
      <DashboardCard title={t('band.staking.stakingInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.staking.unbondingPeriod')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">21 {t('band.staking.days')}</p>
            <p className="text-sm text-purple-600 mt-1">{t('band.staking.unbondingDesc')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.staking.minStake')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">1 BAND</p>
            <p className="text-sm text-purple-600 mt-1">{t('band.staking.minStakeDesc')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.staking.communityPool')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {formatNumber(stats.communityPool)} BAND
            </p>
            <p className="text-sm text-purple-600 mt-1">{t('band.staking.communityPoolDesc')}</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
