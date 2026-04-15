import { Hash, Settings, Globe, Database, Clock, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/ui/StatCard';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import { getStatRating } from '@/lib/utils/stat-rating';

interface SupraStatsProps {
  data: SupraTokenOnChainData;
}

export function SupraStats({ data }: SupraStatsProps) {
  const { decimals, supportedChainsCount, pairIndex, pairName, dataAge, source } = data;
  const t = useTranslations('priceQuery.stats');

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title={t('pairIndex')}
        value={`#${pairIndex}`}
        description={t('pairIndexDesc')}
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={t('pricePrecision')}
        value={t('precisionDigits', { count: decimals })}
        description={t('pricePrecisionDesc')}
      />
      <StatCard
        icon={Globe}
        iconColor="text-indigo-500"
        title={t('supportedChains')}
        value={t('supportedChainsValue', { count: supportedChainsCount })}
        description={t('supportedChainsDesc', { oracle: 'Supra' })}
      />
      <StatCard
        icon={Activity}
        iconColor="text-teal-500"
        title={t('tradingPair')}
        value={pairName}
        description={t('tradingPairDesc')}
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title={t('dataSource')}
        value={source}
        description={t('supraDataSourceDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-rose-500"
        title={t('dataAge')}
        value={
          dataAge !== null ? (dataAge < 60 ? `${dataAge}s` : `${Math.round(dataAge / 60)}m`) : '-'
        }
        description={t('dataAgeDesc')}
        rating={dataAgeRating}
      />
    </>
  );
}
