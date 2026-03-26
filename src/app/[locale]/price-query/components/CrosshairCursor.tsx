'use client';

/**
 * @fileoverview 十字准星光标组件
 * @description 在图表上显示水平和垂直参考线，用于追踪鼠标位置
 */

import { useState, useCallback } from 'react';

interface CrosshairCursorProps {
  data: Array<{ timestamp: number; [key: string]: number | string }>;
  seriesNames: string[];
  hiddenSeries: Set<string>;
  yAxisDomain: [number, number] | ['auto', 'auto'];
}

interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * 十字准星光标组件
 *
 * 使用自定义 SVG 渲染水平和垂直参考线
 * 只在有数据时显示
 */
export function CrosshairCursor({
  data,
  seriesNames,
  hiddenSeries,
  yAxisDomain,
}: CrosshairCursorProps) {
  const [cursor, setCursor] = useState<CursorPosition>({
    x: 0,
    y: 0,
    visible: false,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (data.length === 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCursor({
        x,
        y,
        visible: true,
      });
    },
    [data.length]
  );

  const handleMouseLeave = useCallback(() => {
    setCursor((prev) => ({ ...prev, visible: false }));
  }, []);

  // 如果没有数据，不渲染
  if (data.length === 0) {
    return null;
  }

  return (
    <>
      {/* 透明覆盖层用于捕获鼠标事件 */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="transparent"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      />

      {/* 十字准星线条 */}
      {cursor.visible && (
        <g>
          {/* 垂直参考线 */}
          <line
            x1={cursor.x}
            y1={0}
            x2={cursor.x}
            y2="100%"
            stroke="#9ca3af"
            strokeDasharray="3 3"
            strokeWidth={1}
            pointerEvents="none"
          />
          {/* 水平参考线 */}
          <line
            x1={0}
            y1={cursor.y}
            x2="100%"
            y2={cursor.y}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            strokeWidth={1}
            pointerEvents="none"
          />
        </g>
      )}
    </>
  );
}

/**
 * 获取图表的可见数据范围
 * 用于计算十字准星的位置
 */
export function getVisibleDataRange(
  data: Array<{ timestamp: number; [key: string]: number | string }>,
  seriesNames: string[],
  hiddenSeries: Set<string>
): { min: number; max: number } | null {
  if (data.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;

  data.forEach((point) => {
    seriesNames.forEach((name) => {
      if (!hiddenSeries.has(name)) {
        const value = point[name] as number;
        if (typeof value === 'number' && !isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    });
  });

  if (min === Infinity || max === -Infinity) return null;

  return { min, max };
}
