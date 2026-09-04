import { Clock, Database, FileDigit, Hash, Server, Timer } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { ReflectorTokenOnChainData } from '@/hooks/oracles/useReflectorOnChainData';
import {
  formatDataAge,
  formatDecimals,
  formatOraclePrice,
  formatOracleTimestamp,
} from '@/lib/utils/format';
import { getStatRating } from '@/lib/utils/stat-rating';

interface ReflectorStatsProps {
  data: ReflectorTokenOnChainData;
}

export function ReflectorStats({ data }: ReflectorStatsProps) {
  const {
    price,
    decimals,
    resolution,
    version,
    nodeCount,
    threshold,
    baseAsset,
    dataAge,
    lastUpdated,
    source,
  } = data;

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-amber-500"
        title="Reflector Price"
        value={formatOraclePrice(price, 2, (decimals ?? 2) > 8 ? 8 : (decimals ?? 2))}
        description="Current price from Reflector oracle"
      />
      <StatCard
        icon={FileDigit}
        iconColor="text-amber-600"
        title="Price Precision"
        value={formatDecimals(decimals)}
        description="Number of decimal places"
      />
      <StatCard
        icon={Server}
        iconColor="text-amber-700"
        title="Node Consensus"
        value={`${threshold}-of-${nodeCount}`}
        description="Multi-signature threshold"
      />
      <StatCard
        icon={Hash}
        iconColor="text-amber-500"
        title="Resolution"
        value={resolution ? `${resolution / 60} min` : '-'}
        description="Data update interval"
      />
      <StatCard
        icon={Clock}
        iconColor="text-amber-600"
        title="Last Updated"
        value={formatOracleTimestamp(lastUpdated)}
        description="Timestamp of last update"
      />
      <StatCard
        icon={Timer}
        iconColor="text-blue-600"
        title="Data Age"
        value={formatDataAge(dataAge)}
        description="Time since last update"
        rating={dataAgeRating}
      />
      <StatCard
        icon={Database}
        iconColor="text-blue-600"
        title="Base Asset"
        value={baseAsset}
        description="Base asset symbol"
      />
      <StatCard
        icon={Database}
        iconColor="text-blue-700"
        title="Contract Version"
        value={version ? `v${version}` : '-'}
        description="Reflector contract version"
      />
      <StatCard
        icon={Database}
        iconColor="text-teal-500"
        title="Data Source"
        value={source}
        description="Oracle data source"
      />
    </>
  );
}
