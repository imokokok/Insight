'use client';

import { useState, useCallback, useMemo } from 'react';

import { DropdownSelect } from '@/components/ui';

export interface MutePeriodConfig {
  enabled: boolean;
  duration: number; // in minutes
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  recurring: boolean;
  daysOfWeek?: number[]; // 0-6, 0 = Sunday
}

interface AlertMutePeriodProps {
  config: MutePeriodConfig;
  onChange: (config: MutePeriodConfig) => void;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '24 hours' },
  { value: -1, label: 'Custom schedule' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function AlertMutePeriod({ config, onChange }: AlertMutePeriodProps) {
  const [localConfig, setLocalConfig] = useState<MutePeriodConfig>(config);

  const durationOptions = useMemo(() => {
    return DURATION_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const handleToggleEnable = useCallback(() => {
    const newConfig = { ...localConfig, enabled: !localConfig.enabled };
    setLocalConfig(newConfig);
    onChange(newConfig);
  }, [localConfig, onChange]);

  const handleDurationChange = useCallback(
    (value: number) => {
      const newConfig = { ...localConfig, duration: value };
      setLocalConfig(newConfig);
      onChange(newConfig);
    },
    [localConfig, onChange]
  );

  const handleRecurringChange = useCallback(
    (recurring: boolean) => {
      const newConfig = { ...localConfig, recurring };
      setLocalConfig(newConfig);
      onChange(newConfig);
    },
    [localConfig, onChange]
  );

  const handleTimeChange = useCallback(
    (field: 'startTime' | 'endTime') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newConfig = { ...localConfig, [field]: e.target.value };
      setLocalConfig(newConfig);
      onChange(newConfig);
    },
    [localConfig, onChange]
  );

  const handleDayToggle = useCallback(
    (day: number) => {
      const currentDays = localConfig.daysOfWeek || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day].sort();
      const newConfig = { ...localConfig, daysOfWeek: newDays };
      setLocalConfig(newConfig);
      onChange(newConfig);
    },
    [localConfig, onChange]
  );

  const isCustomSchedule = localConfig.duration === -1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Mute Period</h4>
          <p className="text-xs text-gray-500 mt-0.5">Temporarily silence alert notifications</p>
        </div>
        <button
          type="button"
          onClick={handleToggleEnable}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            localConfig.enabled ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              localConfig.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {localConfig.enabled && (
        <div className="space-y-4 pt-3 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
            <DropdownSelect
              options={durationOptions}
              value={localConfig.duration}
              onChange={(value) => handleDurationChange(value as number)}
            />
          </div>

          {isCustomSchedule && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={localConfig.startTime || '22:00'}
                    onChange={handleTimeChange('startTime')}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                  <input
                    type="time"
                    value={localConfig.endTime || '08:00'}
                    onChange={handleTimeChange('endTime')}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={localConfig.recurring}
                    onChange={(e) => handleRecurringChange(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  Recurring
                </label>
              </div>

              {localConfig.recurring && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Days of Week
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = (localConfig.daysOfWeek || []).includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleDayToggle(day.value)}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-warning-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Alerts will be muted during this period</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isInMutePeriod(config: MutePeriodConfig): boolean {
  if (!config.enabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (config.duration > 0) {
    // Fixed duration from now (for temporary mute)
    return false; // This should be checked at trigger time with stored start time
  }

  // Custom schedule
  if (config.startTime && config.endTime) {
    const [startHour, startMin] = config.startTime.split(':').map(Number);
    const [endHour, endMin] = config.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Check day of week for recurring
    if (config.recurring && config.daysOfWeek && config.daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!config.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check time range
    if (startMinutes <= endMinutes) {
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
      // Overnight (e.g., 22:00 - 08:00)
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }
  }

  return false;
}

function formatMutePeriod(config: MutePeriodConfig, t: (key: string) => string): string {
  if (!config.enabled) return 'Disabled';

  if (config.duration > 0) {
    return t(`alerts.mute.duration.${config.duration}`) || `${config.duration} minutes`;
  }

  if (config.startTime && config.endTime) {
    const timeRange = `${config.startTime} - ${config.endTime}`;
    if (config.recurring && config.daysOfWeek && config.daysOfWeek.length > 0) {
      const days = config.daysOfWeek
        .map(
          (d) =>
            t(`alerts.mute.daysOfWeek.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d]}`) ||
            DAYS_OF_WEEK[d].label
        )
        .join(', ');
      return `${timeRange} (${days})`;
    }
    return timeRange;
  }

  return 'Enabled';
}
