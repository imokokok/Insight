import { Hash, Clock, Database, Timer, FileDigit } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/ui/StatCard';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import { getStatRating } from '@/lib/utils/stat-rating';

interface SupraStatsProps {
  data: SupraTokenOnChainData;
}

export function SupraStats({ data }: SupraStatsProps) {
  const { price, decimals, pairIndex, source, dataAge, lastUpdated } = data;
  const t = useTranslations('priceQuery.stats');

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSupraPrice = (value: number) => {
    if (!value || isNaN(value)) return '-';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals || 2,
    })}`;
  };

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-blue-500"
        title={t('supraPrice')}
        value={formatSupraPrice(price)}
        description={t('supraPriceDesc')}
      />
      <StatCard
        icon={FileDigit}
        iconColor="text-amber-500"
        title={t('pricePrecision')}
        value={t('precisionDigits', { count: decimals })}
        description={t('pricePrecisionDesc')}
      />
      <StatCard
        icon={Hash}
        iconColor="text-indigo-500"
        title={t('pairIndex')}
        value={`#${pairIndex}`}
        description={t('pairIndexDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-teal-500"
        title={t('lastUpdated')}
        value={formatTimestamp(lastUpdated)}
        description={t('lastUpdatedDesc')}
      />
      <StatCard
        icon={Timer}
        iconColor="text-rose-500"
        title={t('dataAge')}
        value={
          dataAge !== null ? (dataAge < 60 ? `${dataAge}s` : `${Math.round(dataAge / 60)}m`) : '-'
        }
        description={t('dataAgeDesc')}
        rating={dataAgeRating}
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title={t('dataSource')}
        value={source}
        description={t('supraDataSourceDesc')}
      />
    </>
  );
}
