'use client';

import { useI18n } from '@/lib/i18n/context';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors, getCorrelationColor } from '../utils';

interface CorrelationMatrixProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  const { t } = useI18n();
  const { filteredChains, correlationMatrix } = data;

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
        链间相关性分析
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Pearson 相关系数衡量两条链价格走势的线性相关程度。r = 1 表示完全正相关，r = -1
        表示完全负相关，r = 0 表示无线性相关。
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="flex">
            <div className="w-24 shrink-0" />
            {filteredChains.map((chain) => (
              <div key={chain} className="flex-1 min-w-20 text-center px-1 py-2">
                <span className="text-xs font-medium text-gray-600">{chainNames[chain]}</span>
              </div>
            ))}
          </div>
          {filteredChains.map((chainX) => (
            <div key={chainX} className="flex">
              <div className="w-24 shrink-0 flex items-center py-1">
                <span className="text-xs font-medium text-gray-600">{chainNames[chainX]}</span>
              </div>
              {filteredChains.map((chainY) => {
                const correlation = correlationMatrix[chainX]?.[chainY] ?? 0;
                const bgColor = getCorrelationColor(correlation);
                const textColor = Math.abs(correlation) > 0.5 ? 'text-white' : 'text-gray-900';

                return (
                  <div
                    key={`${chainX}-${chainY}`}
                    className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: bgColor }}
                    title={`${chainNames[chainX]} vs ${chainNames[chainY]}: r = ${correlation.toFixed(4)}`}
                  >
                    <span className={`text-xs font-medium ${textColor}`}>
                      {correlation.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">负相关</span>
              <div
                className="w-32 h-3"
                style={{ background: 'linear-gradient(to right, #dc2626, #ffffff, #1e40af)' }}
              />
              <span className="text-xs text-gray-500">正相关</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
