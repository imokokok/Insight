'use client';

import { useI18n } from '@/lib/i18n/provider';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, getCorrelationColor } from '../utils';

interface CorrelationMatrixProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  const { t } = useI18n();
  const { filteredChains, correlationMatrixWithSignificance } = data;

  // Calculate average sample size for display
  const sampleSizes: number[] = [];
  filteredChains.forEach((chainX) => {
    filteredChains.forEach((chainY) => {
      const result = correlationMatrixWithSignificance[chainX]?.[chainY];
      if (result && result.sampleSize > 0) {
        sampleSizes.push(result.sampleSize);
      }
    });
  });
  const avgSampleSize =
    sampleSizes.length > 0
      ? Math.round(sampleSizes.reduce((a, b) => a + b, 0) / sampleSizes.length)
      : 0;

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
          链间相关性分析
        </h3>
        {avgSampleSize > 0 && (
          <span className="text-xs text-gray-500">样本量 n = {avgSampleSize}</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Pearson 相关系数衡量两条链价格走势的线性相关程度。r = 1 表示完全正相关，r = -1
        表示完全负相关，r = 0 表示无线性相关。显著性标记: *** p&lt;0.001, ** p&lt;0.01, * p&lt;0.05
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
                const result = correlationMatrixWithSignificance[chainX]?.[chainY];
                const correlation = result?.correlation ?? 0;
                const significanceLevel = result?.significanceLevel ?? '';
                const pValue = result?.pValue ?? 1;
                const sampleSize = result?.sampleSize ?? 0;
                const bgColor = getCorrelationColor(correlation);
                const textColor = Math.abs(correlation) > 0.5 ? 'text-white' : 'text-gray-900';

                return (
                  <div
                    key={`${chainX}-${chainY}`}
                    className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-transform hover:scale-105 relative"
                    style={{ backgroundColor: bgColor }}
                    title={`${chainNames[chainX]} vs ${chainNames[chainY]}: r = ${correlation.toFixed(4)}, p = ${pValue.toFixed(4)}, n = ${sampleSize}`}
                  >
                    <span className={`text-xs font-medium ${textColor}`}>
                      {correlation.toFixed(2)}
                    </span>
                    {significanceLevel && (
                      <span
                        className={`absolute top-0.5 right-0.5 text-[8px] font-bold ${
                          Math.abs(correlation) > 0.5 ? 'text-white/80' : 'text-gray-600'
                        }`}
                      >
                        {significanceLevel}
                      </span>
                    )}
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
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-gray-500">显著性:</span>
              <span className="text-[10px] font-bold text-gray-700">*** p&lt;0.001</span>
              <span className="text-[10px] font-bold text-gray-700">** p&lt;0.01</span>
              <span className="text-[10px] font-bold text-gray-700">* p&lt;0.05</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
