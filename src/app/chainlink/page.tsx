'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { PriceData, Blockchain } from '@/lib/types/oracle';

const chainlinkClient = new ChainlinkClient();

export default function ChainlinkPage() {
  const t = useTranslations('chainlink');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const CHAINLINK_STATS = [
    { label: t('stats.decentralizedNodes'), value: '1,800+', change: '+5%' },
    { label: t('stats.supportedChains'), value: '20+', change: 'Active' },
    { label: t('stats.dataFeeds'), value: '1,200+', change: 'Growing' },
    { label: t('stats.totalValueSecured'), value: '$10T+', change: 'Stable' },
  ];

  const CHAINLINK_FEATURES = [
    {
      title: t('decentralizedNodesTitle'),
      description: t('decentralizedNodesDesc'),
      icon: '🌐',
    },
    {
      title: t('reputationSystemTitle'),
      description: t('reputationSystemDesc'),
      icon: '⭐',
    },
    {
      title: t('securityFirstTitle'),
      description: t('securityFirstDesc'),
      icon: '🔒',
    },
    {
      title: t('multiChainSupportTitle'),
      description: t('multiChainSupportDesc'),
      icon: '⛓️',
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-full bg-[#375BD2] flex items-center justify-center text-white text-2xl font-bold">
            ⛓️
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {CHAINLINK_STATS.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-green-600 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('priceChartTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                {t('loadingChartData')}
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#375BD2"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('currentPriceTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-gray-500">
                {t('loadingPrice')}
              </div>
            ) : priceData ? (
              <div>
                <p className="text-4xl font-bold text-gray-900">${priceData.price.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-2">{t('updatedJustNow')}</p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t('chain')}: <span className="font-medium">{t('ethereum')}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('source')}: <span className="font-medium">{t('chainlinkDataFeed')}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">{t('failedToLoad')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('keyFeatures')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CHAINLINK_FEATURES.map((feature, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="py-6">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
