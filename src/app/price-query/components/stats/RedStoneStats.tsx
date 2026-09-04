import { Settings, Globe, TrendingDown, TrendingUp, Database, Clock } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import { formatPrice, formatDataAge, formatDecimals } from '@/lib/utils/format';
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
        value={formatDecimals(data.decimals)}
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
        value={data.bid ? formatPrice(data.bid) : '-'}
        description="Bid price from RedStone"
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-blue-700"
        title="Ask Price"
        value={data.ask ? formatPrice(data.ask) : '-'}
        description="Ask price from RedStone"
      />
      <StatCard
        icon={Database}
        iconColor="text-blue-600"
        title="Data Source"
        value={data.provider ? data.provider.replace('redstone-', '').toUpperCase() : '-'}
        description="RedStone data provider"
      />
      <StatCard
        icon={Clock}
        iconColor="text-rose-500"
        title="Data Age"
        value={formatDataAge(data.dataAge)}
        description="Time since last update"
        rating={dataAgeRating}
      />
    </>
  );
}
