'use client';

import { memo } from 'react';

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Brush,
  Cell,
  Legend,
  Area,
  ReferenceLine,
} from 'recharts';

import { type IndicatorDataPoint } from '@/hooks';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors } from '@/lib/config/colors';

import { type ChartType } from './priceChartConfig';
import { MainChartTooltip, RSITooltip, MACDTooltip, CandlestickShape } from './PriceChartTooltip';
import { type AnomalyPoint } from './useChartState';

interface ChartCanvasProps {
  data: IndicatorDataPoint[];
  dataWithPrediction: IndicatorDataPoint[];
  comparisonData: IndicatorDataPoint[];
  chartType: ChartType;
  isMobile: boolean;
  chartHeights: { main: number; rsi: number; macd: number };
  priceRange: { min: number; max: number };
  volumeRange: { min: number; max: number };
  showVolume: boolean;
  showBollingerBands: boolean;
  showPredictionInterval: boolean;
  showMA7: boolean;
  showMA14: boolean;
  showMA30: boolean;
  showMA60: boolean;
  showMA20: boolean;
  showRSI: boolean;
  showMACD: boolean;
  comparisonEnabled: boolean;
  anomalyDetectionEnabled: boolean;
  anomalies: AnomalyPoint[];
  brushStartIndex: number | undefined;
  brushEndIndex: number | undefined;
  onBrushChange: (range: { startIndex?: number; endIndex?: number }) => void;
}

