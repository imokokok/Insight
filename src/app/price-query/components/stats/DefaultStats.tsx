import { StatCard } from '@/components/ui/StatCard';
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
  const stdDevRating = getStatRating('stddev', standardDeviationPercent);

  return (
    <>
      <StatCard
        title={'priceQuery.stats.maxPrice'}
        value={formatPrice(maxPrice)}
        description={'priceQuery.stats.maxPriceDesc'}
      />
      <StatCard
        title={'priceQuery.stats.minPrice'}
        value={formatPrice(minPrice)}
        description={'priceQuery.stats.minPriceDesc'}
      />
      <StatCard
        title={'priceQuery.stats.avgPrice'}
        value={formatPrice(avgPrice)}
        description={'priceQuery.stats.avgPriceDesc'}
      />
      <StatCard
        title={'priceQuery.stats.priceRange'}
        value={formatPrice(priceRange)}
        description={'priceQuery.stats.priceRangeDesc'}
      />
      <StatCard
        title={'priceQuery.volume24h'}
        value={formatLargeNumber(volume24h)}
        description={'priceQuery.stats.volume24hShortDesc'}
      />
      <StatCard
        title={'priceQuery.stats.consistencyRating'}
        value={standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
        description={'priceQuery.stats.consistencyRatingDesc'}
        rating={standardDeviationPercent > 0 ? stdDevRating : null}
      />
    </>
  );
}
