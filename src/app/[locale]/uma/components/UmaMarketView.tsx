'use client';

import { useTranslations } from '@/i18n';
import { PriceChart } from '@/components/oracle';
import { UmaMarketViewProps } from '../types';
import { TrendingUp, TrendingDown, Activity, Zap, Server, Clock, Shield, Scale } from 'lucide-react';

export function UmaMarketView({
  config,
  price,
  networkStats,
}: UmaMarketViewProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;

  const stats = [
    {
      label: t('uma.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: '+5%',
    },
    {
      label: t('uma.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+8%',
    },
    {
      label: t('uma.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M UMA`,
      change: null,
    },
    {
      label: t('uma.stats.stakingApr'),
      value: `${config.marketData.stakingApr ?? '8.5'}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    { 
      label: t('uma.stats.activeValidators'), 
      value: `${networkStats?.activeValidators ?? 850}+`, 
      status: 'healthy' as const,
      icon: Server 
    },
    { 
      label: t('uma.stats.totalDisputes'), 
      value: `${networkStats?.totalDisputes ?? 1250}+`, 
      status: 'healthy' as const,
      icon: Scale 
    },
    { 
      label: t('uma.stats.disputeSuccessRate'), 
      value: `${networkStats?.disputeSuccessRate ?? 78}%`, 
      status: 'healthy' as const,
      icon: Shield 
    },
    { 
      label: t('uma.stats.avgResolutionTime'), 
      value: `${networkStats?.avgResolutionTime ?? 4.2}h`, 
      status: 'healthy' as const,
      icon: Clock 
    },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('uma.priceTrend')}
            </h3>
          </div>
          <div className="flex-1">
            <PriceChart
              client={config.client}
              symbol={config.symbol}
              chain={config.defaultChain}
              height={300}
              showToolbar={true}
              defaultPrice={config.marketData.change24hValue}
            />
          </div>
        </div>

        {/* 右侧统计区域 */}
        <div className="flex flex-col gap-8">
          {/* 快速统计 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('uma.quickStats')}
            </h3>
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
                    {stat.change && (
                      <span className={`text-xs ml-2 ${
                        stat.change.startsWith('+') 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 网络状态 - 内联布局 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('uma.networkStatus')}
            </h3>
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

          {/* 数据来源 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('uma.dataSource')}
            </h3>
            <div className="flex-1 flex flex-col">
              {[
                { name: 'UMA Market', status: 'active', latency: '150ms' },
                { name: 'Ethereum Mainnet', status: 'active', latency: '300ms' },
                { name: 'Secondary Feed', status: 'active', latency: '180ms' },
                { name: 'Backup Node', status: 'syncing', latency: '450ms' },
              ].map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        source.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{source.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{source.latency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 核心交易对信息 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('uma.tradingPair') || '主要交易对'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">UMA/USDC</p>
            <p className="text-2xl font-semibold text-gray-900">${currentPrice.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-1">
              {priceChange24h >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className={`text-sm ${priceChange24h >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">${(config.marketData.volume24h / 1e6).toFixed(1)}M</p>
            <p className="text-sm text-emerald-600 mt-1">+8.2%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">$28.5M</p>
            <p className="text-sm text-emerald-600 mt-1">+3.5%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">7.8</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('uma.depthScore')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
