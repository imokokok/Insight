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
        title={t('priceQuery.stats.priceId') || 'Price Feed ID'}
        value={priceId ? `${priceId.slice(0, 6)}...${priceId.slice(-4)}` : '-'}
        description="Pyth 价格源的唯一定价标识符"
      />
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title={t('priceQuery.stats.exponent') || 'Exponent'}
        value={exponent !== undefined ? `10^${exponent}` : '-'}
        description="价格指数，实际价格 = 原始值 × 10^exponent"
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.confidenceAbs') || 'Confidence'}
        value={conf !== undefined ? `$${conf.toFixed(4)}` : '-'}
        description="置信区间的绝对宽度，表示价格的不确定性范围"
      />
      <StatCard
        icon={Clock}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.publishTime') || 'Published'}
        value={publishTime ? new Date(publishTime).toLocaleTimeString() : '-'}
        description="价格数据最近一次发布的时间"
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.confidenceWidth') || 'Spread %'}
        value={
          confidenceInterval?.widthPercentage !== undefined
            ? `${confidenceInterval.widthPercentage.toFixed(4)}%`
            : '-'
        }
        description="置信区间宽度占价格的百分比，越小表示数据越可信"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.confidenceScore') || 'Confidence Score'}
        value={confidence !== undefined ? `${confidence.toFixed(2)}%` : '-'}
        description="价格数据的置信度评分，越高表示数据越可靠"
      />
    </>
  );
}
