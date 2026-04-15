'use client';

import { useMemo, useState } from 'react';

import { TrendingUp, Table } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Cell,
  Customized,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';

import { ChartToolbar, type ChartType, type TimeRange } from '@/components/charts/ChartToolbar';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import { chainNames } from '@/lib/constants';
import { safeMax, safeMin } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/chartSharedUtils';

import { type QueryResult } from '../constants';

import { ChartDataTable } from './ChartDataTable';
import { CustomTooltip } from './CustomTooltip';

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string | Record<string, unknown>;
}

interface PriceChartProps {
  chartData: ChartDataPoint[];
  queryResults: QueryResult[];
  selectedTimeRange: number;
  avgPrice?: number;
}

const hoursToTimeRange = (hours: number): TimeRange => {
  if (hours <= 0) return 'ALL';
  if (hours <= 1) return '1H';
  if (hours <= 24) return '24H';
  if (hours <= 168) return '7D';
  if (hours <= 720) return '30D';
  return '1Y';
};

const timeRangeToHours = (range: string): number => {
  const mapping: Record<string, number> = {
    '1H': 1,
    '24H': 24,
    '7D': 168,
    '30D': 720,
    '1Y': 8760,
    ALL: -1,
  };
  return mapping[range] ?? -1;
};

const TIME_RANGES: TimeRange[] = ['1H', '24H', '7D', '30D', '1Y', 'ALL'];

interface AxisMap {
  scale: (v: number) => number;
  bandSize?: number;
}

interface OhlcDataItem {
  timestamp: number;
  open: number;
  close: number;
  high: number;
  low: number;
  isUp: boolean;
}

