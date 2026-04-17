import { Hash, Settings, BarChart3, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';

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
  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-purple-500"
        title={'priceQuery.stats.priceId'}
        value={priceId ? `${priceId.slice(0, 6)}...${priceId.slice(-4)}` : '-'}
        description={'priceQuery.stats.priceIdDesc'}
      />
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title={'priceQuery.stats.exponent'}
        value={exponent !== undefined ? `10^${exponent}` : '-'}
        description={'priceQuery.stats.exponentDesc'}
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-emerald-500"
        title={'priceQuery.stats.confidenceAbs'}
        value={conf !== undefined ? `$${conf.toFixed(4)}` : '-'}
        description={'priceQuery.stats.confidenceAbsDesc'}
      />
      <StatCard
        icon={Clock}
        iconColor="text-amber-500"
        title={'priceQuery.stats.publishTime'}
        value={publishTime ? new Date(publishTime).toLocaleTimeString() : '-'}
        description={'priceQuery.stats.publishTimeDesc'}
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-indigo-500"
        title={'priceQuery.stats.confidenceWidth'}
        value={
          confidenceInterval?.widthPercentage !== undefined
            ? `${confidenceInterval.widthPercentage.toFixed(4)}%`
            : '-'
        }
        description={'priceQuery.stats.confidenceWidthDesc'}
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={'priceQuery.stats.confidenceScore'}
        value={confidence !== undefined ? `${confidence.toFixed(2)}%` : '-'}
        description={'priceQuery.stats.confidenceScoreDesc'}
      />
    </>
  );
}
