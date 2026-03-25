'use client';

import { useTranslations } from '@/i18n';
import { NodeStakingData } from '@/lib/oracles/winklink';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Coins } from 'lucide-react';
import { Users } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Award } from 'lucide-react';
import { Globe } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

interface WINkLinkStakingPanelProps {
  data: NodeStakingData;
}

export function WINkLinkStakingPanel({ data }: WINkLinkStakingPanelProps) {
  const t = useTranslations();

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'gold':
        return 'bg-warning-100 text-warning-700 border-yellow-200';
      case 'silver':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'bronze':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'from-purple-500 to-pink-500';
      case 'gold':
        return 'from-yellow-400 to-orange-500';
      case 'silver':
        return 'from-gray-300 to-gray-500';
      case 'bronze':
        return 'from-amber-400 to-amber-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const formatNumber = (value: number) => {
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(0)}K`;
    } else {
      return value.toLocaleString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Staking Stats */}
      <DashboardCard title={t('winklink.staking.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-pink-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.staking.totalStaked')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatNumber(data.totalStaked)} WIN
            </p>
          </div>
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-success-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.staking.activeNodes')}
              </p>
            </div>
            <p className="text-xl font-bold text-success-600 tracking-tight">{data.activeNodes}</p>
          </div>
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-warning-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.staking.averageApr')}
              </p>
            </div>
            <p className="text-xl font-bold text-warning-600 tracking-tight">{data.averageApr}%</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.staking.rewardPool')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatNumber(data.rewardPool)} WIN
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Staking Tiers */}
      <DashboardCard title={t('winklink.staking.tiers')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.stakingTiers.map((tier, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg text-center ${getTierColor(tier.tier.toLowerCase())}`}
            >
              <h4 className="font-bold text-sm capitalize mb-2">{tier.tier}</h4>
              <div
                className={`w-10 h-10 mx-auto mb-3 rounded-full bg-gradient-to-br ${getTierGradient(tier.tier.toLowerCase())} flex items-center justify-center`}
              >
                <Award className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold mb-1">{tier.apr}%</p>
              <p className="text-xs opacity-75">{t('winklink.staking.aprLabel')}</p>
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <p className="text-xs">
                  {formatNumber(tier.minStake)} - {formatNumber(tier.maxStake)}
                </p>
                <p className="text-xs opacity-75 mt-1">{tier.nodeCount} nodes</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Top Nodes */}
      <DashboardCard title={t('winklink.staking.topNodes')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('winklink.staking.node')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('winklink.staking.region')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('winklink.staking.tier')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('winklink.staking.staked')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('winklink.staking.uptime')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('winklink.staking.rewards')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.nodes.slice(0, 5).map((node, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-semibold text-gray-900">{node.name}</p>
                      <p className="text-xs text-gray-500">{node.address}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-700">{node.region}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getTierColor(node.tier)}`}
                    >
                      {node.tier}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-900">{formatNumber(node.stakedAmount)}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-success-500" />
                      <span className="text-gray-900">{node.uptime}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-success-600">{formatNumber(node.rewardsEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
