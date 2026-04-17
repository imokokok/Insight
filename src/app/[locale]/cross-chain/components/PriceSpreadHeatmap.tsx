'use client';

import { memo, useMemo, useState, useCallback } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import { ChartToolbar, type TimeRange } from '@/components/charts/ChartToolbar';
import { useTranslations } from '@/i18n';
import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';
import { type Blockchain, type PriceData } from '@/lib/oracles';
import { safeMax } from '@/lib/utils';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { downloadBlob } from '@/lib/utils/download';
import { escapeCSVField } from '@/lib/utils/export';
import { useColorblindMode } from '@/stores/crossChainConfigStore';

import { getColorblindHeatmapColor, colorblindLegendConfig } from '../colorblindTheme';
import { type useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors, getHeatmapColor } from '../utils';

interface PriceSpreadHeatmapProps {
  data: ReturnType<typeof useCrossChainData>;
}

export const PriceSpreadHeatmap = memo(function PriceSpreadHeatmap({
  data,
}: PriceSpreadHeatmapProps) {
  const t = useTranslations();
  const { chainsWithHighDeviation } = data;

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
            {t('crossChain.deviationAlert', { count: chainsWithHighDeviation.length })}
          </span>
        </div>
      </div>
    );
  }

  return null;
});

interface HeatmapDetailViewProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function HeatmapDetailView({ data }: HeatmapDetailViewProps) {
  const t = useTranslations();
  const colorblindMode = useColorblindMode();
  const {
    filteredChains,
    heatmapData: originalHeatmapData,
    maxHeatmapValue: originalMaxHeatmapValue,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    currentPrices,
    historicalPrices,
  } = data;
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24H');

  const handleTimeRangeChange = useCallback((range: string) => {
    setSelectedTimeRange(range as TimeRange);
  }, []);

  // Get time range in milliseconds - must be defined before handleExport
  const getTimeRangeInMs = useCallback((range: TimeRange): number => {
    const now = Date.now();
    switch (range) {
      case '1H':
        return now - 60 * 60 * 1000;
      case '24H':
        return now - 24 * 60 * 60 * 1000;
      case '7D':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '30D':
        return now - 30 * 24 * 60 * 60 * 1000;
      default:
        return now - 24 * 60 * 60 * 1000;
    }
  }, []);

  const filteredHistoricalPrices = useMemo(() => {
    const cutoffTime = getTimeRangeInMs(selectedTimeRange);
    const filtered: Partial<Record<Blockchain, PriceData[]>> = {};

    Object.keys(historicalPrices).forEach((chain) => {
      if (isBlockchain(chain)) {
        const prices = historicalPrices[chain];
        if (prices) {
          filtered[chain] = prices.filter((p) => p.timestamp >= cutoffTime);
        }
      }
    });

    return filtered;
  }, [historicalPrices, selectedTimeRange, getTimeRangeInMs]);

  const { heatmapData, maxHeatmapValue } = useMemo(() => {
    // 直接使用原始热力图数据，确保数据一致性
    if (filteredChains.length < 2) {
      return { heatmapData: originalHeatmapData, maxHeatmapValue: originalMaxHeatmapValue };
    }

    // 过滤原始数据以匹配当前选中的链
    const filteredData = originalHeatmapData.filter(
      (d) => filteredChains.includes(d.xChain) && filteredChains.includes(d.yChain)
    );

    // 计算最大值
    const maxValue = safeMax(filteredData.map((d) => d.percent));

    return { heatmapData: filteredData, maxHeatmapValue: maxValue };
  }, [filteredChains, originalHeatmapData, originalMaxHeatmapValue]);

  // handleExport must be defined after heatmapData is computed
  const handleExport = useCallback(() => {
    if (filteredChains.length === 0 || heatmapData.length === 0) {
      return;
    }

    try {
      const cutoffTime = getTimeRangeInMs(selectedTimeRange);
      const startTime = new Date(cutoffTime).toISOString();
      const endTime = new Date().toISOString();

      const csvLines: string[] = [];

      csvLines.push('=== Price Spread Heatmap Data ===');
      csvLines.push(`Export Timestamp,${escapeCSVField(new Date().toISOString())}`);
      csvLines.push(`Time Range,${escapeCSVField(selectedTimeRange)}`);
      csvLines.push(`Data Start Time,${escapeCSVField(startTime)}`);
      csvLines.push(`Data End Time,${escapeCSVField(endTime)}`);
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
  }, [filteredChains, heatmapData, maxHeatmapValue, selectedTimeRange, getTimeRangeInMs]);

  // 根据色盲模式获取热力图颜色
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
      aria-label={t('crossChain.priceSpreadHeatmap')}
      tabIndex={0}
    >
      <div className="sr-only">
        {t('crossChain.priceSpreadHeatmap')} - {t('crossChain.heatmapDesc')}
      </div>
      {/* Chart Toolbar */}
      <ChartToolbar
        timeRanges={['1H', '24H', '7D', '30D']}
        selectedRange={selectedTimeRange}
        onRangeChange={handleTimeRangeChange}
        onExport={handleExport}
        className="mb-3"
      />

      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        {t('crossChain.priceSpreadHeatmap')}
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* 表头 */}
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

