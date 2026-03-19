'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatCompactNumber } from '@/lib/utils/format';
import { AssetData } from '../types';
import { semanticColors } from '@/lib/config/colors';

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
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '资产' : 'Asset'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '价格' : 'Price'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '24h变化' : '24h Change'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '7d变化' : '7d Change'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '24h成交量' : '24h Volume'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '主要预言机' : 'Primary Oracle'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.map((asset, index) => (
              <tr
                key={asset.symbol}
                className="transition-all duration-200 hover:bg-gray-50/80 group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-gray-400 bg-gray-100 group-hover:bg-gray-200 transition-colors duration-200">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-gray-900 block text-sm group-hover:text-blue-600 transition-colors duration-200">
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-gray-400">
                        ${formatCompactNumber(asset.marketCap)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors duration-200">
                    {formatPrice(asset.price)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 border transition-all duration-200"
                    style={{
                      color: asset.change24h >= 0 ? semanticColors.success.text : semanticColors.danger.text,
                      backgroundColor: asset.change24h >= 0 ? semanticColors.success.light : semanticColors.danger.light,
                      borderColor: asset.change24h >= 0 ? semanticColors.success.light : semanticColors.danger.light,
                    }}
                  >
                    {asset.change24h >= 0 ? '+' : ''}
                    {asset.change24h.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 border transition-all duration-200"
                    style={{
                      color: asset.change7d >= 0 ? semanticColors.success.text : semanticColors.danger.text,
                      backgroundColor: asset.change7d >= 0 ? semanticColors.success.light : semanticColors.danger.light,
                      borderColor: asset.change7d >= 0 ? semanticColors.success.light : semanticColors.danger.light,
                    }}
                  >
                    {asset.change7d >= 0 ? '+' : ''}
                    {asset.change7d.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-500 text-xs font-medium">
                    ${formatCompactNumber(asset.volume24h)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 cursor-pointer">
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
