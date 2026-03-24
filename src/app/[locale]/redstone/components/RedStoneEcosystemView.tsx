'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RedStoneEcosystemViewProps, EcosystemIntegration } from '../types';

const ECOSYSTEM_INTEGRATIONS: EcosystemIntegration[] = [
  { name: 'Arweave', description: 'Permanent data storage', category: 'infrastructure' },
  { name: 'Ethereum', description: 'Smart contract platform', category: 'infrastructure' },
  { name: 'Avalanche', description: 'High-throughput blockchain', category: 'infrastructure' },
  { name: 'Aave', description: 'Decentralized lending protocol', category: 'defi' },
  { name: 'Compound', description: 'Algorithmic money markets', category: 'defi' },
  { name: 'Uniswap', description: 'Decentralized exchange', category: 'defi' },
  { name: 'GMX', description: 'Decentralized perpetual exchange', category: 'defi' },
  { name: 'Pendle', description: 'Yield tokenization protocol', category: 'defi' },
  { name: 'Stargate', description: 'Cross-chain liquidity transport', category: 'defi' },
  { name: 'Radiant', description: 'Cross-chain lending protocol', category: 'defi' },
  { name: 'OpenSea', description: 'NFT marketplace', category: 'nft' },
  { name: 'Blur', description: 'NFT marketplace for pro traders', category: 'nft' },
];

export function RedStoneEcosystemView({ isLoading }: RedStoneEcosystemViewProps) {
  const t = useTranslations();

  const ecosystemByCategory = useMemo(() => {
    const categories: Record<string, typeof ECOSYSTEM_INTEGRATIONS> = {};
    ECOSYSTEM_INTEGRATIONS.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });
    return categories;
  }, []);

  const stats = [
    {
      title: t('redstone.ecosystem.integrations'),
      value: `${ECOSYSTEM_INTEGRATIONS.length}+`,
      change: '+3',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.ecosystem.defiProtocols'),
      value: String(ecosystemByCategory.defi?.length || 6),
      change: '+1',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.ecosystem.categories.infrastructure'),
      value: String(ecosystemByCategory.infrastructure?.length || 3),
      change: '+1',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      title: t('redstone.ecosystem.nftAndGaming'),
      value: String(
        (ecosystemByCategory.nft?.length || 2) +
          (ecosystemByCategory.gaming?.length || 0)
      ),
      change: '+1',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '→'}{' '}
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

      {Object.entries(ecosystemByCategory).map(([category, items]) => (
        <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t(`redstone.ecosystem.categories.${category}`)}
          </h3>
          <div className="border border-gray-200 divide-y divide-gray-200 rounded-lg overflow-hidden">
            {items.map((integration, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                  <p className="text-sm text-gray-600 mt-0.5">{integration.description}</p>
                </div>
                <span className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 bg-gray-50">
                  {t(`redstone.ecosystem.categories.${integration.category}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
