'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, TrendingDown, Activity, Server, Clock, Shield, Scale } from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type UmaMarketViewProps } from '../types';

import { OptimisticOracleFlow } from './OptimisticOracleFlow';

export function UmaMarketView({ config, price, networkStats }: UmaMarketViewProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? 0;
  const priceChange24h = price?.change24hPercent ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      label: t('uma.stats.marketCap'),
      value:
        config.marketData.marketCap > 0
          ? `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`
          : '-',
      change: price ? `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%` : '-',
    },
    {
      label: t('uma.stats.volume24h'),
      value:
        config.marketData.volume24h > 0
          ? `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`
          : '-',
      change: null,
    },
    {
      label: t('uma.stats.circulatingSupply'),
      value:
        config.marketData.circulatingSupply > 0
          ? `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M UMA`
          : '-',
      change: null,
    },
    {
      label: t('uma.stats.stakingApr'),
      value: config.marketData.stakingApr ? `${config.marketData.stakingApr}%` : '-',
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    {
      label: t('uma.stats.activeValidators'),
      value: networkStats?.activeValidators ? `${networkStats.activeValidators}+` : '-',
      status: 'healthy' as const,
      icon: Server,
    },
    {
      label: t('uma.stats.totalDisputes'),
      value: networkStats?.totalDisputes ? `${networkStats.totalDisputes}+` : '-',
      status: 'healthy' as const,
      icon: Scale,
    },
    {
      label: t('uma.stats.disputeSuccessRate'),
      value: networkStats?.disputeSuccessRate ? `${networkStats.disputeSuccessRate}%` : '-',
      status: 'healthy' as const,
      icon: Shield,
    },
    {
      label: t('uma.stats.avgResolutionTime'),
      value: networkStats?.avgResolutionTime ? `${networkStats.avgResolutionTime}h` : '-',
      status: 'healthy' as const,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8">
      <OptimisticOracleFlow />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('uma.priceTrend')}</h3>
          </div>
          <div className="flex-1">
            {config.client ? (
              <PriceChart
                client={config.client}
                symbol={config.symbol}
                chain={config.defaultChain}
                height={300}
                showToolbar={true}
                defaultPrice={config.marketData.change24hValue}
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t('common.noData')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.quickStats')}</h3>
            <div className="flex-1 flex flex-col">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-500">{stat.label}</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium ${
                        stat.highlight ? 'text-emerald-600' : 'text-gray-900'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.change && stat.change !== '-' && (
                      <span
                        className={`text-xs ml-2 ${
                          stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.networkStatus')}</h3>
            <div className="flex-1 flex flex-col gap-3">
              {networkStatus.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.value}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.market.tradingPair')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">UMA/USDC</p>
            <p className="text-2xl font-semibold text-gray-900">
              {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '-'}
            </p>
            {price && (
              <div className="flex items-center gap-1 mt-1">
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                )}
                <span className={`text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}
                  {priceChange24h.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {config.marketData.volume24h > 0
                ? `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">-</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
