'use client';

import { useTranslations } from 'next-intl';
import { TellorEcosystemViewProps } from '../types';

export function TellorEcosystemView({ isLoading }: TellorEcosystemViewProps) {
  const t = useTranslations();

  const ecosystemStats = [
    {
      label: t('tellor.ecosystem.protocols'),
      value: '45+',
      change: '+3',
    },
    {
      label: t('tellor.ecosystem.chains'),
      value: '6',
      change: '+1',
    },
    {
      label: t('tellor.ecosystem.tvl'),
      value: '$850M',
      change: '+12%',
    },
    {
      label: t('tellor.ecosystem.integrations'),
      value: '120+',
      change: '+8',
    },
  ];

  const protocols = [
    { name: 'Aave', category: 'Lending', tvl: '$450M', status: 'active' },
    { name: 'Compound', category: 'Lending', tvl: '$180M', status: 'active' },
    { name: 'Synthetix', category: 'Derivatives', tvl: '$120M', status: 'active' },
    { name: 'Liquity', category: 'Stablecoin', tvl: '$85M', status: 'active' },
    { name: 'Alchemix', category: 'Yield', tvl: '$45M', status: 'active' },
    { name: 'Float Capital', category: 'Derivatives', tvl: '$25M', status: 'active' },
  ];

  const partners = [
    { name: 'Ethereum', type: 'L1', status: 'live' },
    { name: 'Arbitrum', type: 'L2', status: 'live' },
    { name: 'Optimism', type: 'L2', status: 'live' },
    { name: 'Polygon', type: 'L2', status: 'live' },
    { name: 'Base', type: 'L2', status: 'live' },
    { name: 'Avalanche', type: 'L1', status: 'live' },
  ];

  return (
    <div className="space-y-4">
      {/* Ecosystem Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ecosystemStats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <span className="text-xs text-emerald-600">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Protocol Integrations */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.ecosystem.protocolIntegrations')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocols.map((protocol, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{protocol.name}</p>
                <p className="text-xs text-gray-500">{protocol.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{protocol.tvl}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {protocol.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chain Partners */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.ecosystem.supportedChains')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {partners.map((partner, index) => (
            <div
              key={index}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <p className="text-sm font-medium text-gray-900">{partner.name}</p>
              <p className="text-xs text-gray-500 mt-1">{partner.type}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mt-2">
                {partner.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Why Tellor */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.ecosystem.whyTellor')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-cyan-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {t('tellor.ecosystem.secureTitle')}
            </h4>
            <p className="text-xs text-gray-600">
              {t('tellor.ecosystem.secureDesc')}
            </p>
          </div>
          <div className="p-4 bg-cyan-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {t('tellor.ecosystem.fastTitle')}
            </h4>
            <p className="text-xs text-gray-600">
              {t('tellor.ecosystem.fastDesc')}
            </p>
          </div>
          <div className="p-4 bg-cyan-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {t('tellor.ecosystem.decentralizedTitle')}
            </h4>
            <p className="text-xs text-gray-600">
              {t('tellor.ecosystem.decentralizedDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
