'use client';

import React from 'react';
import { OracleProvider, PriceData } from '@/types/oracle';
import { oracleNames, SortColumn, SortDirection } from '../constants';
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
  selectedOracles: OracleProvider[];
  oracleChartColors: Record<OracleProvider, string>;
  onSort: (column: SortColumn) => void;
  onExpandRow: (index: number | null) => void;
  onSetHoveredRow: (index: number | null) => void;
  onSetSelectedRow: (index: number | null) => void;
  onHoverOracle: (oracle: OracleProvider | null) => void;
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
  selectedOracles,
  oracleChartColors,
  onSort,
  onExpandRow,
  onSetHoveredRow,
  onSetSelectedRow,
  onHoverOracle,
  onToggleOracle,
  t,
}: PriceTableSectionProps) {
  return (
    <>
      <div className="py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.currentPriceComparison')}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {getOracleProvidersSortedByMarketCap().map((oracle) => (
            <button
              key={oracle}
              onClick={() => onToggleOracle(oracle)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
                selectedOracles.includes(oracle)
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
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

      <div className="py-4">
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
