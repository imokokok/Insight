'use client';

import { useState, useEffect } from 'react';
import { DashboardCard } from './DashboardCard';
import { UMAClient, ValidatorPerformanceHeatmapData } from '@/lib/oracles/uma';
import { useI18n } from '@/lib/i18n/context';

type ViewMode = 'responseTime' | 'successRate';

interface TooltipData {
  validatorName: string;
  hour: number;
  value: number;
  type: ViewMode;
  x: number;
  y: number;
}

export function ValidatorPerformanceHeatmap() {
  const { t } = useI18n();
  const [data, setData] = useState<ValidatorPerformanceHeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('responseTime');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new UMAClient();
        const heatmapData = await client.getValidatorPerformanceHeatmap();
        setData(heatmapData);
      } catch (error) {
        console.error('Failed to fetch heatmap data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getColor = (value: number, type: ViewMode): string => {
    if (type === 'responseTime') {
      if (value <= 120) return '#10B981';
      if (value <= 150) return '#F59E0B';
      return '#EF4444';
    } else {
      if (value >= 99.5) return '#10B981';
      if (value >= 99.0) return '#F59E0B';
      return '#EF4444';
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
    hour: number,
    value: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      validatorName,
      hour,
      value,
      type: viewMode,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  if (loading) {
    return (
      <DashboardCard title={t('uma.validatorAnalytics.performanceHeatmap')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardCard>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <DashboardCard title={t('uma.validatorAnalytics.performanceHeatmap')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('responseTime')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'responseTime'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('uma.validatorAnalytics.responseTime')}
            </button>
            <button
              onClick={() => setViewMode('successRate')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'successRate'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('uma.validatorAnalytics.successRate')}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
              <span className="text-gray-600">
                {viewMode === 'responseTime' ? '< 120ms' : '≥ 99.5%'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-gray-600">
                {viewMode === 'responseTime' ? '120-150ms' : '99.0-99.5%'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
              <span className="text-gray-600">
                {viewMode === 'responseTime' ? '> 150ms' : '< 99.0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex mb-2 pl-32">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-xs text-gray-500"
                  style={{ minWidth: '24px' }}
                >
                  {hour}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {data.map((validator) => (
                <div key={validator.validatorId} className="flex items-center gap-2">
                  <div className="w-32 text-sm text-gray-700 truncate">
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
              ))}
            </div>
          </div>
        </div>

        {tooltip && (
          <div
            className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 10,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold">{tooltip.validatorName}</div>
            <div>
              {t('uma.validatorAnalytics.hour')}: {tooltip.hour}:00
            </div>
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
