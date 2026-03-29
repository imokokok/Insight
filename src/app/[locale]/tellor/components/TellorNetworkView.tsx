'use client';

import { useMemo } from 'react';

import { Activity, Globe, Database, Clock, Zap, Server, TrendingUp, TrendingDown, Shield, Users } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { Blockchain } from '@/types/oracle';

import { type TellorNetworkViewProps } from '../types';

interface ChainStatus {
  chain: Blockchain;
  status: 'healthy' | 'degraded' | 'down';
  blockHeight: number;
  avgLatency: number;
  reporterCount: number;
  dataFeeds: number;
}

function generateChainStatuses(): ChainStatus[] {
  const chains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.OPTIMISM,
    Blockchain.BASE,
  ];

  return chains.map((chain, index) => ({
    chain,
    status: ['healthy', 'healthy', 'healthy', 'healthy', 'degraded'][index] as 'healthy' | 'degraded' | 'down',
    blockHeight: 18500000 + Math.floor(Math.random() * 10000),
    avgLatency: [120, 85, 95, 110, 100][index],
    reporterCount: [28, 22, 18, 15, 12][index],
    dataFeeds: [150, 120, 95, 80, 70][index],
  }));
}

export function TellorNetworkView({ config }: TellorNetworkViewProps) {
  const t = useTranslations('tellor');
  const chainStatuses = useMemo(() => generateChainStatuses(), []);

  const networkMetrics = [
    {
      label: t('network.activeReporters'),
      value: '72',
      change: '+5.2%',
      icon: Users,
      trend: 'up',
    },
    {
      label: t('network.dataFeeds'),
      value: '350+',
      change: '+12%',
      icon: Database,
      trend: 'up',
    },
    {
      label: t('network.avgResponseTime'),
      value: '95ms',
      change: '-8%',
      icon: Clock,
      trend: 'down',
    },
    {
      label: t('network.uptime'),
      value: '99.9%',
      change: '+0.1%',
      icon: Shield,
      trend: 'up',
    },
  ];

  const hourlyActivity = [
    { hour: '00:00', requests: 1200, updates: 850 },
    { hour: '04:00', requests: 800, updates: 600 },
    { hour: '08:00', requests: 1500, updates: 1100 },
    { hour: '12:00', requests: 1800, updates: 1350 },
    { hour: '16:00', requests: 1600, updates: 1200 },
    { hour: '20:00', requests: 1400, updates: 1000 },
  ];

  const maxRequests = Math.max(...hourlyActivity.map((a) => a.requests));

  return (
    <div className="space-y-8">
      {/* 网络概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {networkMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.trend === 'up';
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-50">
                  <Icon className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-xs text-gray-500">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                <span
                  className={`text-xs flex items-center gap-0.5 ${
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {metric.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 链状态表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">{t('network.chainStatus')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('network.chain')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('network.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('network.reporters')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('network.dataFeeds')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('network.latency')}
              </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('network.performance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chainStatuses.map((chain, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                        <Globe className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{chain.chain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        chain.status === 'healthy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : chain.status === 'degraded'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {chain.status === 'healthy'
                        ? t('network.healthy')
                        : chain.status === 'degraded'
                          ? t('network.degraded')
                          : t('network.down')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {chain.reporterCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {chain.dataFeeds}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {chain.avgLatency}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${95 - chain.avgLatency * 0.1}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {(95 - chain.avgLatency * 0.1).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 每小时活动统计 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">{t('network.hourlyActivity')}</h3>
        <div className="space-y-4">
          {hourlyActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-12">{activity.hour}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${(activity.requests / maxRequests) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">
                  {activity.requests.toLocaleString()} {t('network.requests')}
                </span>
              </div>
              <div className="flex items-center gap-2 w-32">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-gray-500">{activity.updates} {t('network.updates')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
