'use client';

import { useTranslations } from '@/i18n';
import { type OracleProvider } from '@/types/oracle';

import { CollapsiblePanel } from './CollapsiblePanel';
import {
  type PriceComparisonData,
  type DeviationData,
  type OraclePerformance,
} from './crossOracleConfig';
import { DeviationTable } from './DeviationTable';
import { PerformanceTable } from './PerformanceTable';
import { PriceComparisonTable } from './PriceComparisonTable';

interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  median: number;
}

interface DataTabProps {
  sortedPriceData: PriceComparisonData[];
  priceStats: PriceStats | null;
  deviationData: DeviationData[];
  performanceData: OraclePerformance[];
  selectedOracles: OracleProvider[];
  handleSort: (field: 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name') => void;
  getSortIcon: (
    field: 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name'
  ) => React.ReactNode;
}

export function DataTab({
  sortedPriceData,
  priceStats,
  deviationData,
  performanceData,
  selectedOracles,
  handleSort,
  getSortIcon,
}: DataTabProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* 价格对比表格 - 默认展开 */}
      <div className="bg-slate-50/30">
        <CollapsiblePanel
          title={t('crossOracle.priceComparisonTable')}
          defaultExpanded={true}
          storageKey="price-comparison-table"
          contentClassName="py-2 px-5"
          headerClassName="px-5"
        >
          <PriceComparisonTable
            sortedPriceData={sortedPriceData}
            priceStats={priceStats}
            deviationData={deviationData}
            handleSort={handleSort}
            getSortIcon={getSortIcon}
          />
        </CollapsiblePanel>
      </div>

      {/* 偏差分析表格 - 默认展开 */}
      <div className="bg-slate-50/30">
        <CollapsiblePanel
          title={t('crossOracle.deviationAnalysis')}
          defaultExpanded={true}
          storageKey="deviation-table"
          contentClassName="py-2 px-5"
          headerClassName="px-5"
        >
          <DeviationTable deviationData={deviationData} />
        </CollapsiblePanel>
      </div>

      {/* 性能对比表格 - 默认折叠 */}
      <div className="bg-slate-50/30">
        <CollapsiblePanel
          title={t('crossOracle.performanceComparison')}
          defaultExpanded={false}
          storageKey="performance-table"
          contentClassName="py-2 px-5"
          headerClassName="px-5"
        >
          <PerformanceTable performanceData={performanceData} selectedOracles={selectedOracles} />
        </CollapsiblePanel>
      </div>
    </div>
  );
}