          {/* 热力图主体 */}
          {filteredChains.map((xChain) => (
            <div key={xChain} className="flex">
              {/* 行标签 */}
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

              {/* 单元格 */}
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

      {/* 水平渐变图例 */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {colorblindMode ? t('crossChain.lowDiff') : t('crossOracle.low')}
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
            {colorblindMode ? t('crossChain.highDiff') : t('crossOracle.high')}
          </span>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>0%</span>
          <span>{(maxHeatmapValue / 2).toFixed(3)}%</span>
          <span>{maxHeatmapValue.toFixed(3)}%</span>
        </div>
      </div>

      {/* Enhanced Tooltip - shows on hover or when pinned */}
      {(hoveredCell || selectedCell) && (
        <HeatmapTooltip
          cell={selectedCell || hoveredCell}
          heatmapData={heatmapData}
          currentPrices={currentPrices}
          historicalPrices={filteredHistoricalPrices}
          tooltipPosition={tooltipPosition}
          isPinned={!!selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {selectedCell && <SelectedCellDetail data={data} />}
    </div>
  );
}

// Enhanced Tooltip Component
interface HeatmapTooltipProps {
  cell: { xChain: Blockchain; yChain: Blockchain; x?: number; y?: number } | null;
  heatmapData: { xChain: Blockchain; yChain: Blockchain; value: number; percent: number }[];
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  tooltipPosition: { x: number; y: number };
  isPinned: boolean;
  onClose: () => void;
}

function HeatmapTooltip({
  cell,
  heatmapData,
  currentPrices,
  historicalPrices,
  tooltipPosition,
  isPinned,
  onClose,
}: HeatmapTooltipProps) {
  const t = useTranslations();

  const cellData = cell
    ? heatmapData.find((d) => d.xChain === cell.xChain && d.yChain === cell.yChain)
    : null;
  const xPrice = cell ? currentPrices.find((p) => p.chain === cell.xChain)?.price : undefined;
  const yPrice = cell ? currentPrices.find((p) => p.chain === cell.yChain)?.price : undefined;

  const historicalPercentile = useMemo(() => {
    if (!cell) return null;

    const xHistorical = historicalPrices[cell.xChain] || [];
    const yHistorical = historicalPrices[cell.yChain] || [];

    if (xHistorical.length < 2 || yHistorical.length < 2 || !cellData) return null;

    const historicalDiffs: number[] = [];
    const timestamps = new Set<number>();

    xHistorical.forEach((p) => timestamps.add(p.timestamp));
    yHistorical.forEach((p) => timestamps.add(p.timestamp));

    timestamps.forEach((timestamp) => {
      const xHistPrice = xHistorical.find((p) => p.timestamp === timestamp)?.price;
      const yHistPrice = yHistorical.find((p) => p.timestamp === timestamp)?.price;
      if (
        xHistPrice !== undefined &&
        yHistPrice !== undefined &&
        xHistPrice > 0 &&
        yHistPrice > 0
      ) {
        const diffPercent = (Math.abs(xHistPrice - yHistPrice) / xHistPrice) * 100;
        historicalDiffs.push(diffPercent);
      }
    });

    if (historicalDiffs.length < 2) return null;

    const sortedDiffs = [...historicalDiffs].sort((a, b) => a - b);
    const currentValue = cellData.percent;

    let count = 0;
    for (const diff of sortedDiffs) {
      if (diff <= currentValue) count++;
    }

    return (count / sortedDiffs.length) * 100;
  }, [cell, cellData, historicalPrices]);

  if (!cell) return null;

  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 80) return 'text-red-600';
    if (percentile >= 60) return 'text-amber-500';
    if (percentile >= 40) return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div
      className={`fixed z-50 bg-white border border-gray-200 p-4 min-w-[280px] rounded-lg shadow-lg ${
        isPinned ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      style={{
        left: `${Math.min(tooltipPosition.x + 15, typeof window !== 'undefined' ? window.innerWidth - 320 : 1000)}px`,
        top: `${Math.min(tooltipPosition.y + 15, typeof window !== 'undefined' ? window.innerHeight - 350 : 800)}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span>{chainNames[cell.xChain]}</span>
          <span className="text-gray-400">vs</span>
          <span>{chainNames[cell.yChain]}</span>
        </div>
        {isPinned && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Price Info */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {chainNames[cell.xChain]} {t('crossChain.price')}
          </span>
          <span className="font-mono text-gray-900 font-medium">
            $
            {xPrice?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            }) || '-'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {chainNames[cell.yChain]} {t('crossChain.price')}
          </span>
          <span className="font-mono text-gray-900 font-medium">
            $
            {yPrice?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            }) || '-'}
          </span>
        </div>
      </div>

      {/* Difference Info */}
      <div className="pt-3 border-t border-gray-100 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{t('crossChain.absoluteDiff')}</span>
          <span className="font-mono font-medium text-gray-900">
            ${cellData?.value.toFixed(4) || '-'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{t('crossChain.percentDifference')}</span>
          <span
            className={`font-mono font-medium ${
              (cellData?.percent || 0) > 0.1 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {cellData?.percent.toFixed(2) || '-'}%
          </span>
        </div>

        {/* Historical Percentile */}
        {historicalPercentile !== null && (
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">{t('crossChain.historicalPercentile')}</span>
            <span className={`font-mono font-medium ${getPercentileColor(historicalPercentile)}`}>
              {t('crossChain.higherThanPercent', { percent: historicalPercentile.toFixed(0) })}
            </span>
          </div>
        )}
      </div>

      {/* Pin indicator */}
      {isPinned && (
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1 text-xs text-blue-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          <span>{t('crossChain.pinnedComparison')}</span>
        </div>
      )}
    </div>
  );
}

function SelectedCellDetail({ data }: { data: ReturnType<typeof useCrossChainData> }) {
  const t = useTranslations();
  const { selectedCell, setSelectedCell, heatmapData, currentPrices, chartData } = data;

  if (!selectedCell) return null;

  return (
    <div className="mt-4 border border-gray-200 overflow-hidden bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            {chainNames[selectedCell.xChain]} vs {chainNames[selectedCell.yChain]}{' '}
            {t('crossChain.detailComparison')}
          </span>
        </div>
        <button
          onClick={() => setSelectedCell(null)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {chainNames[selectedCell.xChain]} {t('crossChain.price')}
            </div>
            <div className="text-xl font-semibold text-gray-900 font-mono">
              ${currentPrices.find((p) => p.chain === selectedCell.xChain)?.price.toFixed(4) || '-'}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {chainNames[selectedCell.yChain]} {t('crossChain.price')}
            </div>
            <div className="text-xl font-semibold text-gray-900 font-mono">
              ${currentPrices.find((p) => p.chain === selectedCell.yChain)?.price.toFixed(4) || '-'}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t('crossChain.priceDifference')}
            </div>
            <div className="text-xl font-semibold font-mono">
              <span
                className={
                  heatmapData.find(
                    (d) => d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain
                  )?.percent
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }
              >
                $
                {heatmapData
                  .find((d) => d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain)
                  ?.value.toFixed(4) || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {t('crossChain.priceTrendComparison')}
          </div>
          <div className="h-48 bg-gray-50 border border-gray-200 p-2 rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={baseColors.gray[200]}
                  vertical={false}
                />
                <XAxis dataKey="time" stroke={chartColors.recharts.axis} tick={{ fontSize: 10 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => {
                    const absV = Math.abs(Number(v));
                    if (absV >= 1000) return `$${(Number(v) / 1000).toFixed(1)}K`;
                    if (absV >= 1) return `$${Number(v).toFixed(4)}`;
                    return `$${Number(v).toFixed(6)}`;
                  }}
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <RechartsTooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, '']} />
                <Line
                  type="monotone"
                  dataKey={selectedCell.xChain}
                  name={chainNames[selectedCell.xChain]}
                  stroke={chainColors[selectedCell.xChain]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={selectedCell.yChain}
                  name={chainNames[selectedCell.yChain]}
                  stroke={chainColors[selectedCell.yChain]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
