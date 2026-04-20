'use client';

import { memo, useMemo, useState, useCallback } from 'react';

import { ChartToolbar, type TimeRange } from '@/components/charts/ChartToolbar';
import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';
import { safeMax } from '@/lib/utils';
import { downloadBlob } from '@/lib/utils/download';
import { escapeCSVField } from '@/lib/utils/export';
import { useColorblindMode, useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { type Blockchain } from '@/types/oracle';

import { getColorblindHeatmapColor, colorblindLegendConfig } from '../colorblindTheme';
import { useChartData } from '../hooks/useChartData';
import { useStatistics } from '../hooks/useStatistics';
import {
  useChainsWithHighDeviation,
  useFilteredChains,
  useCurrentClient,
} from '../useCrossChainData';
import { chainNames, getHeatmapColor } from '../utils';

import { HeatmapTooltip } from './HeatmapTooltip';

export const PriceSpreadHeatmap = memo(function PriceSpreadHeatmap() {
  const chainsWithHighDeviation = useChainsWithHighDeviation();

  if (chainsWithHighDeviation.length > 0) {
    return (
      <div
        className="mb-4 p-3 border rounded-lg"
        style={{
          backgroundColor: semanticColors.warning.light,
          borderColor: semanticColors.warning.light,
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: semanticColors.warning.dark }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-medium" style={{ color: semanticColors.warning.text }}>
            {chainsWithHighDeviation.length} chains with high deviation
          </span>
        </div>
      </div>
    );
  }

  return null;
});

function useHeatmapData() {
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);
  const filteredChains = useFilteredChains();
  const currentClient = useCurrentClient();

  const statistics = useStatistics({
    currentPrices,
    filteredChains,
    currentClient,
  });

  const chart = useChartData({
    currentPrices,
    filteredChains,
    selectedBaseChain,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
    thresholdConfig,
  });

  return {
    filteredChains,
    heatmapData: chart.heatmapData,
    maxHeatmapValue: chart.maxHeatmapValue,
    currentPrices,
  };
}

export function HeatmapDetailView() {
  const colorblindMode = useColorblindMode();
  const {
    filteredChains,
    heatmapData: originalHeatmapData,
    maxHeatmapValue: originalMaxHeatmapValue,
    currentPrices,
  } = useHeatmapData();

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24H');
  const [hoveredCell, setHoveredCell] = useState<{
    xChain: Blockchain;
    yChain: Blockchain;
    x: number;
    y: number;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    xChain: Blockchain;
    yChain: Blockchain;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTimeRangeChange = useCallback((range: string) => {
    setSelectedTimeRange(range as TimeRange);
  }, []);

  const { heatmapData, maxHeatmapValue } = useMemo(() => {
    if (filteredChains.length < 2) {
      return { heatmapData: originalHeatmapData, maxHeatmapValue: originalMaxHeatmapValue };
    }

    const filteredData = originalHeatmapData.filter(
      (d) => filteredChains.includes(d.xChain) && filteredChains.includes(d.yChain)
    );

    const maxValue = safeMax(filteredData.map((d) => d.percent));

    return { heatmapData: filteredData, maxHeatmapValue: maxValue > 0 ? maxValue : 1 };
  }, [filteredChains, originalHeatmapData, originalMaxHeatmapValue]);

  const handleExport = useCallback(() => {
    if (filteredChains.length === 0 || heatmapData.length === 0) {
      return;
    }

    try {
      const csvLines: string[] = [];

      csvLines.push('=== Price Spread Heatmap Data ===');
      csvLines.push(`Export Timestamp,${escapeCSVField(new Date().toISOString())}`);
      csvLines.push(`Time Range,${escapeCSVField(selectedTimeRange)}`);
      csvLines.push(`Chain Count,${filteredChains.length}`);
      csvLines.push(`Max Heatmap Value,${escapeCSVField(maxHeatmapValue.toFixed(4) + '%')}`);
      csvLines.push('');

      csvLines.push(
        ['Chain X', 'Chain Y', 'Price Difference', 'Percent Difference (%)']
          .map(escapeCSVField)
          .join(',')
      );

      heatmapData.forEach((cell) => {
        csvLines.push(
          `${escapeCSVField(chainNames[cell.xChain])},${escapeCSVField(chainNames[cell.yChain])},${escapeCSVField(cell.value.toFixed(6))},${escapeCSVField(cell.percent.toFixed(4))}`
        );
      });

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(
        blob,
        `price-spread-heatmap-${selectedTimeRange}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
      );
    } catch (error) {
      console.error('Failed to export heatmap data:', error);
    }
  }, [filteredChains, heatmapData, maxHeatmapValue, selectedTimeRange]);

  const getHeatmapColorFn = colorblindMode ? getColorblindHeatmapColor : getHeatmapColor;

  const heatmapMap = useMemo(() => {
    const map = new Map<string, (typeof heatmapData)[number]>();
    heatmapData.forEach((d) => map.set(`${d.xChain}|${d.yChain}`, d));
    return map;
  }, [heatmapData]);

  const CELL_SIZE = 48;
  const HEADER_SIZE = 80;

  return (
    <div
      className="mb-6 pb-6 border-b border-gray-200"
      role="img"
      aria-label="Price Spread Heatmap"
      tabIndex={0}
    >
      <div className="sr-only">
        Price Spread Heatmap - Visual comparison of price differences across chains
      </div>
      <ChartToolbar
        timeRanges={['1H', '24H', '7D', '30D']}
        selectedRange={selectedTimeRange}
        onRangeChange={handleTimeRangeChange}
        onExport={handleExport}
        className="mb-3"
      />

      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        Price Spread Heatmap
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex">
            <div
              className="flex-shrink-0 flex items-end justify-center pb-2"
              style={{ width: HEADER_SIZE }}
            />
            {filteredChains.map((chain) => {
              const isHighlighted =
                hoveredCell && (hoveredCell.xChain === chain || hoveredCell.yChain === chain);
              return (
                <div
                  key={chain}
                  className="flex-shrink-0 flex items-end justify-center px-1 pb-2 transition-colors duration-150"
                  style={{
                    width: CELL_SIZE,
                    backgroundColor: isHighlighted ? baseColors.gray[100] : 'transparent',
                  }}
                >
                  <span
                    className="text-xs font-medium text-center transition-colors"
                    style={{
                      color: isHighlighted ? baseColors.gray[900] : baseColors.gray[600],
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    {chainNames[chain]}
                  </span>
                </div>
              );
            })}
          </div>

          {filteredChains.map((xChain) => (
            <div key={xChain} className="flex">
              <div
                className="flex-shrink-0 flex items-center justify-end pr-3 transition-colors duration-150"
                style={{
                  width: HEADER_SIZE,
                  backgroundColor:
                    hoveredCell && hoveredCell.yChain === xChain
                      ? baseColors.gray[100]
                      : 'transparent',
                }}
              >
                <span
                  className="text-xs font-medium transition-colors truncate"
                  style={{
                    color:
                      hoveredCell && hoveredCell.yChain === xChain
                        ? baseColors.gray[900]
                        : baseColors.gray[600],
                  }}
                >
                  {chainNames[xChain]}
                </span>
              </div>

              {filteredChains.map((yChain) => {
                const cell = heatmapMap.get(`${xChain}|${yChain}`);
                const percent = cell?.percent || 0;
                const isDiagonal = xChain === yChain;
                const isHovered =
                  hoveredCell && hoveredCell.xChain === xChain && hoveredCell.yChain === yChain;
                const isSelected =
                  selectedCell && selectedCell.xChain === xChain && selectedCell.yChain === yChain;

                return (
                  <div
                    key={`${xChain}-${yChain}`}
                    className={`flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
                      isDiagonal
                        ? ''
                        : 'hover:ring-2 hover:ring-gray-400 hover:ring-inset cursor-pointer'
                    }`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: isDiagonal
                        ? baseColors.gray[100]
                        : getHeatmapColorFn(percent, maxHeatmapValue),
                      transform: isHovered && !isDiagonal ? 'scale(1.05)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isSelected ? `inset 0 0 0 2px ${baseColors.primary[500]}` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDiagonal) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          xChain,
                          yChain,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (!isDiagonal && hoveredCell) {
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => {
                      if (!isDiagonal) {
                        if (selectedCell?.xChain === xChain && selectedCell?.yChain === yChain) {
                          setSelectedCell(null);
                        } else {
                          setSelectedCell({ xChain, yChain });
                        }
                      }
                    }}
                  >
                    {isDiagonal ? (
                      <span className="text-sm text-gray-300">—</span>
                    ) : (
                      <span
                        className="text-xs font-medium"
                        style={{
                          color:
                            percent > maxHeatmapValue * 0.5
                              ? baseColors.gray[50]
                              : baseColors.gray[900],
                        }}
                      >
                        {percent.toFixed(3)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {colorblindMode ? 'Low Diff' : 'Low'}
          </span>
          <div
            className="flex-1 h-3 rounded-full"
            style={{
              background: colorblindMode
                ? `linear-gradient(to right, ${colorblindLegendConfig.heatmap.lowColor}, ${colorblindLegendConfig.heatmap.highColor})`
                : `linear-gradient(to right, ${semanticColors.success.main}, ${semanticColors.warning.main}, ${semanticColors.danger.main})`,
            }}
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {colorblindMode ? 'High Diff' : 'High'}
          </span>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>0%</span>
          <span>{(maxHeatmapValue / 2).toFixed(3)}%</span>
          <span>{maxHeatmapValue.toFixed(3)}%</span>
        </div>
      </div>

      {(hoveredCell || selectedCell) && (
        <HeatmapTooltip
          cell={selectedCell || hoveredCell}
          heatmapData={heatmapData}
          currentPrices={currentPrices}
          historicalPrices={{}}
          tooltipPosition={tooltipPosition}
          isPinned={!!selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
