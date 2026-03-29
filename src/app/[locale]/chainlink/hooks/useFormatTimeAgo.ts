'use client';

import { useTranslations } from '@/i18n';
import { formatTimeAgo } from '../utils/format';

export function useFormatTimeAgo() {
  const t = useTranslations();

  return (date: Date) => formatTimeAgo(date, {
    secondsAgo: (count) => t('common.time.secondsAgo', { count }),
    minutesAgo: (count) => t('common.time.minutesAgo', { count }),
    hoursAgo: (count) => t('common.time.hoursAgo', { count }),
    daysAgo: (count) => t('common.time.daysAgo', { count }),
  });
}
