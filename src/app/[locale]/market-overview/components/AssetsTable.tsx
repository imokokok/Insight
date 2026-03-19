'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatCompactNumber } from '@/lib/utils/format';
import { AssetData } from '../types';

interface AssetsTableProps {
  assets: AssetData[];
}

export default function AssetsTable({ assets }: AssetsTableProps) {
  const locale = useLocale();

  return (
    <div className="overflow-hidden">
      <div className="pb-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isChineseLocale(locale) ? '热门资产' : 'Top Assets'}
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          {assets.length} {isChineseLocale(locale) ? '个资产' : 'assets'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isChineseLocale(locale) ? '资产' : 'Asset'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isChineseLocale(locale) ? '价格' : 'Price'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isChineseLocale(locale) ? '24h变化' : '24h Change'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isChineseLocale(locale) ? '7d变化' : '7d Change'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isChineseLocale(locale) ? '24h成交量' : '24h Volume'}
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isChineseLocale(locale) ? '主要预言机' : 'Primary Oracle'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {assets.map((asset, index) => (
              <tr key={asset.symbol} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-400">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900 block text-sm">
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-gray-400">
                        ${formatCompactNumber(asset.marketCap)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="font-medium text-gray-900">
                    {formatPrice(asset.price)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`text-xs font-medium ${
                      asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {asset.change24h >= 0 ? '+' : ''}
                    {asset.change24h.toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`text-xs font-medium ${
                      asset.change7d >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {asset.change7d >= 0 ? '+' : ''}
                    {asset.change7d.toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-500 text-xs">
                    ${formatCompactNumber(asset.volume24h)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs font-medium text-blue-600">
                    {asset.primaryOracle}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
