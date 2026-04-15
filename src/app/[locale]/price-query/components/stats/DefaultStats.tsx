import { StatCard } from '@/components/ui/StatCard';
import { useTranslations } from '@/i18n';
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
        description={t('priceQuery.stats.maxPriceDesc')}
      />
      <StatCard
        title={t('priceQuery.stats.minPrice')}
        value={`$${formatPrice(minPrice)}`}
        description={t('priceQuery.stats.minPriceDesc')}
      />
      <StatCard
        title={t('priceQuery.stats.avgPrice')}
        value={`$${formatPrice(avgPrice)}`}
        description={t('priceQuery.stats.avgPriceDesc')}
      />
      <StatCard
        title={t('priceQuery.stats.priceRange')}
        value={`$${formatPrice(priceRange)}`}
        description={t('priceQuery.stats.priceRangeDesc')}
      />
      <StatCard
        title={t('priceQuery.volume24h')}
        value={formatLargeNumber(volume24h)}
        description={t('priceQuery.stats.volume24hShortDesc')}
      />
      <StatCard
        title={t('priceQuery.stats.consistencyRating')}
        value={standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
        description={t('priceQuery.stats.consistencyRatingDesc')}
        rating={standardDeviationPercent > 0 ? stdDevRating : null}
      />
    </>
  );
}
