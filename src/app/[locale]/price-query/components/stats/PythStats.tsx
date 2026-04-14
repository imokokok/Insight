import { Hash, Settings, BarChart3, Clock, Shield } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

interface PythStatsProps {
  priceId?: string;
  exponent?: number;
  conf?: number;
  publishTime?: number;
  confidenceInterval?: {
    widthPercentage?: number;
  };
  confidence?: number;
}

function StatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: React.ReactNode;
  description?: string;
}) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm',
        description && 'group'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <p
        className="text-lg font-bold text-gray-900 font-mono truncate"
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
      {description && (
        <div
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg',
            'whitespace-nowrap pointer-events-none',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
          role="tooltip"
        >
          {description}
          <span
            className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 -mt-1',
              'w-2 h-2 bg-gray-900 border-4 border-gray-900',
              'border-l-transparent border-r-transparent border-b-transparent'
            )}
          />
        </div>
      )}
    </div>
  );
}

export function PythStats({
  priceId,
  exponent,
  conf,
  publishTime,
  confidenceInterval,
  confidence,
}: PythStatsProps) {
  const t = useTranslations();

  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-purple-500"
        title={t('priceQuery.stats.priceId') || 'Price Feed ID'}
        value={priceId ? `${priceId.slice(0, 6)}...${priceId.slice(-4)}` : '-'}
        description="Pyth 价格源的唯一定价标识符"
      />
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title={t('priceQuery.stats.exponent') || 'Exponent'}
        value={exponent !== undefined ? `10^${exponent}` : '-'}
        description="价格指数，实际价格 = 原始值 × 10^exponent"
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.confidenceAbs') || 'Confidence'}
        value={conf !== undefined ? `$${conf.toFixed(4)}` : '-'}
        description="置信区间的绝对宽度，表示价格的不确定性范围"
      />
      <StatCard
        icon={Clock}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.publishTime') || 'Published'}
        value={publishTime ? new Date(publishTime).toLocaleTimeString() : '-'}
        description="价格数据最近一次发布的时间"
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.confidenceWidth') || 'Spread %'}
        value={
          confidenceInterval?.widthPercentage !== undefined
            ? `${confidenceInterval.widthPercentage.toFixed(4)}%`
            : '-'
        }
        description="置信区间宽度占价格的百分比，越小表示数据越可信"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.confidenceScore') || 'Confidence Score'}
        value={confidence !== undefined ? `${confidence.toFixed(2)}%` : '-'}
        description="价格数据的置信度评分，越高表示数据越可靠"
      />
    </>
  );
}
