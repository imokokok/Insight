'use client';

import { useI18n } from '@/lib/i18n/provider';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, getCorrelationColor } from '../utils';
import { useColorblindMode } from '@/stores/crossChainStore';
import {
  getColorblindCorrelationColor,
  getCorrelationSizeScale,
  colorblindLegendConfig,
} from '../colorblindTheme';

interface CorrelationMatrixProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  const colorblindMode = useColorblindMode();
  const { filteredChains, correlationMatrixWithSignificance } = data;

  // 根据色盲模式选择颜色函数
  const getCorrelationColorFn = colorblindMode
    ? getColorblindCorrelationColor
    : getCorrelationColor;

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
                const bgColor = getCorrelationColorFn(correlation);
                const textColor = Math.abs(correlation) > 0.5 ? 'text-white' : 'text-gray-900';

                // 色盲模式下使用形状大小编码
                const sizeScale = colorblindMode ? getCorrelationSizeScale(correlation) : 1;
                const cellSize = colorblindMode
                  ? {
                      width: `${sizeScale * 100}%`,
                      height: `${sizeScale * 100}%`,
                    }
                  : {};

                return (
                  <div
                    key={`${chainX}-${chainY}`}
                    className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-transform hover:scale-105 relative"
                    style={{ backgroundColor: bgColor }}
                    title={`${chainNames[chainX]} vs ${chainNames[chainY]}: r = ${correlation.toFixed(4)}, p = ${pValue.toFixed(4)}, n = ${sampleSize}`}
                  >
                    <span className={`text-xs font-medium ${textColor}`} style={cellSize}>
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
                    {/* 色盲模式下添加形状指示器 */}
                    {colorblindMode && (
                      <div
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gray-800/20"
                        style={{
                          width: `${4 + Math.abs(correlation) * 8}px`,
                          height: `${4 + Math.abs(correlation) * 8}px`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {colorblindMode ? colorblindLegendConfig.correlation.negativeLabel : '负相关'}
              </span>
              <div
                className="w-32 h-3"
                style={{
                  background: colorblindMode
                    ? `linear-gradient(to right, ${colorblindLegendConfig.correlation.negativeColor}, #ffffff, ${colorblindLegendConfig.correlation.positiveColor})`
                    : 'linear-gradient(to right, #dc2626, #ffffff, #1e40af)',
                }}
              />
              <span className="text-xs text-gray-500">
                {colorblindMode ? colorblindLegendConfig.correlation.positiveLabel : '正相关'}
              </span>
            </div>
            {/* 色盲模式下图例说明 */}
            {colorblindMode && (
              <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                圆点大小表示相关性强弱
              </div>
            )}
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
