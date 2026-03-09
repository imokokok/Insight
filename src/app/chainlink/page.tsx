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
import StatCard from '@/components/StatCard';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { PriceData, Blockchain } from '@/lib/types/oracle';

const chainlinkClient = new ChainlinkClient();

const ChainlinkIcon = () => (
  <svg viewBox="0 0 256 256" className="w-full h-full" fill="none">
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
      trendDirection: 'up' as const, 
      trend: 5,
      accentColor: 'blue' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      )
    },
    { 
      title: t('chainlink.stats.supportedChains'), 
      value: '20+', 
      trendDirection: 'neutral' as const,
      accentColor: 'purple' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    { 
      title: t('chainlink.stats.dataFeeds'), 
      value: '1,200+', 
      trendDirection: 'up' as const,
      accentColor: 'green' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      title: t('chainlink.stats.totalValueSecured'), 
      value: '$10T+', 
      trendDirection: 'neutral' as const,
      accentColor: 'cyan' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const CHAINLINK_FEATURES = [
    {
      title: t('chainlink.decentralizedNodesTitle'),
      description: t('chainlink.decentralizedNodesDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: t('chainlink.reputationSystemTitle'),
      description: t('chainlink.reputationSystemDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: t('chainlink.securityFirstTitle'),
      description: t('chainlink.securityFirstDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: t('chainlink.multiChainSupportTitle'),
      description: t('chainlink.multiChainSupportDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-cyan-500 to-teal-500',
    },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#375BD2] via-[#4A6DE5] to-[#6582F0] text-white mb-12 shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48" />
          </div>
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                <ChainlinkIcon />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">{t('chainlink.title')}</h1>
                <p className="text-xl opacity-90">{t('chainlink.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {CHAINLINK_STATS.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              trend={stat.trend}
              trendDirection={stat.trendDirection}
              trendLabel={stat.trendLabel}
              accentColor={stat.accentColor}
              variant={index === 0 ? 'accent' : 'default'}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <AdvancedCard className="lg:col-span-2" variant="glass" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle className="text-gray-900">{t('chainlink.priceChartTitle')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  {t('chainlink.loadingChartData')}
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#375BD2" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#375BD2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="time" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#375BD2"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 8, fill: '#375BD2', stroke: '#fff', strokeWidth: 2 }}
                        fill="url(#colorPrice)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AdvancedCardContent>
          </AdvancedCard>

          <AdvancedCard variant="gradient" gradientType="blue">
            <AdvancedCardHeader className="border-b border-white/20">
              <AdvancedCardTitle>{t('chainlink.currentPriceTitle')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-white/70">
                  {t('chainlink.loadingPrice')}
                </div>
              ) : priceData ? (
                <div className="text-center">
                  <p className="text-5xl font-bold mb-2">${priceData.price.toFixed(2)}</p>
                  <p className="text-sm opacity-80">{t('chainlink.updatedJustNow')}</p>
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm opacity-80">{t('chainlink.chain')}</span>
                        <span className="font-semibold">{t('chainlink.ethereum')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm opacity-80">{t('chainlink.source')}</span>
                        <span className="font-semibold">{t('chainlink.chainlinkDataFeed')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-white/70 text-center">{t('chainlink.failedToLoad')}</p>
              )}
            </AdvancedCardContent>
          </AdvancedCard>
        </div>

        <div className="mb-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('chainlink.keyFeatures')}</h2>
            <p className="text-gray-600 text-lg">{t('chainlink.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CHAINLINK_FEATURES.map((feature, index) => (
              <div key={index} className="group">
                <AdvancedCard variant="default" hoverable={true}>
                  <AdvancedCardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className={`flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#375BD2] transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </AdvancedCardContent>
                </AdvancedCard>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
