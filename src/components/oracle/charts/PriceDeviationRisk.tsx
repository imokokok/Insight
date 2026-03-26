'use client';

import { useMemo } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';
import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';

interface DeviationDataPoint {
  timestamp: string;
  deviation: number;
  pythPrice: number;
  marketAvg: number;
}

interface DeviationStats {
  max: number;
  min: number;
  avg: number;
  current: number;
}

const DEVIATION_THRESHOLD = 1.0;

function generateMockData(t: (key: string) => string): DeviationDataPoint[] {
  const data: DeviationDataPoint[] = [];
  const basePrice = 14.5;
  const now = Date.now();

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now - (23 - i) * 3600000);
    const marketAvg = basePrice + (Math.random() - 0.5) * 0.3;
    const deviation = (Math.random() - 0.5) * 1.5;
    const pythPrice = marketAvg * (1 + deviation / 100);

    data.push({
      timestamp: timestamp.toLocaleTimeString(t('locale') || 'zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      deviation: Number(deviation.toFixed(3)),
      pythPrice: Number(pythPrice.toFixed(4)),
      marketAvg: Number(marketAvg.toFixed(4)),
    });
  }

  return data;
}

function calculateStats(data: DeviationDataPoint[]): DeviationStats {
  const deviations = data.map((d) => Math.abs(d.deviation));
  return {
    max: Math.max(...deviations),
    min: Math.min(...deviations),
    avg: Number((deviations.reduce((a, b) => a + b, 0) / deviations.length).toFixed(3)),
    current: Math.abs(data[data.length - 1]?.deviation || 0),
  };
}

export function PriceDeviationRisk() {
  const t = useTranslations();
  const deviationData = useMemo(() => generateMockData(t), [t]);
  const stats = useMemo(() => calculateStats(deviationData), [deviationData]);

  const hasWarning = stats.current >= DEVIATION_THRESHOLD;
  const warningCount = deviationData.filter(
    (d) => Math.abs(d.deviation) >= DEVIATION_THRESHOLD
  ).length;

  return (
    <DashboardCard title={t('charts.priceDeviationRisk.title')}>
      <div className="space-y-6">
        {hasWarning && (
          <div className="bg-warning-50 border border-orange-200  p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-orange-800">
                  {t('charts.priceDeviationRisk.warningTitle')}
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  {t('charts.priceDeviationRisk.warningMessage', {
                    current: stats.current.toFixed(3),
                    threshold: DEVIATION_THRESHOLD,
                    count: warningCount,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">
              {t('charts.priceDeviationRisk.currentDeviation')}
            </p>
            <p
              className={`text-xl font-bold ${stats.current >= DEVIATION_THRESHOLD ? 'text-warning-600' : 'text-gray-900'}`}
            >
              {stats.current.toFixed(3)}%
            </p>
          </div>
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">
              {t('charts.priceDeviationRisk.maxDeviation')}
            </p>
            <p className="text-xl font-bold text-gray-900">{stats.max.toFixed(3)}%</p>
          </div>
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">
              {t('charts.priceDeviationRisk.minDeviation')}
            </p>
            <p className="text-xl font-bold text-gray-900">{stats.min.toFixed(3)}%</p>
          </div>
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">
              {t('charts.priceDeviationRisk.avgDeviation')}
            </p>
            <p className="text-xl font-bold text-gray-900">{stats.avg.toFixed(3)}%</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('charts.priceDeviationRisk.historicalTrend')}
          </h4>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deviationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                <XAxis
                  dataKey="timestamp"
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                  minTickGap={40}
                />
                <YAxis
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  width={50}
                />
                <RechartsTooltip
                  formatter={(value) => [
                    `${Number(value).toFixed(3)}%`,
                    t('charts.priceDeviationRisk.deviation'),
                  ]}
                  labelStyle={{ color: semanticColors.neutral.text }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${baseColors.gray[200]}`,
                  }}
                />
                <ReferenceLine
                  y={DEVIATION_THRESHOLD}
                  stroke={semanticColors.warning.DEFAULT}
                  strokeDasharray="5 5"
                />
                <ReferenceLine
                  y={-DEVIATION_THRESHOLD}
                  stroke={semanticColors.warning.DEFAULT}
                  strokeDasharray="5 5"
                />
                <ReferenceLine y={0} stroke={chartColors.recharts.axis} strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="deviation"
                  stroke={chartColors.recharts.purple}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColors.recharts.purple }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-purple-500" />
            <span className="text-xs text-gray-600">
              {t('charts.priceDeviationRisk.deviation')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-warning-500 border-dashed"
              style={{ borderTop: `2px dashed ${semanticColors.warning.DEFAULT}` }}
            />
            <span className="text-xs text-gray-600">
              {t('charts.priceDeviationRisk.warningThreshold', { threshold: DEVIATION_THRESHOLD })}
            </span>
          </div>
        </div>

        <div className="bg-primary-50  p-4">
          <h4 className="text-sm font-medium text-primary-900 mb-2">
            {t('charts.priceDeviationRisk.analysisTitle')}
          </h4>
          <ul className="text-sm text-primary-800 space-y-1">
            <li>{t('charts.priceDeviationRisk.analysis1')}</li>
            <li>{t('charts.priceDeviationRisk.analysis2')}</li>
            <li>{t('charts.priceDeviationRisk.analysis3', { threshold: DEVIATION_THRESHOLD })}</li>
            <li>{t('charts.priceDeviationRisk.analysis4')}</li>
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
