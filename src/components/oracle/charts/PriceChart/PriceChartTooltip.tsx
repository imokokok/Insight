'use client';

import { memo } from 'react';
import { useTranslations } from '@/i18n';
import { IndicatorDataPoint } from '@/hooks';
import { ChartType } from './priceChartConfig';
import { semanticColors } from '@/lib/config/colors';

interface MainChartTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: IndicatorDataPoint }>;
  label?: string;
  chartType: ChartType;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  isMobile?: boolean;
}

export const MainChartTooltip = memo(function MainChartTooltip({
  active,
  payload,
  label,
  chartType,
  showBollingerBands,
  showRSI,
  showMACD,
  isMobile,
}: MainChartTooltipProps) {
  const t = useTranslations();

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isUp = data.close !== undefined && data.open !== undefined ? data.close >= data.open : true;

  return (
    <div
      className={`bg-white border border-gray-200   ${isMobile ? 'p-2 max-w-[200px]' : 'p-3 max-w-xs'}`}
    >
      <p className={`text-gray-600 mb-2 font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
        {label}
      </p>

      {chartType === 'candlestick' && data.open !== undefined ? (
        <div className="space-y-1">
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.open')}</span>
            <span className="text-gray-900 font-mono">${data.open.toFixed(4)}</span>
          </div>
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.high')}</span>
            <span className="text-success-600 font-mono">${data.high?.toFixed(4)}</span>
          </div>
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.low')}</span>
            <span className="text-danger-600 font-mono">${data.low?.toFixed(4)}</span>
          </div>
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.close')}</span>
            <span className={`font-mono ${isUp ? 'text-success-600' : 'text-danger-600'}`}>
              ${data.close?.toFixed(4)}
            </span>
          </div>
        </div>
      ) : (
        <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.price')}</span>
          <span className="text-primary-600 font-mono">${data.price.toFixed(4)}</span>
        </div>
      )}

      {data.ma7 !== undefined && chartType === 'line' && (
        <div className={`flex justify-between gap-4 mt-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.ma7')}</span>
          <span className="text-amber-600 font-mono">${data.ma7.toFixed(4)}</span>
        </div>
      )}

      {!isMobile && data.ma14 !== undefined && chartType === 'line' && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.ma14')}</span>
          <span className="text-primary-600 font-mono">${data.ma14.toFixed(4)}</span>
        </div>
      )}

      {!isMobile && data.ma30 !== undefined && chartType === 'line' && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.ma30')}</span>
          <span className="text-purple-600 font-mono">${data.ma30.toFixed(4)}</span>
        </div>
      )}

      {showBollingerBands && !isMobile && data.bbUpper !== undefined && (
        <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 font-medium">
            {t('priceQuery.chart.tooltip.bollingerBands')}
          </p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.upperBand')}</span>
            <span className="text-purple-500 font-mono">${data.bbUpper.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.middleBand')}</span>
            <span className="text-purple-400 font-mono">${data.bbMiddle?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.lowerBand')}</span>
            <span className="text-purple-500 font-mono">${data.bbLower?.toFixed(4)}</span>
          </div>
        </div>
      )}

      {data.predictionUpper !== undefined &&
        data.predictionLower !== undefined &&
        data.predictionUpper !== null &&
        data.predictionLower !== null && (
          <div
            className={`space-y-1 mt-2 pt-2 border-t border-gray-200 ${isMobile ? 'text-[10px]' : 'text-xs'}`}
          >
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('priceQuery.chart.tooltip.predictionUpper')}</span>
              <span className="text-primary-600 font-mono">
                ${Number(data.predictionUpper).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('priceQuery.chart.tooltip.predictionLower')}</span>
              <span className="text-primary-600 font-mono">
                ${Number(data.predictionLower).toFixed(4)}
              </span>
            </div>
          </div>
        )}

      <div
        className={`flex justify-between gap-4 mt-2 pt-2 border-t border-gray-200 ${isMobile ? 'text-[10px]' : 'text-xs'}`}
      >
        <span className="text-gray-500">{t('priceQuery.chart.tooltip.volume')}</span>
        <span className="text-gray-700 font-mono">{(data.volume / 1000000).toFixed(2)}M</span>
      </div>

      {showRSI && !isMobile && data.rsi !== undefined && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.rsi')}</span>
          <span
            className={`font-mono ${data.rsi > 70 ? 'text-danger-500' : data.rsi < 30 ? 'text-success-500' : 'text-gray-700'}`}
          >
            {data.rsi.toFixed(2)}
          </span>
        </div>
      )}

      {showMACD && !isMobile && data.macd !== undefined && (
        <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 font-medium">{t('priceQuery.chart.tooltip.macd')}</p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.macdValue')}</span>
            <span className="text-primary-600 font-mono">{data.macd.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.signal')}</span>
            <span className="text-warning-600 font-mono">{data.macdSignal?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">{t('priceQuery.chart.tooltip.histogram')}</span>
            <span
              className={`font-mono ${(data.macdHistogram || 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}
            >
              {data.macdHistogram?.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

interface RSITooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: IndicatorDataPoint }>;
  label?: string;
}

export const RSITooltip = memo(function RSITooltip({ active, payload, label }: RSITooltipProps) {
  const t = useTranslations();

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data || data.rsi === undefined) return null;

  return (
    <div className="bg-white border border-gray-200  p-2 ">
      <p className="text-gray-600 text-xs mb-1 font-medium">{label}</p>
      <div className="flex justify-between gap-4 text-xs">
        <span className="text-gray-500">{t('priceQuery.chart.tooltip.rsi')}</span>
        <span
          className={`font-mono font-medium ${data.rsi > 70 ? 'text-danger-500' : data.rsi < 30 ? 'text-success-500' : 'text-gray-900'}`}
        >
          {data.rsi.toFixed(2)}
        </span>
      </div>
    </div>
  );
});

interface MACDTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: IndicatorDataPoint }>;
  label?: string;
}

export const MACDTooltip = memo(function MACDTooltip({ active, payload, label }: MACDTooltipProps) {
  const t = useTranslations();

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200  p-2 ">
      <p className="text-gray-600 text-xs mb-1 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.macdValue')}</span>
          <span className="text-primary-600 font-mono">{data.macd?.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.signal')}</span>
          <span className="text-warning-600 font-mono">{data.macdSignal?.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">{t('priceQuery.chart.tooltip.histogram')}</span>
          <span
            className={`font-mono ${(data.macdHistogram || 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}
          >
            {data.macdHistogram?.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
});

interface CandlestickShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: IndicatorDataPoint;
}

export const CandlestickShape = memo(function CandlestickShape(props: CandlestickShapeProps) {
  const { x = 0, y = 0, width = 0, payload } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  if (open === undefined || high === undefined || low === undefined || close === undefined) {
    return null;
  }

  const isUp = close >= open;
  const color = isUp ? semanticColors.success.DEFAULT : semanticColors.danger.DEFAULT;
  const bodyHeight = Math.abs(close - open);

  const centerX = x + width / 2;

  return (
    <g>
      <line
        x1={centerX}
        y1={y}
        x2={centerX}
        y2={y + (props.height || 0)}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x + width * 0.2}
        y={y + (isUp ? 0 : (props.height || 0) * 0.5)}
        width={width * 0.6}
        height={Math.max(bodyHeight, 2)}
        fill={color}
        rx={1}
      />
    </g>
  );
});
