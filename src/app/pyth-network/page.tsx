'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
import { PythNetworkClient } from '@/lib/oracles/pythNetwork';
import { PriceData } from '@/lib/types/oracle';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const pythClient = new PythNetworkClient();

export default function PythNetworkPage() {
  const { t } = useI18n();
  const [priceFeeds, setPriceFeeds] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const symbols = ['BTC', 'ETH', 'SOL', 'PYTH', 'USDC'];

  const networkStats = [
    { name: t('stats.totalPriceFeeds'), value: '500+', change: '+12%' },
    { name: t('stats.updateFrequency'), value: '400ms', change: t('stats.lowLatency') },
    { name: t('stats.supportedChains'), value: '50+', change: t('stats.multiChain') },
    { name: t('stats.dataSources'), value: 'Exchanges', change: t('stats.firstParty') },
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
        <p className="text-xl text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {networkStats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <p className="text-sm text-gray-500 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-green-600 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('btcPriceFeed')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">{t('loading')}</div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('uniqueFeatures')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t('firstPartyData')}</h4>
                  <p className="text-sm text-gray-600">{t('firstPartyDataDesc')}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t('lowLatencyFeature')}</h4>
                  <p className="text-sm text-gray-600">{t('lowLatencyFeatureDesc')}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t('highFrequency')}</h4>
                  <p className="text-sm text-gray-600">{t('highFrequencyDesc')}</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('priceFeeds')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('loadingPriceFeeds')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('symbol')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('price')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('timestamp')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('confidence')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceFeeds.map((feed, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{feed.symbol}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${feed.price.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(feed.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600">
                          {feed.confidence ? `${feed.confidence.toFixed(2)}%` : t('na')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
