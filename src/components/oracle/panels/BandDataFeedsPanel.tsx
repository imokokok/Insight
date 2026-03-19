'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/utils/logger';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/selectors';
import { DashboardCard, MetricCard } from '@/components/oracle/common/DashboardCard';
import { Database, Server, CheckCircle, Clock, Shield, Zap, Globe } from 'lucide-react';

interface BandDataFeedsPanelProps {
  client: BandProtocolClient;
}

interface PriceFeed {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  updateFrequency: number;
  lastUpdate: number;
  confidence: number;
  sources: number;
  status: 'active' | 'inactive' | 'warning';
}

interface DataSource {
  name: string;
  type: string;
  feeds: number;
  reliability: number;
  avgLatency: number;
  status: 'active' | 'inactive';
}

export function BandDataFeedsPanel({ client }: BandDataFeedsPanelProps) {
  const t = useTranslations();
  const [priceFeeds, setPriceFeeds] = useState<PriceFeed[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchDataFeeds = async () => {
      try {
        const mockPriceFeeds: PriceFeed[] = [
          {
            symbol: 'BTC/USD',
            name: 'Bitcoin',
            price: 67842.35,
            change24h: 1250.5,
            change24hPercent: 1.88,
            updateFrequency: 10,
            lastUpdate: Date.now() - 5000,
            confidence: 99.8,
            sources: 12,
            status: 'active',
          },
          {
            symbol: 'ETH/USD',
            name: 'Ethereum',
            price: 3456.78,
            change24h: 45.2,
            change24hPercent: 1.33,
            updateFrequency: 10,
            lastUpdate: Date.now() - 3000,
            confidence: 99.7,
            sources: 12,
            status: 'active',
          },
          {
            symbol: 'USDC/USD',
            name: 'USD Coin',
            price: 1.0001,
            change24h: 0.0001,
            change24hPercent: 0.01,
            updateFrequency: 60,
            lastUpdate: Date.now() - 45000,
            confidence: 99.9,
            sources: 8,
            status: 'active',
          },
          {
            symbol: 'USDT/USD',
            name: 'Tether',
            price: 0.9998,
            change24h: -0.0002,
            change24hPercent: -0.02,
            updateFrequency: 60,
            lastUpdate: Date.now() - 50000,
            confidence: 99.8,
            sources: 8,
            status: 'active',
          },
          {
            symbol: 'ATOM/USD',
            name: 'Cosmos',
            price: 8.45,
            change24h: 0.25,
            change24hPercent: 3.05,
            updateFrequency: 15,
            lastUpdate: Date.now() - 8000,
            confidence: 99.5,
            sources: 10,
            status: 'active',
          },
          {
            symbol: 'OSMO/USD',
            name: 'Osmosis',
            price: 0.65,
            change24h: 0.02,
            change24hPercent: 3.17,
            updateFrequency: 20,
            lastUpdate: Date.now() - 12000,
            confidence: 99.4,
            sources: 8,
            status: 'active',
          },
          {
            symbol: 'LINK/USD',
            name: 'Chainlink',
            price: 18.25,
            change24h: 0.45,
            change24hPercent: 2.53,
            updateFrequency: 15,
            lastUpdate: Date.now() - 10000,
            confidence: 99.6,
            sources: 10,
            status: 'active',
          },
          {
            symbol: 'AVAX/USD',
            name: 'Avalanche',
            price: 42.18,
            change24h: 1.25,
            change24hPercent: 3.06,
            updateFrequency: 15,
            lastUpdate: Date.now() - 9000,
            confidence: 99.5,
            sources: 10,
            status: 'active',
          },
          {
            symbol: 'MATIC/USD',
            name: 'Polygon',
            price: 0.72,
            change24h: 0.02,
            change24hPercent: 2.86,
            updateFrequency: 20,
            lastUpdate: Date.now() - 15000,
            confidence: 99.4,
            sources: 8,
            status: 'active',
          },
          {
            symbol: 'SOL/USD',
            name: 'Solana',
            price: 145.32,
            change24h: 3.45,
            change24hPercent: 2.43,
            updateFrequency: 10,
            lastUpdate: Date.now() - 6000,
            confidence: 99.6,
            sources: 10,
            status: 'active',
          },
        ];

        const mockDataSources: DataSource[] = [
          {
            name: 'Binance',
            type: 'CEX',
            feeds: 45,
            reliability: 99.9,
            avgLatency: 50,
            status: 'active',
          },
          {
            name: 'Coinbase',
            type: 'CEX',
            feeds: 40,
            reliability: 99.8,
            avgLatency: 60,
            status: 'active',
          },
          {
            name: 'Kraken',
            type: 'CEX',
            feeds: 35,
            reliability: 99.7,
            avgLatency: 70,
            status: 'active',
          },
          {
            name: 'Huobi',
            type: 'CEX',
            feeds: 30,
            reliability: 99.6,
            avgLatency: 80,
            status: 'active',
          },
          {
            name: 'OKX',
            type: 'CEX',
            feeds: 28,
            reliability: 99.5,
            avgLatency: 75,
            status: 'active',
          },
          {
            name: 'KuCoin',
            type: 'CEX',
            feeds: 25,
            reliability: 99.4,
            avgLatency: 85,
            status: 'active',
          },
          {
            name: 'Bitfinex',
            type: 'CEX',
            feeds: 20,
            reliability: 99.5,
            avgLatency: 90,
            status: 'active',
          },
          {
            name: 'CryptoCompare',
            type: 'Aggregator',
            feeds: 50,
            reliability: 99.3,
            avgLatency: 100,
            status: 'active',
          },
        ];

        setPriceFeeds(mockPriceFeeds);
        setDataSources(mockDataSources);
      } catch (error) {
        logger.error(
          'Failed to fetch data feeds:',
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDataFeeds();
  }, [client]);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(4)}`;
  };

  const filteredFeeds =
    selectedCategory === 'all'
      ? priceFeeds
      : priceFeeds.filter((feed) => {
          if (selectedCategory === 'crypto') return !feed.symbol.includes('USD/USD');
          if (selectedCategory === 'stablecoin')
            return feed.symbol.includes('USD') && feed.price < 2;
          return true;
        });

  const activeFeeds = priceFeeds.filter((f) => f.status === 'active').length;
  const totalSources = dataSources.reduce((sum, s) => sum + s.feeds, 0);
  const avgConfidence = priceFeeds.reduce((sum, f) => sum + f.confidence, 0) / priceFeeds.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Feeds Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('band.dataFeeds.totalFeeds')}
          value={priceFeeds.length.toString()}
          subValue={`${activeFeeds} ${t('band.dataFeeds.active')}`}
          icon={<Database className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.dataFeeds.dataSources')}
          value={dataSources.length.toString()}
          subValue={`${totalSources} ${t('band.dataFeeds.totalSources')}`}
          icon={<Server className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.dataFeeds.avgConfidence')}
          value={`${avgConfidence.toFixed(1)}%`}
          subValue={t('band.dataFeeds.acrossAllFeeds')}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.dataFeeds.avgUpdateFreq')}
          value={`${Math.round(
            priceFeeds.reduce((sum, f) => sum + f.updateFrequency, 0) / priceFeeds.length
          )}s`}
          subValue={t('band.dataFeeds.updateInterval')}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Price Feeds Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">
              {t('band.dataFeeds.priceFeeds')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <SegmentedControl
                options={[
                  { value: 'all', label: t('band.dataFeeds.allCategories') },
                  { value: 'crypto', label: t('band.dataFeeds.crypto') },
                  { value: 'stablecoin', label: t('band.dataFeeds.stablecoin') },
                ]}
                value={selectedCategory}
                onChange={(value) => setSelectedCategory(value as string)}
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.symbol')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.price')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.change24h')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.updateFreq')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.confidence')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.sources')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.dataFeeds.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.map((feed, index) => (
                  <tr
                    key={feed.symbol}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{feed.symbol}</p>
                        <p className="text-xs text-gray-500">{feed.name}</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <p className="text-sm font-medium text-gray-900">{formatPrice(feed.price)}</p>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`text-sm font-medium ${
                          feed.change24hPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {feed.change24hPercent >= 0 ? '+' : ''}
                        {feed.change24hPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-sm text-gray-600">{feed.updateFrequency}s</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 h-1.5">
                          <div
                            className="bg-purple-500 h-1.5"
                            style={{ width: `${feed.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{feed.confidence.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-sm text-gray-600">{feed.sources}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium ${
                          feed.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : feed.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {feed.status === 'active' ? '●' : '○'} {feed.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <DashboardCard title={t('band.dataFeeds.dataSources')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataSources.map((source) => (
            <div key={source.name} className="bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{source.name}</span>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium ${
                    source.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {source.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{source.type}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('band.dataFeeds.feeds')}:</span>
                  <span className="font-medium text-gray-900">{source.feeds}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('band.dataFeeds.reliability')}:</span>
                  <span className="font-medium text-green-600">
                    {source.reliability.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('band.dataFeeds.latency')}:</span>
                  <span className="font-medium text-gray-900">{source.avgLatency}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Data Quality Info */}
      <DashboardCard title={t('band.dataFeeds.dataQuality')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.dataFeeds.multiSource')}</h4>
            </div>
            <p className="text-sm text-purple-700">{t('band.dataFeeds.multiSourceDesc')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.dataFeeds.realTime')}</h4>
            </div>
            <p className="text-sm text-purple-700">{t('band.dataFeeds.realTimeDesc')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.dataFeeds.decentralized')}</h4>
            </div>
            <p className="text-sm text-purple-700">{t('band.dataFeeds.decentralizedDesc')}</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
