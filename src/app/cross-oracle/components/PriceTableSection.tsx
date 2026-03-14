'use client';

import React from 'react';
import { OracleProvider, PriceData } from '@/types/oracle';
import { oracleNames, symbols, SortColumn, SortDirection } from '../constants';
import { PriceTable } from './PriceTable';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';

interface PriceTableSectionProps {
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
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  oracleChartColors: Record<OracleProvider, string>;
  onSort: (column: SortColumn) => void;
  onExpandRow: (index: number | null) => void;
  onSetHoveredRow: (index: number | null) => void;
  onSetSelectedRow: (index: number | null) => void;
  onHoverOracle: (oracle: OracleProvider | null) => void;
  onSymbolChange: (symbol: string) => void;
  onToggleOracle: (oracle: OracleProvider) => void;
  t: (key: string) => string;
}

export function PriceTableSection({
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
  selectedSymbol,
  selectedOracles,
  oracleChartColors,
  onSort,
  onExpandRow,
  onSetHoveredRow,
  onSetSelectedRow,
  onHoverOracle,
  onSymbolChange,
  onToggleOracle,
  t,
}: PriceTableSectionProps) {
  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('crossOracle.currentPriceComparison')}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">交易对:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {getOracleProvidersSortedByMarketCap().map((oracle) => (
            <button
              key={oracle}
              onClick={() => onToggleOracle(oracle)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedOracles.includes(oracle)
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: oracleChartColors[oracle] }}
              />
              {oracleNames[oracle]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <PriceTable
          priceData={priceData}
          filteredPriceData={filteredPriceData}
          isLoading={isLoading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          expandedRow={expandedRow}
          selectedRowIndex={selectedRowIndex}
          hoveredRowIndex={hoveredRowIndex}
          chartColors={chartColors}
          avgPrice={avgPrice}
          standardDeviation={standardDeviation}
          validPrices={validPrices}
          onSort={onSort}
          onExpandRow={onExpandRow}
          onSetHoveredRow={onSetHoveredRow}
          onSetSelectedRow={onSetSelectedRow}
          onHoverOracle={onHoverOracle}
          t={t}
        />
      </div>
    </>
  );
}
