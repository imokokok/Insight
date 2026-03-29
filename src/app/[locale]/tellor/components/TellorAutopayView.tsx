'use client';

import { TrendingUp, TrendingDown, Database, Activity, Gift, Users, Clock, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorAutopayViewProps } from '../types';

export function TellorAutopayView({ isLoading }: TellorAutopayViewProps) {
  const t = useTranslations();

  const poolStats = [
    {
      label: t('tellor.autopay.totalFunds'),
      value: '1.5M TRB',
      change: '+12%',
      trend: 'up',
      icon: Database,
    },
    {
      label: t('tellor.autopay.activeQueries'),
      value: '48',
      change: '+6',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('tellor.autopay.pendingRewards'),
      value: '125K TRB',
      change: '+8%',
      trend: 'up',
      icon: Gift,
    },
    {
      label: t('tellor.autopay.sponsors'),
      value: '32',
      change: '+3',
      trend: 'up',
      icon: Users,
    },
  ];

  const activeQueries = [
    {
      queryId: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
      dataType: 'SpotPrice',
      asset: 'ETH/USD',
      currentTip: '50 TRB',
      totalReward: '12,500 TRB',
      lastUpdate: '2 min ago',
    },
    {
      queryId: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234',
      dataType: 'SpotPrice',
      asset: 'BTC/USD',
      currentTip: '75 TRB',
      totalReward: '28,000 TRB',
      lastUpdate: '5 min ago',
    },
    {
      queryId: '0x3c4d5e6f7890abcdef1234567890abcdef123456',
      dataType: 'SpotPrice',
      asset: 'TRB/USD',
      currentTip: '30 TRB',
      totalReward: '8,200 TRB',
      lastUpdate: '8 min ago',
    },
    {
      queryId: '0x4d5e6f7890abcdef1234567890abcdef12345678',
      dataType: 'TWAP',
      asset: 'ETH/USD',
      currentTip: '100 TRB',
      totalReward: '45,000 TRB',
      lastUpdate: '12 min ago',
    },
    {
      queryId: '0x5e6f7890abcdef1234567890abcdef1234567890',
      dataType: 'SpotPrice',
      asset: 'MATIC/USD',
      currentTip: '25 TRB',
      totalReward: '5,800 TRB',
      lastUpdate: '15 min ago',
    },
  ];

  const fundingHistory = [
    {
      time: '2024-01-15 14:32',
      type: 'tip',
      amount: '500 TRB',
      address: '0x1234...5678',
    },
    {
      time: '2024-01-15 12:18',
      type: 'claim',
      amount: '1,200 TRB',
      address: '0xabcd...efgh',
    },
    {
      time: '2024-01-15 10:45',
      type: 'tip',
      amount: '350 TRB',
      address: '0x9876...5432',
    },
    {
      time: '2024-01-15 09:22',
      type: 'claim',
      amount: '800 TRB',
      address: '0xdefg...hijk',
    },
    {
      time: '2024-01-15 08:05',
      type: 'tip',
      amount: '1,000 TRB',
      address: '0xlmno...pqrs',
    },
    {
      time: '2024-01-14 22:30',
      type: 'claim',
      amount: '2,500 TRB',
      address: '0xtuvw...xyz0',
    },
  ];

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const truncateQueryId = (queryId: string) => {
    if (queryId.length <= 16) return queryId;
    return `${queryId.slice(0, 10)}...${queryId.slice(-6)}`;
  };

  return (
    <div className="space-y-8">
      {/* 资金池统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {poolStats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                <div
                  className={`flex items-center gap-0.5 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  <TrendIcon className="w-3.5 h-3.5" />
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 活跃Query列表 */}
        <div className="lg:col-span-2">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.autopay.activeQueriesList')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('tellor.autopay.queryId')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('tellor.autopay.dataType')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('tellor.autopay.currentTip')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('tellor.autopay.totalReward')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('tellor.autopay.lastUpdate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeQueries.map((query, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-gray-900">
                        {truncateQueryId(query.queryId)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{query.dataType}</span>
                        <span className="text-xs text-gray-500">{query.asset}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-cyan-600">{query.currentTip}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">{query.totalReward}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{query.lastUpdate}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 资金历史记录 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellor.autopay.fundingHistory')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('tellor.autopay.time')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('tellor.autopay.type')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('tellor.autopay.amount')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('tellor.autopay.address')}
                </th>
              </tr>
            </thead>
            <tbody>
              {fundingHistory.map((record, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-900">{record.time}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {record.type === 'tip' ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-sm font-medium text-emerald-600">
                            {t('tellor.autopay.tip')}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                            <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <span className="text-sm font-medium text-amber-600">
                            {t('tellor.autopay.claim')}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`text-sm font-medium ${record.type === 'tip' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {record.amount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-gray-600">{record.address}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* Autopay 说明 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.autopay.howItWorks') || 'How Autopay Works'}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </span>
              <span>Sponsors fund data queries with TRB tokens to incentivize reporters</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </span>
              <span>Reporters submit data for funded queries and earn tips automatically</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </span>
              <span>Payments are distributed based on query response and data accuracy</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.autopay.benefits') || 'Benefits'}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Automated reward distribution reduces manual overhead</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Flexible tipping allows custom incentive structures</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Transparent on-chain tracking of all payments and tips</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
