'use client';

import { useState, useEffect } from 'react';
import { DashboardCard } from '../common/DashboardCard';
import {
  UMAClient,
  ValidatorPerformanceHeatmapData,
  ValidatorPerformanceHeatmapDataByDay,
  TimeRange,
} from '@/lib/oracles/uma';
import { useI18n } from '@/lib/i18n/provider';
import { createLogger } from '@/lib/utils/logger';
import { semanticColors, baseColors } from '@/lib/config/colors';

const logger = createLogger('ValidatorPerformanceHeatmap');

type ViewMode = 'responseTime' | 'successRate';

interface TooltipData {
  validatorName: string;
  hour?: number;
  date?: string;
  value: number;
  type: ViewMode;
  x: number;
  y: number;
}

export function ValidatorPerformanceHeatmap() {
  const { t } = useI18n();
  const [data, setData] = useState<ValidatorPerformanceHeatmapData[]>([]);
  const [dataByDay, setDataByDay] = useState<ValidatorPerformanceHeatmapDataByDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('responseTime');
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new UMAClient();

        if (timeRange === '24H') {
          const heatmapData = await client.getValidatorPerformanceHeatmap();
          setData(heatmapData);
        } else {
          const heatmapDataByDay = await client.getValidatorPerformanceHeatmapByDays(7);
          setDataByDay(heatmapDataByDay);
        }
      } catch (error) {
        logger.error(
          'Failed to fetch heatmap data',
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const getColor = (value: number, type: ViewMode): string => {
    if (type === 'responseTime') {
      if (value <= 120) return semanticColors.success.DEFAULT;
      if (value <= 150) return semanticColors.warning.DEFAULT;
      return semanticColors.danger.DEFAULT;
    } else {
      if (value >= 99.5) return semanticColors.success.DEFAULT;
      if (value >= 99.0) return semanticColors.warning.DEFAULT;
      return semanticColors.danger.DEFAULT;
    }
  };

  const getOpacity = (value: number, type: ViewMode): number => {
    if (type === 'responseTime') {
      const normalized = Math.min(1, Math.max(0, (value - 50) / 150));
      return 0.3 + normalized * 0.7;
    } else {
      const normalized = (value - 95) / 5;
      return 0.3 + normalized * 0.7;
    }
  };

  const handleCellHover = (
    validatorName: string,
    hourOrDate: number | string,
    value: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (timeRange === '24H') {
      setTooltip({
        validatorName,
        hour: hourOrDate as number,
        value,
        type: viewMode,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    } else {
      setTooltip({
        validatorName,
        date: hourOrDate as string,
        value,
        type: viewMode,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  if (loading) {
    return (
      <DashboardCard title={t('uma.validatorAnalytics.performanceHeatmap')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-b-2" style={{ borderColor: baseColors.primary[600] }} />
        </div>
      </DashboardCard>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = dataByDay.length > 0 ? dataByDay[0].dailyData.map((d) => d.date) : [];

  return (
    <DashboardCard title={t('uma.validatorAnalytics.performanceHeatmap')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeRange('24H')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                timeRange === '24H'
                  ? 'text-white'
                  : 'hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: timeRange === '24H' ? baseColors.primary[600] : baseColors.gray[100],
                color: timeRange === '24H' ? 'white' : baseColors.gray[700]
              }}
            >
              24H
            </button>
            <button
              onClick={() => setTimeRange('7D')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                timeRange === '7D'
                  ? 'text-white'
                  : 'hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: timeRange === '7D' ? baseColors.primary[600] : baseColors.gray[100],
                color: timeRange === '7D' ? 'white' : baseColors.gray[700]
              }}
            >
              7D
            </button>
            <div className="w-px h-6 mx-2" style={{ backgroundColor: baseColors.gray[300] }} />
            <button
              onClick={() => setViewMode('responseTime')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'responseTime'
                  ? 'text-white'
                  : 'hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: viewMode === 'responseTime' ? baseColors.primary[600] : baseColors.gray[100],
                color: viewMode === 'responseTime' ? 'white' : baseColors.gray[700]
              }}
            >
              {t('uma.validatorAnalytics.responseTime')}
            </button>
            <button
              onClick={() => setViewMode('successRate')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'successRate'
                  ? 'text-white'
                  : 'hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: viewMode === 'successRate' ? baseColors.primary[600] : baseColors.gray[100],
                color: viewMode === 'successRate' ? 'white' : baseColors.gray[700]
              }}
            >
              {t('uma.validatorAnalytics.successRate')}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: semanticColors.success.DEFAULT }} />
              <span style={{ color: baseColors.gray[600] }}>
                {viewMode === 'responseTime'
                  ? t('uma.validatorAnalytics.legend.responseTimeExcellent')
                  : t('uma.validatorAnalytics.legend.successRateExcellent')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: semanticColors.warning.DEFAULT }} />
              <span style={{ color: baseColors.gray[600] }}>
                {viewMode === 'responseTime'
                  ? t('uma.validatorAnalytics.legend.responseTimeGood')
                  : t('uma.validatorAnalytics.legend.successRateGood')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: semanticColors.danger.DEFAULT }} />
              <span style={{ color: baseColors.gray[600] }}>
                {viewMode === 'responseTime'
                  ? t('uma.validatorAnalytics.legend.responseTimePoor')
                  : t('uma.validatorAnalytics.legend.successRatePoor')}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex mb-2 pl-32">
              {timeRange === '24H'
                ? hours.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 text-center text-xs"
                      style={{ minWidth: '24px', color: baseColors.gray[500] }}
                    >
                      {hour}
                    </div>
                  ))
                : days.map((day) => (
                    <div
                      key={day}
                      className="flex-1 text-center text-xs"
                      style={{ minWidth: '60px', color: baseColors.gray[500] }}
                    >
                      {day}
                    </div>
                  ))}
            </div>

            <div className="space-y-1">
              {timeRange === '24H'
                ? data.map((validator) => (
                    <div key={validator.validatorId} className="flex items-center gap-2">
                      <div className="w-32 text-sm truncate" style={{ color: baseColors.gray[700] }}>
                        {validator.validatorName}
                      </div>
                      <div className="flex-1 flex gap-0.5">
                        {validator.hourlyData.map((hourData) => {
                          const value =
                            viewMode === 'responseTime'
                              ? hourData.responseTime
                              : hourData.successRate;
                          const color = getColor(value, viewMode);
                          const opacity = getOpacity(value, viewMode);

                          return (
                            <div
                              key={hourData.hour}
                              className="flex-1 h-6 rounded cursor-pointer transition-transform hover:scale-110 hover:z-10"
                              style={{
                                backgroundColor: color,
                                opacity,
                                minWidth: '24px',
                              }}
                              onMouseEnter={(e) =>
                                handleCellHover(validator.validatorName, hourData.hour, value, e)
                              }
                              onMouseLeave={handleCellLeave}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                : dataByDay.map((validator) => (
                    <div key={validator.validatorId} className="flex items-center gap-2">
                      <div className="w-32 text-sm truncate" style={{ color: baseColors.gray[700] }}>
                        {validator.validatorName}
                      </div>
                      <div className="flex-1 flex gap-0.5">
                        {validator.dailyData.map((dayData) => {
                          const value =
                            viewMode === 'responseTime'
                              ? dayData.avgResponseTime
                              : dayData.avgSuccessRate;
                          const color = getColor(value, viewMode);
                          const opacity = getOpacity(value, viewMode);

                          return (
                            <div
                              key={dayData.dayIndex}
                              className="flex-1 h-6 rounded cursor-pointer transition-transform hover:scale-110 hover:z-10"
                              style={{
                                backgroundColor: color,
                                opacity,
                                minWidth: '60px',
                              }}
                              onMouseEnter={(e) =>
                                handleCellHover(validator.validatorName, dayData.date, value, e)
                              }
                              onMouseLeave={handleCellLeave}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {tooltip && (
          <div
            className="fixed z-50 px-3 py-2 text-white text-xs pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 10,
              transform: 'translate(-50%, -100%)',
              backgroundColor: baseColors.gray[900],
            }}
          >
            <div className="font-semibold">{tooltip.validatorName}</div>
            {tooltip.hour !== undefined ? (
              <div>
                {t('uma.validatorAnalytics.hour')}: {tooltip.hour}:00
              </div>
            ) : (
              <div>
                {t('uma.validatorAnalytics.date')}: {tooltip.date}
              </div>
            )}
            <div>
              {tooltip.type === 'responseTime'
                ? `${t('uma.validatorAnalytics.responseTime')}: ${tooltip.value}ms`
                : `${t('uma.validatorAnalytics.successRate')}: ${tooltip.value}%`}
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
