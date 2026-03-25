'use client';

import { useTranslations } from 'next-intl';
import { Link, Zap, Trophy, Activity, Server } from 'lucide-react';
import { RedStoneCrossChainViewProps, ChainInfo } from '../types';

const SUPPORTED_CHAINS: ChainInfo[] = [
  { chain: 'Ethereum', latency: 80, updateFreq: 60, status: 'active' },
  { chain: 'Arbitrum', latency: 65, updateFreq: 30, status: 'active' },
  { chain: 'Optimism', latency: 70, updateFreq: 30, status: 'active' },
  { chain: 'Polygon', latency: 75, updateFreq: 45, status: 'active' },
  { chain: 'Avalanche', latency: 85, updateFreq: 60, status: 'active' },
  { chain: 'Base', latency: 60, updateFreq: 30, status: 'active' },
  { chain: 'BNB Chain', latency: 90, updateFreq: 60, status: 'active' },
  { chain: 'Fantom', latency: 95, updateFreq: 60, status: 'active' },
  { chain: 'Linea', latency: 70, updateFreq: 45, status: 'active' },
  { chain: 'Mantle', latency: 75, updateFreq: 45, status: 'active' },
  { chain: 'Scroll', latency: 80, updateFreq: 60, status: 'active' },
  { chain: 'zkSync', latency: 72, updateFreq: 45, status: 'active' },
];

export function RedStoneCrossChainView({ isLoading }: RedStoneCrossChainViewProps) {
  const t = useTranslations();

  const avgLatency = Math.round(
    SUPPORTED_CHAINS.reduce((sum, c) => sum + c.latency, 0) / SUPPORTED_CHAINS.length
  );
  const fastestChain = SUPPORTED_CHAINS.reduce((min, c) => (c.latency < min.latency ? c : min));
  const maxLatency = Math.max(...SUPPORTED_CHAINS.map((c) => c.latency));

  const stats = [
    {
      title: t('redstone.crossChain.supportedChains'),
      value: String(SUPPORTED_CHAINS.length),
      change: '+2',
      changeType: 'positive' as const,
      icon: Link,
    },
    {
      title: t('redstone.stats.avgResponse'),
      value: `${avgLatency}ms`,
      change: '-5ms',
      changeType: 'positive' as const,
      icon: Zap,
    },
    {
      title: t('redstone.crossChain.fastestChain'),
      value: fastestChain.chain,
      change: `${fastestChain.latency}ms`,
      changeType: 'neutral' as const,
      icon: Trophy,
    },
    {
      title: t('redstone.crossChain.uptime'),
      value: '99.9%',
      change: '+0.01%',
      changeType: 'positive' as const,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 跨链统计 - 行内布局 */}
      <div className="flex flex-wrap items-center gap-6 p-4 bg-white border border-gray-200 rounded-lg">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-md">
                <IconComponent className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.title}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading ? '-' : stat.value}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      stat.changeType === 'positive' ? 'text-emerald-600' : 'text-gray-500'
                    }`}
                  >
                    {stat.changeType === 'positive' ? '↑' : '→'} {stat.change}
                  </span>
                </div>
              </div>
              {index < stats.length - 1 && (
                <div className="hidden sm:block w-px h-10 bg-gray-200 ml-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* 链列表表格 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {t('redstone.crossChain.chainList')}
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('redstone.crossChain.chainName')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('redstone.crossChain.latency')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('redstone.crossChain.updateFrequency')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('redstone.crossChain.latencyComparison')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('redstone.crossChain.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {SUPPORTED_CHAINS.map((chain) => (
                <tr key={chain.chain} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-50 rounded-md flex items-center justify-center">
                        <span className="text-xs font-bold text-red-600">
                          {chain.chain.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{chain.chain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{chain.latency}ms</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{chain.updateFreq}s</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                          style={{ width: `${(chain.latency / maxLatency) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round((chain.latency / maxLatency) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        chain.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          chain.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      {chain.status === 'active'
                        ? t('redstone.crossChain.active')
                        : t('redstone.crossChain.inactive')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
