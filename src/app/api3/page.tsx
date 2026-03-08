'use client';

import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
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
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const priceFeedData = [
  { time: '00:00', BTC: 68000, ETH: 3500, SOL: 180 },
  { time: '04:00', BTC: 68120, ETH: 3515, SOL: 181 },
  { time: '08:00', BTC: 68050, ETH: 3508, SOL: 180.5 },
  { time: '12:00', BTC: 68200, ETH: 3520, SOL: 182 },
  { time: '16:00', BTC: 68150, ETH: 3518, SOL: 181.5 },
  { time: '20:00', BTC: 68250, ETH: 3525, SOL: 182.5 },
  { time: '24:00', BTC: 68300, ETH: 3530, SOL: 183 },
];

const networkStatsData = [
  { name: 'Ethereum', value: 65 },
  { name: 'Arbitrum', value: 20 },
  { name: 'Polygon', value: 15 },
];

const securityMetrics = [
  { name: 'Security 1', value: 95 },
  { name: 'Security 2', value: 92 },
  { name: 'Security 3', value: 88 },
  { name: 'Security 4', value: 90 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Api3Page() {
  const { t } = useI18n();
  const [currentPrice, setCurrentPrice] = useState({
    BTC: 68300,
    ETH: 3530,
    SOL: 183,
    API3: 2.8,
  });

  const features = [
    {
      title: t('features.firstPartyOracles'),
      description: t('features.firstPartyOraclesDesc'),
    },
    {
      title: t('features.airnode'),
      description: t('features.airnodeDesc'),
    },
    {
      title: t('features.decentralizedApiConnectivity'),
      description: t('features.decentralizedApiConnectivityDesc'),
    },
    {
      title: t('features.quantifiableSecurity'),
      description: t('features.quantifiableSecurityDesc'),
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice((prev) => ({
        BTC: prev.BTC + (Math.random() - 0.5) * 100,
        ETH: prev.ETH + (Math.random() - 0.5) * 5,
        SOL: prev.SOL + (Math.random() - 0.5) * 0.5,
        API3: prev.API3 + (Math.random() - 0.5) * 0.05,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-lg text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Object.entries(currentPrice).map(([symbol, price]) => (
          <Card key={symbol} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{symbol}/USD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${price.toFixed(symbol === 'API3' ? 2 : symbol === 'SOL' ? 1 : 0)}
              </div>
              <div className="text-xs text-green-600 mt-1">+0.24%</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('uniqueFeatures')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('priceFeeds')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceFeedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="BTC"
                      stroke="#0088FE"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ETH"
                      stroke="#00C49F"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="SOL"
                      stroke="#FFBB28"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('networkDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={networkStatsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {networkStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('quantifiableSecurityMetrics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={securityMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
