'use client';

import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';

import { useStatistics } from '../hooks/useStatistics';
import { useCurrentClient, useFilteredChains } from '../useCrossChainData';

export function ChartsTab() {
  const filteredChains = useFilteredChains();
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const currentClient = useCurrentClient();

  const statistics = useStatistics({
    currentPrices,
    filteredChains,
    currentClient,
  });

  const { avgPrice, medianPrice, standardDeviation } = statistics;

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold mb-4" style={{ color: baseColors.gray[900] }}>
        Price Statistics
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: baseColors.gray[50] }}>
          <div className="text-xs" style={{ color: baseColors.gray[500] }}>
            Average Price
          </div>
          <div className="text-lg font-semibold" style={{ color: baseColors.primary[500] }}>
            ${avgPrice.toFixed(4)}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: baseColors.gray[50] }}>
          <div className="text-xs" style={{ color: baseColors.gray[500] }}>
            Median Price
          </div>
          <div className="text-lg font-semibold" style={{ color: semanticColors.success.main }}>
            ${medianPrice.toFixed(4)}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: baseColors.gray[50] }}>
          <div className="text-xs" style={{ color: baseColors.gray[500] }}>
            Standard Deviation
          </div>
          <div className="text-lg font-semibold" style={{ color: chartColors.recharts.purple }}>
            ${standardDeviation.toFixed(4)}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm" style={{ color: baseColors.gray[500] }}>
        Historical price charts have been removed. This view now shows current price statistics
        only.
      </p>
    </div>
  );
}
