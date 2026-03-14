'use client';

import React, { useState, useCallback } from 'react';
import { chartColors, semanticColors } from '@/lib/config/colors';

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

export const chainlinkMilestones: ChartAnnotation[] = [
  {
    id: 'link-mainnet-2019',
    timestamp: 1559347200000, // 2019-06-01
    title: 'Chainlink 主网上线',
    description: 'Chainlink 预言机网络正式在以太坊主网上线，开启了去中心化预言机的新时代。',
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-google-2019',
    timestamp: 1561939200000, // 2019-07-01
    title: 'Google Cloud 合作',
    description: 'Chainlink 与 Google Cloud 建立合作关系，将预言机数据引入 BigQuery。',
    type: 'event',
    importance: 'high',
  },
  {
    id: 'link-swell-2020',
    timestamp: 1585699200000, // 2020-04-01
    title: 'Chainlink 价格参考数据上线',
    description: 'Chainlink 价格参考数据合约正式上线，为 DeFi 协议提供高质量价格数据。',
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-ico-boom-2020',
    timestamp: 1593561600000, // 2020-07-01
    title: 'DeFi 夏季爆发',
    description: 'DeFi 协议爆发式增长，Chainlink 成为大多数 DeFi 项目的首选预言机。',
    type: 'event',
    importance: 'high',
  },
  {
    id: 'link-price-spike-2020',
    timestamp: 1601510400000, // 2020-10-01
    title: 'LINK 价格创历史新高',
    description: 'LINK 代币价格突破 $10，市值进入加密货币前 10 名。',
    type: 'alert',
    importance: 'medium',
  },
  {
    id: 'link-2.0-2021',
    timestamp: 1612137600000, // 2021-02-01
    title: 'Chainlink 2.0 白皮书发布',
    description: '发布 Chainlink 2.0 白皮书，引入去中心化预言机网络（DONs）概念。',
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-keepers-2021',
    timestamp: 1625097600000, // 2021-07-01
    title: 'Chainlink Keepers 上线',
    description: 'Chainlink Keepers 在主网上线，提供去中心化自动化服务。',
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-ccip-2022',
    timestamp: 1654041600000, // 2022-06-01
    title: 'CCIP 跨链互操作性协议',
    description: 'Chainlink CCIP（跨链互操作性协议）发布，实现跨链消息传递。',
    type: 'milestone',
    importance: 'high',
  },
  {
    id: 'link-staking-2022',
    timestamp: 1669852800000, // 2022-12-01
    title: 'Chainlink Staking v0.1',
    description: 'Chainlink Staking v0.1 上线，为节点运营商和代币持有者提供质押机制。',
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-functions-2023',
    timestamp: 1677628800000, // 2023-03-01
    title: 'Chainlink Functions 发布',
    description: 'Chainlink Functions 上线，允许智能合约连接任何 Web2 API。',
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-staking-v0.2-2023',
    timestamp: 1698796800000, // 2023-11-01
    title: 'Chainlink Staking v0.2',
    description: 'Staking v0.2 升级，引入原生代币质押和扩展的质押池。',
    type: 'milestone',
    importance: 'medium',
  },
  {
    id: 'link-svr-2024',
    timestamp: 1704067200000, // 2024-01-01
    title: 'Smart Value Recapture (SVR)',
    description: 'Chainlink 推出 SVR 服务，帮助 DeFi 协议捕获 MEV 价值。',
    type: 'event',
    importance: 'medium',
  },
  {
    id: 'link-alliance-2024',
    timestamp: 1711929600000, // 2024-04-01
    title: 'Chainlink 合作伙伴扩展',
    description: '与主要金融机构和传统企业建立战略合作伙伴关系。',
    type: 'event',
    importance: 'medium',
  },
  {
    id: 'link-price-volatility-2024',
    timestamp: 1717200000000, // 2024-06-01
    title: '市场剧烈波动',
    description: '加密货币市场经历剧烈波动，Chainlink 预言机保持高可用性和准确性。',
    type: 'alert',
    importance: 'high',
  },
];

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

const getImportanceLabel = (importance: ImportanceLevel): string => {
  const labels: Record<ImportanceLevel, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[importance];
};

const getTypeLabel = (type: AnnotationType): string => {
  const labels: Record<AnnotationType, string> = {
    event: '事件',
    alert: '警报',
    milestone: '里程碑',
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
}

function AnnotationTooltip({ annotation, visible, x, y }: AnnotationTooltipProps) {
  if (!visible) return null;

  const color = getAnnotationColor(annotation.type, annotation.importance);

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[240px] max-w-[320px] pointer-events-none"
      style={{
        left: x + 12,
        top: y - 10,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getAnnotationIcon(annotation.type)}</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {getTypeLabel(annotation.type)}
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
          {getImportanceLabel(annotation.importance)}优先级
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
        className={`relative flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 ${
          isHovered ? 'scale-125 shadow-lg' : ''
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
          className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full animate-ping"
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
      .filter(
        (a) => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      )
      .map((annotation) => ({
        ...annotation,
        position: ((annotation.timestamp - timeRange.start) / range) * 100,
      }));
  }, [annotations, timeRange]);

  const handleHover = useCallback(
    (annotation: ChartAnnotation | null, x: number, y: number) => {
      setHoveredAnnotation(annotation);
      setTooltipPosition({ x, y });
    },
    []
  );

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
      />

      {/* 图例 */}
      <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-500">事件</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-500">警报</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-gray-500">里程碑</span>
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
              className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 cursor-pointer transition-all duration-200 ${
                isHovered ? 'scale-125 shadow-lg' : ''
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
                className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px] pointer-events-none"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y - 10,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {getTypeLabel(annotation.type)}
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

export {
  getAnnotationColor,
  getAnnotationIcon,
  getImportanceLabel,
  getTypeLabel,
  formatDate,
};

export default ChartAnnotations;
