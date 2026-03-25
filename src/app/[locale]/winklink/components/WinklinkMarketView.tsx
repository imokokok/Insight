'use client';

import { useTranslations } from '@/i18n';
import { PriceChart } from '@/components/oracle';
import { WinklinkMarketViewProps } from '../types';
import { TrendingUp, TrendingDown, Server, Zap, Clock, Shield } from 'lucide-react';

export function WinklinkMarketView({
  config,
  price,
  historicalData,
  staking,
  isLoading,
}: WinklinkMarketViewProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      label: t('winklink.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: '+8%',
    },
    {
      label: t('winklink.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+12%',
    },
    {
      label: t('winklink.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e9).toFixed(1)}B WIN`,
      change: null,
    },
    {
      label: t('winklink.stats.stakingApr'),
      value: `${staking?.averageApr ?? 12.5}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    { label: t('winklink.stats.activeNodes'), value: `${staking?.activeNodes ?? 82}+`, status: 'healthy', icon: Server },
    { label: t('winklink.stats.dataFeeds'), value: '180+', status: 'healthy', icon: Zap },
    { label: t('winklink.stats.responseTime'), value: '110ms', status: 'healthy', icon: Clock },
    { label: t('winklink.stats.successRate'), value: '99.92%', status: 'healthy', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.priceTrend')}
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
              {t('winklink.quickStats')}
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
                        stat.highlight ? 'text-pink-600' : 'text-gray-900'
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
              {t('winklink.networkStatus')}
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
              {t('winklink.dataSource')}
            </h3>
            <div className="flex-1 flex flex-col">
              {[
                { name: 'TRON Mainnet', status: 'active', latency: '85ms' },
                { name: 'BNB Chain', status: 'active', latency: '110ms' },
                { name: 'BTTC Network', status: 'active', latency: '95ms' },
                { name: 'Backup Node', status: 'active', latency: '120ms' },
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
          {t('winklink.tradingPair') || '主要交易对'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">WIN/USDT</p>
            <p className="text-2xl font-semibold text-gray-900">${currentPrice.toFixed(6)}</p>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className={`text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('winklink.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">${(config.marketData.volume24h / 1e6).toFixed(1)}M</p>
            <p className="text-sm text-emerald-600 mt-1">+12%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('winklink.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">$32.5M</p>
            <p className="text-sm text-emerald-600 mt-1">+8.3%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('winklink.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">7.8</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('winklink.depthScore')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
