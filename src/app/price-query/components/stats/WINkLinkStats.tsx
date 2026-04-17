import { Hash, Settings, Database, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

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
        value={
          data.feedContractAddress
            ? `${data.feedContractAddress.slice(0, 6)}...${data.feedContractAddress.slice(-4)}`
            : '-'
        }
        description="Price feed contract address"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="Price Precision"
        value={data.decimals ?? '-'}
        description="Number of decimal places"
      />
      <StatCard
        icon={Database}
        iconColor="text-emerald-500"
        title="Data Feeds"
        value={data.dataFeedsCount}
        description="Number of data feeds"
      />
      <StatCard
        icon={Clock}
        iconColor="text-indigo-500"
        title="Response Time"
        value={`${data.avgResponseTime}ms`}
        description="Average response time"
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title="Data Age"
        value={
          data.priceUpdateTime !== null
            ? data.priceUpdateTime < 60
              ? `${data.priceUpdateTime}s`
              : `${Math.round(data.priceUpdateTime / 60)}m`
            : '-'
        }
        description="Time since last update"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title="Node Uptime"
        value={`${data.nodeUptime.toFixed(2)}%`}
        description="Node uptime percentage"
      />
    </>
  );
}
