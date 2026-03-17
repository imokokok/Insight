'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden min-w-[24px]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${config.bgColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold w-6 text-right" style={{ color: config.color }}>
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
  const t = useTranslations();
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 表头 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icons.chart className="w-4 h-4" />
          {t('priceQuery.results.title')}
          <span className="text-xs font-normal text-gray-500">({filteredResults.length})</span>
        </h2>
        {results.length > 0 && (
          <div className="relative">
            <div
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            >
              <Icons.search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('priceQuery.filter.placeholder')}
              className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        )}
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
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
            <div
              className="grid text-xs min-w-[700px]"
              style={{
                gridTemplateColumns:
                  'minmax(100px, 1fr) minmax(90px, 1fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(70px, 0.7fr) minmax(80px, 0.8fr) minmax(70px, 0.7fr)',
              }}
              role="table"
            >
              {/* 表头 */}
              <div
                className={`text-left py-2.5 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none ${
                  sortField === 'oracle' ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('oracle')}
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.table.oracle')}
                  {sortField === 'oracle' && (
                    <span className="text-gray-900">
                      {sortDirection === 'asc' ? <Icons.arrowUp className="w-3 h-3" /> : <Icons.arrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`text-left py-2.5 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none ${
                  sortField === 'blockchain' ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('blockchain')}
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.table.blockchain')}
                  {sortField === 'blockchain' && (
                    <span className="text-gray-900">
                      {sortDirection === 'asc' ? <Icons.arrowUp className="w-3 h-3" /> : <Icons.arrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`text-right py-2.5 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none ${
                  sortField === 'price' ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-700'
                }`}
                onClick={() => onSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('priceQuery.results.table.price')}
                  {sortField === 'price' && (
                    <span className="text-gray-900">
                      {sortDirection === 'asc' ? <Icons.arrowUp className="w-3 h-3" /> : <Icons.arrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="text-right py-2.5 px-3 font-semibold text-gray-700 bg-gray-50"
              >
                {t('priceQuery.results.table.change24h')}
              </div>
              <div
                className="text-right py-2.5 px-3 font-semibold text-gray-700 bg-gray-50"
              >
                {t('priceQuery.results.table.freshness')}
              </div>
              <div
                className="text-right py-2.5 px-3 font-semibold text-gray-700 bg-gray-50"
              >
                {t('dataQuality.completenessScore') || '质量'}
              </div>
              <div
                className="text-right py-2.5 px-3 font-semibold text-gray-700 bg-gray-50"
              >
                {t('priceQuery.results.table.confidence')}
              </div>

              {/* 数据行 */}
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
                    className="contents cursor-pointer"
                    onClick={() => handleRowClick(result)}
                    role="row"
                    aria-selected={isSelected}
                  >
                    <div
                      className={`py-2.5 px-3 border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: oracleColors[result.provider] }}
                        />
                        <span className="font-medium text-gray-900 truncate text-xs">
                          {t(`navbar.${oracleI18nKeys[result.provider]}`)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`py-2.5 px-3 border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chainColors[result.chain] }}
                        />
                        <span className="font-medium text-gray-900 truncate text-xs">
                          {t(`blockchain.${result.chain.toLowerCase()}`)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`py-2.5 px-3 text-right border-b border-gray-100 font-mono text-gray-900 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs">
                          $
                          {result.priceData.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </span>
                        {isHighDeviation && (
                          <span
                            className={`text-[10px] px-1 py-0.5 rounded flex-shrink-0 ${
                              deviation > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {deviation > 0 ? '+' : ''}
                            {deviation.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`py-2.5 px-3 text-right border-b border-gray-100 font-mono transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      {result.priceData.change24hPercent !== undefined ? (
                        <span className={change24hPercent >= 0 ? 'text-green-600 text-xs' : 'text-red-600 text-xs'}>
                          {change24hPercent >= 0 ? '+' : ''}
                          {change24hPercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                    <div
                      className={`py-2.5 px-3 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <FreshnessIndicator timestamp={result.priceData.timestamp} />
                    </div>
                    <div
                      className={`py-2.5 px-3 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <DataQualityBadge score={completenessScore} />
                    </div>
                    <div
                      className={`py-2.5 px-3 text-right border-b border-gray-100 transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-100'
                          : isHighDeviation
                            ? 'bg-amber-50/50 hover:bg-blue-50/60'
                            : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <ConfidenceBadge score={result.priceData.confidence} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 分页 */}
      {filteredResults.length > 10 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>条</span>
            <span className="ml-2 text-gray-500">
              共 {filteredResults.length} 条
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
            >
              上一页
            </button>

            {getPageNumbers().map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-1.5 text-gray-400 text-xs">...</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(page as number)}
                    className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                      currentPage === page
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-300 hover:bg-white bg-white'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
