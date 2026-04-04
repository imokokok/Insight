'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, Info } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

import { Skeleton } from '@/components/ui';
import { getDIADataService } from '@/lib/oracles';
import { Blockchain } from '@/types/oracle';

const DIA_CHAIN_NAMES: Partial<Record<Blockchain, string>> = {
  [Blockchain.ETHEREUM]: 'Ethereum',
  [Blockchain.POLYGON]: 'Polygon',
  [Blockchain.AVALANCHE]: 'Avalanche',
  [Blockchain.ARBITRUM]: 'Arbitrum',
  [Blockchain.BASE]: 'Base',
};

const CHAIN_COLORS: Partial<Record<Blockchain, string>> = {
  [Blockchain.ETHEREUM]: '#627eea',
  [Blockchain.POLYGON]: '#8247e5',
  [Blockchain.AVALANCHE]: '#e84142',
  [Blockchain.ARBITRUM]: '#28a0f0',
  [Blockchain.BASE]: '#0052ff',
};

interface NFTCollection {
  address: string;
  name: string;
  chain: Blockchain;
  imageUrl?: string;
}

interface NFTFloorPriceData {
  collection: string;
  floorPrice: number;
  floorPriceUSD: number;
  floorPriceYesterday: number;
  volumeYesterday: number;
  timestamp: number;
  chain: Blockchain;
  change24h: number;
  change24hPercent: number;
}

interface FloorPricePoint {
  timestamp: number;
  date: string;
  floorPrice: number;
  floorPriceUSD: number;
}

interface VolumePoint {
  date: string;
  volume: number;
  color: string;
}

interface NFTFloorPriceHistoryProps {
  collection: NFTCollection;
  days?: 7 | 14 | 30;
  showVolume?: boolean;
  onRefresh?: () => void;
}

export function NFTFloorPriceHistory({
  collection,
  days = 14,
  showVolume = true,
  onRefresh,
}: NFTFloorPriceHistoryProps) {
  const [floorPriceData, setFloorPriceData] = useState<NFTFloorPriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<FloorPricePoint[]>([]);
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(days);

  const diaService = useMemo(() => getDIADataService(), []);

  const generateMockHistoricalData = useCallback(
    (_basePrice: number, _periodDays: number): FloorPricePoint[] => {
      throw new Error('Mock data is disabled. Please use real data sources.');
    },
    []
  );

  const generateMockVolumeData = useCallback(
    (_baseVolume: number, _periodDays: number): VolumePoint[] => {
      throw new Error('Mock data is disabled. Please use real data sources.');
    },
    []
  );

  const fetchData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const nftData = await diaService.getNFTFloorPrice(collection.address, collection.chain);

      if (nftData) {
        const change24h = nftData.FloorPrice - (nftData.FloorPriceYesterday || nftData.FloorPrice);
        const change24hPercent = nftData.FloorPriceYesterday
          ? (change24h / nftData.FloorPriceYesterday) * 100
          : 0;

        setFloorPriceData({
          collection: nftData.Collection || collection.name,
          floorPrice: nftData.FloorPrice,
          floorPriceUSD: nftData.FloorPriceUSD || nftData.FloorPrice * 1800,
          floorPriceYesterday: nftData.FloorPriceYesterday || nftData.FloorPrice,
          volumeYesterday: nftData.VolumeYesterday || 0,
          timestamp: new Date(nftData.Time).getTime(),
          chain: collection.chain,
          change24h,
          change24hPercent,
        });

        setHistoricalData(generateMockHistoricalData(nftData.FloorPrice, selectedPeriod));
        setVolumeData(generateMockVolumeData(nftData.VolumeYesterday || 100, selectedPeriod));
      } else {
        throw new Error('No NFT floor price data available. Please check the data source.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      onRefresh?.();
    }
  };

  useEffect(() => {
    fetchData();
  }, [collection.address, collection.chain, selectedPeriod]);

  const stats = useMemo(() => {
    if (!floorPriceData || historicalData.length === 0) return null;

    const prices = historicalData.map((d) => d.floorPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const volatility = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
    );

    return {
      minPrice,
      maxPrice,
      avgPrice,
      volatility,
      volatilityPercent: (volatility / avgPrice) * 100,
    };
  }, [floorPriceData, historicalData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!floorPriceData) return null;

  const isPositive = floorPriceData.change24hPercent >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Floor Price History</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {collection.name} • {DIA_CHAIN_NAMES[collection.chain] || collection.chain}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedPeriod(d as 7 | 14 | 30)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedPeriod === d
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Current Floor</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            Ξ {floorPriceData.floorPrice.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            ${floorPriceData.floorPriceUSD.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">24h Change</p>
          <p
            className={`text-xl font-semibold mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
          >
            <span className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {isPositive ? '+' : ''}
              {floorPriceData.change24hPercent.toFixed(2)}%
            </span>
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">24h Volume</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            Ξ {floorPriceData.volumeYesterday.toFixed(2)}
          </p>
        </div>
        {stats && (
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Volatility</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {stats.volatilityPercent.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-4">Floor Price Trend</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="floorPriceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={CHAIN_COLORS[collection.chain] || '#6b7280'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHAIN_COLORS[collection.chain] || '#6b7280'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 10 }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `Ξ${value.toFixed(2)}`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  const numValue = Number(value);
                  if (name === 'floorPrice') {
                    return [`Ξ ${numValue.toFixed(4)}`, 'Floor Price'];
                  }
                  return [`$${numValue.toLocaleString()}`, 'USD Value'];
                }}
              />
              <Area
                type="monotone"
                dataKey="floorPrice"
                stroke={CHAIN_COLORS[collection.chain] || '#6b7280'}
                strokeWidth={2}
                fill="url(#floorPriceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showVolume && volumeData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Daily Volume</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `Ξ${value.toFixed(0)}`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`Ξ ${Number(value).toFixed(2)}`, 'Volume']}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {volumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-gray-500">Period Low</p>
            <p className="text-sm font-semibold text-red-600 mt-1">Ξ {stats.minPrice.toFixed(4)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Period High</p>
            <p className="text-sm font-semibold text-emerald-600 mt-1">
              Ξ {stats.maxPrice.toFixed(4)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Average</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              Ξ {stats.avgPrice.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Info className="w-3.5 h-3.5" />
        <span>
          Data sourced from DIA Oracle. Last updated:{' '}
          {new Date(floorPriceData.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default NFTFloorPriceHistory;
