'use client';

import { useState, useMemo, useCallback } from 'react';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import {
  useSelectedTimeRange,
  useSetSelectedTimeRange,
  useSelectedHour,
  useSetSelectedHour,
  useSyncEnabled,
  SelectedTimeRange,
} from '@/stores/uiStore';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UpdateFrequencyHeatmap');

interface HourlyData {
  hour: number;
  updateCount: number;
  avgLatency: number;
  isAnomaly: boolean;
}

interface UpdateFrequencyHeatmapProps {
  hourlyActivity?: number[];
  updateFrequency?: number;
  date?: Date;
}

export function UpdateFrequencyHeatmap({
  hourlyActivity,
  updateFrequency = 1,
  date = new Date(),
}: UpdateFrequencyHeatmapProps) {
  const { t } = useI18n();
  const selectedHour = useSelectedHour();
  const setSelectedHour = useSetSelectedHour();
  const setSelectedTimeRange = useSetSelectedTimeRange();
  const syncEnabled = useSyncEnabled();
  const [hoveredCell, setHoveredCell] = useState<{ hour: number; count: number } | null>(null);

  const hourlyData: HourlyData[] = useMemo(() => {
    const activity = hourlyActivity || generateDefaultActivity();
    const avgCount = activity.reduce((a, b) => a + b, 0) / activity.length;
    const stdDev = Math.sqrt(
      activity.reduce((sum, val) => sum + Math.pow(val - avgCount, 2), 0) / activity.length
    );

    return activity.map((count, index) => ({
      hour: index,
      updateCount: count,
      avgLatency: 50,
      isAnomaly: count < avgCount - stdDev * 1.5,
    }));
  }, [hourlyActivity]);

  const maxCount = useMemo(() => {
    return Math.max(...hourlyData.map((d) => d.updateCount));
  }, [hourlyData]);

  const avgHourlyUpdates = useMemo(() => {
    return Math.round(hourlyData.reduce((sum, d) => sum + d.updateCount, 0) / hourlyData.length);
  }, [hourlyData]);

  const anomalyHours = useMemo(() => {
    return hourlyData.filter((d) => d.isAnomaly);
  }, [hourlyData]);

  const getIntensityColor = (count: number, isAnomaly: boolean) => {
    if (isAnomaly) {
      return 'bg-yellow-400';
    }

    const intensity = count / maxCount;
    if (intensity >= 0.8) return 'bg-purple-600';
    if (intensity >= 0.6) return 'bg-purple-500';
    if (intensity >= 0.4) return 'bg-purple-400';
    if (intensity >= 0.2) return 'bg-purple-300';
    return 'bg-purple-200';
  };

  const getIntensityText = (count: number) => {
    const intensity = count / maxCount;
    if (intensity >= 0.6) return 'text-white';
    return 'text-purple-900';
  };

  const handleCellClick = useCallback(
    (hour: number) => {
      if (!syncEnabled) return;

      const selectedDate = new Date(date);
      selectedDate.setHours(hour, 0, 0, 0);
      const startTime = selectedDate.getTime();
      const endTime = startTime + 60 * 60 * 1000; // 1 hour later

      const timeRange: SelectedTimeRange = {
        startTime,
        endTime,
        startHour: hour,
        endHour: hour + 1,
        label: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
      };

      setSelectedHour(hour);
      setSelectedTimeRange(timeRange);
      logger.info(`Selected hour ${hour}, time range: ${timeRange.label}`);
    },
    [date, setSelectedHour, setSelectedTimeRange, syncEnabled]
  );

  const isCellSelected = (hour: number) => {
    return selectedHour === hour;
  };

  return (
    <DashboardCard
      title={t('updateFrequency.title')}
      headerAction={
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {t('updateFrequency.updateFrequencyLabel', { frequency: updateFrequency })}
          </span>
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2  bg-yellow-400" />
            <span className="text-gray-500">{t('updateFrequency.anomaly')}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50  p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">{t('updateFrequency.avgHourlyUpdates')}</p>
            <p className="text-xl font-bold text-blue-700">{avgHourlyUpdates.toLocaleString()}</p>
          </div>
          <div className="bg-green-50  p-3 text-center">
            <p className="text-xs text-green-600 mb-1">{t('updateFrequency.maxUpdateFrequency')}</p>
            <p className="text-xl font-bold text-green-700">{maxCount.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50  p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">
              {t('updateFrequency.minUpdateFrequency')}
            </p>
            <p className="text-xl font-bold text-purple-700">
              {Math.min(...hourlyData.map((d) => d.updateCount)).toLocaleString()}
            </p>
          </div>
          <div className="bg-yellow-50  p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">
              {t('updateFrequency.anomalyPeriodCount')}
            </p>
            <p className="text-xl font-bold text-yellow-700">{anomalyHours.length}</p>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-12 gap-1">
            {hourlyData.map((data) => {
              const isSelected = isCellSelected(data.hour);
              return (
                <div
                  key={data.hour}
                  className={`relative aspect-square rounded-md ${getIntensityColor(
                    data.updateCount,
                    data.isAnomaly
                  )} ${getIntensityText(data.updateCount)} flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10 ${
                    isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-110 z-20 ' : ''
                  } ${syncEnabled ? '' : 'cursor-not-allowed opacity-80'}`}
                  onMouseEnter={() => setHoveredCell({ hour: data.hour, count: data.updateCount })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => handleCellClick(data.hour)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCellClick(data.hour);
                    }
                  }}
                  aria-label={`${data.hour.toString().padStart(2, '0')}:00 - ${(data.hour + 1).toString().padStart(2, '0')}:00, ${data.updateCount} updates`}
                  aria-pressed={isSelected}
                >
                  {data.hour}
                  {data.isAnomaly && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300  animate-pulse" />
                  )}
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500  border-2 border-white flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>

          {hoveredCell && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900 text-white text-xs  px-3 py-2 z-20 ">
              <div className="font-semibold">
                {hoveredCell.hour.toString().padStart(2, '0')}:00 -{' '}
                {(hoveredCell.hour + 1).toString().padStart(2, '0')}:00
              </div>
              <div>
                {t('updateFrequency.updateCount')}: {hoveredCell.count.toLocaleString()}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {syncEnabled
                  ? selectedHour === hoveredCell.hour
                    ? '已选中'
                    : '点击查看详情'
                  : '同步已禁用'}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-gray-500 mr-2">{t('updateFrequency.low')}</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded bg-purple-200" />
            <div className="w-4 h-4 rounded bg-purple-300" />
            <div className="w-4 h-4 rounded bg-purple-400" />
            <div className="w-4 h-4 rounded bg-purple-500" />
            <div className="w-4 h-4 rounded bg-purple-600" />
          </div>
          <span className="text-xs text-gray-500 ml-2">{t('updateFrequency.high')}</span>
        </div>

        {anomalyHours.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200  p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                  {t('updateFrequency.anomalyDetected')}
                </h4>
                <p className="text-xs text-yellow-700">
                  {t('updateFrequency.anomalyPeriodsDesc')}
                  {anomalyHours.map((h) => ` ${h.hour.toString().padStart(2, '0')}:00`).join(',')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border border-gray-200  overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">
              {t('updateFrequency.hourlyStats')}
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('updateFrequency.period')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('updateFrequency.updateCount')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('updateFrequency.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hourlyData.map((data) => (
                  <tr
                    key={data.hour}
                    className={`${data.isAnomaly ? 'bg-yellow-50' : ''} hover:bg-gray-50`}
                  >
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {data.hour.toString().padStart(2, '0')}:00 -{' '}
                      {(data.hour + 1).toString().padStart(2, '0')}:00
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                      {data.updateCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5  text-xs font-medium ${
                          data.isAnomaly
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {data.isAnomaly
                          ? t('updateFrequency.anomaly')
                          : t('updateFrequency.normal')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function generateDefaultActivity(): number[] {
  const baseActivity = [
    5000, 4500, 4000, 3500, 3000, 3500, 4500, 6500, 9000, 11000, 13000, 14000, 13500, 13000, 12500,
    12800, 13200, 13800, 13500, 11500, 10000, 8000, 6500, 5500,
  ];

  return baseActivity.map((val) => {
    const variance = val * (Math.random() * 0.2 - 0.1);
    return Math.round(val + variance);
  });
}
