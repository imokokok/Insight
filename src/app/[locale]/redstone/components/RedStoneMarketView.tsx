'use client';

import { TrendingUp, TrendingDown, Activity, Zap, Server, Clock, Shield } from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type RedStoneMarketViewProps } from '../types';

export function RedStoneMarketView({
  client,
  price,
  historicalData,
  isLoading,
  networkStats,
}: RedStoneMarketViewProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? 0;
  const priceChange24h = 5.5; // Mock data
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      label: t('redstone.stats.marketCap'),
      value: '$2.5B',
      change: '+8%',
    },
    {
      label: t('redstone.stats.volume24h'),
      value: '$125.3M',
      change: '+12%',
    },
    {
      label: t('redstone.stats.circulatingSupply'),
      value: '1.2B RED',
      change: null,
    },
    {
      label: t('redstone.stats.stakingApr'),
      value: '12.5%',
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    {
      label: t('redstone.networkHealth.activeNodes'),
      value: `${networkStats?.activeNodes || 25}+`,
      status: 'healthy' as const,
      icon: Server,
    },
    {
      label: t('redstone.stats.dataFeeds'),
      value: `${networkStats?.dataFeeds || 1000}+`,
      status: 'healthy' as const,
      icon: Zap,
    },
    {
      label: t('redstone.networkHealth.responseTime'),
      value: `${networkStats?.avgResponseTime || 200}ms`,
      status: 'healthy' as const,
      icon: Clock,
    },
    { label: t('redstone.successRate'), value: '99.9%', status: 'healthy' as const, icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('redstone.priceTrend')}</h3>
          </div>
          <div className="flex-1">
            <PriceChart
              client={client}
              symbol="REDSTONE"
              height={300}
              showToolbar={true}
              defaultPrice={currentPrice}
            />
          </div>
        </div>

        {/* 右侧统计区域 */}
        <div className="flex flex-col gap-8">
          {/* 快速统计 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('redstone.quickStats')}</h3>
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
                      <span
                        className={`text-xs ml-2 ${
                          typeof stat.change === 'string' && stat.change.startsWith('+')
                            ? 'text-emerald-600'
                            : 'text-red-600'
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

          {/* 网络状态 - 内联布局 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('redstone.networkStatus')}
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('redstone.dataSource')}</h3>
            <div className="flex-1 flex flex-col">
              {[
                { name: 'RedStone Core', status: 'active' as const, latency: '80ms' },
                { name: 'Ethereum Mainnet', status: 'active' as const, latency: '200ms' },
                { name: 'Arweave Storage', status: 'active' as const, latency: '150ms' },
                { name: 'Backup Node', status: 'syncing' as const, latency: '320ms' },
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
          {t('redstone.tradingPair') || '主要交易对'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">RED/USDC</p>
            <p className="text-3xl font-semibold text-gray-900">
              ${isLoading ? '-' : currentPrice.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className={`text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}
                {priceChange24h}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('redstone.volume24h')}</p>
            <p className="text-3xl font-semibold text-gray-900">$125.2M</p>
            <p className="text-sm text-emerald-600 mt-1">+12.5%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('redstone.liquidity')}</p>
            <p className="text-3xl font-semibold text-gray-900">$45.8M</p>
            <p className="text-sm text-emerald-600 mt-1">+5.2%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('redstone.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-semibold text-gray-900">8.7</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('redstone.depthScore')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
