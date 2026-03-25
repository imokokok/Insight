'use client';

import { useTranslations } from '@/i18n';
import { Server, TrendingUp, Globe, Award, Activity, Clock, Shield } from 'lucide-react';
import { ChainlinkDataTable } from '@/app/[locale]/chainlink/components/ChainlinkDataTable';
import { StakingRewardsCalculator } from '@/app/[locale]/chainlink/components/StakingRewardsCalculator';
import { API3AirnodeViewProps } from '../types';

interface AirnodeNode {
  id: string;
  name: string;
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  staked: number;
}

const mockAirnodes: AirnodeNode[] = [
  {
    id: '1',
    name: 'Amberdata',
    region: 'North America',
    responseTime: 95,
    successRate: 99.9,
    reputation: 98.2,
    staked: 3200000,
  },
  {
    id: '2',
    name: 'Finage',
    region: 'Europe',
    responseTime: 110,
    successRate: 99.8,
    reputation: 97.5,
    staked: 2800000,
  },
  {
    id: '3',
    name: 'CoinGecko',
    region: 'Asia',
    responseTime: 125,
    successRate: 99.7,
    reputation: 96.8,
    staked: 2100000,
  },
  {
    id: '4',
    name: 'dxFeed',
    region: 'Europe',
    responseTime: 105,
    successRate: 99.8,
    reputation: 96.2,
    staked: 1950000,
  },
  {
    id: '5',
    name: 'Kaiko',
    region: 'North America',
    responseTime: 100,
    successRate: 99.8,
    reputation: 95.8,
    staked: 1800000,
  },
  {
    id: '6',
    name: 'CoinAPI',
    region: 'Asia',
    responseTime: 130,
    successRate: 99.6,
    reputation: 94.5,
    staked: 1500000,
  },
  {
    id: '7',
    name: 'Tiingo',
    region: 'North America',
    responseTime: 115,
    successRate: 99.7,
    reputation: 93.9,
    staked: 1400000,
  },
  {
    id: '8',
    name: 'NCFX',
    region: 'Europe',
    responseTime: 120,
    successRate: 99.7,
    reputation: 93.2,
    staked: 1250000,
  },
];

const regionStats = [
  { region: 'North America', count: 3, percentage: 37.5 },
  { region: 'Europe', count: 3, percentage: 37.5 },
  { region: 'Asia', count: 2, percentage: 25 },
];

export function API3AirnodeView({
  airnodeStats,
  firstParty,
  isLoading,
}: API3AirnodeViewProps) {
  const t = useTranslations();

  const columns = [
    { key: 'name', header: t('api3.airnode.name'), sortable: true },
    { key: 'region', header: t('api3.airnode.region'), sortable: true },
    {
      key: 'responseTime',
      header: t('api3.airnode.responseTime'),
      sortable: true,
      render: (item: AirnodeNode) => `${item.responseTime}ms`,
    },
    {
      key: 'successRate',
      header: t('api3.airnode.successRate'),
      sortable: true,
      render: (item: AirnodeNode) => `${item.successRate}%`,
    },
    {
      key: 'reputation',
      header: t('api3.airnode.reputation'),
      sortable: true,
      render: (item: AirnodeNode) => (
        <span
          className={`font-medium ${item.reputation >= 95 ? 'text-emerald-600' : item.reputation >= 90 ? 'text-amber-600' : 'text-gray-600'}`}
        >
          {item.reputation}
        </span>
      ),
    },
    {
      key: 'staked',
      header: t('api3.airnode.staked'),
      sortable: true,
      render: (item: AirnodeNode) => `${(item.staked / 1e6).toFixed(2)}M API3`,
    },
  ];

  const totalStaked = mockAirnodes.reduce((acc, n) => acc + n.staked, 0);
  const avgSuccessRate = (mockAirnodes.reduce((acc, n) => acc + n.successRate, 0) / mockAirnodes.length).toFixed(1);
  const avgResponseTime = Math.round(mockAirnodes.reduce((acc, n) => acc + n.responseTime, 0) / mockAirnodes.length);

  const advantages = [
    {
      title: t('api3.advantages.firstParty.title'),
      description: t('api3.advantages.firstParty.description'),
      metrics: '99.8% Uptime',
    },
    {
      title: t('api3.advantages.transparency.title'),
      description: t('api3.advantages.transparency.description'),
      metrics: 'Full Source Traceability',
    },
    {
      title: t('api3.advantages.security.title'),
      description: t('api3.advantages.security.description'),
      metrics: 'Decentralized Coverage',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 节点统计概览 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('api3.airnode.totalNodes')}</span>
          <span className="text-lg font-semibold text-gray-900">{mockAirnodes.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('api3.airnode.avgResponse')}</span>
          <span className="text-lg font-semibold text-gray-900">{avgResponseTime}ms</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('api3.airnode.avgSuccess')}</span>
          <span className="text-lg font-semibold text-emerald-600">{avgSuccessRate}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('api3.airnode.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">{(totalStaked / 1e6).toFixed(1)}M API3</span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧 - 节点表格 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('api3.airnode.activeAirnodes')}
            </h2>
          </div>
          <ChainlinkDataTable
            data={mockAirnodes as unknown as Record<string, unknown>[]}
            columns={
              columns as unknown as Array<{
                key: string;
                header: string;
                width?: string;
                sortable?: boolean;
                render?: (item: Record<string, unknown>) => React.ReactNode;
              }>
            }
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
                {t('api3.airnode.regionDistribution')}
              </h3>
            </div>
            <div className="space-y-4">
              {regionStats.map((stat, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{stat.region}</span>
                    <span className="font-medium text-gray-900">{stat.count} <span className="text-gray-400">({stat.percentage}%)</span></span>
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
              <h3 className="text-sm font-medium text-gray-900">
                {t('api3.airnode.overview')}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('api3.airnode.avgReputation')}</span>
                <span className="font-medium text-gray-900">
                  {(mockAirnodes.reduce((acc, n) => acc + n.reputation, 0) / mockAirnodes.length).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('api3.airnode.topPerformers')}</span>
                <span className="font-medium text-gray-900">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('api3.airnode.regions')}</span>
                <span className="font-medium text-gray-900">{regionStats.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 第一方数据优势 */}
      <div className="py-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-6">
          {t('api3.firstPartyAdvantages')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {advantages.map((advantage, index) => (
            <div key={index} className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">{advantage.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{advantage.description}</p>
              {advantage.metrics && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded">
                  {advantage.metrics}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
