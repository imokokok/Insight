import { StatCard } from '@/components/ui/StatCard';
import { getStatRating } from '@/lib/utils/stat-rating';

import { formatPrice, formatLargeNumber } from '../../utils/queryResultsUtils';

interface DefaultStatsProps {
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  priceRange: number;
  volume24h: number | null | undefined;
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
        title="Max Price"
        value={formatPrice(maxPrice)}
        description="Highest price in the selected period"
      />
      <StatCard
        title="Min Price"
        value={formatPrice(minPrice)}
        description="Lowest price in the selected period"
      />
      <StatCard
        title="Average Price"
        value={formatPrice(avgPrice)}
        description="Average price across all data points"
      />
      <StatCard
        title="Price Range"
        value={formatPrice(priceRange)}
        description="Difference between max and min price"
      />
      <StatCard
        title="24h Volume"
        value={volume24h ? formatLargeNumber(volume24h) : 'N/A'}
        description="Trading volume in the last 24 hours"
      />
      <StatCard
        title="Consistency Rating"
        value={standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
        description="Price consistency across oracles"
        rating={standardDeviationPercent > 0 ? stdDevRating : null}
      />
    </>
  );
}
