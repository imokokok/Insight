'use client';

import { useI18n } from '@/lib/i18n/context';
import { Icons } from './Icons';
import { OracleProvider } from '@/lib/oracles';
import {
  QueryResult,
  oracleColors,
  chainColors,
  providerNames,
  chainNames,
  DEVIATION_THRESHOLD,
} from '../constants';

interface PriceResultsTableProps {
  results: QueryResult[];
  filteredResults: QueryResult[];
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  avgPrice: number;
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
}: PriceResultsTableProps) {
  const { t } = useI18n();

  const calculateDeviation = (price: number, avg: number): number => {
    if (avg === 0) return 0;
    return ((price - avg) / avg) * 100;
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
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              role="table"
              aria-label={t('priceQuery.results.title')}
            >
              <thead>
                <tr className="border-b border-gray-200">
                  <th
                    scope="col"
                    onClick={() => onSort('oracle')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSort('oracle');
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${t('priceQuery.results.table.oracle')}, ${sortField === 'oracle' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                    className={`text-left py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                      sortField === 'oracle'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {t('priceQuery.results.table.oracle')}
                      {sortField === 'oracle' && (
                        <span className="text-gray-900" aria-hidden="true">
                          {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => onSort('blockchain')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSort('blockchain');
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${t('priceQuery.results.table.blockchain')}, ${sortField === 'blockchain' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                    className={`text-left py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                      sortField === 'blockchain'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {t('priceQuery.results.table.blockchain')}
                      {sortField === 'blockchain' && (
                        <span className="text-gray-900" aria-hidden="true">
                          {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => onSort('price')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSort('price');
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${t('priceQuery.results.table.price')}, ${sortField === 'price' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                    className={`text-right py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                      sortField === 'price'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('priceQuery.results.table.price')}
                      {sortField === 'price' && (
                        <span className="text-gray-900" aria-hidden="true">
                          {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => onSort('timestamp')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSort('timestamp');
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${t('priceQuery.results.table.timestamp')}, ${sortField === 'timestamp' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                    className={`text-right py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                      sortField === 'timestamp'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('priceQuery.results.table.timestamp')}
                      {sortField === 'timestamp' && (
                        <span className="text-gray-900" aria-hidden="true">
                          {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50"
                  >
                    {t('priceQuery.results.table.source')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResults.map((result) => {
                  const deviation = calculateDeviation(result.priceData.price, avgPrice);
                  const isHighDeviation = Math.abs(deviation) > DEVIATION_THRESHOLD * 100;

                  return (
                    <tr
                      key={`${result.provider}-${result.chain}`}
                      className={`hover:bg-gray-50 transition-colors ${
                        isHighDeviation ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: oracleColors[result.provider] }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-gray-900">
                            {t(`navbar.${result.provider.toLowerCase()}`)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: chainColors[result.chain] }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-gray-900">
                            {t(`blockchain.${result.chain.toLowerCase()}`)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
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
                              className={`text-xs px-1.5 py-0.5 rounded ${
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
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {new Date(result.priceData.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {result.priceData.source ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100">
                            {result.priceData.source}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="md:hidden mt-2 text-xs text-gray-400 text-center">
              {t('priceQuery.scrollHint')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
