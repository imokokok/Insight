'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { Icons } from './Icons';
import { FreshnessIndicator } from './FreshnessIndicator';
import { ConfidenceBadge } from './ConfidenceBadge';
import {
  QueryResult,
  oracleColors,
  chainColors,
  providerNames,
  chainNames,
  DEVIATION_THRESHOLD,
  oracleI18nKeys,
} from '../constants';
import { semanticColors } from '@/lib/config/colors';

type ScoreLevel = 'excellent' | 'good' | 'warning' | 'critical';

interface PriceResultsTableProps {
  results: QueryResult[];
  filteredResults: QueryResult[];
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  avgPrice: number;
  selectedRow: string | null;
  onRowSelect: (rowKey: string | null) => void;
  historicalData?: Partial<Record<string, QueryResult['priceData'][]>>;
}

const SCORE_CONFIG: Record<ScoreLevel, { color: string; bgColor: string; label: string }> = {
  excellent: { color: semanticColors.success.main, bgColor: 'bg-green-500', label: '优秀' },
  good: { color: semanticColors.info.main, bgColor: 'bg-blue-500', label: '良好' },
  warning: { color: semanticColors.warning.main, bgColor: 'bg-yellow-500', label: '警告' },
  critical: { color: semanticColors.danger.main, bgColor: 'bg-red-500', label: '异常' },
};

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

function calculateCompletenessScore(dataPoints: number, expectedPoints: number): number {
  const missingRatio = expectedPoints > 0 ? (expectedPoints - dataPoints) / expectedPoints : 0;
  const continuity = expectedPoints > 0 ? dataPoints / expectedPoints : 0;

  let score = 100;
  score -= missingRatio * 50;
  score -= (1 - continuity) * 30;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function DataQualityBadge({ score }: { score: number }) {
  const level = getScoreLevel(score);
  const config = SCORE_CONFIG[level];

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${config.bgColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`text-xs font-semibold w-8 text-right`}
        style={{ color: config.color }}
      >
        {score}
      </span>
    </div>
  );
}

