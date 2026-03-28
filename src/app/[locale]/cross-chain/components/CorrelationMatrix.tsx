'use client';

import { useState, useCallback } from 'react';

import { ChartToolbar } from '@/components/charts/ChartToolbar';
import { useTranslations } from '@/i18n';
import { baseColors, semanticColors } from '@/lib/config/colors';
import { useColorblindMode } from '@/stores/crossChainStore';

import {
  getColorblindCorrelationColor,
  getCorrelationSizeScale,
  colorblindLegendConfig,
} from '../colorblindTheme';
import { type useCrossChainData } from '../useCrossChainData';
import { chainNames, getCorrelationColor } from '../utils';

interface CorrelationMatrixProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  const t = useTranslations();
  const colorblindMode = useColorblindMode();
  const { filteredChains, correlationMatrixWithSignificance } = data;

  const handleExport = useCallback(() => {
    if (filteredChains.length === 0) {
      return;
    }

    try {
      const exportData = {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          chartType: 'Correlation Matrix',
          chainCount: filteredChains.length,
          chains: filteredChains.map((chain) => chainNames[chain]),
        },
        correlationMatrix: {} as Record<string, Record<string, { correlation: number; pValue: number; sampleSize: number; significanceLevel: string }>>,
      };

      filteredChains.forEach((chainX) => {
        exportData.correlationMatrix[chainNames[chainX]] = {};
        filteredChains.forEach((chainY) => {
          const result = correlationMatrixWithSignificance[chainX]?.[chainY];
          if (result) {
            exportData.correlationMatrix[chainNames[chainX]][chainNames[chainY]] = {
              correlation: result.correlation,
              pValue: result.pValue,
              sampleSize: result.sampleSize,
              significanceLevel: result.significanceLevel || '',
            };
          }
        });
      });

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `correlation-matrix-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export correlation matrix:', error);
    }
  }, [filteredChains, correlationMatrixWithSignificance]);

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
  const minSampleSize = sampleSizes.length > 0 ? Math.min(...sampleSizes) : 0;
  const maxSampleSize = sampleSizes.length > 0 ? Math.max(...sampleSizes) : 0;
  const hasLowSampleSize = minSampleSize > 0 && minSampleSize < 10;

  return (
    <div
      className="mb-8 pb-8 border-b"
      style={{ borderColor: baseColors.gray[200] }}
      role="img"
      aria-label={t('crossChain.correlationMatrix')}
      tabIndex={0}
    >
      <div className="sr-only">
        {t('crossChain.correlationMatrix')} - {t('crossChain.correlationMatrixDesc')}
      </div>
      {/* Chart Toolbar - Export only for correlation matrix */}
      <ChartToolbar
        timeRanges={[]}
        selectedRange=""
        onRangeChange={() => {}}
        onExport={handleExport}
        className="mb-4"
      />

      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: baseColors.gray[900] }}
        >
          {t('crossChain.chainCorrelationAnalysis')}
        </h3>
        <div className="flex items-center gap-2">
          {minSampleSize > 0 && (
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('crossChain.sampleSizeRange')}: n = {minSampleSize} - {maxSampleSize}
            </span>
          )}
          {hasLowSampleSize && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: semanticColors.warning.light,
                color: semanticColors.warning.dark,
              }}
            >
              ⚠️ {t('crossChain.lowSampleSizeWarning')}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs mb-4" style={{ color: baseColors.gray[500] }}>
        {t('crossChain.pearsonCorrelationDesc')} {t('crossChain.significanceMarkers')}
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="flex">
            <div className="w-24 shrink-0" />
            {filteredChains.map((chain) => (
              <div key={chain} className="flex-1 min-w-20 text-center px-1 py-2">
                <span className="text-xs font-medium" style={{ color: baseColors.gray[600] }}>
                  {chainNames[chain]}
                </span>
              </div>
            ))}
          </div>
          {filteredChains.map((chainX) => (
            <div key={chainX} className="flex">
              <div className="w-24 shrink-0 flex items-center py-1">
                <span className="text-xs font-medium" style={{ color: baseColors.gray[600] }}>
                  {chainNames[chainX]}
                </span>
              </div>
              {filteredChains.map((chainY) => {
                const result = correlationMatrixWithSignificance[chainX]?.[chainY];
                const correlation = result?.correlation ?? 0;
                const significanceLevel = result?.significanceLevel ?? '';
                const pValue = result?.pValue ?? 1;
                const sampleSize = result?.sampleSize ?? 0;
                const bgColor = getCorrelationColorFn(correlation);
                const textColor =
                  Math.abs(correlation) > 0.5 ? baseColors.gray[50] : baseColors.gray[900];

                // 色盲模式下使用形状大小编码
                const sizeScale = colorblindMode ? getCorrelationSizeScale(correlation) : 1;
                const cellSize = colorblindMode
                  ? {
                      width: `${sizeScale * 100}%`,
                      height: `${sizeScale * 100}%`,
                    }
                  : {};

                const isLowSampleSize = sampleSize > 0 && sampleSize < 10;

                return (
                  <div
                    key={`${chainX}-${chainY}`}
                    className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-transform hover:scale-105 relative"
                    style={{ backgroundColor: bgColor }}
                    title={`${chainNames[chainX]} vs ${chainNames[chainY]}: r = ${correlation.toFixed(4)}, p = ${pValue.toFixed(4)}, n = ${sampleSize}`}
                  >
                    <span className="text-xs font-medium" style={{ color: textColor, ...cellSize }}>
                      {correlation.toFixed(2)}
                    </span>
                    {significanceLevel && (
                      <span
                        className="absolute top-0.5 right-0.5 text-[8px] font-bold"
                        style={{
                          color:
                            Math.abs(correlation) > 0.5
                              ? baseColors.gray[50] + 'CC'
                              : baseColors.gray[600],
                        }}
                      >
                        {significanceLevel}
                      </span>
                    )}
                    {sampleSize > 0 && (
                      <span
                        className="absolute bottom-0.5 left-0.5 text-[7px]"
                        style={{
                          color:
                            Math.abs(correlation) > 0.5
                              ? baseColors.gray[50] + '99'
                              : baseColors.gray[400],
                        }}
                      >
                        n={sampleSize}
                      </span>
                    )}
                    {isLowSampleSize && (
                      <span
                        className="absolute top-0.5 left-0.5 text-[7px]"
                        style={{
                          color: semanticColors.warning.dark,
                        }}
                      >
                        ⚠
                      </span>
                    )}
                    {/* 色盲模式下添加形状指示器 */}
                    {colorblindMode && (
                      <div
                        className="absolute bottom-1 left-1/2 -translate-x-1/2"
                        style={{
                          width: `${4 + Math.abs(correlation) * 8}px`,
                          height: `${4 + Math.abs(correlation) * 8}px`,
                          backgroundColor: baseColors.gray[800] + '33',
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
              <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                {colorblindMode
                  ? t('crossChain.negativeCorr')
                  : t('crossChain.negativeCorrelation')}
              </span>
              <div
                className="w-32 h-3"
                style={{
                  background: colorblindMode
                    ? `linear-gradient(to right, ${colorblindLegendConfig.correlation.negativeColor}, ${baseColors.gray[50]}, ${colorblindLegendConfig.correlation.positiveColor})`
                    : `linear-gradient(to right, ${semanticColors.danger.dark}, ${baseColors.gray[50]}, ${baseColors.primary[800]})`,
                }}
              />
              <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                {colorblindMode
                  ? t('crossChain.positiveCorr')
                  : t('crossChain.positiveCorrelation')}
              </span>
            </div>
            {/* 色盲模式下图例说明 */}
            {colorblindMode && (
              <div
                className="flex items-center gap-2 ml-2 px-2 py-1 text-xs"
                style={{
                  backgroundColor: semanticColors.info.light,
                  border: `1px solid ${semanticColors.info.light}`,
                  color: semanticColors.info.text,
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('crossChain.dotSizeIndicatesStrength')}
              </div>
            )}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                {t('crossChain.significance')}:
              </span>
              <span className="text-[10px] font-bold" style={{ color: baseColors.gray[700] }}>
                *** p&lt;0.001
              </span>
              <span className="text-[10px] font-bold" style={{ color: baseColors.gray[700] }}>
                ** p&lt;0.01
              </span>
              <span className="text-[10px] font-bold" style={{ color: baseColors.gray[700] }}>
                * p&lt;0.05
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
