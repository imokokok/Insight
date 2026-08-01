import { Hash, Clock, Database, Timer, FileDigit } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import {
  formatDataAge,
  formatDecimals,
  formatOraclePrice,
  formatOracleTimestamp,
} from '@/lib/utils/format';
import { getStatRating } from '@/lib/utils/stat-rating';

interface SupraStatsProps {
  data: SupraTokenOnChainData;
}

export function SupraStats({ data }: SupraStatsProps) {
  const { price, decimals, pairIndex, source, dataAge, lastUpdated } = data;

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-blue-500"
        title="Supra Price"
        value={formatOraclePrice(price, 2, decimals ?? 2)}
        description="Current price from Supra oracle"
      />
      <StatCard
        icon={FileDigit}
        iconColor="text-amber-500"
        title="Price Precision"
        value={formatDecimals(decimals)}
        description="Number of decimal places"
      />
      <StatCard
        icon={Hash}
        iconColor="text-indigo-500"
        title="Pair Index"
        value={`#${pairIndex}`}
        description="Trading pair identifier"
      />
      <StatCard
        icon={Clock}
        iconColor="text-teal-500"
        title="Last Updated"
        value={formatOracleTimestamp(lastUpdated)}
        description="Timestamp of last update"
      />
      <StatCard
        icon={Timer}
        iconColor="text-rose-500"
        title="Data Age"
        value={formatDataAge(dataAge)}
        description="Time since last update"
        rating={dataAgeRating}
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title="Data Source"
        value={source}
        description="Oracle data source"
      />
    </>
  );
}
