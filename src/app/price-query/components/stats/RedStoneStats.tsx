import { Settings, Globe, TrendingDown, TrendingUp, Database, Clock } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import { getStatRating } from '@/lib/utils/stat-rating';

interface RedStoneStatsProps {
  data: RedStoneTokenOnChainData;
}

export function RedStoneStats({ data }: RedStoneStatsProps) {
  const dataAgeRating = data.dataAge !== null ? getStatRating('latency', data.dataAge) : null;

  return (
    <>
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title="Price Precision"
        value={`${data.decimals} decimals`}
        description="Number of decimal places"
      />
      <StatCard
        icon={Globe}
        iconColor="text-amber-500"
        title="Supported Chains"
        value={`${data.supportedChainsCount} chains`}
        description="Number of supported chains by RedStone"
      />
      <StatCard
        icon={TrendingDown}
        iconColor="text-emerald-500"
        title="Bid Price"
        value={data.bid ? `$${data.bid.toFixed(4)}` : '-'}
        description="Bid price from RedStone"
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-indigo-500"
        title="Ask Price"
        value={data.ask ? `$${data.ask.toFixed(4)}` : '-'}
        description="Ask price from RedStone"
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title="Data Source"
        value={data.provider ? data.provider.replace('redstone-', '').toUpperCase() : '-'}
        description="RedStone data provider"
      />
      <StatCard
        icon={Clock}
        iconColor="text-rose-500"
        title="Data Age"
        value={
          data.dataAge !== null
            ? data.dataAge < 60
              ? `${data.dataAge}s`
              : `${Math.round(data.dataAge / 60)}m`
            : '-'
        }
        description="Time since last update"
        rating={dataAgeRating}
      />
    </>
  );
}
