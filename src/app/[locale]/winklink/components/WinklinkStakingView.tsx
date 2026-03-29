'use client';

import { useState, useMemo } from 'react';

import {
  Activity,
  Clock,
  Shield,
  Award,
  Server,
  TrendingUp,
  Globe,
  MapPin,
  Users,
  Zap,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type WinklinkStakingViewProps, type SortConfig, type StakingNode } from '../types';

import { StakingRewardsCalculator } from './StakingRewardsCalculator';
import { WinklinkDataTable } from './WinklinkDataTable';

interface RegionData {
  region: string;
  nodeCount: number;
  percentage: number;
  avgUptime: number;
  avgResponseTime: number;
  totalStaked: number;
}

export function WinklinkStakingView({ staking, price, isLoading }: WinklinkStakingViewProps) {
  const t = useTranslations();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'stakedAmount',
    direction: 'desc',
  });

  const winPrice = price?.price;

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

  const tierTextColors: Record<string, string> = {
    bronze: 'text-amber-600',
    silver: 'text-gray-500',
    gold: 'text-yellow-600',
    platinum: 'text-pink-600',
  };

  const columns = [
    {
      key: 'name',
      header: t('winklink.staking.nodeName'),
      sortable: true,
      render: (item: StakingNode) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">{item.region}</p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: t('winklink.staking.tier'),
      sortable: true,
      render: (item: StakingNode) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize ${tierColors[item.tier]}`}
        >
          {item.tier}
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('winklink.staking.staked'),
      sortable: true,
      render: (item: StakingNode) => (
        <span className="text-sm text-gray-900">{(item.stakedAmount / 1e6).toFixed(2)}M</span>
      ),
    },
    {
      key: 'uptime',
      header: t('winklink.staking.uptime'),
      sortable: true,
      render: (item: StakingNode) => (
        <span className="text-sm text-gray-900">{item.uptime.toFixed(2)}%</span>
      ),
    },
    {
      key: 'status',
      header: t('winklink.staking.status'),
      sortable: false,
      render: (item: StakingNode) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            item.status === 'active' ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {item.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const totalTierNodes = stakingData.stakingTiers.reduce((acc, tier) => acc + tier.nodeCount, 0);

  const regionColors: Record<string, string> = {
    Asia: 'bg-blue-500',
    Europe: 'bg-purple-500',
    'North America': 'bg-emerald-500',
    'South America': 'bg-orange-500',
    Other: 'bg-gray-400',
  };

  const regionTextColors: Record<string, string> = {
    Asia: 'text-blue-600',
    Europe: 'text-purple-600',
    'North America': 'text-emerald-600',
    'South America': 'text-orange-600',
    Other: 'text-gray-500',
  };

  const geographicData: RegionData[] = useMemo(() => {
    const allRegions = ['Asia', 'Europe', 'North America', 'South America', 'Other'];
    const regionMap = new Map<string, StakingNode[]>();

    allRegions.forEach((region) => regionMap.set(region, []));

    nodes.forEach((node) => {
      const region = allRegions.includes(node.region) ? node.region : 'Other';
      regionMap.get(region)?.push(node);
    });

    return allRegions.map((region) => {
      const regionNodes = regionMap.get(region) || [];
      const nodeCount = regionNodes.length;
      const percentage = nodes.length > 0 ? (nodeCount / nodes.length) * 100 : 0;
      const avgUptime =
        nodeCount > 0
          ? regionNodes.reduce((acc, n) => acc + n.uptime, 0) / nodeCount
          : 0;
      const avgResponseTime =
        nodeCount > 0
          ? regionNodes.reduce((acc, n) => acc + n.responseTime, 0) / nodeCount
          : 0;
      const totalStaked = regionNodes.reduce((acc, n) => acc + n.stakedAmount, 0);

      return {
        region,
        nodeCount,
        percentage,
        avgUptime,
        avgResponseTime,
        totalStaked,
      };
    });
  }, [nodes]);

  const decentralizationScore = useMemo(() => {
    if (geographicData.length === 0) return 0;

    const activeRegions = geographicData.filter((r) => r.nodeCount > 0);
    const regionCount = activeRegions.length;

    const regionCountScore = (regionCount / 5) * 40;

    const percentages = activeRegions.map((r) => r.percentage);
    const maxPercentage = Math.max(...percentages, 0);
    const idealPercentage = 100 / regionCount;
    const balanceScore = maxPercentage > 0 ? Math.max(0, (1 - Math.abs(maxPercentage - idealPercentage) / 100) * 40) : 0;

    const avgUptime =
      activeRegions.length > 0
        ? activeRegions.reduce((acc, r) => acc + r.avgUptime, 0) / activeRegions.length
        : 0;
    const uptimeScore = (avgUptime / 100) * 20;

    return Math.min(100, Math.round(regionCountScore + balanceScore + uptimeScore));
  }, [geographicData]);

  return (
    <div className="space-y-8">
      {/* 质押统计概览 - 内联图标+文本布局 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('winklink.staking.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            ${(stakingData.totalStaked / 1e6).toFixed(1)}M
          </span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('winklink.staking.totalNodes')}</span>
          <span className="text-lg font-semibold text-gray-900">{stakingData.totalNodes}</span>
          <span className="text-xs text-emerald-600">({stakingData.activeNodes} active)</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('winklink.staking.averageApr')}</span>
          <span className="text-lg font-semibold text-pink-600">{stakingData.averageApr}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('winklink.staking.rewardPool')}</span>
          <span className="text-lg font-semibold text-gray-900">
            ${(stakingData.rewardPool / 1e6).toFixed(2)}M
          </span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧 - 节点表格 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('winklink.staking.nodeList')}
            </h2>
          </div>
          <WinklinkDataTable
            data={nodes}
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            isLoading={isLoading}
          />
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-8">
          {/* 质押计算器 */}
          <section>
            <StakingRewardsCalculator winPrice={winPrice} />
          </section>

          {/* 质押等级分布 - 紧凑进度条 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('winklink.staking.tierDistribution')}
              </h3>
            </div>
            <div className="space-y-4">
              {stakingData.stakingTiers.map((tier) => {
                const percentage = (tier.nodeCount / totalTierNodes) * 100;
                return (
                  <div key={tier.tier}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className={`font-medium capitalize ${tierTextColors[tier.tier]}`}>
                        {tier.tier}
                      </span>
                      <span className="text-gray-900">
                        {tier.nodeCount}{' '}
                        <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`${tierColors[tier.tier]} h-1.5 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{tier.apr}% APR</span>
                      <span>
                        {(tier.minStake / 1e3).toFixed(0)}K - {(tier.maxStake / 1e6).toFixed(1)}M
                        WIN
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">Node Geographic Distribution</h3>
            </div>
            <div className="space-y-3">
              {geographicData.map((region) => (
                <div key={region.region}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className={`w-3 h-3 ${regionTextColors[region.region]}`} />
                      <span className={`font-medium ${regionTextColors[region.region]}`}>
                        {region.region}
                      </span>
                    </div>
                    <span className="text-gray-900">
                      {region.nodeCount}{' '}
                      <span className="text-gray-400">({region.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`${regionColors[region.region]} h-1.5 rounded-full transition-all`}
                      style={{ width: `${region.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {region.avgUptime.toFixed(1)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {region.avgResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">Decentralization Score</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">{decentralizationScore}</span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    decentralizationScore >= 80
                      ? 'bg-emerald-500'
                      : decentralizationScore >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${decentralizationScore}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <span className="font-medium text-gray-700">Region Coverage:</span>{' '}
                  {(geographicData.filter((r) => r.nodeCount > 0).length / 5) * 100}% (40 points)
                </p>
                <p>
                  <span className="font-medium text-gray-700">Distribution Balance:</span>{' '}
                  {decentralizationScore > 0 ? '~' : 0}
                  {Math.max(
                    0,
                    decentralizationScore -
                      (geographicData.filter((r) => r.nodeCount > 0).length / 5) * 40 -
                      ((geographicData.filter((r) => r.nodeCount > 0).reduce(
                        (acc, r) => acc + r.avgUptime,
                        0
                      ) /
                        Math.max(1, geographicData.filter((r) => r.nodeCount > 0).length) /
                        100) *
                        20)
                  ).toFixed(0)}
                  % (40 points)
                </p>
                <p>
                  <span className="font-medium text-gray-700">Network Health:</span>{' '}
                  {(
                    (geographicData.filter((r) => r.nodeCount > 0).reduce(
                      (acc, r) => acc + r.avgUptime,
                      0
                    ) /
                      Math.max(1, geographicData.filter((r) => r.nodeCount > 0).length) /
                      100) *
                    100
                  ).toFixed(0)}
                  % (20 points)
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">Regional Performance</h3>
            </div>
            <div className="space-y-2">
              {geographicData
                .filter((r) => r.nodeCount > 0)
                .sort((a, b) => b.nodeCount - a.nodeCount)
                .map((region) => (
                  <div
                    key={region.region}
                    className="bg-gray-50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className={`w-3 h-3 ${regionTextColors[region.region]}`} />
                        <span className="text-sm font-medium text-gray-900">{region.region}</span>
                      </div>
                      <span className="text-xs text-gray-500">{region.nodeCount} nodes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Uptime</p>
                        <p className="font-medium text-gray-900">{region.avgUptime.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Response</p>
                        <p className="font-medium text-gray-900">{region.avgResponseTime.toFixed(0)}ms</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Staked</p>
                        <p className="font-medium text-gray-900">
                          {region.totalStaked >= 1e6
                            ? `${(region.totalStaked / 1e6).toFixed(1)}M`
                            : `${(region.totalStaked / 1e3).toFixed(0)}K`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('winklink.staking.overview')}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Active Rate</span>
                <span className="font-medium text-gray-900">
                  {((stakingData.activeNodes / stakingData.totalNodes) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Top Tier Nodes</span>
                <span className="font-medium text-gray-900">
                  {stakingData.stakingTiers.find((t) => t.tier === 'platinum')?.nodeCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tier Levels</span>
                <span className="font-medium text-gray-900">{stakingData.stakingTiers.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
