'use client';

import { ReferenceDot } from 'recharts';
import { semanticColors } from '@/lib/config/colors';

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
    <div className="bg-white border-2 border-red-400 rounded-lg p-4 shadow-xl min-w-[220px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-bold text-red-600">
          {isSpike ? '价格尖峰异常' : '价格骤降异常'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">时间:</span>
          <span className="text-gray-900 font-medium">
            {date.toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">价格:</span>
          <span className="text-gray-900 font-mono font-medium">${data.price.toFixed(4)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">偏差幅度:</span>
          <span className={`font-mono font-bold ${isSpike ? 'text-red-600' : 'text-green-600'}`}>
            {isSpike ? '+' : '-'}
            {data.deviationPercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">绝对偏差:</span>
          <span className="text-gray-700 font-mono">${data.absoluteDeviation.toFixed(4)}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-1">可能原因:</p>
        <ul className="text-xs text-gray-600 space-y-0.5">
          {possibleReasons.slice(0, 2).map((reason, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
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
          stroke="#fff"
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
                <circle cx={cx} cy={cy} r={8} fill={semanticColors.danger.DEFAULT} stroke="#fff" strokeWidth={2} />
                <circle cx={cx} cy={cy} r={4} fill="#fff" />
              </g>
            );
          }}
        />
      ))}
    </>
  );
}

export { AnomalyTooltip };
