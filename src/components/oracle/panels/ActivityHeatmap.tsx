import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function ActivityHeatmap({
  hourlyData,
  onHourClick,
}: {
  hourlyData: number[];
  onHourClick?: (hour: number) => void;
}) {
  const t = useTranslations();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const maxValue = Math.max(...hourlyData);
  const minValue = Math.min(...hourlyData);

  const getIntensity = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio > 0.8) return 'bg-blue-400';
    if (ratio > 0.6) return 'bg-blue-500';
    if (ratio > 0.4) return 'bg-blue-600';
    if (ratio > 0.2) return 'bg-blue-700';
    return 'bg-blue-200';
  };

  const getHourLabel = (index: number) => {
    return `${index.toString().padStart(2, '0')}:00`;
  };

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    onHourClick?.(hour);
  };

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('networkHealth.activityHeatmap.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('networkHealth.activityHeatmap.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{t('networkHealth.activityHeatmap.low')}</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-blue-200"></div>
            <div className="w-3 h-3 bg-blue-700"></div>
            <div className="w-3 h-3 bg-blue-600"></div>
            <div className="w-3 h-3 bg-blue-500"></div>
            <div className="w-3 h-3 bg-blue-400"></div>
          </div>
          <span>{t('networkHealth.activityHeatmap.high')}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1.5">
        {hourlyData.map((value, index) => (
          <div key={index} className="group relative">
            <div
              className={`h-10 ${getIntensity(value)} transition-all duration-300 hover:ring-2 hover:ring-blue-300 cursor-pointer ${
                selectedHour === index ? 'ring-2 ring-blue-500' : ''
              }`}
              title={`${getHourLabel(index)}: ${value.toLocaleString()} ${t('networkHealth.activityHeatmap.requests')}`}
              onClick={() => handleHourClick(index)}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
              {getHourLabel(index)}: {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-1.5 mt-2">
        {[0, 4, 8, 12, 16, 20].map((hour) => (
          <div key={hour} className="text-center">
            <span className="text-xs text-gray-500">{getHourLabel(hour)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {t('networkHealth.activityHeatmap.totalRequests')}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {hourlyData.reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('networkHealth.activityHeatmap.peakHour')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {getHourLabel(hourlyData.indexOf(maxValue))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('networkHealth.activityHeatmap.avgPerHour')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {Math.round(hourlyData.reduce((a, b) => a + b, 0) / 24).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('networkHealth.activityHeatmap.peakRequests')}</p>
          <p className="text-sm font-semibold text-gray-900">{maxValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
