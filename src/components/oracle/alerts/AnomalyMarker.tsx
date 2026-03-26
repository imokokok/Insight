'use client';

import { ReferenceDot } from 'recharts';

import { chartColors, getChartColor } from '@/lib/chartColors';
import { semanticColors, baseColors, shadowColors } from '@/lib/config/colors';

export interface AnomalyPoint {
  timestamp: number;
  price: number;
  deviation: number;
  type: 'spike' | 'drop';
  time: string;
  deviationPercent: number;
  absoluteDeviation: number;
}

interface AnomalyMarkerProps {
  anomalies: AnomalyPoint[];
  yAxisId?: string | number;
  onDataClick?: (anomaly: AnomalyPoint) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: AnomalyPoint;
  }>;
}

function AnomalyTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isSpike = data.type === 'spike';
  const date = new Date(data.timestamp);

  const possibleReasons = isSpike
    ? ['市场波动剧烈', '大额交易影响', '流动性不足', '数据源异常']
    : ['市场恐慌抛售', '重大利空消息', '流动性枯竭', '预言机延迟'];

  return (
    <div
      className="rounded p-4 min-w-[220px]"
      style={{
        backgroundColor: baseColors.gray[50],
        border: `2px solid ${semanticColors.danger.DEFAULT}`,
        boxShadow: shadowColors.card,
      }}
    >
      <div
        className="flex items-center gap-2 mb-3 pb-2"
        style={{ borderBottom: `1px solid ${semanticColors.danger.light}` }}
      >
        <div
          className="w-3 h-3 rounded animate-pulse"
          style={{ backgroundColor: semanticColors.danger.DEFAULT }}
        />
        <span className="text-sm font-bold" style={{ color: semanticColors.danger.dark }}>
          {isSpike ? '价格尖峰异常' : '价格骤降异常'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span style={{ color: baseColors.gray[500] }}>时间:</span>
          <span className="font-medium" style={{ color: baseColors.gray[900] }}>
            {date.toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: baseColors.gray[500] }}>价格:</span>
          <span className="font-mono font-medium" style={{ color: baseColors.gray[900] }}>
            ${data.price.toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: baseColors.gray[500] }}>偏差幅度:</span>
          <span
            className="font-mono font-bold"
            style={{ color: isSpike ? semanticColors.danger.dark : semanticColors.success.dark }}
          >
            {isSpike ? '+' : '-'}
            {data.deviationPercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: baseColors.gray[500] }}>绝对偏差:</span>
          <span className="font-mono" style={{ color: baseColors.gray[700] }}>
            ${data.absoluteDeviation.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}>
        <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
          可能原因:
        </p>
        <ul className="text-xs space-y-0.5" style={{ color: baseColors.gray[600] }}>
          {possibleReasons.slice(0, 2).map((reason, index) => (
            <li key={index} className="flex items-center gap-1">
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: baseColors.gray[400] }}
              />
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AnomalyMarker({ anomalies, yAxisId = 'price', onDataClick }: AnomalyMarkerProps) {
  if (anomalies.length === 0) return null;

  return (
    <>
      {anomalies.map((anomaly, index) => (
        <ReferenceDot
          key={`anomaly-${index}-${anomaly.timestamp}`}
          x={anomaly.time}
          y={anomaly.price}
          r={8}
          fill={semanticColors.danger.DEFAULT}
          stroke={baseColors.gray[50]}
          strokeWidth={2}
          yAxisId={yAxisId}
          shape={(props: { cx?: number; cy?: number }) => {
            const { cx = 0, cy = 0 } = props;
            return (
              <g
                onClick={() => onDataClick?.(anomaly)}
                style={{ cursor: onDataClick ? 'pointer' : 'default' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={12}
                  fill={semanticColors.danger.DEFAULT}
                  fillOpacity={0.2}
                  className="animate-ping"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill={semanticColors.danger.DEFAULT}
                  stroke={baseColors.gray[50]}
                  strokeWidth={2}
                />
                <circle cx={cx} cy={cy} r={4} fill={baseColors.gray[50]} />
              </g>
            );
          }}
        />
      ))}
    </>
  );
}

export { AnomalyTooltip };
