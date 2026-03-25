'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from '@/i18n';
import {
  startOfHour,
  startOfDay,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  isValid,
  parseISO,
} from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { TimeRange, TimePeriod, TimeComparisonConfig } from './types';
import { semanticColors, baseColors } from '@/lib/config/colors';

interface TimeRangeSelectorProps {
  value: TimeComparisonConfig;
  onChange: (config: TimeComparisonConfig) => void;
  className?: string;
  maxCustomRangeDays?: number;
}

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  icon: React.ReactNode;
  getPeriod: () => { start: Date; end: Date };
}

export function TimeRangeSelector({
  value,
  onChange,
  className = '',
  maxCustomRangeDays = 365,
}: TimeRangeSelectorProps) {
  const t = useTranslations('comparison.timeRange');
  const currentLocale = useLocale();
  const locale = currentLocale === 'zh-CN' ? zhCN : enUS;

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const timeRangeOptions: TimeRangeOption[] = useMemo(
    () => [
      {
        value: '1h',
        label: t('last1h'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        getPeriod: () => ({
          start: startOfHour(subHours(new Date(), 1)),
          end: new Date(),
        }),
      },
      {
        value: '24h',
        label: t('last24h'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        getPeriod: () => ({
          start: startOfDay(subDays(new Date(), 1)),
          end: new Date(),
        }),
      },
      {
        value: '7d',
        label: t('last7d'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        getPeriod: () => ({
          start: startOfDay(subDays(new Date(), 7)),
          end: new Date(),
        }),
      },
      {
        value: '30d',
        label: t('last30d'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        getPeriod: () => ({
          start: startOfDay(subDays(new Date(), 30)),
          end: new Date(),
        }),
      },
      {
        value: '90d',
        label: t('last90d'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
        getPeriod: () => ({
          start: startOfDay(subDays(new Date(), 90)),
          end: new Date(),
        }),
      },
      {
        value: '1y',
        label: t('last1y'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M3 21h18M5 21v-8a2 2 0 012-2h14a2 2 0 012 2v8"
            />
          </svg>
        ),
        getPeriod: () => ({
          start: startOfDay(subYears(new Date(), 1)),
          end: new Date(),
        }),
      },
    ],
    [t]
  );

  const handleTimeRangeSelect = useCallback(
    (range: TimeRange) => {
      if (range === 'custom') {
        setIsCustomOpen(true);
        return;
      }

      const option = timeRangeOptions.find((o) => o.value === range);
      if (!option) return;

      const { start, end } = option.getPeriod();
      const duration = end.getTime() - start.getTime();

      const primaryPeriod: TimePeriod = {
        id: `primary-${range}`,
        label: option.label,
        startDate: start,
        endDate: end,
        range,
      };

      const comparisonPeriod: TimePeriod = {
        id: `comparison-${range}`,
        label: t('previousPeriod'),
        startDate: new Date(start.getTime() - duration),
        endDate: start,
        range,
      };

      onChange({
        primaryPeriod,
        comparisonPeriod,
        comparisonType: 'previous',
      });
    },
    [timeRangeOptions, onChange, t]
  );

  const handleCustomApply = useCallback(() => {
    const start = parseISO(customStart);
    const end = parseISO(customEnd);

    if (!isValid(start) || !isValid(end)) {
      return;
    }

    if (start >= end) {
      return;
    }

    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxCustomRangeDays) {
      return;
    }

    const primaryPeriod: TimePeriod = {
      id: 'primary-custom',
      label: format(start, 'yyyy-MM-dd', { locale }),
      startDate: start,
      endDate: end,
      range: 'custom',
    };

    const duration = end.getTime() - start.getTime();
    const comparisonPeriod: TimePeriod = {
      id: 'comparison-custom',
      label: t('previousPeriod'),
      startDate: new Date(start.getTime() - duration),
      endDate: start,
      range: 'custom',
    };

    onChange({
      primaryPeriod,
      comparisonPeriod,
      comparisonType: 'previous',
    });

    setIsCustomOpen(false);
  }, [customStart, customEnd, onChange, t, locale, maxCustomRangeDays]);

  const handleYearOverYear = useCallback(() => {
    const end = new Date();
    const start = subYears(end, 1);

    const primaryPeriod: TimePeriod = {
      id: 'primary-yoy',
      label: t('currentYear'),
      startDate: start,
      endDate: end,
      range: '1y',
    };

    const comparisonPeriod: TimePeriod = {
      id: 'comparison-yoy',
      label: t('previousYear'),
      startDate: subYears(start, 1),
      endDate: start,
      range: '1y',
    };

    onChange({
      primaryPeriod,
      comparisonPeriod,
      comparisonType: 'year_over_year',
    });
  }, [onChange, t]);

  const currentRange = value.primaryPeriod.range;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {timeRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleTimeRangeSelect(option.value)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
              currentRange === option.value && value.comparisonType !== 'year_over_year'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
        <button
          onClick={() => handleTimeRangeSelect('custom')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
            currentRange === 'custom'
              ? 'bg-primary-50 border-primary-300 text-primary-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {t('custom')}
        </button>
        <button
          onClick={handleYearOverYear}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
            value.comparisonType === 'year_over_year'
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {t('yearOverYear')}
        </button>
      </div>

      {isCustomOpen && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('startDate')}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('endDate')}</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCustomOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 px-4 py-3 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-medium">{t('currentPeriod')}:</span>
          <span className="text-primary-600">
            {format(value.primaryPeriod.startDate, 'yyyy-MM-dd HH:mm', { locale })} -{' '}
            {format(value.primaryPeriod.endDate, 'yyyy-MM-dd HH:mm', { locale })}
          </span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="font-medium">{t('comparisonPeriod')}:</span>
          <span className="text-purple-600">
            {format(value.comparisonPeriod.startDate, 'yyyy-MM-dd HH:mm', { locale })} -{' '}
            {format(value.comparisonPeriod.endDate, 'yyyy-MM-dd HH:mm', { locale })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TimeRangeSelector;
