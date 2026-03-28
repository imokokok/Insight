'use client';

import { useMemo } from 'react';

import { Table } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { formatPrice } from '@/lib/utils/chartSharedUtils';

import { type ChartDataPoint } from './PriceChart';

interface ChartDataTableProps {
  chartData: ChartDataPoint[];
  seriesNames: string[];
  selectedTimeRange: number;
}

export function ChartDataTable({ chartData, seriesNames, selectedTimeRange }: ChartDataTableProps) {
  const t = useTranslations();

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (selectedTimeRange <= 1) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (selectedTimeRange <= 24) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const tableData = useMemo(() => {
    return chartData.map((point) => {
      const row: Record<string, string | number> = {
        time: formatTimestamp(point.timestamp),
        timestamp: point.timestamp,
      };
      seriesNames.forEach((name) => {
        const value = point[name];
        if (typeof value === 'number') {
          row[name] = value;
        }
      });
      return row;
    });
  }, [chartData, seriesNames]);

  if (chartData.length === 0 || seriesNames.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Table className="w-4 h-4 text-gray-500" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-gray-900">{t('priceQuery.charts.dataTable')}</h4>
        <span className="ml-auto text-xs text-gray-500">
          {t('priceQuery.charts.dataPoints')}: {tableData.length}
        </span>
      </div>
      <div className="max-h-80 overflow-auto">
        <table
          className="w-full text-xs"
          role="table"
          aria-label={t('priceQuery.charts.dataTableAriaLabel')}
        >
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200"
              >
                {t('priceQuery.charts.time')}
              </th>
              {seriesNames.map((name) => (
                <th
                  key={name}
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tableData.map((row, index) => (
              <tr
                key={row.timestamp as number}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
              >
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.time as string}</td>
                {seriesNames.map((name) => (
                  <td
                    key={name}
                    className="px-3 py-2 text-right text-gray-900 font-tabular whitespace-nowrap"
                  >
                    {typeof row[name] === 'number' ? formatPrice(row[name] as number) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
