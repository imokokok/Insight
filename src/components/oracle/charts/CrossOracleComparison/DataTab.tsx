'use client';

import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import { PriceComparisonData, DeviationData, OraclePerformance } from './crossOracleConfig';
import { CollapsiblePanel } from './CollapsiblePanel';
import { PriceComparisonTable } from './PriceComparisonTable';
import { DeviationTable } from './DeviationTable';
import { PerformanceTable } from './PerformanceTable';

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
  getSortIcon: (field: 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name') => React.ReactNode;
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
    <div className="space-y-4">
      {/* 价格对比表格 - 默认展开 */}
      <div className="bg-gray-50 border border-gray-100">
        <CollapsiblePanel
          title={t('crossOracle.priceComparisonTable')}
          defaultExpanded={true}
          storageKey="price-comparison-table"
          contentClassName="py-2 px-4"
          headerClassName="px-4"
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
      <div className="bg-gray-50 border border-gray-100">
        <CollapsiblePanel
          title={t('crossOracle.deviationAnalysis')}
          defaultExpanded={true}
          storageKey="deviation-table"
          contentClassName="py-2 px-4"
          headerClassName="px-4"
        >
          <DeviationTable deviationData={deviationData} />
        </CollapsiblePanel>
      </div>

      {/* 性能对比表格 - 默认折叠 */}
      <div className="bg-gray-50 border border-gray-100">
        <CollapsiblePanel
          title={t('crossOracle.performanceComparison')}
          defaultExpanded={false}
          storageKey="performance-table"
          contentClassName="py-2 px-4"
          headerClassName="px-4"
        >
          <PerformanceTable performanceData={performanceData} selectedOracles={selectedOracles} />
        </CollapsiblePanel>
      </div>
    </div>
  );
}
