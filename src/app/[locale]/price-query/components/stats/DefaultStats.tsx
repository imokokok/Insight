import { useTranslations } from '@/i18n';

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

  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {t('priceQuery.stats.maxPrice')}
        </p>
        <p className="text-lg font-bold text-gray-900 font-mono">${formatPrice(maxPrice)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {t('priceQuery.stats.minPrice')}
        </p>
        <p className="text-lg font-bold text-gray-900 font-mono">${formatPrice(minPrice)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {t('priceQuery.stats.avgPrice')}
        </p>
        <p className="text-lg font-bold text-gray-900 font-mono">${formatPrice(avgPrice)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {t('priceQuery.stats.priceRange')}
        </p>
        <p className="text-lg font-bold text-gray-900 font-mono">${formatPrice(priceRange)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {t('priceQuery.volume24h')}
        </p>
        <p className="text-lg font-bold text-gray-900 font-mono">{formatLargeNumber(volume24h)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {t('priceQuery.stats.consistencyRating')}
        </p>
        <p
          className={`text-lg font-bold ${
            standardDeviationPercent > 0 ? consistencyRating?.color : 'text-gray-900'
          }`}
        >
          {standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
        </p>
      </div>
    </>
  );
}
