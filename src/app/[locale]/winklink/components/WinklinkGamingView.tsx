'use client';

import { useTranslations } from 'next-intl';
import { WinklinkGamingViewProps } from '../types';

export function WinklinkGamingView({ gaming, isLoading }: WinklinkGamingViewProps) {
  const t = useTranslations();

  const gamingData = gaming || {
    totalGamingVolume: 850000000,
    activeGames: 125,
    dailyRandomRequests: 125000,
    dataSources: [
      {
        id: 'game-001',
        name: 'Dice',
        type: 'game',
        category: 'casino',
        users: 450000,
        volume24h: 8500000,
        dataTypes: ['random_number', 'outcome_verification'],
        reliability: 99.9,
        lastUpdate: Date.now(),
      },
      {
        id: 'game-002',
        name: 'Moon',
        type: 'game',
        category: 'casino',
        users: 320000,
        volume24h: 6200000,
        dataTypes: ['random_number', 'outcome_verification'],
        reliability: 99.8,
        lastUpdate: Date.now(),
      },
    ],
    randomNumberServices: [
      {
        serviceId: 'vrf-001',
        name: 'WINkLink VRF',
        requestCount: 5200000,
        averageResponseTime: 105,
        securityLevel: 'high',
        supportedChains: ['TRON', 'BNB'],
      },
      {
        serviceId: 'rng-001',
        name: 'Casino RNG Service',
        requestCount: 5200000,
        averageResponseTime: 105,
        securityLevel: 'medium',
        supportedChains: ['TRON', 'BTTC'],
      },
    ],
  };

  const stats = [
    {
      label: t('winklink.gaming.totalVolume'),
      value: `$${(gamingData.totalGamingVolume / 1e9).toFixed(2)}B`,
      change: '+15%',
    },
    {
      label: t('winklink.gaming.activeGames'),
      value: gamingData.activeGames.toString(),
      change: '+8',
    },
    {
      label: t('winklink.gaming.dailyRandomRequests'),
      value: `${(gamingData.dailyRandomRequests / 1e3).toFixed(0)}K`,
      change: '+12%',
    },
    {
      label: t('winklink.gaming.avgReliability'),
      value: '99.85%',
      change: '+0.05%',
    },
  ];

  const vrfUseCases = [
    { id: '1', name: 'Casino Games', category: 'Gaming', description: 'Random outcomes for dice, slots, and card games', usageCount: 2500000, reliability: 99.9 },
    { id: '2', name: 'Lottery Draws', category: 'Gaming', description: 'Fair and verifiable lottery number generation', usageCount: 850000, reliability: 99.95 },
    { id: '3', name: 'NFT Minting', category: 'Gaming', description: 'Random NFT attribute generation', usageCount: 420000, reliability: 99.8 },
    { id: '4', name: 'Tournament Brackets', category: 'Esports', description: 'Random tournament seeding and matchmaking', usageCount: 180000, reliability: 99.9 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.change && (
                <span className="text-sm font-medium text-emerald-600">{stat.change}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.gaming.randomNumberServices')}
          </h3>
          <div className="space-y-3">
            {gamingData.randomNumberServices.map((service) => (
              <div key={service.serviceId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    service.securityLevel === 'high'
                      ? 'bg-emerald-100 text-emerald-700'
                      : service.securityLevel === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {service.securityLevel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Requests:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {(service.requestCount / 1e6).toFixed(1)}M
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Response:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {service.averageResponseTime}ms
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {service.supportedChains.map((chain) => (
                    <span
                      key={chain}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-700"
                    >
                      {chain}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.gaming.vrfUseCases')}
          </h3>
          <div className="space-y-3">
            {vrfUseCases.map((useCase) => (
              <div key={useCase.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{useCase.name}</h4>
                  <span className="text-xs text-gray-500">{useCase.category}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{useCase.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Usage: <span className="font-medium text-gray-900">{(useCase.usageCount / 1e6).toFixed(1)}M</span>
                  </span>
                  <span className="text-gray-500">
                    Reliability: <span className="font-medium text-emerald-600">{useCase.reliability}%</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('winklink.gaming.dataSources')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('winklink.gaming.gameName')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('winklink.gaming.category')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('winklink.gaming.users')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('winklink.gaming.volume24h')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('winklink.gaming.reliability')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gamingData.dataSources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {source.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                      {source.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {source.users.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ${(source.volume24h / 1e6).toFixed(2)}M
                  </td>
                  <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                    {source.reliability}%
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
