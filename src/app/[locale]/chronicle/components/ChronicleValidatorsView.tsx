'use client';

import { Activity, Shield, Award, Server, Globe, TrendingUp, Clock } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type ChronicleValidatorsViewProps } from '../types';

import { ChronicleDataTable } from './ChronicleDataTable';

interface ValidatorData {
  id: string;
  name: string;
  address: string;
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  stakedAmount: number;
  status: 'active' | 'inactive' | 'jailed';
}

const mockValidators: ValidatorData[] = [
  {
    id: '1',
    name: 'Chronicle Labs',
    address: '0x1234...5678',
    region: 'Europe',
    responseTime: 120,
    successRate: 99.9,
    reputation: 98.5,
    stakedAmount: 5000000,
    status: 'active',
  },
  {
    id: '2',
    name: 'MakerDAO Oracle',
    address: '0xabcd...efgh',
    region: 'North America',
    responseTime: 135,
    successRate: 99.8,
    reputation: 97.2,
    stakedAmount: 4500000,
    status: 'active',
  },
  {
    id: '3',
    name: 'DeFi Sentinel',
    address: '0x9876...5432',
    region: 'Asia',
    responseTime: 155,
    successRate: 99.7,
    reputation: 95.8,
    stakedAmount: 3200000,
    status: 'active',
  },
  {
    id: '4',
    name: 'BlockWatcher',
    address: '0xijkl...mnop',
    region: 'Europe',
    responseTime: 140,
    successRate: 99.6,
    reputation: 94.5,
    stakedAmount: 2800000,
    status: 'active',
  },
  {
    id: '5',
    name: 'PriceGuardian',
    address: '0xqrst...uvwx',
    region: 'North America',
    responseTime: 125,
    successRate: 99.8,
    reputation: 93.2,
    stakedAmount: 2500000,
    status: 'active',
  },
  {
    id: '6',
    name: 'DataValidator',
    address: '0xyzab...cdef',
    region: 'Asia',
    responseTime: 165,
    successRate: 99.5,
    reputation: 91.8,
    stakedAmount: 1800000,
    status: 'active',
  },
];

const regionStats = [
  { region: 'Europe', count: 2, percentage: 33.3 },
  { region: 'North America', count: 2, percentage: 33.3 },
  { region: 'Asia', count: 2, percentage: 33.3 },
];

export function ChronicleValidatorsView({
  validatorMetrics,
  isLoading,
}: ChronicleValidatorsViewProps) {
  const t = useTranslations();

  const totalStaked = mockValidators.reduce((acc, n) => acc + n.stakedAmount, 0);
  const avgSuccessRate = (
    mockValidators.reduce((acc, n) => acc + n.successRate, 0) / mockValidators.length
  ).toFixed(1);
  const avgResponseTime = Math.round(
    mockValidators.reduce((acc, n) => acc + n.responseTime, 0) / mockValidators.length
  );

  const columns = [
    { key: 'name', header: t('chronicle.validators.name'), sortable: true },
    { key: 'region', header: t('chronicle.validators.region'), sortable: true },
    {
      key: 'responseTime',
      header: t('chronicle.validators.responseTime'),
      sortable: true,
      render: (item: ValidatorData) => `${item.responseTime}ms`,
    },
    {
      key: 'successRate',
      header: t('chronicle.validators.successRate'),
      sortable: true,
      render: (item: ValidatorData) => `${item.successRate}%`,
    },
    {
      key: 'reputation',
      header: t('chronicle.validators.reputation'),
      sortable: true,
      render: (item: ValidatorData) => (
        <span
          className={`font-medium ${item.reputation >= 95 ? 'text-emerald-600' : item.reputation >= 90 ? 'text-amber-600' : 'text-gray-600'}`}
        >
          {item.reputation}
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('chronicle.validators.staked'),
      sortable: true,
      render: (item: ValidatorData) => `${(item.stakedAmount / 1e6).toFixed(2)}M MKR`,
    },
    {
      key: 'status',
      header: t('chronicle.validators.status'),
      sortable: true,
      render: (item: ValidatorData) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            item.status === 'active'
              ? 'text-emerald-600'
              : item.status === 'inactive'
                ? 'text-gray-500'
                : 'text-red-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'active'
                ? 'bg-emerald-500'
                : item.status === 'inactive'
                  ? 'bg-gray-400'
                  : 'bg-red-500'
            }`}
          />
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* 节点统计概览 - 简化内联展示 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chronicle.validators.total')}</span>
          <span className="text-lg font-semibold text-gray-900">{mockValidators.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chronicle.validators.avgResponse')}</span>
          <span className="text-lg font-semibold text-gray-900">{avgResponseTime}ms</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chronicle.validators.avgSuccess')}</span>
          <span className="text-lg font-semibold text-emerald-600">{avgSuccessRate}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chronicle.validators.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {(totalStaked / 1e6).toFixed(1)}M MKR
          </span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧 - 验证者表格 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('chronicle.validators.activeValidators')}
            </h2>
          </div>
          <ChronicleDataTable
            data={mockValidators as unknown as Record<string, unknown>[]}
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
                {t('chronicle.validators.regionDistribution')}
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
                      className="bg-amber-500 h-1.5 rounded-full transition-all"
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
                {t('chronicle.validators.overview')}
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chronicle.validators.avgReputation')}</span>
                <span className="font-medium text-gray-900">
                  {(
                    mockValidators.reduce((acc, n) => acc + n.reputation, 0) / mockValidators.length
                  ).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chronicle.validators.topPerformers')}</span>
                <span className="font-medium text-gray-900">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chronicle.validators.regions')}</span>
                <span className="font-medium text-gray-900">{regionStats.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
