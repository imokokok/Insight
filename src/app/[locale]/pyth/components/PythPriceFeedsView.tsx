'use client';

import { useTranslations } from 'next-intl';
import { PythPriceFeedsViewProps } from '../types';

interface PriceFeedCategory {
  category: string;
  count: number;
  icon: string;
  color: string;
}

export function PythPriceFeedsView({ isLoading }: PythPriceFeedsViewProps) {
  const t = useTranslations();

  const categories: PriceFeedCategory[] = [
    {
      category: t('pyth.priceFeeds.categories.crypto') || '加密货币',
      count: 350,
      icon: '₿',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      category: t('pyth.priceFeeds.categories.equities') || '股票',
      count: 80,
      icon: '📈',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      category: t('pyth.priceFeeds.categories.commodities') || '商品',
      count: 45,
      icon: '🛢️',
      color: 'bg-amber-100 text-amber-600',
    },
    {
      category: t('pyth.priceFeeds.categories.forex') || '外汇',
      count: 45,
      icon: '💱',
      color: 'bg-emerald-100 text-emerald-600',
    },
  ];

  const totalFeeds = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="space-y-4">
      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((feed) => (
          <div
            key={feed.category}
            className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:border-violet-300 transition-colors"
          >
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-3 ${feed.color}`}>
              {feed.icon}
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">{feed.category}</h4>
            <p className="text-2xl font-bold text-gray-900 mt-2">{feed.count}</p>
            <p className="text-xs text-gray-500 mt-1">{t('pyth.priceFeeds.priceFeeds')}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('pyth.priceFeeds.totalTitle') || '总价格源'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('pyth.priceFeeds.totalDescription', { count: totalFeeds }) ||
                `Pyth Network 目前支持 ${totalFeeds} 个价格源，涵盖加密货币、股票、商品和外汇等多个资产类别。`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-violet-600">{totalFeeds}+</p>
            <p className="text-sm text-gray-500">{t('pyth.priceFeeds.activeFeeds') || '活跃价格源'}</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {t('pyth.priceFeeds.features.highFrequency') || '高频更新'}
            </h4>
          </div>
          <p className="text-xs text-gray-500">
            {t('pyth.priceFeeds.features.highFrequencyDesc') || '亚秒级价格更新，平均延迟低于 1 秒'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {t('pyth.priceFeeds.features.firstParty') || '第一方数据'}
            </h4>
          </div>
          <p className="text-xs text-gray-500">
            {t('pyth.priceFeeds.features.firstPartyDesc') || '直接来自顶级交易所和做市商'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {t('pyth.priceFeeds.features.crossChain') || '跨链支持'}
            </h4>
          </div>
          <p className="text-xs text-gray-500">
            {t('pyth.priceFeeds.features.crossChainDesc') || '通过 Wormhole 支持多条区块链'}
          </p>
        </div>
      </div>
    </div>
  );
}
