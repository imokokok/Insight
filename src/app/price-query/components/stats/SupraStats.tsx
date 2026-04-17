import { Hash, Clock, Database, Timer, FileDigit } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import { getStatRating } from '@/lib/utils/stat-rating';

interface SupraStatsProps {
  data: SupraTokenOnChainData;
}

export function SupraStats({ data }: SupraStatsProps) {
  const { price, decimals, pairIndex, source, dataAge, lastUpdated } = data;

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

  const formatSupraPrice = (value: number) => {
    if (!value || isNaN(value)) return '-';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals || 2,
    })}`;
  };

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-blue-500"
        title="Supra Price"
        value={formatSupraPrice(price)}
        description="Current price from Supra oracle"
      />
      <StatCard
        icon={FileDigit}
        iconColor="text-amber-500"
        title="Price Precision"
        value={`${decimals} decimals`}
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
        title="Data Source"
        value={source}
        description="Oracle data source"
      />
    </>
  );
}
