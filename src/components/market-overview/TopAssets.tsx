'use client';

import { useMemo } from 'react';

interface Asset {
  symbol: string;
  price: number;
  change24h: number;
  primaryOracle: string;
}

interface TopAssetsProps {
  assets?: Asset[];
  title?: string;
}

const defaultAssets: Asset[] = [
  { symbol: 'BTC', price: 67432.5, change24h: 2.4, primaryOracle: 'Chainlink' },
  { symbol: 'ETH', price: 3521.8, change24h: -1.2, primaryOracle: 'Pyth Network' },
  { symbol: 'SOL', price: 142.3, change24h: 5.6, primaryOracle: 'Chainlink' },
  { symbol: 'AVAX', price: 35.4, change24h: -0.8, primaryOracle: 'API3' },
  { symbol: 'LINK', price: 18.2, change24h: 1.5, primaryOracle: 'Chainlink' },
  { symbol: 'MATIC', price: 0.65, change24h: -3.2, primaryOracle: 'Pyth Network' },
  { symbol: 'ARB', price: 1.85, change24h: 0.9, primaryOracle: 'Chainlink' },
  { symbol: 'OP', price: 2.45, change24h: -2.1, primaryOracle: 'Band Protocol' },
  { symbol: 'UNI', price: 9.8, change24h: 3.4, primaryOracle: 'Chainlink' },
  { symbol: 'AAVE', price: 125.4, change24h: -1.8, primaryOracle: 'API3' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function ChangeCell({ change }: { change: number }) {
  const isPositive = change >= 0;

  return (
    <span
      className={`font-medium ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {formatChange(change)}
    </span>
  );
}

export function TopAssets({
  assets = defaultAssets,
  title = 'Top Assets',
}: TopAssetsProps) {
  const sortedAssets = useMemo(() => {
    return [...assets].slice(0, 10);
  }, [assets]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {title && (
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                24h Change
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Primary Oracle
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map((asset, index) => (
              <tr
                key={asset.symbol}
                className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{index + 1}</span>
                    <span className="font-semibold text-gray-900">{asset.symbol}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-gray-900">{formatPrice(asset.price)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <ChangeCell change={asset.change24h} />
                </td>
                <td className="px-5 py-3">
                  <span className="text-gray-500">{asset.primaryOracle}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopAssets;
