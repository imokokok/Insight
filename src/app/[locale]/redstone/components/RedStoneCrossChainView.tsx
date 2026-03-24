'use client';

import { useTranslations } from 'next-intl';
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

  const stats = [
    {
      title: t('redstone.crossChain.supportedChains'),
      value: String(SUPPORTED_CHAINS.length),
      change: '+2',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.stats.avgResponse'),
      value: '75ms',
      change: '-5ms',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.crossChain.fastestChain'),
      value: 'Base',
      change: '60ms',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.crossChain.uptime'),
      value: '99.9%',
      change: '+0.01%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-500">{stat.icon}</span>
              <span
                className={`text-xs font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-emerald-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.changeType === 'positive' ? '↑' : '→'}{' '}
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {isLoading ? '-' : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('redstone.crossChain.chainList')}
        </h3>
        <div className="border border-gray-200 divide-y divide-gray-200 rounded-lg overflow-hidden">
          {SUPPORTED_CHAINS.map((chain, index) => (
            <div
              key={chain.chain}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-400 w-6">#{index + 1}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{chain.chain}</h4>
                  <p className="text-xs text-gray-500">
                    {t('redstone.crossChain.updateFrequency')}: {chain.updateFreq}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-900">
                      {chain.latency}ms
                    </span>
                    <span className="text-xs text-gray-500">
                      {t('redstone.crossChain.latency')}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs border rounded-md ${
                    chain.status === 'active'
                      ? 'border-green-200 text-emerald-700 bg-emerald-50'
                      : 'border-gray-200 text-gray-600 bg-gray-50'
                  }`}
                >
                  {chain.status === 'active'
                    ? t('redstone.crossChain.active')
                    : t('redstone.crossChain.inactive')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
