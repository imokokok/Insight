import { Settings, Globe, TrendingDown, TrendingUp, Database, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/ui/StatCard';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import { getStatRating } from '@/lib/utils/stat-rating';

interface RedStoneStatsProps {
  data: RedStoneTokenOnChainData;
}

export function RedStoneStats({ data }: RedStoneStatsProps) {
  const t = useTranslations('priceQuery.stats');
  const dataAgeRating = data.dataAge !== null ? getStatRating('latency', data.dataAge) : null;

  return (
    <>
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title={t('pricePrecision')}
        value={t('precisionDigits', { count: data.decimals })}
        description={t('pricePrecisionDesc')}
      />
      <StatCard
        icon={Globe}
        iconColor="text-amber-500"
        title={t('supportedChains')}
        value={t('supportedChainsValue', { count: data.supportedChainsCount })}
        description={t('supportedChainsDesc', { oracle: 'RedStone' })}
      />
      <StatCard
        icon={TrendingDown}
        iconColor="text-emerald-500"
        title={t('bidPrice')}
        value={data.bid ? `$${data.bid.toFixed(4)}` : '-'}
        description={t('bidPriceDesc')}
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-indigo-500"
        title={t('askPrice')}
        value={data.ask ? `$${data.ask.toFixed(4)}` : '-'}
        description={t('askPriceDesc')}
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title={t('dataSource')}
        value={data.provider ? data.provider.replace('redstone-', '').toUpperCase() : '-'}
        description={t('redstoneDataSourceDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-rose-500"
        title={t('dataAge')}
        value={
          data.dataAge !== null
            ? data.dataAge < 60
              ? `${data.dataAge}s`
              : `${Math.round(data.dataAge / 60)}m`
            : '-'
        }
        description={t('dataAgeDesc')}
        rating={dataAgeRating}
      />
    </>
  );
}