export function PriceResultsTable({
  results,
  filteredResults,
  filterText,
  setFilterText,
  sortField,
  sortDirection,
  onSort,
  avgPrice,
  selectedRow,
  onRowSelect,
  historicalData = {},
}: PriceResultsTableProps) {
  const { t } = useI18n();
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const calculateDeviation = (price: number, avg: number): number => {
    if (avg === 0) return 0;
    return ((price - avg) / avg) * 100;
  };

  const getRowKey = (result: QueryResult): string => {
    return `${result.provider}-${result.chain}`;
  };

  const handleRowClick = (result: QueryResult) => {
    const rowKey = getRowKey(result);
    if (selectedRow === rowKey) {
      onRowSelect(null);
    } else {
      onRowSelect(rowKey);
    }
  };

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredResults.slice(startIndex, startIndex + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredResults.length / pageSize);
  }, [filteredResults.length, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const pageSizeOptions = [10, 20, 50];

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icons.chart />
          {t('priceQuery.results.title')}
        </h2>
        {results.length > 0 && (
          <div className="relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            >
              <Icons.search />
            </div>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('priceQuery.filter.placeholder')}
              aria-label={t('priceQuery.filter.placeholder')}
              className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}
      </div>
      {results.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          {t('priceQuery.results.empty')}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          {t('priceQuery.filter.noResults')}
        </div>
      ) : (
        <>
          {filterText && (
            <div className="mb-3 text-sm text-gray-500">
              {t('priceQuery.filter.results')
                .replace('{count}', filteredResults.length.toString())
                .replace('{total}', results.length.toString())}
            </div>
          )}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div
              className="grid text-sm min-w-[900px]"
              style={{
                gridTemplateColumns:
                  'minmax(140px, 1.2fr) minmax(120px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(100px, 0.8fr) minmax(100px, 0.8fr) minmax(120px, 1fr) minmax(100px, 0.8fr)',
              }}
              role="table"
              aria-label={t('priceQuery.results.title')}
            >
              <div
                className={`text-left py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                  sortField === 'oracle' ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('oracle')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSort('oracle');
                  }
                }}
                tabIndex={0}
                role="columnheader"
                aria-label={`${t('priceQuery.results.table.oracle')}, ${sortField === 'oracle' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.table.oracle')}
                  {sortField === 'oracle' && (
                    <span className="text-gray-900" aria-hidden="true">
                      {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`text-left py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                  sortField === 'blockchain'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('blockchain')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSort('blockchain');
                  }
                }}
                tabIndex={0}
                role="columnheader"
                aria-label={`${t('priceQuery.results.table.blockchain')}, ${sortField === 'blockchain' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.table.blockchain')}
                  {sortField === 'blockchain' && (
                    <span className="text-gray-900" aria-hidden="true">
                      {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`text-right py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                  sortField === 'price' ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('price')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSort('price');
                  }
                }}
                tabIndex={0}
                role="columnheader"
                aria-label={`${t('priceQuery.results.table.price')}, ${sortField === 'price' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('priceQuery.results.table.price')}
                  {sortField === 'price' && (
                    <span className="text-gray-900" aria-hidden="true">
                      {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`text-right py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                  sortField === 'timestamp'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('timestamp')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSort('timestamp');
                  }
                }}
                tabIndex={0}
                role="columnheader"
                aria-label={`${t('priceQuery.results.table.timestamp')}, ${sortField === 'timestamp' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('priceQuery.results.table.timestamp')}
                  {sortField === 'timestamp' && (
                    <span className="text-gray-900" aria-hidden="true">
                      {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50"
                role="columnheader"
              >
                {t('priceQuery.results.table.change24h')}
              </div>
              <div
                className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50"
                role="columnheader"
              >
                {t('priceQuery.results.table.freshness')}
              </div>
              <div
                className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50"
                role="columnheader"
              >
                {t('dataQuality.completenessScore') || '数据质量'}
              </div>
              <div
                className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50"
                role="columnheader"
              >
                {t('priceQuery.results.table.confidence')}
              </div>

              {paginatedResults.map((result) => {
                const deviation = calculateDeviation(result.priceData.price, avgPrice);
                const isHighDeviation = Math.abs(deviation) > DEVIATION_THRESHOLD * 100;
                const change24hPercent = result.priceData.change24hPercent ?? 0;
                const rowKey = getRowKey(result);
                const isSelected = selectedRow === rowKey;

                const historyKey = `${result.provider}-${result.chain}`;
                const history = historicalData[historyKey] || [];
                const dataPoints = history.length;
                const expectedPoints = Math.max(24, dataPoints);
                const completenessScore = calculateCompletenessScore(dataPoints, expectedPoints);

                return (
                  <div
                    key={rowKey}
                    className={`contents cursor-pointer`}
                    onClick={() => handleRowClick(result)}
                    role="row"
                    aria-selected={isSelected}
                  >
                    <div
                      className={`py-3 px-4 border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                      title={
                        isHighDeviation
                          ? `偏差: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: oracleColors[result.provider] }}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-gray-900 truncate">
                          {t(`navbar.${oracleI18nKeys[result.provider]}`)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`py-3 px-4 border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chainColors[result.chain] }}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-gray-900 truncate">
                          {t(`blockchain.${result.chain.toLowerCase()}`)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`py-3 px-4 text-right border-b border-gray-100 font-mono text-gray-900 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          $
                          {result.priceData.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </span>
                        {isHighDeviation && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                              deviation > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {deviation > 0 ? '+' : ''}
                            {deviation.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`py-3 px-4 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      <FreshnessIndicator timestamp={result.priceData.timestamp} />
                    </div>
                    <div
                      className={`py-3 px-4 text-right border-b border-gray-100 font-mono transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      {result.priceData.change24hPercent !== undefined ? (
                        <span className={change24hPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {change24hPercent >= 0 ? '+' : ''}
                          {change24hPercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    <div
                      className={`py-3 px-4 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      <DataQualityBadge score={completenessScore} />
                    </div>
                    <div
                      className={`py-3 px-4 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      <ConfidenceBadge score={result.priceData.confidence} />
                    </div>
                    <div
                      className={`py-3 px-4 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                      role="cell"
                    >
                      {result.priceData.source ? (
                        <span className="inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 truncate max-w-full">
                          {result.priceData.source}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="md:hidden mt-2 text-xs text-gray-400 text-center">
              {t('priceQuery.scrollHint')}
            </div>
          </div>

          {filteredResults.length > 10 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>每页显示</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  aria-label="每页显示数量"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>条</span>
                <span className="ml-4">
                  共 {filteredResults.length} 条，{totalPages} 页
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="上一页"
                >
                  上一页
                </button>

                {getPageNumbers().map((page, index) => (
                  <div key={index}>
                    {page === '...' ? (
                      <span className="px-2 text-gray-400">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                          currentPage === page
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                        aria-label={`第 ${page} 页`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="下一页"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
