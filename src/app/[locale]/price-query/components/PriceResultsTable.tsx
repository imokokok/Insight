'use client';

/**
 * @fileoverview 价格结果表格组件
 * @description 展示价格查询结果的表格，支持排序、筛选和选中
 */

import { useMemo, useState } from 'react';
import { useTranslations } from '@/i18n';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { QueryResult, PriceData, oracleI18nKeys } from '../constants';
import { OracleProvider, Blockchain } from '@/lib/oracles';

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
  onRowSelect: (row: string | null) => void;
  historicalData: Partial<Record<string, PriceData[]>>;
  filterInputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * 价格结果表格组件
 *
 * @param props - 组件属性
 * @returns 价格结果表格 JSX 元素
 */
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
  historicalData: _historicalData,
  filterInputRef,
}: PriceResultsTableProps) {
  const t = useTranslations();
  const [showFilters, setShowFilters] = useState(false);

  // 获取排序图标
  const getSortIcon = (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
    );
  };

  // 计算价格偏差
  const getPriceDeviation = (price: number): { value: string; color: string } => {
    if (avgPrice === 0) return { value: '-', color: 'text-gray-400' };
    const deviation = ((price - avgPrice) / avgPrice) * 100;
    const formatted = deviation >= 0 ? `+${deviation.toFixed(2)}%` : `${deviation.toFixed(2)}%`;
    if (Math.abs(deviation) < 0.1) return { value: formatted, color: 'text-success-600' };
    if (Math.abs(deviation) < 0.5) return { value: formatted, color: 'text-warning-600' };
    return { value: formatted, color: 'text-danger-600' };
  };

  // 格式化时间
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取行唯一标识
  const getRowKey = (result: QueryResult): string => {
    return `${result.provider}-${result.chain}-${result.priceData.timestamp}`;
  };

  // 处理行点击
  const handleRowClick = (result: QueryResult) => {
    const key = getRowKey(result);
    onRowSelect(selectedRow === key ? null : key);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 表格头部 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('priceQuery.results.title')}</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
            {filteredResults.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              showFilters
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
            }`}
            aria-expanded={showFilters}
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            {t('filter')}
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      {showFilters && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              ref={filterInputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('priceQuery.results.filterPlaceholder')}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={t('clear')}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('oracle')}
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.oracle')}
                  {getSortIcon('oracle')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('blockchain')}
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.blockchain')}
                  {getSortIcon('blockchain')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('priceQuery.results.price')}
                  {getSortIcon('price')}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('priceQuery.results.deviation')}
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('timestamp')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('priceQuery.results.timestamp')}
                  {getSortIcon('timestamp')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  {t('priceQuery.results.noMatchingData')}
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => {
                const rowKey = getRowKey(result);
                const isSelected = selectedRow === rowKey;
                const deviation = getPriceDeviation(result.priceData.price);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => handleRowClick(result)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-50 hover:bg-primary-100'
                        : 'hover:bg-gray-50'
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleRowClick(result);
                      }
                    }}
                    aria-pressed={isSelected}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            result.provider === 'chainlink'
                              ? 'bg-blue-500'
                              : result.provider === 'pyth'
                                ? 'bg-emerald-500'
                                : result.provider === 'band-protocol'
                                  ? 'bg-amber-500'
                                  : result.provider === 'api3'
                                    ? 'bg-violet-500'
                                    : result.provider === 'uma'
                                      ? 'bg-red-500'
                                      : result.provider === 'redstone'
                                        ? 'bg-cyan-500'
                                        : result.provider === 'dia'
                                          ? 'bg-orange-500'
                                          : result.provider === 'tellor'
                                            ? 'bg-pink-500'
                                            : result.provider === 'chronicle'
                                              ? 'bg-indigo-500'
                                              : 'bg-gray-500'
                          }`}
                        />
                        <span className="font-medium text-gray-900">
                          {t(`navbar.${oracleI18nKeys[result.provider]}`)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {t(`blockchain.${result.chain.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium font-tabular text-gray-900">
                        ${result.priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${deviation.color}`}>
                        {deviation.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(result.priceData.timestamp)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 表格底部信息 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
        <span>
          {t('priceQuery.results.showing', {
            count: filteredResults.length,
            total: results.length,
          })}
        </span>
        {filterText && (
          <button
            onClick={() => setFilterText('')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>
    </div>
  );
}
