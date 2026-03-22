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
  onHoverOracle,
  onToggleOracle,
  t,
}: PriceTableSectionProps) {
  return (
    <>
      {/* Compact header with title and oracle badges */}
      <div className="py-2 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.currentPriceComparison')}
          </h3>
          {/* Compact oracle badges - visual indicator only */}
          <div className="flex flex-wrap items-center gap-1">
            {getOracleProvidersSortedByMarketCap()
              .filter((oracle) => selectedOracles.includes(oracle))
              .map((oracle) => (
                <button
                  key={oracle}
                  onClick={() => onToggleOracle(oracle)}
                  onMouseEnter={() => onHoverOracle(oracle)}
                  onMouseLeave={() => onHoverOracle(null)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  title={oracleNames[oracle]}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: oracleChartColors[oracle] }}
                  />
                  <span className="truncate max-w-[80px]">{oracleNames[oracle]}</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Price Table */}
      <div className="py-2">
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
          onHoverOracle={onHoverOracle}
          t={t}
        />
      </div>
    </>
  );
}
