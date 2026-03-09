'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import StatCard from '@/components/StatCard';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { PriceData } from '@/lib/types/oracle';

const bandClient = new BandProtocolClient();

export default function BandProtocolPage() {
  const { t } = useI18n();
  const [btcPrice, setBtcPrice] = useState<PriceData | null>(null);
  const [ethPrice, setEthPrice] = useState<PriceData | null>(null);
  const [solPrice, setSolPrice] = useState<PriceData | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const networkStats = [
    { label: t('stats.activeDataSources'), value: '120+', change: '+8%' },
    { label: t('stats.supportedBlockchains'), value: '30+', change: '+5%' },
    { label: t('stats.priceFeeds'), value: '200+', change: '+12%' },
    { label: t('stats.dailyTransactions'), value: '1.2M', change: '+23%' },
  ];

  const features = [
    {
      title: t('features.crossChainOracle'),
      description: t('features.crossChainOracleDesc'),
      icon: '🌐',
    },
    {
      title: t('features.dataSources'),
      description: t('features.dataSourcesDesc'),
      icon: '📊',
    },
    {
      title: t('features.cosmosSdkIntegration'),
      description: t('features.cosmosSdkIntegrationDesc'),
      icon: '🚀',
    },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const [btc, eth, sol, historical] = await Promise.all([
          bandClient.getPrice('BTC'),
          bandClient.getPrice('ETH'),
          bandClient.getPrice('SOL'),
          bandClient.getHistoricalPrices('BTC', undefined, 24),
        ]);
        setBtcPrice(btc);
        setEthPrice(eth);
        setSolPrice(sol);
        setHistoricalPrices(historical);
      } catch (error) {
        console.error('Failed to fetch Band Protocol data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartData = historicalPrices.map((price) => ({
    time: new Date(price.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: price.price,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-3 rounded-xl border border-blue-100">
            <span className="text-2xl">🔗</span>
            <div className="text-sm">
              <span className="font-semibold text-gray-800">Band Protocol</span>
              <span className="text-gray-600"> • Decentralized Oracle Network</span>
            </div>
          </div>
        </div>
      </div>

      <AdvancedCard className="mb-8" variant="glass">
        <AdvancedCardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-white/50 border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </AdvancedCardContent>
      </AdvancedCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {networkStats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.label}
            value={stat.value}
            accentColor={
              index === 0 ? 'blue' : index === 1 ? 'green' : index === 2 ? 'purple' : 'orange'
            }
            description={stat.change}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AdvancedCard variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('btcPriceFeed')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500">{t('loadingData')}</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#9ca3af"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                      stroke="#9ca3af"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow:
                          '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        padding: '16px 20px',
                        backdropFilter: 'blur(10px)',
                      }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Price']}
                      labelFormatter={(label) => label}
                      cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </AdvancedCardContent>
          </AdvancedCard>
        </div>

        <div className="space-y-6">
          <AdvancedCard variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('currentPriceFeeds')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              {isLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        ₿
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">BTC/USD</p>
                        <p className="text-xs text-gray-500">{t('bitcoin')}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 text-lg">
                      ${btcPrice?.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        Ξ
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">ETH/USD</p>
                        <p className="text-xs text-gray-500">{t('ethereum')}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 text-lg">
                      ${ethPrice?.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                        S
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">SOL/USD</p>
                        <p className="text-xs text-gray-500">{t('solana')}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 text-lg">
                      ${solPrice?.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </AdvancedCardContent>
          </AdvancedCard>
        </div>
      </div>
    </div>
  );
}
