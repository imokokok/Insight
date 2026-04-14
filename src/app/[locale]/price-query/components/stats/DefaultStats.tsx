import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { getStatRating } from '@/lib/utils/stat-rating';

import { formatPrice, formatLargeNumber } from '../../utils/queryResultsUtils';

interface DefaultStatsProps {
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  priceRange: number;
  volume24h: number;
  consistencyRating: {
    label: string;
    color: string;
  } | null;
  standardDeviationPercent: number;
}

function StatCard({
  title,
  value,
  description,
  rating,
}: {
  title: string;
  value: React.ReactNode;
  description?: string;
  rating?: { label: string; color: string; bgColor: string } | null;
}) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm',
        description && 'group'
      )}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{title}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-lg font-bold text-gray-900 font-mono">{value}</p>
        {rating && (
          <span
            className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded"
            style={{ color: rating.color, backgroundColor: rating.bgColor }}
          >
            {rating.label}
          </span>
        )}
      </div>
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

export function DefaultStats({
  maxPrice,
  minPrice,
  avgPrice,
  priceRange,
  volume24h,
  consistencyRating,
  standardDeviationPercent,
}: DefaultStatsProps) {
  const t = useTranslations();

  const stdDevRating = getStatRating('stddev', standardDeviationPercent);

  return (
    <>
      <StatCard
        title={t('priceQuery.stats.maxPrice')}
        value={`$${formatPrice(maxPrice)}`}
        description="所选时间范围内的最高价格"
      />
      <StatCard
        title={t('priceQuery.stats.minPrice')}
        value={`$${formatPrice(minPrice)}`}
        description="所选时间范围内的最低价格"
      />
      <StatCard
        title={t('priceQuery.stats.avgPrice')}
        value={`$${formatPrice(avgPrice)}`}
        description="所选时间范围内的平均价格"
      />
      <StatCard
        title={t('priceQuery.stats.priceRange')}
        value={`$${formatPrice(priceRange)}`}
        description="最高价与最低价之间的差距"
      />
      <StatCard
        title={t('priceQuery.volume24h')}
        value={formatLargeNumber(volume24h)}
        description="过去24小时的交易量"
      />
      <StatCard
        title={t('priceQuery.stats.consistencyRating')}
        value={standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
        description="价格波动的统计度量，值越小表示价格越稳定"
        rating={standardDeviationPercent > 0 ? stdDevRating : null}
      />
    </>
  );
}
