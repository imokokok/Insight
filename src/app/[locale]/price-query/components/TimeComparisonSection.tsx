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
  const comparisonData = useMemo((): ComparisonChartData[] => {
    if (chartData.length === 0 || compareChartData.length === 0) {
      return [];
    }

    // Get the first series label for comparison
    const firstResult = queryResults[0];
    const label = firstResult
      ? `${t(`navbar.${firstResult.provider.toLowerCase()}`)} (${t(`blockchain.${firstResult.chain.toLowerCase()}`)})`
      : '';

    // Map data to ComparisonChartData format
    const maxLength = Math.max(chartData.length, compareChartData.length);
    const result: ComparisonChartData[] = [];

    for (let i = 0; i < maxLength; i++) {
      const currentPoint = chartData[i];
      const comparePoint = compareChartData[i];

      if (currentPoint && comparePoint) {
        const primary = (currentPoint[label] as number) || 0;
        const comparison = (comparePoint[label] as number) || 0;
        const difference = comparison !== 0 ? ((primary - comparison) / comparison) * 100 : 0;

        result.push({
          timestamp: currentPoint.timestamp,
          primary,
          comparison,
          difference,
          label: currentPoint.time as string,
        });
      }
    }

    return result;
  }, [chartData, compareChartData, queryResults, t]);

  if (chartData.length === 0 || compareChartData.length === 0) {
    return null;
  }

  const primaryLabel = queryResults[0]
    ? `${t(`navbar.${queryResults[0].provider.toLowerCase()}`)} (${t(`blockchain.${queryResults[0].chain.toLowerCase()}`)})`
    : t('comparison.timeComparison.currentPeriod');

  const comparisonLabel = compareQueryResults[0]
    ? `${t(`navbar.${compareQueryResults[0].provider.toLowerCase()}`)} (${t(`blockchain.${compareQueryResults[0].chain.toLowerCase()}`)})`
    : timeConfig.comparisonType === 'year_over_year'
      ? t('comparison.timeComparison.yoy')
      : t('comparison.timeComparison.mom');

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
        primaryLabel={primaryLabel}
        comparisonLabel={comparisonLabel}
        valueFormatter={(value) => `$${value.toFixed(2)}`}
        height={350}
      />
    </div>
  );
}
