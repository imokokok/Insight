'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AssetChange {
  symbol: string;
  price: number;
  change24h: number;
}

interface PriceChangeLeaderboardProps {
  title?: string;
}

const defaultAssets: AssetChange[] = [
  { symbol: 'SOL', price: 142.3, change24h: 8.5 },
  { symbol: 'AVAX', price: 35.4, change24h: 6.2 },
  { symbol: 'LINK', price: 18.2, change24h: 5.8 },
  { symbol: 'UNI', price: 9.8, change24h: 4.3 },
  { symbol: 'AAVE', price: 125.4, change24h: 3.7 },
  { symbol: 'BTC', price: 67432.5, change24h: 2.4 },
  { symbol: 'ARB', price: 1.85, change24h: 0.9 },
  { symbol: 'ETH', price: 3521.8, change24h: -1.2 },
  { symbol: 'OP', price: 2.45, change24h: -2.1 },
  { symbol: 'MATIC', price: 0.65, change24h: -3.2 },
  { symbol: 'SNX', price: 2.8, change24h: -4.5 },
  { symbol: 'CRV', price: 0.42, change24h: -5.8 },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

export function PriceChangeLeaderboard({ title = '24h Price Change' }: PriceChangeLeaderboardProps) {
  const { gainers, losers } = useMemo(() => {
    const sorted = [...defaultAssets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    const gainers = sorted.filter((a) => a.change24h > 0).slice(0, 5);
    const losers = sorted.filter((a) => a.change24h < 0).slice(0, 5);
    return { gainers, losers };
  }, []);

  return (
    <div className="bg-white border border-gray-200">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gainers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-green-600 uppercase tracking-wider">Top Gainers</h4>
            </div>
            <div className="space-y-2">
              {gainers.map((asset, index) => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between py-2 px-3 bg-green-50/50 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                    <span className="font-semibold text-gray-900">{asset.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">{formatPrice(asset.price)}</div>
                    <div className="text-sm font-medium text-green-600">+{asset.change24h.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Losers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <h4 className="text-sm font-semibold text-red-600 uppercase tracking-wider">Top Losers</h4>
            </div>
            <div className="space-y-2">
              {losers.map((asset, index) => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between py-2 px-3 bg-red-50/50 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                    <span className="font-semibold text-gray-900">{asset.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">{formatPrice(asset.price)}</div>
                    <div className="text-sm font-medium text-red-600">{asset.change24h.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceChangeLeaderboard;
