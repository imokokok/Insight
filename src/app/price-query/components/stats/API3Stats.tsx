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
        title="dAPI Name"
        value={dapiName || '-'}
        description="API3 data feed name"
      />
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title="Proxy Address"
        value={proxyAddress ? `${proxyAddress.slice(0, 6)}...${proxyAddress.slice(-4)}` : '-'}
        description="Proxy contract address"
      />
      <StatCard
        icon={Globe}
        iconColor="text-indigo-500"
        title="Blockchain"
        value={chain || '-'}
        description="Blockchain network"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="Decimals"
        value={decimals ?? '-'}
        description="Number of decimal places"
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title="Data Age"
        value={
          dataAge !== undefined
            ? dataAge < 60000
              ? `${Math.round(dataAge / 1000)}s`
              : `${Math.round(dataAge / 60000)}m`
            : '-'
        }
        description="Time since last update"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title="Confidence Score"
        value={confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : '-'}
        description="Overall confidence score"
      />
    </>
  );
}
