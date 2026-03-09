'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';

// 模拟生态数据
const ecosystemData = {
  protocols: [
    { name: 'Aave', category: 'Lending', tvs: '$450M', features: ['Price Feeds', 'Liquidation Protection'] },
    { name: 'Compound', category: 'Lending', tvs: '$280M', features: ['Price Feeds'] },
    { name: 'Synthetix', category: 'Derivatives', tvs: '$320M', features: ['Price Feeds', 'Forex Data'] },
    { name: 'dYdX', category: 'DEX', tvs: '$180M', features: ['Price Feeds'] },
    { name: 'GMX', category: 'Perpetuals', tvs: '$220M', features: ['Price Feeds', 'Fast Updates'] },
    { name: 'Ribbon', category: 'Options', tvs: '$95M', features: ['Price Feeds'] },
  ],
  blockchains: [
    { name: 'Ethereum', status: 'Active', dapis: 89 },
    { name: 'Arbitrum', status: 'Active', dapis: 45 },
    { name: 'Polygon', status: 'Active', dapis: 34 },
  ],
  apiProviders: [
    { name: 'Binance', type: 'Exchange', status: 'Active' },
    { name: 'Coinbase', type: 'Exchange', status: 'Active' },
    { name: 'Kraken', type: 'Exchange', status: 'Active' },
    { name: 'Bloomberg', type: 'Traditional Finance', status: 'Active' },
    { name: 'Refinitiv', type: 'Traditional Finance', status: 'Active' },
    { name: 'Weather.com', type: 'Other', status: 'Active' },
  ],
};

export function EcosystemPanel() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟加载
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('api3.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 生态统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-3xl font-bold">156</p>
          <p className="text-sm text-blue-100 mt-1">{t('api3.ecosystem.integratedProtocols')}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-3xl font-bold">$2.5B</p>
          <p className="text-sm text-green-100 mt-1">{t('api3.ecosystem.totalValueSecured')}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <p className="text-3xl font-bold">3</p>
          <p className="text-sm text-purple-100 mt-1">{t('api3.ecosystem.supportedBlockchains')}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <p className="text-3xl font-bold">168</p>
          <p className="text-sm text-orange-100 mt-1">{t('api3.ecosystem.activeDapis')}</p>
        </div>
      </div>

      {/* DeFi 协议集成 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{t('api3.ecosystem.protocolIntegrations')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('api3.ecosystem.protocol')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('api3.ecosystem.category')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('api3.ecosystem.tvs')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('api3.ecosystem.features')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ecosystemData.protocols.map((protocol, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                        {protocol.name[0]}
                      </div>
                      <span className="font-medium text-gray-900">{protocol.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {protocol.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-900 font-medium">{protocol.tvs}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {protocol.features.map((feature, fIndex) => (
                        <span
                          key={fIndex}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 区块链覆盖和数据源提供商 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 区块链覆盖 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t('api3.ecosystem.blockchainCoverage')}</h3>
          <div className="space-y-3">
            {ecosystemData.blockchains.map((chain, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{chain.name}</p>
                    <p className="text-xs text-gray-500">{chain.dapis} dAPIs</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {chain.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 数据源提供商 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t('api3.ecosystem.dataProviders')}</h3>
          <div className="space-y-3">
            {ecosystemData.apiProviders.map((provider, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.type}</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {provider.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* dAPI 类型分布 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4">{t('api3.ecosystem.dapiTypes')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: t('api3.ecosystem.crypto'), count: 120, icon: '₿', color: 'bg-orange-100 text-orange-600' },
            { type: t('api3.ecosystem.forex'), count: 28, icon: '💱', color: 'bg-blue-100 text-blue-600' },
            { type: t('api3.ecosystem.commodities'), count: 12, icon: '🏭', color: 'bg-green-100 text-green-600' },
            { type: t('api3.ecosystem.stocks'), count: 8, icon: '📈', color: 'bg-purple-100 text-purple-600' },
          ].map((item, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-2xl mx-auto mb-2`}>
                {item.icon}
              </div>
              <p className="text-lg font-bold text-gray-900">{item.count}</p>
              <p className="text-xs text-gray-500">{item.type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
