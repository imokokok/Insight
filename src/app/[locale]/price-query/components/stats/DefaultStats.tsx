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
