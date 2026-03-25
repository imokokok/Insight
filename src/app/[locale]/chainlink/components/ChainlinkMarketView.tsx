'use client';

import { useTranslations } from 'next-intl';
import { PriceChart } from '@/components/oracle';
import { ChainlinkMarketViewProps } from '../types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export function ChainlinkMarketView({
  config,
  price,
  isLoading,
}: ChainlinkMarketViewProps) {
  const t = useTranslations();

  // 核心市场统计数据
  const stats = [
    {
      label: t('chainlink.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: config.marketData.change24hValue,
    },
    {
      label: t('chainlink.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+12%',
    },
    {
      label: t('chainlink.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M LINK`,
      change: null,
    },
    {
      label: t('chainlink.stats.stakingApr'),
      value: `${config.marketData.stakingApr ?? '-'}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    { label: t('chainlink.networkHealth.activeNodes'), value: '1,847+', status: 'healthy' },
    { label: t('chainlink.stats.dataFeeds'), value: '1,243+', status: 'healthy' },
    { label: t('chainlink.networkHealth.responseTime'), value: '245ms', status: 'healthy' },
    { label: t('chainlink.successRate'), value: '99.9%', status: 'healthy' },
  ];

  return (
    <div className="space-y-6">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('chainlink.priceTrend')}
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

        {/* 右侧统计卡片 */}
        <div className="flex flex-col gap-4">
          {/* 快速统计卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('chainlink.quickStats')}
            </h3>
            <div className="flex-1 flex flex-col justify-between">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-600">{stat.label}</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${
                        stat.highlight ? 'text-emerald-600' : 'text-gray-900'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.change && (
                      <span className={`text-xs ml-2 ${
                        typeof stat.change === 'string' && stat.change.startsWith('+') 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {typeof stat.change === 'string' ? stat.change : `${stat.change}%`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 网络状态卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('chainlink.networkStatus')}
            </h3>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {networkStatus.map((item, index) => (
                <div key={index} className="flex flex-col items-center justify-center py-2">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {item.status === 'healthy'
                        ? t('chainlink.normal')
                        : t('chainlink.warning')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 数据来源卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('chainlink.dataSource')}
            </h3>
            <div className="flex-1 flex flex-col justify-between gap-2">
              {[
                { name: 'Chainlink Market', status: 'active', latency: '120ms' },
                { name: 'Ethereum Mainnet', status: 'active', latency: '245ms' },
                { name: 'Secondary Feed', status: 'active', latency: '180ms' },
                { name: 'Backup Node', status: 'syncing', latency: '320ms' },
              ].map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        source.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{source.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{source.latency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 核心交易对信息 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('chainlink.tradingPair') || '主要交易对'}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">LINK/USDC</p>
            <p className="text-xl font-bold text-gray-900">${price?.price?.toFixed(2) || '14.85'}</p>
            <div className="flex items-center gap-1 mt-1">
              {config.marketData.change24hValue >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className={`text-sm ${config.marketData.change24hValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {config.marketData.change24hValue >= 0 ? '+' : ''}{config.marketData.change24hValue}%
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('chainlink.volume24h')}</p>
            <p className="text-xl font-bold text-gray-900">$125.2M</p>
            <p className="text-xs text-emerald-600 mt-1">+12.5%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('chainlink.liquidity')}</p>
            <p className="text-xl font-bold text-gray-900">$45.8M</p>
            <p className="text-xs text-emerald-600 mt-1">+5.2%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{t('chainlink.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">8.7/10</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('chainlink.depthScore')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
