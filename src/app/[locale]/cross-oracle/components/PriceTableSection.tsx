'use client';

import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames, type SortColumn, type SortDirection } from '../constants';
import { type PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

import { PriceTable } from './PriceTable';
import RiskAlertBanner from './RiskAlertBanner';

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
  /** 价格异常列表 */
  anomalies?: PriceAnomaly[];
  /** 异常总数 */
  anomalyCount?: number;
  /** 高风险异常数量 */
  highRiskCount?: number;
  /** 中风险异常数量 */
  mediumRiskCount?: number;
  /** 低风险异常数量 */
  lowRiskCount?: number;
  /** 最高偏差值 */
  maxDeviation?: number;
  /** 点击查看异常详情 */
  onViewAnomalyDetails?: () => void;
}

// 风险等级图例组件
function RiskLevelLegend({ t }: { t: (key: string) => string }) {
  const riskLevels = [
    { key: 'normal', label: '正常', colorClass: 'bg-green-500', bgClass: 'bg-green-50' },
    { key: 'low', label: '低风险', colorClass: 'bg-yellow-500', bgClass: 'bg-yellow-50' },
    { key: 'medium', label: '中风险', colorClass: 'bg-orange-500', bgClass: 'bg-orange-50' },
    { key: 'high', label: '高风险', colorClass: 'bg-red-500', bgClass: 'bg-red-50' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="text-gray-500 font-medium">
        {t('crossOracle.riskLevelLegend')}
      </span>
      {riskLevels.map((level) => (
        <div key={level.key} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${level.colorClass}`} />
          <span className="text-gray-600">{level.label}</span>
        </div>
      ))}
    </div>
  );
}

// 偏差率颜色说明组件
function DeviationLegend({ t }: { t: (key: string) => string }) {
  const deviationLevels = [
    { range: '<0.1%', label: '优秀', colorClass: 'text-green-600 bg-green-50 border-green-200' },
    {
      range: '0.1-0.5%',
      label: '良好',
      colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    },
    {
      range: '0.5-1%',
      label: '警告',
      colorClass: 'text-orange-600 bg-orange-50 border-orange-200',
    },
    { range: '>1%', label: '危险', colorClass: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500 font-medium">
        {t('crossOracle.deviationLegend')}
      </span>
      {deviationLevels.map((level) => (
        <span
          key={level.range}
          className={`inline-flex items-center px-1.5 py-0.5 rounded border ${level.colorClass}`}
        >
          {level.range}
        </span>
      ))}
    </div>
  );
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
  anomalies = [],
  anomalyCount = 0,
  highRiskCount = 0,
  mediumRiskCount = 0,
  lowRiskCount = 0,
  maxDeviation = 0,
  onViewAnomalyDetails,
}: PriceTableSectionProps) {
  return (
    <>
      {/* Risk Alert Banner - 显示价格异常预警 */}
      <RiskAlertBanner
        anomalies={anomalies}
        count={anomalyCount}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
        lowRiskCount={lowRiskCount}
        maxDeviation={maxDeviation}
        onViewDetails={onViewAnomalyDetails}
        t={t}
      />

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

      {/* Risk Level Legend - 风险等级图例 */}
      <div className="py-3 px-4 bg-gray-50/50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <RiskLevelLegend t={t} />
          <div className="hidden sm:block w-px h-4 bg-gray-300" />
          <DeviationLegend t={t} />
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
