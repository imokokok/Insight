'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import AdvancedTable, {
  AdvancedTableHeader,
  AdvancedTableBody,
  AdvancedTableRow,
  AdvancedTableHead,
  AdvancedTableCell,
} from '@/components/AdvancedTable';
import StatCard from '@/components/StatCard';
import { PythNetworkClient } from '@/lib/oracles/pythNetwork';
import { PriceData } from '@/lib/types/oracle';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const pythClient = new PythNetworkClient();

export default function PythNetworkPage() {
  const { t } = useI18n();
  const [priceFeeds, setPriceFeeds] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const symbols = ['BTC', 'ETH', 'SOL', 'PYTH', 'USDC'];

  const networkStats = [
    {
      name: t('stats.totalPriceFeeds'),
      value: '500+',
      change: '+12%',
      accentColor: 'blue' as const,
    },
    {
      name: t('stats.updateFrequency'),
      value: '400ms',
      change: t('stats.lowLatency'),
      accentColor: 'green' as const,
    },
    {
      name: t('stats.supportedChains'),
      value: '50+',
      change: t('stats.multiChain'),
      accentColor: 'purple' as const,
    },
    {
      name: t('stats.dataSources'),
      value: 'Exchanges',
      change: t('stats.firstParty'),
      accentColor: 'cyan' as const,
    },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const prices = await Promise.all(symbols.map((symbol) => pythClient.getPrice(symbol)));
        const history = await pythClient.getHistoricalPrices('BTC', undefined, 24);
        setPriceFeeds(prices);
        setHistoricalData(history);
      } catch (error) {
        console.error('Error fetching Pyth Network data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartData = historicalData.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString(),
    price: d.price,
  }));

  const features = [
    {
      title: t('firstPartyData'),
      description: t('firstPartyDataDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c1.133 0 2.244.255 3.244.255.999 0 1.999-.255 2.999-.255 1.133 0 2.244.255 3.244.255 1.133 0 2.244-.255 3.244-.255a12.02 12.02 0 003-9c0 0 0 0 0 0 12.02 12.02 0 00-3-9z"
          />
        </svg>
      ),
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: t('lowLatencyFeature'),
      description: t('lowLatencyFeatureDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'green',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: t('highFrequency'),
      description: t('highFrequencyDesc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

  const iconBackgrounds: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {t('liveData') || 'Live Data'}
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              {t('title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {networkStats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.name}
              value={stat.value}
              accentColor={stat.accentColor}
              description={stat.change}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>

        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('uniqueFeatures')}</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t('featuresSubtitle') || '创新的价格预言机解决方案'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient}`}
                ></div>
                <div className="p-8">
                  <div
                    className={`w-16 h-16 rounded-2xl ${iconBackgrounds[feature.color]} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-12">
          <AdvancedCard variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('btcPriceFeed')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              {loading ? (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('loading')}</span>
                  </div>
                </div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
                        labelFormatter={(label) => label}
                        cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AdvancedCardContent>
          </AdvancedCard>
        </div>

        <AdvancedCard variant="default" hoverable={false}>
          <AdvancedCardHeader>
            <AdvancedCardTitle>{t('priceFeeds')}</AdvancedCardTitle>
          </AdvancedCardHeader>
          <AdvancedCardContent className="px-4">
            {loading ? (
              <div className="text-center py-16 text-gray-500">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('loadingPriceFeeds')}</span>
                </div>
              </div>
            ) : (
              <AdvancedTable striped hoverable>
                <AdvancedTableHeader>
                  <AdvancedTableRow hoverable={false}>
                    <AdvancedTableHead>{t('symbol')}</AdvancedTableHead>
                    <AdvancedTableHead className="text-right">{t('price')}</AdvancedTableHead>
                    <AdvancedTableHead>{t('timestamp')}</AdvancedTableHead>
                    <AdvancedTableHead className="text-right">{t('confidence')}</AdvancedTableHead>
                  </AdvancedTableRow>
                </AdvancedTableHeader>
                <AdvancedTableBody>
                  {priceFeeds.map((feed, index) => (
                    <AdvancedTableRow key={index}>
                      <AdvancedTableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-white font-bold text-xs">
                              {feed.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800">{feed.symbol}</span>
                        </div>
                      </AdvancedTableCell>
                      <AdvancedTableCell className="text-right font-mono text-gray-800 text-lg font-semibold">
                        ${feed.price.toLocaleString()}
                      </AdvancedTableCell>
                      <AdvancedTableCell>
                        <div className="text-gray-600">
                          {new Date(feed.timestamp).toLocaleString()}
                        </div>
                      </AdvancedTableCell>
                      <AdvancedTableCell className="text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                          {feed.confidence ? `${feed.confidence.toFixed(2)}%` : t('na')}
                        </span>
                      </AdvancedTableCell>
                    </AdvancedTableRow>
                  ))}
                </AdvancedTableBody>
              </AdvancedTable>
            )}
          </AdvancedCardContent>
        </AdvancedCard>
      </div>
    </div>
  );
}
