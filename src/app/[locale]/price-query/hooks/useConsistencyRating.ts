import { useMemo } from 'react';

import { useTranslations } from '@/i18n';

export function useConsistencyRating(stdDevPercent: number) {
  const t = useTranslations();

  return useMemo(() => {
    if (stdDevPercent <= 0) return null;

    if (stdDevPercent < 0.1) {
      return {
        label: t('priceQuery.stats.consistency.excellent'),
        color: 'text-emerald-600',
      };
    }
    if (stdDevPercent < 0.3) {
      return {
        label: t('priceQuery.stats.consistency.good'),
        color: 'text-blue-600',
      };
    }
    if (stdDevPercent < 0.5) {
      return {
        label: t('priceQuery.stats.consistency.fair'),
        color: 'text-amber-600',
      };
    }
    return {
      label: t('priceQuery.stats.consistency.poor'),
      color: 'text-red-600',
    };
  }, [stdDevPercent, t]);
}
