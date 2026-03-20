'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useTranslations } from 'next-intl';
import { chartColors, semanticColors } from '@/lib/config/colors';


export interface RequestTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
}

export interface RequestTypeDistributionProps {
  className?: string;
}

const REQUEST_TYPE_KEYS = [
  { key: 'priceData', color: chartColors.recharts.purple },
  { key: 'randomNumber', color: chartColors.recharts.cyan },
  { key: 'sportsData', color: chartColors.recharts.warning },
  { key: 'stockData', color: chartColors.recharts.success },
  { key: 'commodityData', color: chartColors.recharts.danger },
  { key: 'other', color: semanticColors.neutral.DEFAULT },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RequestTypeData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const t = useTranslations();

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-gray-900 font-medium text-sm mb-2">{data.type}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 text-xs">{t('requestTypeDistribution.requestCount')}</span>
          <span className="text-gray-900 font-mono text-sm">{data.count.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 text-xs">{t('requestTypeDistribution.percentage')}</span>
          <span className="text-gray-900 font-mono text-sm">{data.percentage}%</span>
        </div>
        <p className="text-gray-400 text-xs pt-1 border-t border-gray-100 mt-1">
          {data.description}
        </p>
      </div>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-3 h-3  flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-gray-600 truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function RequestTypeDistribution({ className = '' }: RequestTypeDistributionProps) {
  const t = useTranslations();

  const requestTypes = useMemo(() => {
    return REQUEST_TYPE_KEYS.map((item) => ({
      type: t(`requestTypeDistribution.types.${item.key}`),
      color: item.color,
      description: t(`requestTypeDistribution.types.${item.key}Desc`),
    }));
  }, [t]);

  const data = useMemo(() => {
    const totalRequests = 50000 + Math.floor(Math.random() * 20000);
    const weights = [0.55, 0.15, 0.12, 0.08, 0.06, 0.04];
    let remainingPercentage = 100;

    return requestTypes.map((type, index) => {
      const isLast = index === requestTypes.length - 1;
      const percentage = isLast ? remainingPercentage : Math.round(weights[index] * 100);
      if (!isLast) remainingPercentage -= percentage;

      return {
        type: type.type,
        count: Math.round((totalRequests * percentage) / 100),
        percentage,
        color: type.color,
        description: type.description,
      };
    });
  }, [requestTypes]);

  const totalRequests = data.reduce((sum, item) => sum + item.count, 0);

  const topType = data.reduce((max, item) => (item.count > max.count ? item : max), data[0]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('requestTypeDistribution.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('requestTypeDistribution.subtitle')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{t('requestTypeDistribution.totalRequests')}</p>
          <p className="text-lg font-bold text-gray-900">{totalRequests.toLocaleString()}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="count"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.slice(0, 6).map((item) => (
            <div key={item.type} className="bg-gray-50 border border-gray-100 rounded-lg p-3 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 " style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-gray-700">{item.type}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-gray-900">
                  {item.count.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-purple-50 border border-purple-100 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-sm text-purple-700">
            <span className="font-medium">{topType.type}</span>{' '}
            {t('requestTypeDistribution.mostCommonType')}{' '}
            <span className="font-medium">{topType.percentage}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