const CandlestickRenderer = ({
  xAxisMap,
  yAxisMap,
  ohlcData,
}: {
  xAxisMap: Record<string, AxisMap>;
  yAxisMap: Record<string, AxisMap>;
  ohlcData: OhlcDataItem[];
}) => {
  if (!xAxisMap || !yAxisMap || ohlcData.length === 0) return null;

  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const bandSize =
    xAxis.bandSize ||
    (ohlcData.length > 1
      ? Math.abs(xScale(ohlcData[1].timestamp) - xScale(ohlcData[0].timestamp))
      : 10);

  return ohlcData.map((item, index) => {
    const x = xScale(item.timestamp);
    const yHigh = yScale(item.high);
    const yLow = yScale(item.low);
    const yOpen = yScale(item.open);
    const yClose = yScale(item.close);
    const isUp = item.close >= item.open;
    const color = isUp ? chartColors.recharts.success : chartColors.recharts.danger;
    const barWidth = Math.max(3, bandSize * 0.6);

    return (
      <g key={index}>
        <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />
        <rect
          x={x - barWidth / 2}
          y={Math.min(yOpen, yClose)}
          width={barWidth}
          height={Math.max(Math.abs(yOpen - yClose), 1)}
          fill={isUp ? color : color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  });
};

export function PriceChart({
  chartData,
  queryResults,
  selectedTimeRange,
  avgPrice = 0,
}: PriceChartProps) {
  const t = useTranslations();

  const [showDataTable, setShowDataTable] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('line');

  const seriesNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'timestamp' && key !== 'time' && !key.startsWith('_')) {
          names.add(key);
        }
      });
    });
    return Array.from(names);
  }, [chartData]);

  const oracleInfoMap = useMemo(() => {
    const map: Record<string, { chain?: string; provider?: string }> = {};
    queryResults.forEach((result) => {
      const key = `${result.provider}_${result.chain}`;
      map[key] = {
        provider: result.provider,
        chain: chainNames[result.chain],
      };
    });
    return map;
  }, [queryResults]);

  const enhancedChartData = useMemo(() => {
    if (chartData.length === 0) return [];

    return chartData.map((point, index) => {
      const prevPoint = index > 0 ? chartData[index - 1] : null;
      const prevValues: Record<string, number> = {};

      if (prevPoint) {
        seriesNames.forEach((name) => {
          const prevValue = prevPoint[name];
          if (typeof prevValue === 'number') {
            prevValues[name] = prevValue;
          }
        });
      }

      return {
        ...point,
        _avgPrice: avgPrice,
        _prevValues: prevValues,
        _oracleInfo: oracleInfoMap,
      };
    });
  }, [chartData, seriesNames, avgPrice, oracleInfoMap]);

  const getSeriesColor = (index: number) => {
    return chartColors.sequence[index % chartColors.sequence.length];
  };

  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (selectedTimeRange <= 1) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (selectedTimeRange <= 24) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  const yAxisDomain = useMemo(() => {
    if (enhancedChartData.length === 0) return ['auto', 'auto'];

    let min = Infinity;
    let max = -Infinity;

    enhancedChartData.forEach((point) => {
      seriesNames.forEach((name) => {
        const value = (point as Record<string, unknown>)[name] as number;
        if (typeof value === 'number' && !isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    if (min === Infinity || max === -Infinity) return ['auto', 'auto'];

    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [enhancedChartData, seriesNames]);

  const ohlcData = useMemo(() => {
    if (chartType !== 'candle' || seriesNames.length !== 1) return [];

    const seriesName = seriesNames[0];
    const interval =
      selectedTimeRange <= 1
        ? 5 * 60 * 1000
        : selectedTimeRange <= 24
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    const groups: Map<number, number[]> = new Map();
    enhancedChartData.forEach((point) => {
      const value = (point as Record<string, unknown>)[seriesName] as number;
      if (typeof value !== 'number' || isNaN(value)) return;
      const groupKey = Math.floor(point.timestamp / interval) * interval;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(value);
    });

    return Array.from(groups.entries())
      .map(([timestamp, values]) => ({
        timestamp,
        time: new Date(timestamp).toLocaleString(),
        open: values[0],
        close: values[values.length - 1],
        high: safeMax(values),
        low: safeMin(values),
        isUp: values[values.length - 1] >= values[0],
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [chartType, seriesNames, enhancedChartData, selectedTimeRange]);

  const chartAriaLabel = useMemo(() => {
    if (enhancedChartData.length === 0 || seriesNames.length === 0) {
      return t('priceQuery.charts.priceHistory');
    }
    const firstPoint = enhancedChartData[0];
    const lastPoint = enhancedChartData[enhancedChartData.length - 1];
    const startTime = new Date(firstPoint.timestamp).toLocaleString();
    const endTime = new Date(lastPoint.timestamp).toLocaleString();
    const seriesList = seriesNames.join(', ');
    return t('priceQuery.charts.chartAriaLabel', {
      series: seriesList,
      startTime,
      endTime,
      points: enhancedChartData.length,
    });
  }, [enhancedChartData, seriesNames, t]);

  const handleRangeChange = (range: string) => {
    // TODO: Integrate with parent component to update selectedTimeRange
    const _hours = timeRangeToHours(range);
  };

  const allChartTypes: ChartType[] = useMemo(() => ['line', 'area', 'candle'], []);

  const disabledChartTypes = useMemo<ChartType[]>(() => {
    return seriesNames.length > 1 ? ['candle'] : [];
  }, [seriesNames]);

  if (enhancedChartData.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
        <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">
          {t('priceQuery.noHistoricalData')}
        </p>
        <p className="text-xs mt-1 text-gray-500">
          {t('priceQuery.noHistoricalDataHint')}
        </p>
      </div>
    );
  }

  const renderLineChart = () => (
    <LineChart data={enhancedChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
      <XAxis
        dataKey="timestamp"
        tickFormatter={formatXAxisLabel}
        stroke={chartColors.recharts.axis}
        fontSize={11}
        tickMargin={8}
        minTickGap={30}
      />
      <YAxis
        domain={yAxisDomain}
        tickFormatter={(value) => formatPrice(value as number)}
        stroke={chartColors.recharts.axis}
        fontSize={11}
        width={60}
      />
      <Tooltip
        content={<CustomTooltip />}
        cursor={{ stroke: chartColors.recharts.axis, strokeDasharray: '3 3' }}
      />
      {avgPrice > 0 && (
        <ReferenceLine
          y={avgPrice}
          stroke={chartColors.recharts.axis}
          strokeDasharray="5 5"
          strokeWidth={1}
        />
      )}
      {seriesNames.map((name, index) => (
        <Line
          key={name}
          type="monotone"
          dataKey={name}
          stroke={getSeriesColor(index)}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={500}
        />
      ))}
      <Brush dataKey="time" height={40} stroke={chartColors.recharts.primary} travellerWidth={12} />
    </LineChart>
  );

  const renderAreaChart = () => (
    <AreaChart data={enhancedChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
      <XAxis
        dataKey="timestamp"
        tickFormatter={formatXAxisLabel}
        stroke={chartColors.recharts.axis}
        fontSize={11}
        tickMargin={8}
        minTickGap={30}
      />
      <YAxis
        domain={yAxisDomain}
        tickFormatter={(value) => formatPrice(value as number)}
        stroke={chartColors.recharts.axis}
        fontSize={11}
        width={60}
      />
      <Tooltip
        content={<CustomTooltip />}
        cursor={{ stroke: chartColors.recharts.axis, strokeDasharray: '3 3' }}
      />
      {avgPrice > 0 && (
        <ReferenceLine
          y={avgPrice}
          stroke={chartColors.recharts.axis}
          strokeDasharray="5 5"
          strokeWidth={1}
        />
      )}
      {seriesNames.map((name, index) => (
        <Area
          key={name}
          type="monotone"
          dataKey={name}
          stroke={getSeriesColor(index)}
          fill={getSeriesColor(index)}
          fillOpacity={0.1}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      ))}
      <Brush dataKey="time" height={40} stroke={chartColors.recharts.primary} travellerWidth={12} />
    </AreaChart>
  );

  const renderCandlestickChart = () => {
    if (ohlcData.length === 0) return renderLineChart();

    return (
      <ComposedChart data={ohlcData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXAxisLabel}
          stroke={chartColors.recharts.axis}
          fontSize={11}
          tickMargin={8}
          minTickGap={30}
        />
        <YAxis
          domain={yAxisDomain}
          tickFormatter={(value) => formatPrice(value as number)}
          stroke={chartColors.recharts.axis}
          fontSize={11}
          width={60}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: chartColors.recharts.axis, strokeDasharray: '3 3' }}
        />
        {avgPrice > 0 && (
          <ReferenceLine
            y={avgPrice}
            stroke={chartColors.recharts.axis}
            strokeDasharray="5 5"
            strokeWidth={1}
          />
        )}
        <Bar dataKey="close" isAnimationActive={false}>
          {ohlcData.map((entry, index) => (
            <Cell key={index} fill="transparent" stroke="transparent" />
          ))}
        </Bar>
        <Customized
          component={(props: Record<string, unknown>) => (
            <CandlestickRenderer
              xAxisMap={props.xAxisMap as Record<string, AxisMap>}
              yAxisMap={props.yAxisMap as Record<string, AxisMap>}
              ohlcData={ohlcData}
            />
          )}
        />
        <Brush
          dataKey="time"
          height={40}
          stroke={chartColors.recharts.primary}
          travellerWidth={12}
        />
      </ComposedChart>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return renderAreaChart();
      case 'candle':
        return renderCandlestickChart();
      default:
        return renderLineChart();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <ChartToolbar
          timeRanges={TIME_RANGES}
          selectedRange={hoursToTimeRange(selectedTimeRange)}
          onRangeChange={handleRangeChange}
          chartTypes={allChartTypes}
          selectedType={chartType}
          onTypeChange={(type) => setChartType(type as ChartType)}
          disabledChartTypes={disabledChartTypes}
          className="flex-1"
        />
        <button
          onClick={() => setShowDataTable(!showDataTable)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors shrink-0 ${
            showDataTable
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
          }`}
          aria-pressed={showDataTable}
          aria-label={
            showDataTable
              ? t('priceQuery.charts.hideDataTable')
              : t('priceQuery.charts.showDataTable')
          }
        >
          <Table className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t('priceQuery.charts.tableView')}</span>
        </button>
      </div>

      <div className="h-[300px] w-full" role="img" aria-label={chartAriaLabel} tabIndex={0}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {showDataTable && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <ChartDataTable
            chartData={chartData}
            seriesNames={seriesNames}
            selectedTimeRange={selectedTimeRange}
          />
        </div>
      )}
    </div>
  );
}
