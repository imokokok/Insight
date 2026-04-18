'use client';

import { semanticColors } from '@/lib/config/colors';
import { type Blockchain } from '@/types/oracle';

import { chainNames, chainColors } from '../utils';

export interface ChartLegendProps {
  filteredChains: Blockchain[];
  hiddenLines: string[];
  hasScatterData: boolean;
  onLegendClick: (e: { dataKey: string; color: string; type: string; value: string }) => void;
  onLegendDoubleClick?: (chain: Blockchain) => void;
}

export function ChartLegend({
  filteredChains,
  hiddenLines,
  hasScatterData,
  onLegendClick,
  onLegendDoubleClick,
}: ChartLegendProps) {
  return (
    <div className="flex items-center gap-4 mt-2 flex-wrap">
      {filteredChains.map((chain) => {
        const isHidden = hiddenLines.includes(chain);
        return (
          <button
            key={chain}
            onClick={() =>
              onLegendClick({
                dataKey: chain,
                color: chainColors[chain],
                type: 'line',
                value: chainNames[chain],
              })
            }
            onDoubleClick={() => onLegendDoubleClick?.(chain)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              isHidden ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span
              className="w-3 h-0.5 rounded-full"
              style={{ backgroundColor: chainColors[chain] }}
            />
            <span className={isHidden ? 'line-through text-gray-400' : 'text-gray-700'}>
              {chainNames[chain]}
            </span>
          </button>
        );
      })}
      {hasScatterData && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: semanticColors.warning.dark }}
          />
          <span>Anomaly Point</span>
        </div>
      )}
    </div>
  );
}
