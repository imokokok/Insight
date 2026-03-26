'use client';

import { useState, useMemo, useCallback } from 'react';

export interface HeatmapGridProps {
  data: number[][];
  rowLabels: string[];
  colLabels: string[];
  colorScale?: string[];
  onCellHover?: (value: number, row: number, col: number) => void;
  onCellClick?: (value: number, row: number, col: number) => void;
  className?: string;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

const DEFAULT_COLOR_SCALE = [
  '#eff6ff', // blue-50
  '#dbeafe', // blue-100
  '#bfdbfe', // blue-200
  '#93c5fd', // blue-300
  '#60a5fa', // blue-400
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#1e40af', // blue-800
  '#1e3a8a', // blue-900
];

export function HeatmapGrid({
  data,
  rowLabels,
  colLabels,
  colorScale = DEFAULT_COLOR_SCALE,
  onCellHover,
  onCellClick,
  className = '',
  showValues = false,
  formatValue = (v) => v.toFixed(2),
}: HeatmapGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    row: number;
    col: number;
  } | null>(null);

  const { minValue, maxValue } = useMemo(() => {
    const allValues = data.flat();
    return {
      minValue: Math.min(...allValues),
      maxValue: Math.max(...allValues),
    };
  }, [data]);

  const getColor = useCallback(
    (value: number): string => {
      if (maxValue === minValue) return colorScale[0];
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const index = Math.min(
        Math.floor(normalizedValue * colorScale.length),
        colorScale.length - 1
      );
      return colorScale[index];
    },
    [minValue, maxValue, colorScale]
  );

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent, value: number, row: number, col: number) => {
      setHoveredCell({ row, col });
      setTooltip({
        x: event.clientX,
        y: event.clientY - 40,
        value,
        row,
        col,
      });
      onCellHover?.(value, row, col);
    },
    [onCellHover]
  );

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip((prev) =>
      prev
        ? {
            ...prev,
            x: event.clientX,
            y: event.clientY - 40,
          }
        : null
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback(
    (value: number, row: number, col: number) => {
      onCellClick?.(value, row, col);
    },
    [onCellClick]
  );

  if (data.length === 0 || data[0]?.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <span className="text-sm text-gray-500">No data available</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div className="flex">
            <div className="w-24 flex-shrink-0" /> {/* Empty corner cell */}
            {colLabels.map((label, index) => (
              <div
                key={`col-${index}`}
                className="w-16 flex-shrink-0 text-xs text-center text-gray-600 py-2 px-1 truncate"
                title={label}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {data.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex">
              {/* Row label */}
              <div
                className="w-24 flex-shrink-0 text-xs text-gray-600 py-2 px-2 truncate flex items-center"
                title={rowLabels[rowIndex]}
              >
                {rowLabels[rowIndex]}
              </div>

              {/* Cells */}
              {row.map((value, colIndex) => {
                const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;

                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`
                      w-16 h-10 flex-shrink-0 cursor-pointer
                      transition-all duration-150 ease-in-out
                      flex items-center justify-center
                      ${isHovered ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''}
                    `}
                    style={{ backgroundColor: getColor(value) }}
                    onMouseEnter={(e) => handleMouseEnter(e, value, rowIndex, colIndex)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(value, rowIndex, colIndex)}
                  >
                    {showValues && (
                      <span
                        className={`text-xs font-medium ${
                          value > (maxValue + minValue) / 2 ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {formatValue(value)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium">{rowLabels[tooltip.row]}</div>
          <div className="text-gray-300">{colLabels[tooltip.col]}</div>
          <div className="mt-1 font-semibold">{formatValue(tooltip.value)}</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end mt-4 gap-2">
        <span className="text-xs text-gray-500">{formatValue(minValue)}</span>
        <div className="flex rounded overflow-hidden">
          {colorScale.map((color, index) => (
            <div key={`legend-${index}`} className="w-4 h-3" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-gray-500">{formatValue(maxValue)}</span>
      </div>
    </div>
  );
}

export default HeatmapGrid;
