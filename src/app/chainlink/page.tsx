'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { PriceData, Blockchain } from '@/lib/types/oracle';

const chainlinkClient = new ChainlinkClient();

const ChainlinkIcon = () => (
  <svg viewBox="0 0 256 256" className="w-8 h-8" fill="none">
    <path d="M128 0L16 64v128l112 64 112-64V64L128 0z" fill="#375BD2"/>
    <path d="M208 64l-80 46-80-46 80-46 80 46z" fill="#6582F0"/>
    <path d="M48 64v128l80 46V110l-80-46z" fill="#2A4CAD"/>
    <path d="M208 64v128l-80 46V110l80-46z" fill="#375BD2"/>
    <path d="M72 142l56 32v80l-56-32v-80z" fill="#2A4CAD"/>
    <path d="M184 142l-56 32v80l56-32v-80z" fill="#375BD2"/>
  </svg>
);

export default function ChainlinkPage() {
  const { t } = useI18n();
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const CHAINLINK_STATS = [
    { 
      title: t('chainlink.stats.decentralizedNodes'), 
      value: '1,800+', 
      change: '+5%',
      changeType: 'positive' as const,
    },
    { 
      title: t('chainlink.stats.supportedChains'), 
      value: '20+', 
      change: '0%',
      changeType: 'neutral' as const,
    },
    { 
      title: t('chainlink.stats.dataFeeds'), 
      value: '1,200+', 
      change: '+12%',
      changeType: 'positive' as const,
    },
    { 
      title: t('chainlink.stats.totalValueSecured'), 
      value: '$10T+', 
      change: '+8%',
      changeType: 'positive' as const,
    },
  ];

  const FEATURES_DATA = [
    {
      title: t('chainlink.decentralizedNodesTitle'),
      description: t('chainlink.decentralizedNodesDesc'),
      metric: '1,800+',
      metricLabel: 'Active Nodes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      title: t('chainlink.reputationSystemTitle'),
      description: t('chainlink.reputationSystemDesc'),
      metric: '99.9%',
      metricLabel: 'Uptime',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      title: t('chainlink.securityFirstTitle'),
      description: t('chainlink.securityFirstDesc'),
      metric: '$10T+',
      metricLabel: 'Value Secured',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      title: t('chainlink.multiChainSupportTitle'),
      description: t('chainlink.multiChainSupportDesc'),
      metric: '20+',
      metricLabel: 'Blockchains',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
  ];

  const COMPARISON_DATA = [
    { feature: t('chainlink.nodes'), chainlink: '1,800+', band: '120+', difference: '+1,580%' },
    { feature: t('chainlink.chains'), chainlink: '20+', band: '30+', difference: '-33%' },
    { feature: t('chainlink.feeds'), chainlink: '1,200+', band: '200+', difference: '+500%' },
    { feature: t('chainlink.tvl'), chainlink: '$10T+', band: '$2B+', difference: '+499,900%' },
    { feature: t('chainlink.securityModel'), chainlink: t('chainlink.chainlinkSecurity'), band: t('chainlink.bandSecurity'), difference: '-' },
    { feature: t('chainlink.consensus'), chainlink: t('chainlink.chainlinkConsensus'), band: t('chainlink.bandConsensus'), difference: '-' },
  ];

  const DIFFERENTIATION_DATA = [
    { capability: t('chainlink.vrf'), chainlink: true, common: false },
    { capability: t('chainlink.automation'), chainlink: true, common: false },
    { capability: t('chainlink.ccip'), chainlink: true, common: false },
    { capability: t('chainlink.functions'), chainlink: true, common: false },
    { capability: t('chainlink.priceFeeds'), chainlink: true, common: true },
    { capability: t('chainlink.proofReserve'), chainlink: true, common: false },
    { capability: t('chainlink.marketData'), chainlink: true, common: true },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const [price, history] = await Promise.all([
          chainlinkClient.getPrice('LINK', Blockchain.ETHEREUM),
          chainlinkClient.getHistoricalPrices('LINK', Blockchain.ETHEREUM, 7),
        ]);
        setPriceData(price);
        setHistoricalData(history);
      } catch (error) {
        console.error('Error fetching Chainlink data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartData = historicalData.map((data) => ({
    time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: data.price,
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header - Flat Design */}
        <div className="mb-10 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <ChainlinkIcon />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('chainlink.title')}</h1>
              <p className="text-sm text-gray-500">{t('chainlink.subtitle')}</p>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl">{t('chainlink.description')}</p>
        </div>

        {/* Stats Grid - Flat Design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border border-gray-200 mb-10">
          {CHAINLINK_STATS.map((stat, index) => (
            <div key={index} className="bg-white p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className={`text-xs mt-1 ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '→'} {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Feature Analysis - Flat Design */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('chainlink.featureAnalysis')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200">
            {FEATURES_DATA.map((feature, index) => (
              <div key={index} className="bg-white p-5">
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  {feature.icon}
                  <span className="text-xs uppercase tracking-wide">{feature.title}</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 mb-1">{feature.metric}</p>
                <p className="text-xs text-gray-500 mb-3">{feature.metricLabel}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Oracle Comparison - Flat Design */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('chainlink.oracleComparison')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('chainlink.comparisonSubtitle')}</p>
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.feature')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.chainlinkValue')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.bandProtocolValue')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.difference')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{row.feature}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-900 font-mono">{row.chainlink}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600 font-mono">{row.band}</td>
                    <td className="py-3 px-4 text-right text-sm">
                      {row.difference === '-' ? (
                        <span className="text-gray-400">-</span>
                      ) : row.difference.startsWith('+') ? (
                        <span className="text-green-600">{row.difference}</span>
                      ) : (
                        <span className="text-red-600">{row.difference}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Differentiation Analysis - Flat Design */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('chainlink.differentiation')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('chainlink.differentiationSubtitle')}</p>
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.capability')}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.chainlinkValue')}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('chainlink.commonFeature')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIFFERENTIATION_DATA.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{row.capability}</td>
                    <td className="py-3 px-4 text-center">
                      {row.chainlink ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          {t('chainlink.available')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          {t('chainlink.notAvailable')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.common ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          {t('chainlink.common')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          {t('chainlink.unique')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price Chart - Flat Design */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('chainlink.priceChartTitle')}</h2>
          {loading ? (
            <div className="h-80 flex items-center justify-center border border-gray-200">
              <p className="text-gray-500">{t('chainlink.loadingChartData')}</p>
            </div>
          ) : (
            <div className="h-80 border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                    }}
                    labelStyle={{
                      color: '#1f2937',
                      fontWeight: 600,
                      marginBottom: '8px',
                      fontSize: '13px',
                    }}
                    itemStyle={{
                      padding: '4px 0',
                      fontSize: '12px',
                    }}
                    formatter={(value) => {
                      if (typeof value === 'number') {
                        return [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price'];
                      }
                      return [value, 'Price'];
                    }}
                    cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#375BD2"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Current Price - Flat Design */}
        <div className="border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('chainlink.currentPriceTitle')}</p>
              {loading ? (
                <p className="text-gray-500">{t('chainlink.loadingPrice')}</p>
              ) : priceData ? (
                <p className="text-3xl font-semibold text-gray-900">${priceData.price.toFixed(2)}</p>
              ) : (
                <p className="text-gray-500">{t('chainlink.failedToLoad')}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{t('chainlink.chain')}: {t('chainlink.ethereum')}</p>
              <p className="text-xs text-gray-500">{t('chainlink.source')}: {t('chainlink.chainlinkDataFeed')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('chainlink.updatedJustNow')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
