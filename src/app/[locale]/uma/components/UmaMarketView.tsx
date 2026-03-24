'use client';

import { useTranslations } from 'next-intl';
import { PriceChart } from '@/components/oracle';
import { UmaMarketViewProps } from '../types';

export function UmaMarketView({
  config,
  price,
  historicalData,
  networkStats,
  isLoading,
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
      status: 'healthy' as const 
    },
    { 
      label: t('uma.stats.totalDisputes'), 
      value: `${networkStats?.totalDisputes ?? 1250}+`, 
      status: 'healthy' as const 
    },
    { 
      label: t('uma.stats.disputeSuccessRate'), 
      value: `${networkStats?.disputeSuccessRate ?? 78}%`, 
      status: 'healthy' as const 
    },
    { 
      label: t('uma.stats.avgResolutionTime'), 
      value: `${networkStats?.avgResolutionTime ?? 4.2}h`, 
      status: 'healthy' as const 
    },
  ];

  return (
    <div className="space-y-4">
      {/* 主内容区域 - 使用 items-stretch 让左右两侧等高 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('uma.priceTrend')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`text-sm font-medium ${priceChange24h >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
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

        {/* 右侧三个卡片 - 使用flex布局自动填充高度 */}
        <div className="flex flex-col gap-4">
          {/* 快速统计卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('uma.quickStats')}
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
              {t('uma.networkStatus')}
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
                        ? t('uma.normal')
                        : t('uma.warning')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 数据来源卡片 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('uma.dataSource')}
            </h3>
            <div className="flex-1 flex flex-col justify-between gap-2">
              {[
                { name: 'UMA Market', status: 'active', latency: '150ms' },
                { name: 'Ethereum Mainnet', status: 'active', latency: '300ms' },
                { name: 'Secondary Feed', status: 'active', latency: '180ms' },
                { name: 'Backup Node', status: 'syncing', latency: '450ms' },
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
