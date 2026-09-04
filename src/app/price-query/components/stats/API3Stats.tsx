import { FileText, Hash, Globe, Settings, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import {
  formatDataAge,
  formatDecimals,
  truncateAddress,
  formatConfidenceScore,
} from '@/lib/utils/format';

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
        value={truncateAddress(proxyAddress)}
        description="Proxy contract address"
      />
      <StatCard
        icon={Globe}
        iconColor="text-blue-700"
        title="Blockchain"
        value={chain || '-'}
        description="Blockchain network"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="Price Precision"
        value={formatDecimals(decimals)}
        description="Number of decimal places"
      />
      <StatCard
        icon={Clock}
        iconColor="text-blue-600"
        title="Data Age"
        value={formatDataAge(dataAge)}
        description="Time since last update"
      />
      <StatCard
        icon={Shield}
        iconColor="text-blue-600"
        title="Confidence Score"
        value={formatConfidenceScore(confidence)}
        description="Overall confidence score"
      />
    </>
  );
}
