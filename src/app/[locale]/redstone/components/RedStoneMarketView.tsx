'use client';

import { useState, useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Search,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
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

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

import { type RedStoneMarketViewProps } from '../types';

const PRICE_FEEDS = [
  {
    symbol: 'ETH/USD',
    price: 3452.18,
    change24h: 2.34,
    volume24h: 15234567890,
    source: 'RedStone',
  },
  {
    symbol: 'BTC/USD',
    price: 67234.56,
    change24h: -1.23,
    volume24h: 28456789012,
    source: 'RedStone',
  },
  { symbol: 'LINK/USD', price: 18.45, change24h: 5.67, volume24h: 456789012, source: 'RedStone' },
  { symbol: 'UNI/USD', price: 9.87, change24h: -3.45, volume24h: 234567890, source: 'RedStone' },
  { symbol: 'AAVE/USD', price: 112.34, change24h: 1.89, volume24h: 345678901, source: 'RedStone' },
  { symbol: 'COMP/USD', price: 56.78, change24h: -2.34, volume24h: 123456789, source: 'RedStone' },
  { symbol: 'MKR/USD', price: 1789.45, change24h: 3.21, volume24h: 98765432, source: 'RedStone' },
  { symbol: 'SNX/USD', price: 3.45, change24h: -4.56, volume24h: 87654321, source: 'RedStone' },
];

const HISTORICAL_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  price: 3200 + Math.random() * 400,
  volume: 10000000000 + Math.random() * 5000000000,
}));

type SortField = 'symbol' | 'price' | 'change24h' | 'volume24h';
type SortDirection = 'asc' | 'desc';

export function RedStoneMarketView({
  client,
  price,
  historicalData,
  isLoading,
  networkStats,
}: RedStoneMarketViewProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('volume24h');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  const filteredFeeds = useMemo(() => {
    const feeds = PRICE_FEEDS.filter(
      (feed) =>
        feed.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.source.toLowerCase().includes(searchQuery.toLowerCase())
    );

    feeds.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * multiplier;
      }

      return ((aValue as number) - (bValue as number)) * multiplier;
    });

    return feeds;
  }, [searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const marketStats = {
    totalFeeds: PRICE_FEEDS.length,
    avgChange24h: PRICE_FEEDS.reduce((sum, feed) => sum + feed.change24h, 0) / PRICE_FEEDS.length,
    totalVolume24h: PRICE_FEEDS.reduce((sum, feed) => sum + feed.volume24h, 0),
    activeFeeds: PRICE_FEEDS.filter((feed) => Math.abs(feed.change24h) < 10).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Activity className="w-4 h-4" />
            {t('redstone.market.totalFeeds')}
          </div>
          <div className="text-2xl font-bold text-gray-900">{marketStats.totalFeeds}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            {t('redstone.market.avgChange24h')}
          </div>
          <div
            className={`text-2xl font-bold ${
              marketStats.avgChange24h >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {marketStats.avgChange24h >= 0 ? '+' : ''}
            {marketStats.avgChange24h.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            {t('redstone.market.totalVolume24h')}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(marketStats.totalVolume24h)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <BarChart3 className="w-4 h-4" />
            {t('redstone.market.activeFeeds')}
          </div>
          <div className="text-2xl font-bold text-gray-900">{marketStats.activeFeeds}</div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('redstone.market.priceTrend')}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('redstone.market.dataSource')}:</span>
            <span className="text-sm font-medium text-red-600">RedStone</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HISTORICAL_DATA}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.oracle.redstone} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.oracle.redstone} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
                formatter={(value) => [formatCurrency(Number(value)), t('redstone.market.price')]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColors.oracle.redstone}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Price Feeds Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('redstone.market.priceFeeds')}
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('redstone.market.searchFeeds')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('symbol')}
                >
                  <div className="flex items-center gap-1">
                    {t('redstone.market.symbol')}
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('redstone.market.price')}
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('change24h')}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('redstone.market.change24h')}
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('volume24h')}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('redstone.market.volume24h')}
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  {t('redstone.market.source')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFeeds.map((feed) => (
                <tr
                  key={feed.symbol}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedFeed(feed.symbol)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                        <span className="text-xs font-medium text-red-600">
                          {feed.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{feed.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-gray-900">{formatCurrency(feed.price)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div
                      className={`flex items-center justify-end gap-1 ${
                        feed.change24h >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {feed.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {feed.change24h >= 0 ? '+' : ''}
                        {feed.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-gray-900">{formatCurrency(feed.volume24h)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs">
                      <RefreshCw className="w-3 h-3" />
                      {feed.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Quality Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">{t('redstone.market.dataQuality')}</h4>
            <p className="text-sm text-blue-700 mt-1">{t('redstone.market.dataQualityDesc')}</p>
            <a
              href="https://docs.redstone.finance/docs/data-quality"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              {t('redstone.market.learnMore')} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
