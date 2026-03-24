'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { WinklinkStakingViewProps, SortConfig } from '../types';

export function WinklinkStakingView({ staking, isLoading }: WinklinkStakingViewProps) {
  const t = useTranslations();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'stakedAmount', direction: 'desc' });

  const stakingData = staking || {
    totalStaked: 45000000,
    totalNodes: 85,
    activeNodes: 82,
    averageApr: 12.5,
    rewardPool: 2500000,
    stakingTiers: [
      { tier: 'bronze', minStake: 10000, maxStake: 50000, apr: 10, nodeCount: 35 },
      { tier: 'silver', minStake: 50000, maxStake: 200000, apr: 12, nodeCount: 28 },
      { tier: 'gold', minStake: 200000, maxStake: 500000, apr: 14, nodeCount: 15 },
      { tier: 'platinum', minStake: 500000, maxStake: 10000000, apr: 16, nodeCount: 7 },
    ],
    nodes: [],
  };

  const nodes = staking?.nodes || [
    {
      id: 'node-001',
      address: 'TV6MuMXfmLbBqPZvBHdwFsDnQAaY4zQ4Qc',
      name: 'WINkLink Node Asia',
      region: 'Asia',
      stakedAmount: 750000,
      rewardsEarned: 45000,
      uptime: 99.95,
      responseTime: 85,
      validatedRequests: 1250000,
      joinDate: Date.now() - 86400000 * 400,
      status: 'active',
      tier: 'gold',
    },
    {
      id: 'node-002',
      address: 'TV6MuMXfmLbBqPZvBHdwFsDnQAaY4zQ4Qd',
      name: 'WINkLink Node Europe',
      region: 'Europe',
      stakedAmount: 1200000,
      rewardsEarned: 78000,
      uptime: 99.92,
      responseTime: 95,
      validatedRequests: 1890000,
      joinDate: Date.now() - 86400000 * 350,
      status: 'active',
      tier: 'platinum',
    },
  ];

  const sortedNodes = [...nodes].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const tierColors: Record<string, string> = {
    bronze: 'bg-amber-600',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-500',
    platinum: 'bg-pink-500',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.staking.totalStaked')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${(stakingData.totalStaked / 1e6).toFixed(1)}M
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.staking.totalNodes')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stakingData.totalNodes}</p>
          <p className="text-xs text-emerald-600 mt-1">{stakingData.activeNodes} active</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.staking.averageApr')}</p>
          <p className="text-2xl font-bold text-pink-600 mt-1">{stakingData.averageApr}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.staking.rewardPool')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${(stakingData.rewardPool / 1e6).toFixed(2)}M
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.staking.tierDistribution')}
          </h3>
          <div className="space-y-3">
            {stakingData.stakingTiers.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${tierColors[tier.tier]}`} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{tier.tier}</span>
                    <span className="text-gray-600">{tier.apr}% APR</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                    <span>{tier.nodeCount} nodes</span>
                    <span>{(tier.minStake / 1e3).toFixed(0)}K - {(tier.maxStake / 1e6).toFixed(1)}M WIN</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.staking.nodeList')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    {t('winklink.staking.nodeName')} {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('tier')}
                  >
                    {t('winklink.staking.tier')} {sortConfig.key === 'tier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('stakedAmount')}
                  >
                    {t('winklink.staking.staked')} {sortConfig.key === 'stakedAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('uptime')}
                  >
                    {t('winklink.staking.uptime')} {sortConfig.key === 'uptime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    {t('winklink.staking.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{node.name}</p>
                        <p className="text-xs text-gray-500">{node.region}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize ${tierColors[node.tier]}`}>
                        {node.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {(node.stakedAmount / 1e6).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {node.uptime.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        node.status === 'active' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          node.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        {node.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
