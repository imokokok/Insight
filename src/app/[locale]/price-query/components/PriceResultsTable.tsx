'use client';

import { useState } from 'react';

import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Wifi,
  Database,
  Cloud,
  AlertCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { OracleProvider } from '@/lib/oracles';

import { type QueryResult, type PriceData, oracleI18nKeys } from '../constants';

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
  const [sortAnnouncement, setSortAnnouncement] = useState<string>('');

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

  const getAriaSort = (
    field: 'oracle' | 'blockchain' | 'price' | 'timestamp'
  ): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const handleSort = (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => {
    onSort(field);
    const fieldName = t(`priceQuery.results.${field}`);
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    const directionText =
      newDirection === 'asc'
        ? t('priceQuery.results.sortAscending')
        : t('priceQuery.results.sortDescending');
    setSortAnnouncement(`${fieldName} ${directionText}`);
  };

  // 计算价格偏差
  const getPriceDeviation = (
    price: number
  ): {
    value: string;
    textColor: string;
    bgColor: string;
    indicatorColor: string;
  } => {
    if (avgPrice === 0) {
      return {
        value: '-',
        textColor: 'text-gray-400',
        bgColor: '',
        indicatorColor: '',
      };
    }
    const deviation = ((price - avgPrice) / avgPrice) * 100;
    const formatted = deviation >= 0 ? `+${deviation.toFixed(2)}%` : `${deviation.toFixed(2)}%`;
    const absDeviation = Math.abs(deviation);

    if (absDeviation < 0.1) {
      return {
        value: formatted,
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50/60',
        indicatorColor: 'border-l-emerald-500',
      };
    }
    if (absDeviation < 0.5) {
      return {
        value: formatted,
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50/60',
        indicatorColor: 'border-l-amber-500',
      };
    }
    return {
      value: formatted,
      textColor: 'text-red-600',
      bgColor: 'bg-red-50/60',
      indicatorColor: 'border-l-red-500',
    };
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

  // 获取数据来源配置
  const getDataSourceConfig = (dataSource?: 'real' | 'mock' | 'api' | 'fallback') => {
    switch (dataSource) {
      case 'real':
        return {
          label: t('priceQuery.results.dataSources.real'),
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          icon: <Wifi className="w-3 h-3" aria-hidden="true" />,
        };
      case 'mock':
        return {
          label: t('priceQuery.results.dataSources.mock'),
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Database className="w-3 h-3" aria-hidden="true" />,
        };
      case 'api':
        return {
          label: t('priceQuery.results.dataSources.api'),
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: <Cloud className="w-3 h-3" aria-hidden="true" />,
        };
      case 'fallback':
        return {
          label: t('priceQuery.results.dataSources.fallback'),
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: <AlertCircle className="w-3 h-3" aria-hidden="true" />,
        };
      default:
        return {
          label: t('priceQuery.results.dataSources.mock'),
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Database className="w-3 h-3" aria-hidden="true" />,
        };
    }
  };

  // 获取预言机特性标签
  const getOracleFeature = (provider: OracleProvider): string | null => {
    const featureKey = provider.toLowerCase().replace('_', '');
    const key = `priceQuery.results.oracleFeatures.${featureKey}`;
    const translation = t(key);
    // 如果翻译返回的是 key 本身，说明没有对应的翻译
    if (translation === key) {
      return null;
    }
    return translation;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {sortAnnouncement}
      </div>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('priceQuery.results.title')}</h3>
          <span
            className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full"
            aria-label={`${filteredResults.length} ${t('priceQuery.results.resultsCount')}`}
          >
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
            aria-controls="filter-panel"
            aria-label={
              showFilters
                ? t('priceQuery.results.hideFilters')
                : t('priceQuery.results.showFilters')
            }
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            {t('filter')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div id="filter-panel" className="px-4 py-3 bg-gray-50 border-b border-gray-200">
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
              aria-label={t('priceQuery.results.filterLabel')}
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

      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          role="grid"
          aria-label={t('priceQuery.results.tableLabel')}
        >
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                scope="col"
                aria-sort={getAriaSort('oracle')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('oracle')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSort('oracle');
                  }
                }}
                tabIndex={0}
                role="columnheader"
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.oracle')}
                  {getSortIcon('oracle')}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={getAriaSort('blockchain')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('blockchain')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSort('blockchain');
                  }
                }}
                tabIndex={0}
                role="columnheader"
              >
                <div className="flex items-center gap-1">
                  {t('priceQuery.results.blockchain')}
                  {getSortIcon('blockchain')}
                </div>
              </th>
              <th
                scope="col"
                aria-sort={getAriaSort('price')}
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('price')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSort('price');
                  }
                }}
                tabIndex={0}
                role="columnheader"
              >
                <div className="flex items-center justify-end gap-1">
                  {t('priceQuery.results.price')}
                  {getSortIcon('price')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                role="columnheader"
              >
                {t('priceQuery.results.dataSource')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                role="columnheader"
              >
                {t('priceQuery.results.deviation')}
              </th>
              <th
                scope="col"
                aria-sort={getAriaSort('timestamp')}
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('timestamp')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSort('timestamp');
                  }
                }}
                tabIndex={0}
                role="columnheader"
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  {t('priceQuery.results.noMatchingData')}
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => {
                const rowKey = getRowKey(result);
                const isSelected = selectedRow === rowKey;
                const deviation = getPriceDeviation(result.priceData.price);
                const dataSourceConfig = getDataSourceConfig(result.priceData.dataSource);
                const oracleFeature = getOracleFeature(result.provider);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => handleRowClick(result)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-50 hover:bg-primary-100' : 'hover:bg-gray-50'
                    }`}
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(result);
                      }
                    }}
                    aria-selected={isSelected}
                  >
                    <td className="px-4 py-3" role="gridcell">
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
                          aria-hidden="true"
                        />
                        <span className="font-medium text-gray-900">
                          {t(`navbar.${oracleI18nKeys[result.provider]}`)}
                        </span>
                        {oracleFeature && (
                          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded">
                            {oracleFeature}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" role="gridcell">
                      <span className="text-gray-700">
                        {t(`blockchain.${result.chain.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" role="gridcell">
                      <span className="font-medium font-tabular text-gray-900">
                        $
                        {result.priceData.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3" role="gridcell">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${dataSourceConfig.color}`}
                          title={dataSourceConfig.label}
                        >
                          {dataSourceConfig.icon}
                          <span className="hidden sm:inline">{dataSourceConfig.label}</span>
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 text-right relative border-l-[3px] ${deviation.indicatorColor} ${
                        !isSelected && deviation.bgColor ? deviation.bgColor : ''
                      }`}
                      role="gridcell"
                    >
                      <span className={`text-xs font-medium ${deviation.textColor}`}>
                        {deviation.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" role="gridcell">
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

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
        <span aria-live="polite">
          {t('priceQuery.results.showing', {
            filtered: filteredResults.length,
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
