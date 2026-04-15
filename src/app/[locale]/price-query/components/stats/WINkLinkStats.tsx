import { Hash, Settings, Database, Clock, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/ui/StatCard';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

interface WINkLinkStatsProps {
  data: WINkLinkTokenOnChainData;
}

export function WINkLinkStats({ data }: WINkLinkStatsProps) {
  const t = useTranslations('priceQuery.stats');

  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title={t('feedContract')}
        value={
          data.feedContractAddress
            ? `${data.feedContractAddress.slice(0, 6)}...${data.feedContractAddress.slice(-4)}`
            : '-'
        }
        description={t('feedContractDesc')}
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={t('pricePrecision')}
        value={data.decimals ?? '-'}
        description={t('pricePrecisionDesc')}
      />
      <StatCard
        icon={Database}
        iconColor="text-emerald-500"
        title={t('dataFeeds')}
        value={data.dataFeedsCount}
        description={t('dataFeedsDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-indigo-500"
        title={t('responseTime')}
        value={`${data.avgResponseTime}ms`}
        description={t('responseTimeDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title={t('dataAge')}
        value={
          data.priceUpdateTime !== null
            ? data.priceUpdateTime < 60
              ? `${data.priceUpdateTime}s`
              : `${Math.round(data.priceUpdateTime / 60)}m`
            : '-'
        }
        description={t('dataAgeDesc')}
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('nodeUptime')}
        value={`${data.nodeUptime.toFixed(2)}%`}
        description={t('nodeUptimeDesc')}
      />
    </>
  );
}
