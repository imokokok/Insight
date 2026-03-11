'use client';

import { OracleProvider, PriceData } from '@/lib/types/oracle';
import {
  oracleNames,
  getDeviationColorClass,
  getDeviationBgClass,
  getFreshnessInfo,
  getFreshnessDotColor,
  calculateZScore,
  isOutlier,
  SortColumn,
  SortDirection,
} from '../constants.tsx';

interface PriceTableProps {
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  expandedRow: number | null;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  chartColors: Record<OracleProvider, string>;
  avgPrice: number;
  standardDeviation: number;
  validPrices: number[];
  onSort: (column: SortColumn) => void;
  onExpandRow: (index: number | null) => void;
  onSetHoveredRow: (index: number | null) => void;
  onSetSelectedRow: (index: number | null) => void;
  t: (key: string) => string;
}

export function PriceTable({
  priceData,
  filteredPriceData,
  isLoading,
  sortColumn,
  sortDirection,
  expandedRow,
  selectedRowIndex,
  hoveredRowIndex,
  chartColors,
  avgPrice,
  standardDeviation,
  validPrices,
  onSort,
  onExpandRow,
  onSetHoveredRow,
  onSetSelectedRow,
  t,
}: PriceTableProps) {
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 border border-gray-200">
        <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="w-full min-w-[640px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide bg-gray-50">
                {t('crossOracle.oracle')}
              </th>
              <th
                className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none bg-gray-50"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('crossOracle.price')}
                  {sortColumn === 'price' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              {validPrices.length > 1 && avgPrice > 0 && (
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide bg-gray-50">
                  {t('crossOracle.deviation')}
                </th>
              )}
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide hidden sm:table-cell bg-gray-50">
                {t('crossOracle.confidence')}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide hidden md:table-cell bg-gray-50">
                {t('crossOracle.source')}
              </th>
              <th
                className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none bg-gray-50"
                onClick={() => onSort('timestamp')}
              >
                <div className="flex items-center justify-end gap-1">
                  新鲜度
                  {sortColumn === 'timestamp' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPriceData.map((data, index) => {
              let deviationPercent: number | null = null;
              if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
                deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
              }
              const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
              const outlier = isOutlier(zScore);
              const freshness = getFreshnessInfo(data.timestamp);
              const isExpanded = expandedRow === index;
              const isSelected = selectedRowIndex === index;
              const isHovered = hoveredRowIndex === index;
              const isHighest = data.price === maxPrice && maxPrice !== minPrice;
              const isLowest = data.price === minPrice && maxPrice !== minPrice;
              const barWidth =
                deviationPercent !== null
                  ? Math.min(Math.abs(deviationPercent) * 10, 100)
                  : 0;

              return (
                <>
                  <tr
                    key={data.provider}
                    onClick={() => onExpandRow(isExpanded ? null : index)}
                    onMouseEnter={() => onSetHoveredRow(index)}
                    onMouseLeave={() => onSetHoveredRow(null)}
                    tabIndex={0}
                    className={`relative border-b border-gray-100 cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-inset bg-blue-50'
                        : isHighest
                          ? 'bg-red-50'
                          : isLowest
                            ? 'bg-green-50'
                            : outlier
                              ? 'bg-amber-50'
                              : isHovered
                                ? 'bg-blue-50'
                                : ''
                    } ${isExpanded ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isHighest && (
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                            最高
                          </span>
                        )}
                        {isLowest && (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                            最低
                          </span>
                        )}
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chartColors[data.provider] }}
                        />
                        <span className="font-medium text-gray-900 text-sm">
                          {oracleNames[data.provider]}
                        </span>
                        {outlier && (
                          <span className="text-amber-600 text-xs font-medium bg-amber-100 px-1.5 py-0.5 rounded">
                            {t('crossOracle.outlier')}
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right relative">
                      <div className="relative">
                        <div
                          className={`absolute inset-0 rounded transition-all ${
                            deviationPercent !== null && deviationPercent > 0
                              ? 'bg-red-200'
                              : deviationPercent !== null && deviationPercent < 0
                                ? 'bg-green-200'
                                : ''
                          }`}
                          style={{
                            width: `${barWidth}%`,
                            right: 0,
                            left: 'auto',
                            opacity: 0.3,
                          }}
                        />
                        <span className={`relative font-mono text-sm ${outlier ? 'text-amber-700' : 'text-gray-900'}`}>
                          ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    {validPrices.length > 1 && avgPrice > 0 && (
                      <td className="py-3 px-4 text-right">
                        {deviationPercent !== null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDeviationColorClass(deviationPercent)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDeviationBgClass(deviationPercent)}`} />
                            {deviationPercent >= 0 ? '+' : ''}{deviationPercent.toFixed(3)}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right hidden sm:table-cell">
                      {data.confidence ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm text-gray-700">{(data.confidence * 100).toFixed(1)}%</span>
                          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.confidence * 100}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 text-sm hidden md:table-cell">
                      {data.source || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`w-2 h-2 rounded-full ${getFreshnessDotColor(freshness.seconds)}`} />
                        <span className={`text-sm ${freshness.colorClass}`}>{freshness.text}</span>
                      </div>
                    </td>

                    {isHovered && !isSelected && (
                      <td className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-20">
                        <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-4 min-w-[240px]">
                          <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                            {oracleNames[data.provider]}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">价格</span>
                              <span className="font-mono text-gray-900">${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">偏差</span>
                              <span className={`font-medium ${deviationPercent !== null && deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {deviationPercent !== null ? `${deviationPercent >= 0 ? '+' : ''}${deviationPercent.toFixed(4)}%` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">置信度</span>
                              <span className="text-gray-900">{data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Z-Score</span>
                              <span className={`font-medium ${zScore !== null && Math.abs(zScore) > 2 ? 'text-amber-600' : 'text-gray-900'}`}>
                                {zScore !== null ? zScore.toFixed(3) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">状态</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${outlier ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {outlier ? '异常值' : '正常'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr key={`${index}-detail`} className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={6} className="py-4 px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 block">预言机</span>
                            <span className="font-medium text-gray-900">{oracleNames[data.provider]}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">价格</span>
                            <span className="font-mono text-gray-900">${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">偏离度</span>
                            <span className={`font-medium ${getDeviationColorClass(deviationPercent).split(' ')[0]}`}>
                              {deviationPercent !== null ? `${deviationPercent >= 0 ? '+' : ''}${deviationPercent.toFixed(4)}%` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">置信度</span>
                            <span className="text-gray-900">{data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">数据来源</span>
                            <span className="text-gray-900">{data.source || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">更新时间</span>
                            <span className="text-gray-900">{new Date(data.timestamp).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Z-Score</span>
                            <span className={`font-medium ${zScore !== null && Math.abs(zScore) > 2 ? 'text-amber-600' : 'text-gray-900'}`}>
                              {zScore !== null ? zScore.toFixed(3) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">状态</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${outlier ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              {outlier ? '异常值' : '正常'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
