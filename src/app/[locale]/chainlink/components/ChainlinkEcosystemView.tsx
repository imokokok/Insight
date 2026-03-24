'use client';

import { useTranslations } from 'next-intl';
import { Blockchain } from '@/types/oracle';

const supportedChains = [
  { name: 'Ethereum', icon: '⬡', color: 'bg-blue-500' },
  { name: 'Arbitrum', icon: '⬡', color: 'bg-blue-600' },
  { name: 'Optimism', icon: '⬡', color: 'bg-red-500' },
  { name: 'Polygon', icon: '⬡', color: 'bg-purple-500' },
  { name: 'Avalanche', icon: '⬡', color: 'bg-red-600' },
  { name: 'Base', icon: '⬡', color: 'bg-blue-700' },
  { name: 'BNB Chain', icon: '⬡', color: 'bg-yellow-500' },
  { name: 'Fantom', icon: '⬡', color: 'bg-blue-400' },
];

const ecosystemProjects = [
  { name: 'Aave', category: 'Lending', tvl: '$8.2B' },
  { name: 'Compound', category: 'Lending', tvl: '$3.1B' },
  { name: 'Synthetix', category: 'Derivatives', tvl: '$1.8B' },
  { name: 'dYdX', category: 'DEX', tvl: '$2.4B' },
  { name: 'MakerDAO', category: 'Stablecoin', tvl: '$6.5B' },
  { name: 'Curve', category: 'DEX', tvl: '$4.2B' },
  { name: 'Uniswap', category: 'DEX', tvl: '$5.8B' },
  { name: 'Lido', category: 'Staking', tvl: '$15.2B' },
];

export function ChainlinkEcosystemView() {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chainlink.ecosystem.supportedChains')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {supportedChains.map((chain, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className={`w-8 h-8 ${chain.color} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                {chain.icon}
              </div>
              <span className="text-sm font-medium text-gray-900">{chain.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chainlink.ecosystem.integratedProjects')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ecosystemProjects.map((project, index) => (
            <div
              key={index}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <p className="font-medium text-gray-900">{project.name}</p>
              <p className="text-xs text-gray-500">{project.category}</p>
              <p className="text-sm font-semibold text-emerald-600 mt-2">{project.tvl}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {t('chainlink.ecosystem.totalValueSecured')}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">$13.85B+</p>
          <p className="text-sm text-emerald-600 mt-1">+8% {t('chainlink.vsLastMonth')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {t('chainlink.ecosystem.integratedProjects')}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">1,500+</p>
          <p className="text-sm text-emerald-600 mt-1">+120 {t('chainlink.thisMonth')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {t('chainlink.ecosystem.supportedChains')}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">15+</p>
          <p className="text-sm text-gray-500 mt-1">{t('chainlink.andGrowing')}</p>
        </div>
      </div>
    </div>
  );
}
