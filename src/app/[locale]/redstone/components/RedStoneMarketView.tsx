'use client';

import { useTranslations } from 'next-intl';
import { PriceChart } from '@/components/oracle';
import { RedStoneMarketViewProps } from '../types';

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
    { label: t('redstone.networkHealth.activeNodes'), value: `${networkStats?.activeNodes || 25}+`, status: 'healthy' as const },
    { label: t('redstone.stats.dataFeeds'), value: `${networkStats?.dataFeeds || 1000}+`, status: 'healthy' as const },
    { label: t('redstone.networkHealth.responseTime'), value: `${networkStats?.avgResponseTime || 200}ms`, status: 'healthy' as const },
    { label: t('redstone.successRate'), value: '99.9%', status: 'healthy' as const },
  ];

  return (
    <div className="space-y-4">
      {/* 主内容区域 - 使用 items-stretch 让左右两侧等高 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('redstone.priceTrend')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${isLoading ? '-' : currentPrice.toFixed(2)}
              </span>
              <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
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

        {/* 右侧三个卡片 - 使用flex布局自动填充高度 */}
        <div className="flex flex-col gap-4">
          {/* 快速统计卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('redstone.quickStats')}
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
                      <span className="text-xs text-emerald-600 ml-2">
                        {stat.change}
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
              {t('redstone.networkStatus')}
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
                        ? t('redstone.normal')
                        : t('redstone.warning')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 数据来源卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('redstone.dataSource')}
            </h3>
            <div className="flex-1 flex flex-col justify-between gap-2">
              {[
                { name: 'RedStone Core', status: 'active' as const, latency: '80ms' },
                { name: 'Ethereum Mainnet', status: 'active' as const, latency: '200ms' },
                { name: 'Arweave Storage', status: 'active' as const, latency: '150ms' },
                { name: 'Backup Node', status: 'syncing' as const, latency: '320ms' },
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
    </div>
  );
}
