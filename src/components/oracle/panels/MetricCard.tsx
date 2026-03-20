import { useTranslations } from 'next-intl';
import { NetworkMetric } from './types';

export function MetricCard({ metric }: { metric: NetworkMetric }) {
  const t = useTranslations();
  const trendColor =
    metric.trendDirection === 'up'
      ? 'text-success-600'
      : metric.trendDirection === 'down'
        ? 'text-danger-600'
        : 'text-gray-500';

  const trendIcon =
    metric.trendDirection === 'up' ? '↑' : metric.trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{metric.title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-900 text-xl font-bold">{metric.value}</span>
            {metric.unit && <span className="text-gray-500 text-sm">{metric.unit}</span>}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>
              {metric.trend > 0 ? '+' : ''}
              {metric.trend}%
            </span>
            <span className="text-gray-400 ml-1">{t('networkHealth.vsLastWeek')}</span>
          </div>
        </div>
        <div className="p-2.5 bg-primary-50 border border-primary-100 rounded-lg text-primary-600">{metric.icon}</div>
      </div>
    </div>
  );
}
