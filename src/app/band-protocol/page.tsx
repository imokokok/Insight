'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { PriceData } from '@/lib/types/oracle';

const bandClient = new BandProtocolClient();

export default function BandProtocolPage() {
  const t = useTranslations('bandProtocol');
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardContent className="text-center">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {networkStats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('btcPriceFeed')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">{t('loadingData')}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('currentPriceFeeds')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500">{t('loading')}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">BTC/USD</p>
                      <p className="text-xs text-gray-500">{t('bitcoin')}</p>
                    </div>
                    <p className="font-bold text-gray-900">${btcPrice?.price.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">ETH/USD</p>
                      <p className="text-xs text-gray-500">{t('ethereum')}</p>
                    </div>
                    <p className="font-bold text-gray-900">${ethPrice?.price.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">SOL/USD</p>
                      <p className="text-xs text-gray-500">{t('solana')}</p>
                    </div>
                    <p className="font-bold text-gray-900">${solPrice?.price.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
