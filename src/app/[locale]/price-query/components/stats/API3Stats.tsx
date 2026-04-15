import { FileText, Hash, Globe, Settings, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import { useTranslations } from '@/i18n';

interface API3StatsProps {
  dapiName?: string;
  proxyAddress?: string;
  chain?: string;
  decimals?: number;
  dataAge?: number;
  confidence?: number;
}

export function API3Stats({
  dapiName,
  proxyAddress,
  chain,
  decimals,
  dataAge,
  confidence,
}: API3StatsProps) {
  const t = useTranslations();

  return (
    <>
      <StatCard
        icon={FileText}
        iconColor="text-emerald-500"
        title={t('priceQuery.stats.dapiName')}
        value={dapiName || '-'}
        description={t('priceQuery.stats.dapiNameDesc')}
      />
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title={t('priceQuery.stats.proxyAddress')}
        value={proxyAddress ? `${proxyAddress.slice(0, 6)}...${proxyAddress.slice(-4)}` : '-'}
        description={t('priceQuery.stats.proxyAddressDesc')}
      />
      <StatCard
        icon={Globe}
        iconColor="text-indigo-500"
        title={t('priceQuery.stats.blockchain')}
        value={chain || '-'}
        description={t('priceQuery.stats.blockchainDesc')}
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={t('priceQuery.stats.decimals')}
        value={decimals ?? '-'}
        description={t('priceQuery.stats.decimalsDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title={t('priceQuery.stats.dataAge')}
        value={
          dataAge !== undefined
            ? dataAge < 60000
              ? `${Math.round(dataAge / 1000)}s`
              : `${Math.round(dataAge / 60000)}m`
            : '-'
        }
        description={t('priceQuery.stats.dataAgeDesc')}
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={t('priceQuery.stats.confidenceScore')}
        value={confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : '-'}
        description={t('priceQuery.stats.confidenceScoreDesc')}
      />
    </>
  );
}
