'use client';

import { useI18n } from '@/lib/i18n/context';
import { Blockchain } from '@/lib/oracles';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors, getDiffTextColor, calculateZScore, isOutlier } from '../utils';
import { Sparkline } from './SmallComponents';

interface PriceComparisonTableProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function PriceComparisonTable({ data }: PriceComparisonTableProps) {
  const { t } = useI18n();
  const {
    sortedPriceDifferences,
    selectedBaseChain,
    historicalPrices,
    avgPrice,
    standardDeviation,
    handleSort,
    sortColumn,
    sortDirection,
    tableFilter,
    setTableFilter,
    filteredChains,
  } = data;

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
          {t('crossChain.priceComparisonTable')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('crossChain.filter')}:</span>
          {(['all', 'abnormal', 'normal'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTableFilter(filter)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                tableFilter === filter
                  ? filter === 'abnormal' ? 'bg-red-100 text-red-700'
                  : filter === 'normal' ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`crossChain.filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('chain')}>
                <div className="flex items-center gap-1">
                  {t('crossChain.blockchain')}
                  <span>{sortColumn === 'chain' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                </div>
              </th>
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  {t('crossChain.price')}
                  <span>{sortColumn === 'price' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                </div>
              </th>
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('diff')}>
                <div className="flex items-center justify-end gap-1">
                  {t('crossChain.differenceVs')} {selectedBaseChain ? chainNames[selectedBaseChain] : ''}
                  <span>{sortColumn === 'diff' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                </div>
              </th>
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('diffPercent')}>
                <div className="flex items-center justify-end gap-1">
                  {t('crossChain.percentDifference')}
                  <span>{sortColumn === 'diffPercent' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                </div>
              </th>
              <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase text-center">
                {t('crossChain.trend')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPriceDifferences.map((item) => {
              const zScore = calculateZScore(item.price, avgPrice, standardDeviation);
              const outlier = isOutlier(zScore);
              const chainHistoricalPrices = historicalPrices[item.chain as Blockchain];
              const priceHistory = chainHistoricalPrices?.map((p) => p.price) || [];
              const bgColor = Math.abs(item.diffPercent) > 0.5 ? (item.diffPercent > 0 ? 'bg-red-50' : 'bg-green-50') : '';
              const textColor = getDiffTextColor(item.diffPercent);

              return (
                <tr key={item.chain} className={`border-b border-gray-100 hover:bg-gray-50 ${bgColor} ${outlier ? 'ring-1 ring-amber-300' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 mr-2" style={{ backgroundColor: chainColors[item.chain as Blockchain] }} />
                      <span className="text-sm font-medium text-gray-900">{chainNames[item.chain as Blockchain]}</span>
                      {outlier && (
                        <span className="ml-2 text-amber-600 text-xs font-medium bg-amber-100 px-1.5 py-0.5">{t('crossChain.outlier')}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    <span className={item.diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.diff >= 0 ? '+' : ''}${item.diff.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    <span className={`font-medium ${textColor}`}>
                      {item.diffPercent >= 0 ? '+' : ''}{item.diffPercent.toFixed(4)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Sparkline data={priceHistory} color={chainColors[item.chain as Blockchain]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
