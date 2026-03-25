'use client';

import { useTranslations } from 'next-intl';
import { TellorReportersViewProps, ReporterData } from '../types';
import { TellorDataTable } from './TellorDataTable';
import { Activity, Clock, Shield, Award, Globe, Server, TrendingUp } from 'lucide-react';

const mockReporters: ReporterData[] = [
  {
    id: '1',
    name: 'TellorWhale',
    address: '0x7a2f...3f9b',
    region: 'North America',
    responseTime: 85,
    successRate: 99.8,
    reputation: 98.5,
    stakedAmount: 10000,
    reports: 45230,
    reward: 1250,
  },
  {
    id: '2',
    name: 'CryptoReporter',
    address: '0x9c4f...8a2d',
    region: 'Europe',
    responseTime: 92,
    successRate: 99.7,
    reputation: 97.2,
    stakedAmount: 8500,
    reports: 38920,
    reward: 1080,
  },
  {
    id: '3',
    name: 'DataMiner',
    address: '0x3f8a...1c5e',
    region: 'Asia',
    responseTime: 105,
    successRate: 99.5,
    reputation: 96.8,
    stakedAmount: 7200,
    reports: 32150,
    reward: 920,
  },
  {
    id: '4',
    name: 'OracleNode',
    address: '0x5a1b...9b3c',
    region: 'North America',
    responseTime: 88,
    successRate: 99.6,
    reputation: 95.5,
    stakedAmount: 6500,
    reports: 28400,
    reward: 810,
  },
  {
    id: '5',
    name: 'BlockReporter',
    address: '0x2d7e...4e8a',
    region: 'Europe',
    responseTime: 95,
    successRate: 99.4,
    reputation: 94.9,
    stakedAmount: 5800,
    reports: 25600,
    reward: 730,
  },
  {
    id: '6',
    name: 'ChainWatcher',
    address: '0x8f3c...2a1d',
    region: 'Asia',
    responseTime: 110,
    successRate: 99.3,
    reputation: 93.8,
    stakedAmount: 5200,
    reports: 23100,
    reward: 680,
  },
  {
    id: '7',
    name: 'PriceOracle',
    address: '0x4b2a...7c9f',
    region: 'North America',
    responseTime: 90,
    successRate: 99.5,
    reputation: 93.2,
    stakedAmount: 4800,
    reports: 21500,
    reward: 620,
  },
  {
    id: '8',
    name: 'DataFeeder',
    address: '0x1e9d...5b3a',
    region: 'Europe',
    responseTime: 98,
    successRate: 99.2,
    reputation: 92.5,
    stakedAmount: 4200,
    reports: 19800,
    reward: 580,
  },
];

const regionStats = [
  { region: 'North America', count: 3, percentage: 37.5 },
  { region: 'Europe', count: 3, percentage: 37.5 },
  { region: 'Asia', count: 2, percentage: 25 },
];

export function TellorReportersView({ isLoading }: TellorReportersViewProps) {
  const t = useTranslations();

  const totalStaked = mockReporters.reduce((acc, r) => acc + r.stakedAmount, 0);
  const avgSuccessRate = (mockReporters.reduce((acc, r) => acc + r.successRate, 0) / mockReporters.length).toFixed(1);
  const avgResponseTime = Math.round(mockReporters.reduce((acc, r) => acc + r.responseTime, 0) / mockReporters.length);

  const columns = [
    { key: 'address', header: t('tellor.reporters.address'), sortable: true },
    {
      key: 'reports',
      header: t('tellor.reporters.reports'),
      sortable: true,
      render: (item: ReporterData) => item.reports.toLocaleString(),
    },
    {
      key: 'successRate',
      header: t('tellor.reporters.accuracy'),
      sortable: true,
      render: (item: ReporterData) => (
        <span className={`font-medium ${item.successRate >= 99.5 ? 'text-emerald-600' : item.successRate >= 99.0 ? 'text-amber-600' : 'text-gray-600'}`}>
          {item.successRate}%
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('tellor.reporters.stake'),
      sortable: true,
      render: (item: ReporterData) => `${item.stakedAmount.toLocaleString()} TRB`,
    },
    {
      key: 'reward',
      header: t('tellor.reporters.reward'),
      sortable: true,
      render: (item: ReporterData) => (
        <span className="text-emerald-600 font-medium">+{item.reward} TRB</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* 报告者统计概览 - 简化内联展示 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('tellor.reporters.total')}</span>
          <span className="text-lg font-semibold text-gray-900">{mockReporters.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('tellor.reporters.avgResponse')}</span>
          <span className="text-lg font-semibold text-gray-900">{avgResponseTime}ms</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('tellor.reporters.avgSuccess')}</span>
          <span className="text-lg font-semibold text-emerald-600">{avgSuccessRate}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('tellor.reporters.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">{(totalStaked / 1e3).toFixed(1)}K TRB</span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧 - 报告者表格 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('tellor.reporters.activeReporters')}
            </h2>
          </div>
          <TellorDataTable
            data={mockReporters as unknown as Record<string, unknown>[]}
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
          {/* 区域分布 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('tellor.reporters.regionDistribution')}
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
                      className="bg-cyan-500 h-1.5 rounded-full transition-all"
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
                {t('tellor.reporters.overview')}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('tellor.reporters.avgReputation')}</span>
                <span className="font-medium text-gray-900">
                  {(mockReporters.reduce((acc, r) => acc + r.reputation, 0) / mockReporters.length).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('tellor.reporters.topPerformers')}</span>
                <span className="font-medium text-gray-900">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('tellor.reporters.regions')}</span>
                <span className="font-medium text-gray-900">{regionStats.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* Reporter Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.reporters.howToBecome')}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </span>
              <span>{t('tellor.reporters.step1')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </span>
              <span>{t('tellor.reporters.step2')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </span>
              <span>{t('tellor.reporters.step3')}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.reporters.rewards')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('tellor.reporters.baseReward')}</span>
              <span className="text-sm font-medium text-gray-900">0.5 TRB / report</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('tellor.reporters.accuracyBonus')}</span>
              <span className="text-sm font-medium text-emerald-600">+20%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">{t('tellor.reporters.stakeBonus')}</span>
              <span className="text-sm font-medium text-emerald-600">Up to +50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
