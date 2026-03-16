'use client';

import React, { useState, useCallback } from 'react';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { useTranslations } from 'next-intl';

// ============================================
// 类型定义
// ============================================

export type AnnotationType = 'event' | 'alert' | 'milestone';
export type ImportanceLevel = 'high' | 'medium' | 'low';

export interface ChartAnnotation {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  type: AnnotationType;
  importance: ImportanceLevel;
}

export interface ChartAnnotationsProps {
  annotations: ChartAnnotation[];
  onAnnotationClick?: (annotation: ChartAnnotation) => void;
  chartHeight?: number;
  chartWidth?: number;
  dataStartTime?: number;
  dataEndTime?: number;
}

// ============================================
// 预设 Chainlink 重大事件数据
// ============================================

export interface ChainlinkMilestoneData {
  id: string;
  timestamp: number;
  type: AnnotationType;
  importance: ImportanceLevel;
}

export const chainlinkMilestonesData: ChainlinkMilestoneData[] = [
  {
    id: 'link-mainnet-2019',
    timestamp: 1559347200000, // 2019-06-01
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-google-2019',
    timestamp: 1561939200000, // 2019-07-01
    type: 'event',
    importance: 'high',
  },
  {
    id: 'link-swell-2020',
    timestamp: 1585699200000, // 2020-04-01
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-ico-boom-2020',
    timestamp: 1593561600000, // 2020-07-01
    type: 'event',
    importance: 'high',
  },
  {
    id: 'link-price-spike-2020',
    timestamp: 1601510400000, // 2020-10-01
    type: 'alert',
    importance: 'medium',
  },
  {
    id: 'link-2-0-2021',
    timestamp: 1612137600000, // 2021-02-01
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-keepers-2021',
    timestamp: 1625097600000, // 2021-07-01
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-ccip-2022',
    timestamp: 1654041600000, // 2022-06-01
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-staking-2022',
    timestamp: 1669852800000, // 2022-12-01
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-functions-2023',
    timestamp: 1677628800000, // 2023-03-01
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-staking-v0-2-2023',
    timestamp: 1698796800000, // 2023-11-01
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-svr-2024',
    timestamp: 1704067200000, // 2024-01-01
    type: 'event',
    importance: 'medium',
  },
  {
    id: 'link-alliance-2024',
    timestamp: 1711929600000, // 2024-04-01
    type: 'event',
    importance: 'medium',
  },
  {
    id: 'link-price-volatility-2024',
    timestamp: 1717200000000, // 2024-06-01
    type: 'alert',
    importance: 'high',
  },
];

// 兼容旧代码的导出，使用翻译函数生成完整数据
export const chainlinkMilestones = chainlinkMilestonesData;

// ============================================
// 辅助函数
// ============================================

const getAnnotationColor = (type: AnnotationType, importance: ImportanceLevel): string => {
  const colors: Record<AnnotationType, Record<ImportanceLevel, string>> = {
    event: {
      high: chartColors.recharts.primary,
      medium: chartColors.recharts.primary,
      low: chartColors.recharts.primary,
    },
    alert: {
      high: semanticColors.danger.dark,
      medium: semanticColors.danger.DEFAULT,
      low: semanticColors.danger.light,
    },
    milestone: {
      high: semanticColors.success.dark,
      medium: semanticColors.success.DEFAULT,
      low: semanticColors.success.light,
    },
  };
  return colors[type][importance];
};

const getAnnotationIcon = (type: AnnotationType): string => {
  switch (type) {
    case 'event':
      return '📅';
    case 'alert':
      return '⚠️';
    case 'milestone':
      return '🏆';
    default:
      return '📍';
  }
};

const getImportanceLabel = (importance: ImportanceLevel, t: (key: string) => string): string => {
  const labels: Record<ImportanceLevel, string> = {
    high: t('common.importance.high'),
    medium: t('common.importance.medium'),
    low: t('common.importance.low'),
  };
  return labels[importance];
};