export const ChartCanvas = memo(function ChartCanvas({
  data,
  dataWithPrediction,
  comparisonData,
  chartType,
  isMobile,
  chartHeights,
  priceRange,
  volumeRange,
  showVolume,
  showBollingerBands,
  showPredictionInterval,
  showMA7,
  showMA14,
  showMA30,
  showMA60,
  showMA20,
  showRSI,
  showMACD,
  comparisonEnabled,
  anomalyDetectionEnabled,
  anomalies,
  brushStartIndex,
  brushEndIndex,
  onBrushChange,
}: ChartCanvasProps) {
  const t = useTranslations();

  return (
    <>
      <ResponsiveContainer width="100%" height={chartHeights.main}>
        <ComposedChart
          data={dataWithPrediction}
          margin={{ top: 10, right: isMobile ? 5 : 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            strokeOpacity={0.5}
            vertical={false}
          />

          <XAxis
            dataKey="time"
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
            minTickGap={isMobile ? 60 : 40}
            hide={showRSI || showMACD}
            interval="preserveStartEnd"
          />

          <YAxis
            yAxisId="price"
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
            domain={[priceRange.min, priceRange.max]}
            tickFormatter={(value) => `$${Number(value).toFixed(isMobile ? 0 : 2)}`}
            width={isMobile ? 35 : 60}
          />

          <YAxis
            yAxisId="volume"
            orientation="right"
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={false}
            domain={[volumeRange.min, volumeRange.max]}
            hide
          />

          <RechartsTooltip
            content={
              <MainChartTooltip
                chartType={chartType}
                showBollingerBands={showBollingerBands}
                showRSI={showRSI}
                showMACD={showMACD}
                isMobile={isMobile}
              />
            }
            cursor={{
              stroke: chartColors.recharts.border,
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />

          {comparisonEnabled && (
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                  {value === 'price' ? t('priceChart.timePeriod1') : t('priceChart.timePeriod2')}
                </span>
              )}
            />
          )}

          {showVolume && (
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill={chartColors.recharts.primaryLight}
              fillOpacity={0.2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.close !== undefined &&
                    entry.open !== undefined &&
                    entry.close >= entry.open
                      ? chartColors.semantic.success
                      : chartColors.semantic.danger
                  }
                  fillOpacity={0.3}
                />
              ))}
            </Bar>
          )}

          {chartType === 'line' && (
            <>
              {showBollingerBands && (
                <>
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="none"
                    fill={chartColors.recharts.purple}
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={false}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbLower"
                    stroke="none"
                    fill={chartColors.recharts.white}
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbUpper"
                    stroke={chartColors.recharts.purple}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbMiddle"
                    stroke={chartColors.recharts.purple}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbLower"
                    stroke={chartColors.recharts.purple}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                  />
                </>
              )}

              {showPredictionInterval && (
                <>
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="predictionUpper"
                    stroke={chartColors.recharts.primaryLight}
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    fill="transparent"
                    dot={false}
                    activeDot={false}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="predictionLower"
                    stroke={chartColors.recharts.primaryLight}
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    fill="transparent"
                    dot={false}
                    activeDot={false}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="predictionUpper"
                    stroke="none"
                    fill={chartColors.recharts.primaryLight}
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={false}
                  />
                </>
              )}

              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke={chartColors.recharts.primaryLight}
                strokeWidth={isMobile ? 1.5 : 2}
                dot={false}
                activeDot={{
                  r: isMobile ? 3 : 4,
                  strokeWidth: 0,
                  fill: chartColors.recharts.primaryDark,
                }}
                name="price"
              />

              {comparisonEnabled && comparisonData.length > 0 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  data={comparisonData}
                  dataKey="price"
                  stroke={chartColors.recharts.purple}
                  strokeWidth={isMobile ? 1.5 : 2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{
                    r: isMobile ? 3 : 4,
                    strokeWidth: 0,
                    fill: chartColors.recharts.purpleDark,
                  }}
                  name="comparison"
                />
              )}

              {showMA7 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma7"
                  stroke={chartColors.recharts.warning}
                  strokeWidth={isMobile ? 1 : 1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  name="MA7"
                />
              )}
              {showMA14 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma14"
                  stroke={chartColors.recharts.primaryLight}
                  strokeWidth={1.5}
                  strokeDasharray="10 5"
                  dot={false}
                  activeDot={false}
                  name="MA14"
                />
              )}
              {showMA30 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma30"
                  stroke={chartColors.recharts.purple}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                  name="MA30"
                />
              )}
              {showMA60 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma60"
                  stroke={chartColors.recharts.success}
                  strokeWidth={1.5}
                  strokeDasharray="15 5 3 5"
                  dot={false}
                  activeDot={false}
                  name="MA60"
                />
              )}
              {showMA20 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma20"
                  stroke={chartColors.recharts.cyan}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  name="MA20"
                />
              )}
            </>
          )}

          {chartType === 'candlestick' && (
            <Bar yAxisId="price" dataKey="high" shape={<CandlestickShape />} fill="transparent" />
          )}

          {!showRSI && !showMACD && (
            <Brush
              dataKey="time"
              height={isMobile ? 20 : 30}
              stroke={chartColors.recharts.primaryLight}
              fill={chartColors.recharts.backgroundLight}
              tickFormatter={() => ''}
              onChange={onBrushChange}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {showRSI && (
        <RSIChart
          data={dataWithPrediction}
          isMobile={isMobile}
          chartHeight={chartHeights.rsi}
          showMACD={showMACD}
          brushStartIndex={brushStartIndex}
          brushEndIndex={brushEndIndex}
          onBrushChange={onBrushChange}
        />
      )}

      {showMACD && (
        <MACDChart
          data={dataWithPrediction}
          isMobile={isMobile}
          chartHeight={chartHeights.macd}
          brushStartIndex={brushStartIndex}
          brushEndIndex={brushEndIndex}
          onBrushChange={onBrushChange}
        />
      )}
    </>
  );
});

interface RSIChartProps {
  data: IndicatorDataPoint[];
  isMobile: boolean;
  chartHeight: number;
  showMACD: boolean;
  brushStartIndex: number | undefined;
  brushEndIndex: number | undefined;
  onBrushChange: (range: { startIndex?: number; endIndex?: number }) => void;
}

