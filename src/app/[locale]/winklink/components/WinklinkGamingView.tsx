'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { WinklinkDataTable } from './WinklinkDataTable';
import { WinklinkGamingViewProps } from '../types';
import { Activity, CheckCircle2, Clock, TrendingUp, Gamepad2, Users, Zap, Shield } from 'lucide-react';

export function WinklinkGamingView({ gaming, isLoading }: WinklinkGamingViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      {
        id: 'game-003',
        name: 'Slots Pro',
        type: 'game',
        category: 'casino',
        users: 280000,
        volume24h: 4800000,
        dataTypes: ['random_number', 'outcome_verification'],
        reliability: 99.85,
        lastUpdate: Date.now(),
      },
      {
        id: 'game-004',
        name: 'Poker Room',
        type: 'game',
        category: 'card',
        users: 195000,
        volume24h: 3200000,
        dataTypes: ['random_number', 'outcome_verification'],
        reliability: 99.9,
        lastUpdate: Date.now(),
      },
      {
        id: 'game-005',
        name: 'Blackjack',
        type: 'game',
        category: 'card',
        users: 165000,
        volume24h: 2800000,
        dataTypes: ['random_number', 'outcome_verification'],
        reliability: 99.88,
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
        requestCount: 3200000,
        averageResponseTime: 95,
        securityLevel: 'medium',
        supportedChains: ['TRON', 'BTTC'],
      },
      {
        serviceId: 'rng-002',
        name: 'Gaming RNG Pro',
        requestCount: 1800000,
        averageResponseTime: 88,
        securityLevel: 'high',
        supportedChains: ['TRON', 'BNB', 'BTTC'],
      },
    ],
  };

  const vrfUseCases = [
    { id: '1', name: 'Casino Games', category: 'Gaming', description: 'Random outcomes for dice, slots, and card games', usageCount: 2500000, reliability: 99.9 },
    { id: '2', name: 'Lottery Draws', category: 'Gaming', description: 'Fair and verifiable lottery number generation', usageCount: 850000, reliability: 99.95 },
    { id: '3', name: 'NFT Minting', category: 'Gaming', description: 'Random NFT attribute generation', usageCount: 420000, reliability: 99.8 },
    { id: '4', name: 'Tournament Brackets', category: 'Esports', description: 'Random tournament seeding and matchmaking', usageCount: 180000, reliability: 99.9 },
  ];

  const categories = [
    { id: 'all', label: 'All', count: gamingData.dataSources.length },
    { id: 'casino', label: 'Casino', count: gamingData.dataSources.filter(f => f.category === 'casino').length },
    { id: 'card', label: 'Card Games', count: gamingData.dataSources.filter(f => f.category === 'card').length },
  ];

  const filteredDataSources = selectedCategory === 'all'
    ? gamingData.dataSources
    : gamingData.dataSources.filter(source => source.category === selectedCategory);

  const dataSourceColumns = [
    { key: 'name', header: t('winklink.gaming.gameName'), sortable: true },
    {
      key: 'category',
      header: t('winklink.gaming.category'),
      sortable: true,
      render: (item: typeof gamingData.dataSources[0]) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {item.category}
        </span>
      ),
    },
    {
      key: 'users',
      header: t('winklink.gaming.users'),
      sortable: true,
      render: (item: typeof gamingData.dataSources[0]) => item.users.toLocaleString(),
    },
    {
      key: 'volume24h',
      header: t('winklink.gaming.volume24h'),
      sortable: true,
      render: (item: typeof gamingData.dataSources[0]) => `$${(item.volume24h / 1e6).toFixed(2)}M`,
    },
    {
      key: 'reliability',
      header: t('winklink.gaming.reliability'),
      sortable: true,
      render: (item: typeof gamingData.dataSources[0]) => (
        <span className="text-emerald-600">{item.reliability}%</span>
      ),
    },
  ];

  const vrfColumns = [
    { key: 'name', header: t('winklink.gaming.serviceName'), sortable: true },
    {
      key: 'securityLevel',
      header: t('winklink.gaming.securityLevel'),
      sortable: true,
      render: (item: typeof gamingData.randomNumberServices[0]) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          item.securityLevel === 'high'
            ? 'bg-emerald-100 text-emerald-700'
            : item.securityLevel === 'medium'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {item.securityLevel}
        </span>
      ),
    },
    {
      key: 'requestCount',
      header: t('winklink.gaming.requests'),
      sortable: true,
      render: (item: typeof gamingData.randomNumberServices[0]) => `${(item.requestCount / 1e6).toFixed(1)}M`,
    },
    {
      key: 'averageResponseTime',
      header: t('winklink.gaming.avgResponse'),
      sortable: true,
      render: (item: typeof gamingData.randomNumberServices[0]) => `${item.averageResponseTime}ms`,
    },
    {
      key: 'supportedChains',
      header: t('winklink.gaming.chains'),
      render: (item: typeof gamingData.randomNumberServices[0]) => (
        <div className="flex flex-wrap gap-1">
          {item.supportedChains.map((chain) => (
            <span
              key={chain}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-700"
            >
              {chain}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.gaming.totalVolume')}</p>
            <p className="text-xl font-semibold text-gray-900">${(gamingData.totalGamingVolume / 1e9).toFixed(2)}B</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.gaming.activeGames')}</p>
            <p className="text-xl font-semibold text-emerald-600">{gamingData.activeGames}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.gaming.dailyRandomRequests')}</p>
            <p className="text-xl font-semibold text-gray-900">{(gamingData.dailyRandomRequests / 1e3).toFixed(0)}K</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('winklink.gaming.avgReliability')}</p>
            <p className="text-xl font-semibold text-gray-900">99.85%</p>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === category.id
                ? 'text-gray-900 bg-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {category.label}
            <span className={`text-xs ${
              selectedCategory === category.id ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Data Sources Table */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.gaming.dataSources')}
        </h3>
        <WinklinkDataTable 
          data={filteredDataSources as Record<string, unknown>[]} 
          columns={dataSourceColumns as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>} 
          isLoading={isLoading}
        />
      </div>

      {/* VRF Services Table */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.gaming.randomNumberServices')}
        </h3>
        <WinklinkDataTable 
          data={gamingData.randomNumberServices as Record<string, unknown>[]} 
          columns={vrfColumns as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>} 
          isLoading={isLoading}
        />
      </div>

      {/* Use Cases - Compact Layout */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.gaming.vrfUseCases')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vrfUseCases.map((useCase) => (
            <div key={useCase.id} className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{useCase.name}</h4>
                  <span className="text-xs text-gray-500">{useCase.category}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{useCase.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-gray-500">
                    Usage: <span className="font-medium text-gray-900">{(useCase.usageCount / 1e6).toFixed(1)}M</span>
                  </span>
                  <span className="text-gray-500">
                    Reliability: <span className="font-medium text-emerald-600">{useCase.reliability}%</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('winklink.gaming.about') || 'About Gaming Services'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.gaming.vrfTitle') || 'Verifiable Randomness'}:</span>
              {' '}{t('winklink.gaming.vrfDesc') || 'WINkLink VRF provides cryptographically secure random numbers for fair gaming outcomes.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('winklink.gaming.securityTitle') || 'Security Level'}:</span>
              {' '}{t('winklink.gaming.securityDesc') || 'High security VRF uses multiple oracle nodes for maximum randomness guarantee.'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900">{t('winklink.gaming.responseTitle') || 'Response Time'}:</span>
              {' '}{t('winklink.gaming.responseDesc') || 'Average response time under 110ms ensures smooth gaming experience.'}
            </p>
            <p>
              <span className="font-medium text-gray-900">{t('winklink.gaming.multiChainTitle') || 'Multi-Chain Support'}:</span>
              {' '}{t('winklink.gaming.multiChainDesc') || 'Available on TRON, BNB Chain, and BTTC networks.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
