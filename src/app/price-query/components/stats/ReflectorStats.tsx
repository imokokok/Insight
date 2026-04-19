import { Clock, Database, FileDigit, Hash, Server, Timer } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { ReflectorTokenOnChainData } from '@/hooks/oracles/useReflectorOnChainData';
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

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPrice = (value: number) => {
    if (!value || isNaN(value)) return '-';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals > 8 ? 8 : decimals || 2,
    })}`;
  };

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-amber-500"
        title="Reflector Price"
        value={formatPrice(price)}
        description="Current price from Reflector oracle"
      />
      <StatCard
        icon={FileDigit}
        iconColor="text-amber-600"
        title="Price Precision"
        value={`${decimals} decimals`}
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
        value={formatTimestamp(lastUpdated)}
        description="Timestamp of last update"
      />
      <StatCard
        icon={Timer}
        iconColor="text-rose-500"
        title="Data Age"
        value={
          dataAge !== null ? (dataAge < 60 ? `${dataAge}s` : `${Math.round(dataAge / 60)}m`) : '-'
        }
        description="Time since last update"
        rating={dataAgeRating}
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title="Base Asset"
        value={baseAsset}
        description="Base asset symbol"
      />
      <StatCard
        icon={Database}
        iconColor="text-indigo-500"
        title="Contract Version"
        value={version ? `v${version}` : '-'}
        description="Reflector contract version"
      />
      <StatCard
        icon={Database}
        iconColor="text-teal-500"
        title="Data Source"
        value={source}
        description="Oracle standard"
      />
    </>
  );
}
