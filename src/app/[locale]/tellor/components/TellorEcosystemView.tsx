'use client';

import { useState } from 'react';

import {
  Building2,
  TrendingUp,
  Link2,
  Layers,
  ChevronRight,
  ExternalLink,
  BarChart3,
  Globe,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorEcosystemViewProps } from '../types';

interface Protocol {
  name: string;
  category: string;
  tvl: number;
  usage: number;
  logo: string;
}

const protocols: Protocol[] = [
  { name: 'Aave V3', category: 'Lending', tvl: 450000000, usage: 12500, logo: 'A' },
  { name: 'Uniswap V3', category: 'DEX', tvl: 380000000, usage: 8900, logo: 'U' },
  { name: 'Compound', category: 'Lending', tvl: 280000000, usage: 6700, logo: 'C' },
  { name: 'SushiSwap', category: 'DEX', tvl: 150000000, usage: 4200, logo: 'S' },
  { name: 'dYdX', category: 'Derivatives', tvl: 120000000, usage: 3500, logo: 'D' },
];

const categories = [
  { name: 'Lending', count: 12, percentage: 35 },
  { name: 'DEX', count: 8, percentage: 24 },
  { name: 'Derivatives', count: 6, percentage: 18 },
  { name: 'Yield', count: 5, percentage: 15 },
  { name: 'Other', count: 3, percentage: 8 },
];

export function TellorEcosystemView({ ecosystem, isLoading }: TellorEcosystemViewProps) {
  const t = useTranslations('tellor');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const stats = [
    {
      label: t('ecosystem.totalProtocols'),
      value: '34',
      change: '+5',
      icon: Building2,
    },
    {
      label: t('ecosystem.totalTvl'),
      value: '$1.38B',
      change: '+18%',
      icon: TrendingUp,
    },
    {
      label: t('ecosystem.dataFeeds'),
      value: '350+',
      change: '+42',
      icon: Link2,
    },
    {
      label: t('ecosystem.totalUsage'),
      value: '35.8K',
      change: '+23%',
      icon: Layers,
    },
  ];

  const filteredProtocols =
    selectedCategory === 'all'
      ? protocols
      : protocols.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-50">
                  <Icon className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                <span className="text-xs text-emerald-600">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 类别筛选和协议列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 类别分布 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('ecosystem.protocolsByCategory')}
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-cyan-50 border border-cyan-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium text-gray-900">{t('ecosystem.allCategories')}</span>
              <span className="text-xs text-gray-500">{protocols.length} protocols</span>
            </button>
            {categories.map((category, index) => (
              <button
                key={index}
                onClick={() => setSelectedCategory(category.name)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-cyan-50 border border-cyan-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'][index],
                    }}
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'][index],
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{category.count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 协议列表 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-medium text-gray-900">{t('ecosystem.topProtocols')}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredProtocols.map((protocol, index) => (
              <div
                key={index}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">
                    {protocol.logo}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{protocol.name}</h4>
                    <span className="text-xs text-gray-500">{protocol.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${(protocol.tvl / 1e6).toFixed(1)}M
                    </p>
                    <p className="text-xs text-gray-500">{t('ecosystem.tvl')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {protocol.usage.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{t('ecosystem.uses')}</p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-cyan-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 生态系统增长 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('ecosystem.growthTrend')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('ecosystem.growth.newProjects'), value: '+5', subtext: t('ecosystem.projectAnalysis.thisMonth') },
            { label: t('ecosystem.growth.tvlGrowth'), value: '+18%', subtext: '30d change' },
            { label: t('ecosystem.growth.integrations'), value: '+12', subtext: t('ecosystem.projectAnalysis.thisMonth') },
            { label: t('ecosystem.growth.communityGrowth'), value: '+2.3K', subtext: 'New members' },
          ].map((item, index) => (
            <div key={index} className="p-4 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-xl font-semibold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-400 mt-1">{item.subtext}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
