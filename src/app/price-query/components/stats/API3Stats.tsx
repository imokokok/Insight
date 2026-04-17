import { FileText, Hash, Globe, Settings, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';

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
  return (
    <>
      <StatCard
        icon={FileText}
        iconColor="text-emerald-500"
        title={'priceQuery.stats.dapiName'}
        value={dapiName || '-'}
        description={'priceQuery.stats.dapiNameDesc'}
      />
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title={'priceQuery.stats.proxyAddress'}
        value={proxyAddress ? `${proxyAddress.slice(0, 6)}...${proxyAddress.slice(-4)}` : '-'}
        description={'priceQuery.stats.proxyAddressDesc'}
      />
      <StatCard
        icon={Globe}
        iconColor="text-indigo-500"
        title={'priceQuery.stats.blockchain'}
        value={chain || '-'}
        description={'priceQuery.stats.blockchainDesc'}
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title={'priceQuery.stats.decimals'}
        value={decimals ?? '-'}
        description={'priceQuery.stats.decimalsDesc'}
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title={'priceQuery.stats.dataAge'}
        value={
          dataAge !== undefined
            ? dataAge < 60000
              ? `${Math.round(dataAge / 1000)}s`
              : `${Math.round(dataAge / 60000)}m`
            : '-'
        }
        description={'priceQuery.stats.dataAgeDesc'}
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title={'priceQuery.stats.confidenceScore'}
        value={confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : '-'}
        description={'priceQuery.stats.confidenceScoreDesc'}
      />
    </>
  );
}
