'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import StatCard from '@/components/StatCard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { UMAClient } from '@/lib/oracles/uma';
import { PriceData } from '@/lib/types/oracle';

const umaClient = new UMAClient();

const UMAIcon = () => <div className="text-4xl">🔮</div>;

export default function UMAPage() {
  const { t } = useI18n();
  const [btcHistorical, setBtcHistorical] = useState<PriceData[]>([]);
  const [ethHistorical, setEthHistorical] = useState<PriceData[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({});

  const UMA_STATS = [
    {
      titleKey: 'uma.stats.supportedChains',
      value: '10+',
      trendDirection: 'up' as const,
      trend: 10,
      trendLabel: '',
      accentColor: 'blue' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l1.1 1.1"
          />
        </svg>
      ),
    },
    {
      titleKey: 'uma.stats.activeContracts',
      value: '500+',
      trendDirection: 'up' as const,
      trend: 15,
      trendLabel: '',
      accentColor: 'purple' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      titleKey: 'uma.stats.totalValueLocked',
      value: '$50M+',
      trendDirection: 'neutral' as const,
      trend: 0,
      trendLabel: '',
      accentColor: 'green' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      titleKey: 'uma.stats.dataVerificationRequests',
      value: '10K+',
      trendDirection: 'up' as const,
      trend: 20,
      trendLabel: '',
      accentColor: 'orange' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const FEATURES = [
    {
      titleKey: 'uma.features.optimisticOracle',
      descriptionKey: 'uma.features.optimisticOracleDesc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      titleKey: 'uma.features.pricelessContracts',
      descriptionKey: 'uma.features.pricelessContractsDesc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      titleKey: 'uma.features.financialContracts',
      descriptionKey: 'uma.features.financialContractsDesc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      titleKey: 'uma.features.dataVerification',
      descriptionKey: 'uma.features.dataVerificationDesc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const btc = await umaClient.getHistoricalPrices('BTC');
      const eth = await umaClient.getHistoricalPrices('ETH');
      const btcPrice = await umaClient.getPrice('BTC');
      const ethPrice = await umaClient.getPrice('ETH');
      const umaPrice = await umaClient.getPrice('UMA');

      setBtcHistorical(btc);
      setEthHistorical(eth);
      setCurrentPrices({ BTC: btcPrice, ETH: ethPrice, UMA: umaPrice });
    };

    fetchData();
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white mb-12 shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48" />
          </div>
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg flex items-center justify-center">
                <UMAIcon />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">
                  {t('uma.title')}
                </h1>
                <p className="text-xl opacity-90">{t('uma.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {UMA_STATS.map((stat, index) => (
            <StatCard
              key={index}
              title={t(stat.titleKey)}
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
              <AdvancedCardTitle className="text-gray-900">价格历史对比</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={btcHistorical}>
                    <defs>
                      <linearGradient id="colorBtcLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f7931a" />
                        <stop offset="100%" stopColor="#f2a900" />
                      </linearGradient>
                      <linearGradient id="colorEthLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#627eea" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatDate}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value, name) => [
                        typeof value === 'number'
                          ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '',
                        name,
                      ]}
                      labelFormatter={(label) => formatDate(Number(label))}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                    <Line
                      type="monotone"
                      dataKey="price"
                      name="BTC"
                      stroke="url(#colorBtcLine)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AdvancedCardContent>
          </AdvancedCard>

          <div className="space-y-6">
            {Object.entries(currentPrices).map(([symbol, data]) => {
              const isPositive = (data.change ?? 0) >= 0;
              const gradientType =
                symbol === 'BTC' ? 'orange' : symbol === 'ETH' ? 'blue' : 'purple';
              const icon = symbol === 'BTC' ? '₿' : symbol === 'ETH' ? 'Ξ' : '🔮';

              return (
                <AdvancedCard
                  key={symbol}
                  variant="gradient"
                  gradientType={gradientType}
                  hoverable={false}
                >
                  <AdvancedCardContent>
                    <div className="text-center">
                      <div className="text-5xl mb-2">{icon}</div>
                      <h3 className="text-xl font-bold mb-2">{symbol}/USD</h3>
                      <p className="text-3xl font-bold mb-2">
                        $
                        {data.price.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p
                        className={`text-sm font-medium ${isPositive ? 'text-green-300' : 'text-red-300'}`}
                      >
                        {isPositive ? '↑' : '↓'} {Math.abs(data.change ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  </AdvancedCardContent>
                </AdvancedCard>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('uma.features.title')}</h2>
            <p className="text-gray-600 text-lg">{t('uma.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feature, index) => (
              <div key={index} className="group">
                <AdvancedCard variant="default" hoverable={true}>
                  <AdvancedCardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div
                        className={`flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {t(feature.titleKey)}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">{t(feature.descriptionKey)}</p>
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
