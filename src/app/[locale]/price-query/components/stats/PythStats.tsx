import { Hash, Settings, BarChart3, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import { useTranslations } from '@/i18n';

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
        title={t('priceQuery.stats.priceId')}
        value={priceId ? `${priceId.slice(0, 6)}...${priceId.slice(-4)}` : '-'}
        description={t('priceQuery.stats.priceIdDesc')}
      />
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title={t('priceQuery.stats.exponent')}
        value={exponent !== undefined ? `10^${exponent}` : '-'}
        description={t('priceQuery.stats.exponentDesc')}
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.confidenceAbs')}
        value={conf !== undefined ? `$${conf.toFixed(4)}` : '-'}
        description={t('priceQuery.stats.confidenceAbsDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.publishTime')}
        value={publishTime ? new Date(publishTime).toLocaleTimeString() : '-'}
        description={t('priceQuery.stats.publishTimeDesc')}
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.confidenceWidth')}
        value={
          confidenceInterval?.widthPercentage !== undefined
            ? `${confidenceInterval.widthPercentage.toFixed(4)}%`
            : '-'
        }
        description={t('priceQuery.stats.confidenceWidthDesc')}
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.confidenceScore')}
        value={confidence !== undefined ? `${confidence.toFixed(2)}%` : '-'}
        description={t('priceQuery.stats.confidenceScoreDesc')}
      />
    </>
  );
}
