'use client';

import { ChainSelector } from '@/components/oracle/ChainSelector';
import { ChainCoverageHeatmap } from '@/components/oracle/charts/ChainCoverageHeatmap';

interface ChainsTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ChainsTab({ t }: ChainsTabProps) {
  return (
    <>
      {/* 链覆盖热力图 */}
      <div className="mb-6">
        <ChainCoverageHeatmap
          showLabels={true}
          onCellClick={() => {
          }}
        />
      </div>

      {/* 链选择器示例 */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('crossOracle.chainsTab.chainSelector')}
        </h3>
        <div className="max-w-md">
          <ChainSelector
            selectedChains={[]}
            onChainsChange={() => {
            }}
            allowMultiSelect={true}
            showOracleCount={true}
            placeholder={t('crossOracle.chainsTab.selectChains')}
          />
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {t('crossOracle.chainsTab.chainSelectorDescription')}
        </p>
      </div>
    </>
  );
}
