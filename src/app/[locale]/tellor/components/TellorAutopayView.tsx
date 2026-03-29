'use client';

import { useState } from 'react';

import {
  Wallet,
  TrendingUp,
  Clock,
  Users,
  Zap,
  ChevronRight,
  ExternalLink,
  Gift,
  History,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorAutopayViewProps } from '../types';

interface AutopayQuery {
  id: string;
  dataType: string;
  currentTip: number;
  totalReward: number;
  lastUpdate: string;
  frequency: string;
}

interface FundingEvent {
  time: string;
  type: 'tip' | 'claim';
  amount: number;
  address: string;
}

const mockQueries: AutopayQuery[] = [
  {
    id: '0x1a2b...3c4d',
    dataType: 'SpotPrice',
    currentTip: 50,
    totalReward: 2500,
    lastUpdate: '5 min ago',
    frequency: 'Every 1 hour',
  },
  {
    id: '0x5e6f...7a8b',
    dataType: 'TWAP',
    currentTip: 75,
    totalReward: 3800,
    lastUpdate: '12 min ago',
    frequency: 'Every 30 min',
  },
  {
    id: '0x9c0d...1e2f',
    dataType: 'Custom',
    currentTip: 100,
    totalReward: 5200,
    lastUpdate: '8 min ago',
    frequency: 'Every 2 hours',
  },
];

const mockFundingHistory: FundingEvent[] = [
  { time: '10:30', type: 'tip', amount: 50, address: '0x7a8b...3c4d' },
  { time: '10:15', type: 'claim', amount: 150, address: '0x9e2f...8a1b' },
  { time: '09:45', type: 'tip', amount: 75, address: '0x3d5c...9f2e' },
  { time: '09:30', type: 'claim', amount: 200, address: '0x1b4a...7d3c' },
];

export function TellorAutopayView({ isLoading }: TellorAutopayViewProps) {
  const t = useTranslations('tellor');

  const stats = [
    {
      label: t('autopay.totalFunds'),
      value: '125.5K',
      change: '+12%',
      icon: Wallet,
    },
    {
      label: t('autopay.activeQueries'),
      value: '23',
      change: '+3',
      icon: Zap,
    },
    {
      label: t('autopay.pendingRewards'),
      value: '8.2K',
      change: '+5%',
      icon: Gift,
    },
    {
      label: t('autopay.sponsors'),
      value: '45',
      change: '+8',
      icon: Users,
    },
  ];

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

      {/* 活跃查询和资金历史 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 活跃查询 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-medium text-gray-900">{t('autopay.activeQueriesList')}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockQueries.map((query, index) => (
              <div
                key={index}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-cyan-600">{query.id}</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {query.dataType}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-cyan-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">{t('autopay.currentTip')}</p>
                    <p className="text-sm font-semibold text-gray-900">{query.currentTip} TRB</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('autopay.totalReward')}</p>
                    <p className="text-sm font-semibold text-gray-900">{query.totalReward} TRB</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('autopay.lastUpdate')}</p>
                    <p className="text-sm font-semibold text-gray-900">{query.lastUpdate}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{query.frequency}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 资金历史 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-medium text-gray-900">{t('autopay.fundingHistory')}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockFundingHistory.map((event, index) => (
              <div
                key={index}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      event.type === 'tip' ? 'bg-cyan-50' : 'bg-emerald-50'
                    }`}
                  >
                    {event.type === 'tip' ? (
                      <Wallet className="w-4 h-4 text-cyan-600" />
                    ) : (
                      <Gift className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {event.type === 'tip' ? t('autopay.tip') : t('autopay.claim')}
                    </p>
                    <p className="text-xs text-gray-500">{event.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{event.amount} TRB</p>
                  <p className="text-xs text-gray-400">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 如何工作 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">{t('autopay.howItWorks')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: t('autopay.fundQuery'),
              description: t('autopay.fundQueryDesc'),
            },
            {
              step: '2',
              title: t('autopay.setParameters'),
              description: t('autopay.setParametersDesc'),
            },
            {
              step: '3',
              title: t('autopay.autoRewards'),
              description: t('autopay.autoRewardsDesc'),
            },
          ].map((item, index) => (
            <div key={index} className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium flex items-center justify-center">
                  {item.step}
                </span>
                <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
              </div>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
