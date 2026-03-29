'use client';

import {
  Server,
  TrendingUp,
  Globe,
  Award,
  Activity,
  Clock,
  Shield,
  Wallet,
  BarChart3,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type NodeData, type ChainlinkDataTableProps } from '../types';

import { ChainlinkDataTable } from './ChainlinkDataTable';
import { NodeEarningsPanel } from './NodeEarningsPanel';
import { NodePerformanceTrends } from './NodePerformanceTrends';
import { StakingRewardsCalculator } from './StakingRewardsCalculator';

const mockNodes: NodeData[] = [
  {
    id: '1',
    name: 'LinkPool',
    region: 'North America',
    responseTime: 120,
    successRate: 99.9,
    reputation: 98.5,
    stakedAmount: 2500000,
  },
  {
    id: '2',
    name: 'Certus One',
    region: 'Europe',
    responseTime: 135,
    successRate: 99.8,
    reputation: 97.2,
    stakedAmount: 1800000,
  },
  {
    id: '3',
    name: 'Fiews',
    region: 'North America',
    responseTime: 110,
    successRate: 99.9,
    reputation: 96.8,
    stakedAmount: 2200000,
  },
  {
    id: '4',
    name: 'Everstake',
    region: 'Europe',
    responseTime: 145,
    successRate: 99.7,
    reputation: 95.5,
    stakedAmount: 1500000,
  },
  {
    id: '5',
    name: 'Figment',
    region: 'North America',
    responseTime: 125,
    successRate: 99.8,
    reputation: 94.9,
    stakedAmount: 1900000,
  },
  {
    id: '6',
    name: 'Staked',
    region: 'Asia',
    responseTime: 155,
    successRate: 99.6,
    reputation: 93.8,
    stakedAmount: 1200000,
  },
  {
    id: '7',
    name: 'Blockdaemon',
    region: 'Europe',
    responseTime: 140,
    successRate: 99.7,
    reputation: 93.2,
    stakedAmount: 1600000,
  },
  {
    id: '8',
    name: 'Chorus One',
    region: 'Europe',
    responseTime: 130,
    successRate: 99.8,
    reputation: 92.5,
    stakedAmount: 1400000,
  },
];

const getRegionStats = (t: (key: string) => string) => [
  { region: t('regions.northAmerica'), count: 4, percentage: 50 },
  { region: t('regions.europe'), count: 3, percentage: 37.5 },
  { region: t('regions.asia'), count: 1, percentage: 12.5 },
];

export function ChainlinkNodesView() {
  const t = useTranslations();

  const regionStats = getRegionStats(t);

  const columns: ChainlinkDataTableProps<NodeData>['columns'] = [
    { key: 'name', header: t('chainlink.nodes.name'), sortable: true },
    { key: 'region', header: t('chainlink.nodes.region'), sortable: true },
    {
      key: 'responseTime',
      header: t('chainlink.nodes.responseTime'),
      sortable: true,
      render: (item) => `${item.responseTime}ms`,
    },
    {
      key: 'successRate',
      header: t('chainlink.nodes.successRate'),
      sortable: true,
      render: (item) => `${item.successRate}%`,
    },
    {
      key: 'reputation',
      header: t('chainlink.nodes.reputation'),
      sortable: true,
      render: (item) => (
        <span
          className={`font-medium ${item.reputation >= 95 ? 'text-emerald-600' : item.reputation >= 90 ? 'text-amber-600' : 'text-gray-600'}`}
        >
          {item.reputation}
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('chainlink.nodes.staked'),
      sortable: true,
      render: (item) => `${(item.stakedAmount / 1e6).toFixed(2)}M LINK`,
    },
  ];

  const totalStaked = mockNodes.reduce((acc, n) => acc + n.stakedAmount, 0);
  const avgSuccessRate = (
    mockNodes.reduce((acc, n) => acc + n.successRate, 0) / mockNodes.length
  ).toFixed(1);
  const avgResponseTime = Math.round(
    mockNodes.reduce((acc, n) => acc + n.responseTime, 0) / mockNodes.length
  );

  return (
    <div className="space-y-8">
      {/* 节点统计概览 - 简化内联展示 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.total')}</span>
          <span className="text-lg font-semibold text-gray-900">{mockNodes.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.avgResponse')}</span>
          <span className="text-lg font-semibold text-gray-900">{avgResponseTime}ms</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.avgSuccess')}</span>
          <span className="text-lg font-semibold text-emerald-600">{avgSuccessRate}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {(totalStaked / 1e6).toFixed(1)}M LINK
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
              {t('chainlink.nodes.activeNodes')}
            </h2>
          </div>
          <ChainlinkDataTable<NodeData>
            data={mockNodes}
            columns={columns}
          />
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-8">
          {/* 质押计算器 */}
          <section>
            <StakingRewardsCalculator />
          </section>

          {/* 区域分布 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('chainlink.nodes.regionDistribution')}
              </h3>
            </div>
            <div className="space-y-4">
              {regionStats.map((stat, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{stat.region}</span>
                    <span className="font-medium text-gray-900">
                      {stat.count} <span className="text-gray-400">({stat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-gray-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 概览统计 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">{t('chainlink.nodes.overview')}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chainlink.nodes.avgReputation')}</span>
                <span className="font-medium text-gray-900">
                  {(mockNodes.reduce((acc, n) => acc + n.reputation, 0) / mockNodes.length).toFixed(
                    1
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chainlink.nodes.topPerformers')}</span>
                <span className="font-medium text-gray-900">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chainlink.nodes.regions')}</span>
                <span className="font-medium text-gray-900">{regionStats.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200 my-8" />

      {/* 节点收益分析 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-medium text-gray-900">
            {t('chainlink.nodes.earningsAnalysis')}
          </h2>
        </div>
        <NodeEarningsPanel nodes={mockNodes} />
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200 my-8" />

      {/* 节点性能趋势 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-medium text-gray-900">
            {t('chainlink.nodes.performanceTrends')}
          </h2>
        </div>
        <NodePerformanceTrends nodes={mockNodes} />
      </section>
    </div>
  );
}
