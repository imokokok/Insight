import { Hash, Settings, Database, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';
import { formatDataAge, formatDecimals, truncateAddress } from '@/lib/utils/format';

interface WINkLinkStatsProps {
  data: WINkLinkTokenOnChainData;
}

export function WINkLinkStats({ data }: WINkLinkStatsProps) {
  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title="Feed Contract"
        value={truncateAddress(data.feedContractAddress)}
        description="Price feed contract address"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="Price Precision"
        value={formatDecimals(data.decimals)}
        description="Number of decimal places"
      />
      <StatCard
        icon={Database}
        iconColor="text-emerald-500"
        title="Data Feeds"
        value={data.dataFeedsCount ?? '-'}
        description="Number of data feeds"
      />
      <StatCard
        icon={Clock}
        iconColor="text-indigo-500"
        title="Response Time"
        value={data.avgResponseTime != null ? `${data.avgResponseTime}ms` : '-'}
        description="Average response time"
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title="Data Age"
        value={formatDataAge(data.priceUpdateTime)}
        description="Time since last update"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title="Node Uptime"
        value={data.nodeUptime != null ? `${data.nodeUptime.toFixed(2)}%` : '-'}
        description="Node uptime percentage"
      />
    </>
  );
}
