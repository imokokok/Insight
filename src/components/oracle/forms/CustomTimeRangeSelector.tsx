'use client';

import { useState, useCallback, useMemo } from 'react';

import { Calendar, Clock, ChevronDown, Globe } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useTranslations } from '@/i18n';

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: string;
}

export interface TimeRangePreset {
  id: string;
  label: string;
  shortLabel: string;
  getValue: () => { start: Date; end: Date };
}

const DEFAULT_PRESETS: TimeRangePreset[] = [
  {
    id: '1h',
    label: 'Last Hour',
    shortLabel: '1H',
    getValue: () => ({
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    id: '24h',
    label: 'Last 24 Hours',
    shortLabel: '24H',
    getValue: () => ({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    id: '7d',
    label: 'Last 7 Days',
    shortLabel: '7D',
    getValue: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    id: '30d',
    label: 'Last 30 Days',
    shortLabel: '30D',
    getValue: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    id: '90d',
    label: 'Last 90 Days',
    shortLabel: '90D',
    getValue: () => ({
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    id: '1y',
    label: 'Last Year',
    shortLabel: '1Y',
    getValue: () => ({
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    id: 'all',
    label: 'All Time',
    shortLabel: 'All',
    getValue: () => ({
      start: new Date(0),
      end: new Date(),
    }),
  },
];

const QUICK_SELECT_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'thisMonth', label: 'This Month' },
];

const TIMEZONES = [
  { id: 'UTC', label: 'UTC' },
  { id: 'America/New_York', label: 'EST/EDT' },
  { id: 'America/Los_Angeles', label: 'PST/PDT' },
  { id: 'Europe/London', label: 'GMT/BST' },
  { id: 'Asia/Shanghai', label: 'CST (China)' },
  { id: 'Asia/Tokyo', label: 'JST' },
];

interface CustomTimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  presets?: TimeRangePreset[];
  showTimezone?: boolean;
  compact?: boolean;
}

export function CustomTimeRangeSelector({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  showTimezone = false,
  compact = false,
}: CustomTimeRangeSelectorProps) {
  const t = useTranslations();
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const [customStart, setCustomStart] = useState(value.start.toISOString().slice(0, 16));
  const [customEnd, setCustomEnd] = useState(value.end.toISOString().slice(0, 16));

  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === value.preset);
  }, [presets, value.preset]);

  const handlePresetClick = useCallback(
    (preset: TimeRangePreset) => {
      const { start, end } = preset.getValue();
      onChange({ start, end, preset: preset.id });
      setShowCustomPanel(false);
    },
    [onChange]
  );

  const handleQuickSelect = useCallback(
    (optionId: string) => {
      const now = new Date();
      let start: Date;

      switch (optionId) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          break;
        case 'thisMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          return;
      }

      onChange({ start, end: now, preset: optionId });
      setShowCustomPanel(false);
    },
    [onChange]
  );

  const handleCustomApply = useCallback(() => {
    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start < end) {
      onChange({ start, end, preset: 'custom' });
      setShowCustomPanel(false);
    }
  }, [customStart, customEnd, onChange]);

  const formatDateTimeLocal = (date: Date): string => {
    return date.toISOString().slice(0, 16);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {presets.slice(0, 5).map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              activePreset?.id === preset.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {preset.shortLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activePreset?.id === preset.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {preset.shortLabel}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCustomPanel(!showCustomPanel)}
          className={showCustomPanel ? 'bg-gray-100' : ''}
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          {t('api3.timeRange.custom') || 'Custom'}
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>

        {showTimezone && (
          <div className="flex items-center gap-1.5 ml-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="text-sm border-0 bg-transparent text-gray-600 focus:ring-0 cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showCustomPanel && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('api3.timeRange.quickSelect') || 'Quick Select'}
              </h3>
              <div className="flex gap-2">
                {QUICK_SELECT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleQuickSelect(option.id)}
                    className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('api3.timeRange.customRange') || 'Custom Range'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t('api3.timeRange.start') || 'Start Date'}
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t('api3.timeRange.end') || 'End Date'}
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowCustomPanel(false)}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button size="sm" className="flex-1" onClick={handleCustomApply}>
                {t('common.apply') || 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        {t('api3.timeRange.selected') || 'Selected'}:{' '}
        <span className="font-medium text-gray-700">
          {value.start.toLocaleDateString()} - {value.end.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export { DEFAULT_PRESETS };