const getTypeLabel = (type: AnnotationType, t: (key: string) => string): string => {
  const labels: Record<AnnotationType, string> = {
    event: t('annotation.type.event'),
    alert: t('annotation.type.alert'),
    milestone: t('annotation.type.milestone'),
  };
  return labels[type];
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ============================================
// 子组件
// ============================================

interface AnnotationTooltipProps {
  annotation: ChartAnnotation;
  visible: boolean;
  x: number;
  y: number;
  t: (key: string) => string;
}

function AnnotationTooltip({ annotation, visible, x, y, t }: AnnotationTooltipProps) {
  if (!visible) return null;

  const color = getAnnotationColor(annotation.type, annotation.importance);

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200   p-3 min-w-[240px] max-w-[320px] pointer-events-none"
      style={{
        left: x + 12,
        top: y - 10,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getAnnotationIcon(annotation.type)}</span>
        <span
          className="text-xs font-medium px-2 py-0.5  text-white"
          style={{ backgroundColor: color }}
        >
          {getTypeLabel(annotation.type, t)}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            annotation.importance === 'high'
              ? 'bg-red-100 text-red-700'
              : annotation.importance === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {getImportanceLabel(annotation.importance, t)}
          {t('annotation.priority')}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-gray-900 mb-1">{annotation.title}</h4>
      <p className="text-xs text-gray-600 leading-relaxed mb-2">{annotation.description}</p>
      <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
        {formatDate(annotation.timestamp)}
      </div>
    </div>
  );
}

interface AnnotationMarkerProps {
  annotation: ChartAnnotation;
  position: number;
  onHover: (annotation: ChartAnnotation | null, x: number, y: number) => void;
  onClick: (annotation: ChartAnnotation) => void;
}

function AnnotationMarker({ annotation, position, onHover, onClick }: AnnotationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const color = getAnnotationColor(annotation.type, annotation.importance);
  const icon = getAnnotationIcon(annotation.type);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    onHover(annotation, rect.left + rect.width / 2, rect.top);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover(null, 0, 0);
  };

  const handleClick = () => {
    onClick(annotation);
  };

  return (
    <div
      className="absolute transform -translate-x-1/2 cursor-pointer transition-all duration-200"
      style={{
        left: `${position}%`,
        top: '0',
        zIndex: isHovered ? 20 : 10,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 连接线 */}
      <div
        className="absolute w-0.5 h-8 left-1/2 transform -translate-x-1/2"
        style={{
          backgroundColor: color,
          opacity: isHovered ? 1 : 0.6,
          top: '20px',
        }}
      />
      {/* 标记点 */}
      <div
        className={`relative flex items-center justify-center w-6 h-6  border-2 transition-all duration-200 ${
          isHovered ? 'scale-125 ' : ''
        }`}
        style={{
          backgroundColor: isHovered ? color : 'white',
          borderColor: color,
        }}
      >
        <span className="text-xs">{icon}</span>
      </div>
      {/* 底部脉冲效果（高重要性） */}
      {annotation.importance === 'high' && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3  animate-ping"
          style={{
            backgroundColor: color,
            opacity: 0.4,
            top: '22px',
          }}
        />
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function ChartAnnotations({
  annotations,
  onAnnotationClick,
  chartHeight = 400,
  dataStartTime,
  dataEndTime,
}: ChartAnnotationsProps) {
  const t = useTranslations();
  const [hoveredAnnotation, setHoveredAnnotation] = useState<ChartAnnotation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // 计算时间范围
  const timeRange = React.useMemo(() => {
    if (dataStartTime && dataEndTime) {
      return { start: dataStartTime, end: dataEndTime };
    }
    if (annotations.length === 0) {
      return { start: Date.now() - 365 * 24 * 60 * 60 * 1000, end: Date.now() };
    }
    const timestamps = annotations.map((a) => a.timestamp);
    return {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps),
    };
  }, [annotations, dataStartTime, dataEndTime]);

  // 计算每个注释的位置
  const positionedAnnotations = React.useMemo(() => {
    const range = timeRange.end - timeRange.start;
    if (range === 0) return [];

    return annotations
      .filter((a) => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end)
      .map((annotation) => ({
        ...annotation,
        position: ((annotation.timestamp - timeRange.start) / range) * 100,
      }));
  }, [annotations, timeRange]);

  const handleHover = useCallback((annotation: ChartAnnotation | null, x: number, y: number) => {
    setHoveredAnnotation(annotation);
    setTooltipPosition({ x, y });
  }, []);

  const handleClick = useCallback(
    (annotation: ChartAnnotation) => {
      onAnnotationClick?.(annotation);
    },
    [onAnnotationClick]
  );

  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full" style={{ height: '60px' }}>
      {/* 时间轴 */}
      <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200" />

      {/* 注释标记 */}
      <div className="relative w-full h-full">
        {positionedAnnotations.map((annotation) => (
          <AnnotationMarker
            key={annotation.id}
            annotation={annotation}
            position={annotation.position}
            onHover={handleHover}
            onClick={handleClick}
          />
        ))}
      </div>

      {/* Tooltip */}
      <AnnotationTooltip
        annotation={hoveredAnnotation!}
        visible={!!hoveredAnnotation}
        x={tooltipPosition.x}
        y={tooltipPosition.y}
        t={t}
      />

      {/* 图例 */}
      <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2  bg-blue-500" />
          <span className="text-gray-500">{t('annotation.type.event')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2  bg-red-500" />
          <span className="text-gray-500">{t('annotation.type.alert')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2  bg-emerald-500" />
          <span className="text-gray-500">{t('annotation.type.milestone')}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 简化版组件（用于嵌入图表）
// ============================================

export interface ChartAnnotationOverlayProps {
  annotations: ChartAnnotation[];
  onAnnotationClick?: (annotation: ChartAnnotation) => void;
  xAxisDomain: [number, number];
  chartHeight: number;
}

export function ChartAnnotationOverlay({
  annotations,
  onAnnotationClick,
  xAxisDomain,
  chartHeight,
}: ChartAnnotationOverlayProps) {
  const t = useTranslations();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const range = xAxisDomain[1] - xAxisDomain[0];
  if (range === 0) return null;

  const visibleAnnotations = annotations.filter(
    (a) => a.timestamp >= xAxisDomain[0] && a.timestamp <= xAxisDomain[1]
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {visibleAnnotations.map((annotation) => {
        const x = ((annotation.timestamp - xAxisDomain[0]) / range) * 100;
        const color = getAnnotationColor(annotation.type, annotation.importance);
        const isHovered = hoveredId === annotation.id;

        return (
          <div
            key={annotation.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${x}%`,
              top: '10px',
              transform: 'translateX(-50%)',
              zIndex: isHovered ? 30 : 20,
            }}
          >
            {/* 垂直线 */}
            <div
              className="absolute w-px transition-all duration-200"
              style={{
                height: `${chartHeight - 40}px`,
                backgroundColor: color,
                opacity: isHovered ? 0.8 : 0.4,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />

            {/* 标记点 */}
            <div
              className={`relative flex items-center justify-center w-5 h-5  border-2 cursor-pointer transition-all duration-200 ${
                isHovered ? 'scale-125 ' : ''
              }`}
              style={{
                backgroundColor: isHovered ? color : 'white',
                borderColor: color,
              }}
              onMouseEnter={(e) => {
                setHoveredId(annotation.id);
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onAnnotationClick?.(annotation)}
            >
              <span className="text-xs">{getAnnotationIcon(annotation.type)}</span>
            </div>

            {/* Tooltip */}
            {isHovered && (
              <div
                className="fixed z-50 bg-white border border-gray-200   p-3 min-w-[200px] max-w-[280px] pointer-events-none"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y - 10,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5  text-white"
                    style={{ backgroundColor: color }}
                  >
                    {getTypeLabel(annotation.type, t)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{annotation.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{formatDate(annotation.timestamp)}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 导出辅助函数
// ============================================

// 获取带翻译的里程碑数据
export function getChainlinkMilestonesWithTranslation(
  t: (key: string) => string
): ChartAnnotation[] {
  return chainlinkMilestonesData.map((milestone) => ({
    ...milestone,
    title: t(`annotation.milestones.${milestone.id}.title`),
    description: t(`annotation.milestones.${milestone.id}.description`),
  }));
}

export { getAnnotationColor, getAnnotationIcon, getImportanceLabel, getTypeLabel, formatDate };

export default ChartAnnotations;
