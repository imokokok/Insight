'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TimeComparisonChart, TimeRangeSelector } from '@/components/comparison';
import { ComparisonChartData, TimeComparisonConfig } from '@/components/comparison/types';
import { QueryResult } from '../constants';

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: unknown;
}

interface TimeComparisonSectionProps {
  chartData: ChartDataPoint[];
  compareChartData: ChartDataPoint[];
  queryResults: QueryResult[];
  compareQueryResults: QueryResult[];
  timeConfig: TimeComparisonConfig;
  onTimeConfigChange: (config: TimeComparisonConfig) => void;
  hiddenSeries: Set<string>;
}

export function TimeComparisonSection({
  chartData,
  compareChartData,
  queryResults,
  compareQueryResults,
  timeConfig,
  onTimeConfigChange,
  hiddenSeries,
}: TimeComparisonSectionProps) {
  const t = useTranslations();

  // Convert chart data to comparison chart data format
  const comparisonData = useMemo((): ComparisonChartData => {
    if (chartData.length === 0 || compareChartData.length === 0) {
      return {
        currentPeriod: { data: [], label: '', startDate: new Date(), endDate: new Date() },
        comparisonPeriod: { data: [], label: '', startDate: new Date(), endDate: new Date() },
        differences: [],
      };
    }

    // Get the first series label for comparison
    const firstResult = queryResults[0];
    const label = firstResult
      ? `${t(`navbar.${firstResult.provider.toLowerCase()}`)} (${t(`blockchain.${firstResult.chain.toLowerCase()}`)})`
      : '';

    // Map current period data
    const currentData = chartData.map((point) => ({
      timestamp: point.timestamp,
      time: point.time,
      value: point[label] as number,
    }));

    // Map comparison period data
    const comparisonDataPoints = compareChartData.map((point) => ({
      timestamp: point.timestamp,
      time: point.time,
      value: point[label] as number,
    }));

    // Calculate differences
    const differences = currentData.map((point, index) => {
      const comparePoint = comparisonDataPoints[index];
      if (!comparePoint || comparePoint.value === 0) return 0;
      return ((point.value - comparePoint.value) / comparePoint.value) * 100;
    });

    return {
      currentPeriod: {
        data: currentData,
        label: t('comparison.timeComparison.currentPeriod'),
        startDate: new Date(currentData[0]?.timestamp || Date.now()),
        endDate: new Date(currentData[currentData.length - 1]?.timestamp || Date.now()),
      },
      comparisonPeriod: {
        data: comparisonDataPoints,
        label: timeConfig.comparisonMode === 'yoy'
          ? t('comparison.timeComparison.yoy')
          : t('comparison.timeComparison.mom'),
        startDate: new Date(comparisonDataPoints[0]?.timestamp || Date.now()),
        endDate: new Date(comparisonDataPoints[comparisonDataPoints.length - 1]?.timestamp || Date.now()),
      },
      differences,
    };
  }, [chartData, compareChartData, queryResults, timeConfig.comparisonMode, t]);

  if (chartData.length === 0 || compareChartData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <TimeRangeSelector
          value={timeConfig}
          onChange={onTimeConfigChange}
          maxCustomRangeDays={365}
        />
      </div>

      {/* Time Comparison Chart */}
      <TimeComparisonChart
        data={comparisonData}
        title={t('priceQuery.comparison.title')}
        showDifference={true}
        showStats={true}
        valueFormatter={(value) => `$${value.toFixed(2)}`}
        height={350}
      />
    </div>
  );
}