const RSIChart = memo(function RSIChart({
  data,
  isMobile,
  chartHeight,
  showMACD,
  brushStartIndex,
  brushEndIndex,
  onBrushChange,
}: RSIChartProps) {
  const t = useTranslations();

  return (
    <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
      <div className="flex items-center justify-between px-2 mb-1">
        <span
          className={`font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: baseColors.gray[600] }}
        >
          {t('priceChart.rsi')}
        </span>
        <span
          className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: baseColors.gray[400] }}
        >
          {t('priceChart.rsiPeriod')}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={data}
          margin={{ top: 5, right: isMobile ? 5 : 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            strokeOpacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
            minTickGap={isMobile ? 60 : 40}
            hide={showMACD}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
            width={isMobile ? 35 : 60}
            tickCount={5}
          />
          <RechartsTooltip content={<RSITooltip />} />

          <ReferenceLine
            y={70}
            stroke={chartColors.rsi.overbought.line}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={30}
            stroke={chartColors.rsi.oversold.line}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine y={50} stroke={chartColors.recharts.grid} strokeOpacity={0.5} />

          <Line
            type="monotone"
            dataKey="rsi"
            stroke={chartColors.rsi.line}
            strokeWidth={isMobile ? 1 : 1.5}
            dot={false}
            activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: chartColors.rsi.line }}
          />

          {!showMACD && (
            <Brush
              dataKey="time"
              height={isMobile ? 18 : 25}
              stroke={chartColors.recharts.primaryLight}
              fill={chartColors.recharts.backgroundLight}
              tickFormatter={() => ''}
              onChange={onBrushChange}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

interface MACDChartProps {
  data: IndicatorDataPoint[];
  isMobile: boolean;
  chartHeight: number;
  brushStartIndex: number | undefined;
  brushEndIndex: number | undefined;
  onBrushChange: (range: { startIndex?: number; endIndex?: number }) => void;
}

const MACDChart = memo(function MACDChart({
  data,
  isMobile,
  chartHeight,
  brushStartIndex,
  brushEndIndex,
  onBrushChange,
}: MACDChartProps) {
  const t = useTranslations();

  return (
    <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
      <div className="flex items-center justify-between px-2 mb-1">
        <span
          className={`font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: baseColors.gray[600] }}
        >
          {t('priceChart.macd')}
        </span>
        <span
          className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: baseColors.gray[400] }}
        >
          {t('priceChart.macdPeriod')}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={data}
          margin={{ top: 5, right: isMobile ? 5 : 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            strokeOpacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
            minTickGap={isMobile ? 60 : 40}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
            width={isMobile ? 35 : 60}
          />
          <RechartsTooltip content={<MACDTooltip />} />

          <ReferenceLine y={0} stroke={chartColors.recharts.grid} strokeOpacity={0.8} />

          <Bar dataKey="macdHistogram" barSize={isMobile ? 1 : 2}>
            {data.map((entry, index) => (
              <Cell
                key={`macd-cell-${index}`}
                fill={
                  (entry.macdHistogram || 0) >= 0
                    ? chartColors.macd.histogram.positive
                    : chartColors.macd.histogram.negative
                }
              />
            ))}
          </Bar>

          <Line
            type="monotone"
            dataKey="macd"
            stroke={chartColors.macd.line}
            strokeWidth={isMobile ? 1 : 1.5}
            dot={false}
            activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: chartColors.macd.line }}
          />

          <Line
            type="monotone"
            dataKey="macdSignal"
            stroke={chartColors.macd.signal}
            strokeWidth={isMobile ? 1 : 1.5}
            dot={false}
            activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: chartColors.macd.signal }}
          />

          <Brush
            dataKey="time"
            height={isMobile ? 18 : 25}
            stroke={chartColors.recharts.primaryLight}
            fill={chartColors.recharts.backgroundLight}
            tickFormatter={() => ''}
            onChange={onBrushChange}
            startIndex={brushStartIndex}
            endIndex={brushEndIndex}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
