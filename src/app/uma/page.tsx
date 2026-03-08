'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
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
import { UMAClient } from '@/lib/oracles/uma';
import { PriceData } from '@/lib/types/oracle';

const umaClient = new UMAClient();

export default function UMAPage() {
  const t = useTranslations('uma');
  const [btcHistorical, setBtcHistorical] = useState<PriceData[]>([]);
  const [ethHistorical, setEthHistorical] = useState<PriceData[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({});

  const FEATURES = [
    {
      title: t('features.optimisticOracle'),
      description: t('features.optimisticOracleDesc'),
      icon: '⚖️',
    },
    {
      title: t('features.pricelessContracts'),
      description: t('features.pricelessContractsDesc'),
      icon: '💰',
    },
    {
      title: t('features.financialContracts'),
      description: t('features.financialContractsDesc'),
      icon: '📈',
    },
    {
      title: t('features.dataVerification'),
      description: t('features.dataVerificationDesc'),
      icon: '✅',
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-lg text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {FEATURES.map((feature, index) => (
          <Card key={index}>
            <CardContent className="text-center">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(currentPrices).map(([symbol, data]) => (
          <Card key={symbol}>
            <CardHeader>
              <CardTitle className="text-xl">{symbol}/USD</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                $
                {data.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p
                className={`text-sm font-medium mt-1 ${(data.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {(data.change ?? 0) >= 0 ? '↑' : '↓'} {Math.abs(data.change ?? 0).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('btcPriceHistory')}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={btcHistorical}>
                <defs>
                  <linearGradient id="colorBtc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f7931a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatDate} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number'
                      ? [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Price']
                      : ['', '']
                  }
                  labelFormatter={(label) => formatDate(Number(label))}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#f7931a"
                  fillOpacity={1}
                  fill="url(#colorBtc)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ethPriceHistory')}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ethHistorical}>
                <defs>
                  <linearGradient id="colorEth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#627eea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#627eea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatDate} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number'
                      ? [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Price']
                      : ['', '']
                  }
                  labelFormatter={(label) => formatDate(Number(label))}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#627eea"
                  fillOpacity={1}
                  fill="url(#colorEth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
