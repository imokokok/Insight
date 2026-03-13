'use client';

import { useI18n } from '@/lib/i18n/provider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors, getHeatmapColor } from '../utils';
import { useColorblindMode } from '@/stores/crossChainStore';
import { getColorblindHeatmapColor, colorblindLegendConfig } from '../colorblindTheme';
import { useMemo } from 'react';
import { Blockchain } from '@/lib/oracles';
import { PriceData } from '@/lib/oracles';

interface PriceSpreadHeatmapProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function PriceSpreadHeatmap({ data }: PriceSpreadHeatmapProps) {
  const { t } = useI18n();
  const colorblindMode = useColorblindMode();
  const {
    filteredChains,
    heatmapData,
    maxHeatmapValue,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    currentPrices,
    chainsWithHighDeviation,
  } = data;

  // 根据色盲模式获取热力图颜色
  const getHeatmapColorFn = colorblindMode ? getColorblindHeatmapColor : getHeatmapColor;

  if (chainsWithHighDeviation.length > 0) {
    return (
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-medium text-amber-800">
            {t('crossChain.deviationAlert').replace(
              '{count}',
              chainsWithHighDeviation.length.toString()
            )}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

interface HeatmapDetailViewProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function HeatmapDetailView({ data }: HeatmapDetailViewProps) {
  const { t } = useI18n();
  const colorblindMode = useColorblindMode();
  const {
    filteredChains,
    heatmapData,
    maxHeatmapValue,
    hoveredCell,
    setHoveredCell,
    selectedCell,
    setSelectedCell,
    tooltipPosition,
    setTooltipPosition,
    currentPrices,
    historicalPrices,
  } = data;

  // 根据色盲模式获取热力图颜色
  const getHeatmapColorFn = colorblindMode ? getColorblindHeatmapColor : getHeatmapColor;

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
        {t('crossChain.priceSpreadHeatmap')}
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="flex">
            <div className="w-24 shrink-0" />
            {filteredChains.map((chain) => {
              const isHighlighted =
                hoveredCell && (hoveredCell.xChain === chain || hoveredCell.yChain === chain);
              return (
                <div
                  key={chain}
                  className={`flex-1 min-w-20 text-center px-1 py-2 transition-colors duration-150 ${
                    isHighlighted ? 'bg-gray-100' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isHighlighted ? 'text-gray-900' : 'text-gray-600'
                    }`}
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
                className={`w-24 shrink-0 flex items-center py-1 transition-colors duration-150 ${
                  hoveredCell && hoveredCell.yChain === xChain ? 'bg-gray-100' : ''
                }`}
              >
                <span
                  className={`text-xs font-medium transition-colors ${
                    hoveredCell && hoveredCell.yChain === xChain ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {chainNames[xChain]}
                </span>
              </div>
              {filteredChains.map((yChain) => {
                const cell = heatmapData.find((d) => d.xChain === xChain && d.yChain === yChain);
                const percent = cell?.percent || 0;
                const isDiagonal = xChain === yChain;
                const isHovered =
                  hoveredCell && hoveredCell.xChain === xChain && hoveredCell.yChain === yChain;
                const isSelected =
                  selectedCell && selectedCell.xChain === xChain && selectedCell.yChain === yChain;

                return (
                  <div
                    key={`${xChain}-${yChain}`}
                    className={`flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-all duration-150 ${
                      isDiagonal ? '' : 'hover:ring-2 hover:ring-gray-400 hover:ring-inset'
                    } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                    style={{
                      backgroundColor: isDiagonal
                        ? '#f3f4f6'
                        : getHeatmapColorFn(percent, maxHeatmapValue),
                      transform: isHovered && !isDiagonal ? 'scale(1.05)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
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
                      <span className="text-gray-300 text-sm">—</span>
                    ) : (
                      <span
                        className={`text-xs font-medium ${percent > maxHeatmapValue * 0.5 ? 'text-white' : 'text-gray-900'}`}
                      >
                        {percent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* Enhanced Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-700 mb-3">
              {t('crossChain.heatmapLegend') || 'Price Spread Legend'}
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs text-gray-500">
                {colorblindMode ? colorblindLegendConfig.heatmap.lowLabel : t('crossOracle.low')}
              </span>
              <div
                className="w-32 h-2"
                style={{
                  background: colorblindMode
                    ? `linear-gradient(to right, ${colorblindLegendConfig.heatmap.lowColor}, ${colorblindLegendConfig.heatmap.highColor})`
                    : 'linear-gradient(to right, #4CAF50, #F59E0B, #EF4444)',
                }}
              />
              <span className="text-xs text-gray-500">
                {colorblindMode ? colorblindLegendConfig.heatmap.highLabel : t('crossOracle.high')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4CAF50' }} />
                <span>{t('crossChain.smallSpread') || 'Small Spread'} (&lt;0.5%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                <span>{t('crossChain.mediumSpread') || 'Medium Spread'} (0.5-2%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                <span>{t('crossChain.largeSpread') || 'Large Spread'} (&gt;2%)</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {t('crossChain.heatmapHint') ||
                'Click any cell to pin comparison. Hover for detailed spread information.'}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tooltip - shows on hover or when pinned */}
      {(hoveredCell || selectedCell) && (
        <HeatmapTooltip
          cell={selectedCell || hoveredCell}
          heatmapData={heatmapData}
          currentPrices={currentPrices}
          historicalPrices={historicalPrices}
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
  const { t } = useI18n();

  if (!cell) return null;

  const cellData = heatmapData.find((d) => d.xChain === cell.xChain && d.yChain === cell.yChain);
  const xPrice = currentPrices.find((p) => p.chain === cell.xChain)?.price;
  const yPrice = currentPrices.find((p) => p.chain === cell.yChain)?.price;

  // Calculate historical percentile
  const historicalPercentile = useMemo(() => {
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
      if (xHistPrice && yHistPrice && xHistPrice > 0) {
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

  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 80) return 'text-red-600';
    if (percentile >= 60) return 'text-orange-500';
    if (percentile >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div
      className={`fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-4 min-w-[300px] ${
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
          <span className="text-gray-600">
            {t('crossChain.absoluteDiff') || 'Absolute Difference'}
          </span>
          <span className="font-mono font-medium text-gray-900">
            ${cellData?.value.toFixed(4) || '-'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{t('crossChain.percentDifference')}</span>
          <span
            className={`font-mono font-medium ${
              (cellData?.percent || 0) > 0.5 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {cellData?.percent.toFixed(4) || '-'}%
          </span>
        </div>

        {/* Historical Percentile */}
        {historicalPercentile !== null && (
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">
              {t('crossChain.historicalPercentile') || 'Historical Percentile'}
            </span>
            <span className={`font-mono font-medium ${getPercentileColor(historicalPercentile)}`}>
              {(t('crossChain.higherThanPercent') || 'Higher than {percent}% of history').replace(
                '{percent}',
                historicalPercentile.toFixed(0)
              )}
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
          <span>{t('crossChain.pinnedComparison') || 'Pinned Comparison'}</span>
        </div>
      )}
    </div>
  );
}

function SelectedCellDetail({ data }: { data: ReturnType<typeof useCrossChainData> }) {
  const { t } = useI18n();
  const {
    selectedCell,
    setSelectedCell,
    heatmapData,
    currentPrices,
    chartData,
    historicalPrices,
    filteredChains,
  } = data;

  if (!selectedCell) return null;

  return (
    <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {chainNames[selectedCell.xChain]} {t('crossChain.price')}
            </div>
            <div className="text-2xl font-semibold text-gray-900 font-mono">
              ${currentPrices.find((p) => p.chain === selectedCell.xChain)?.price.toFixed(4) || '-'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {chainNames[selectedCell.yChain]} {t('crossChain.price')}
            </div>
            <div className="text-2xl font-semibold text-gray-900 font-mono">
              ${currentPrices.find((p) => p.chain === selectedCell.yChain)?.price.toFixed(4) || '-'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t('crossChain.priceDifference')}
            </div>
            <div className="text-2xl font-semibold font-mono">
              <span
                className={
                  heatmapData.find(
                    (d) => d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain
                  )?.percent
                    ? 'text-red-600'
                    : 'text-green-600'
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
          <div className="h-48 bg-gray-50 rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, '']} />
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
