'use client';

import { useTranslations } from 'next-intl';
import {
  GamingData,
  GamingDataSource,
  RandomNumberService,
  VRFUseCase,
  GamingCategoryDistribution,
} from '@/lib/oracles/winklink';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Gamepad2, Dices, Shield, Clock, Users, DollarSign, Zap } from 'lucide-react';

interface WINkLinkGamingDataPanelProps {
  data: GamingData & {
    vrfUseCases?: VRFUseCase[];
    categoryDistribution?: GamingCategoryDistribution[];
  };
}

export function WINkLinkGamingDataPanel({ data }: WINkLinkGamingDataPanelProps) {
  const t = useTranslations();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'casino':
        return 'bg-red-100 text-red-700';
      case 'sports':
        return 'bg-blue-100 text-blue-700';
      case 'esports':
        return 'bg-purple-100 text-purple-700';
      case 'lottery':
        return 'bg-green-100 text-green-700';
      case 'defi':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'game':
        return 'bg-pink-100 text-pink-700';
      case 'platform':
        return 'bg-indigo-100 text-indigo-700';
      case 'tournament':
        return 'bg-orange-100 text-orange-700';
      case 'marketplace':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatNumber = (value: number) => {
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(0)}K`;
    } else {
      return value.toLocaleString();
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(0)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(0)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Gaming Stats */}
      <DashboardCard title={t('winklink.gaming.title')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-pink-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.gaming.totalVolume')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatCurrency(data.totalGamingVolume)}
            </p>
          </div>
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.gaming.activeGames')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{data.activeGames}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Dices className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.gaming.dailyRngRequests')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatNumber(data.dailyRandomRequests)}
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Data Sources */}
      <DashboardCard title={t('winklink.gaming.dataSources')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.dataSources.map((source, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{source.name}</h4>
                <div className="flex gap-1">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getCategoryColor(source.category)}`}
                  >
                    {source.category}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getTypeColor(source.type)}`}
              >
                {source.type}
              </span>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('winklink.gaming.users')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {source.users.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('winklink.gaming.volume24h')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${(source.volume24h / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('winklink.gaming.reliability')}</span>
                  <span className="text-sm font-medium text-green-600">{source.reliability}%</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {source.dataTypes.map((type, i) => (
                  <span key={i} className="px-2 py-1 bg-pink-100 rounded-md text-xs text-pink-700">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Random Number Services */}
      <DashboardCard title={t('winklink.gaming.rngServices')}>
        <div className="space-y-3">
          {data.randomNumberServices.map((service, index) => (
            <div
              key={index}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{service.name}</h4>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium capitalize border ${getSecurityLevelColor(service.securityLevel)}`}
                  >
                    {service.securityLevel} {t('winklink.gaming.security')}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {t('winklink.gaming.chains')}: {service.supportedChains.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <p className="text-lg font-bold text-gray-900">
                      {formatNumber(service.requestCount)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">{t('winklink.gaming.requests')}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <p className="text-lg font-bold text-gray-900">
                      {service.averageResponseTime}ms
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">{t('winklink.gaming.avgResponse')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* VRF Use Cases */}
      {data.vrfUseCases && (
        <DashboardCard title={t('winklink.gaming.vrfUseCases')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.vrfUseCases.map((useCase, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{useCase.name}</h4>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getCategoryColor(useCase.category)}`}
                  >
                    {useCase.category}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{useCase.description}</p>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('winklink.gaming.usageCount')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {useCase.usageCount >= 1e6
                      ? `${(useCase.usageCount / 1e6).toFixed(1)}M`
                      : useCase.usageCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-600">{t('winklink.gaming.reliability')}</span>
                  <span className="text-sm font-medium text-green-600">{useCase.reliability}%</span>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Category Distribution */}
      {data.categoryDistribution && (
        <DashboardCard title={t('winklink.gaming.categoryDistribution')}>
          <div className="space-y-3">
            {data.categoryDistribution.map((category, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600 capitalize">{category.category}</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getCategoryColor(category.category).replace('text-', 'bg-').replace('100', '500')}`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-medium text-gray-900">
                  {category.percentage}%
                </div>
                <div className="w-24 text-right text-sm text-gray-500">
                  {category.count} {t('winklink.gaming.games')}
                </div>
                <div className="w-28 text-right text-sm font-medium text-gray-900">
                  ${(category.volume24h / 1e6).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
