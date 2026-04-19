import { Hash, Clock, Database, Timer, FileDigit, Zap } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { FlareTokenOnChainData } from '@/lib/oracles/clients/flare';
import { formatTimeString, formatNumberWithDecimals } from '@/lib/utils/format';
import { getStatRating } from '@/lib/utils/stat-rating';

interface FlareStatsProps {
  data: FlareTokenOnChainData;
}

export function FlareStats({ data }: FlareStatsProps) {
  const { price, decimals, feedId, dataAge, lastUpdated, network } = data;

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '-';
    return formatTimeString(new Date(timestamp));
  };

  const formatFlarePrice = (value: number) => {
    if (!value || isNaN(value)) return '-';
    return `$${formatNumberWithDecimals(value, 2, decimals || 2)}`;
  };

  const formatFeedId = (id: string) => {
    if (!id || id.length < 10) return id;
    return `${id.slice(0, 10)}...${id.slice(-6)}`;
  };

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-orange-500"
        title="FTSO Price"
        value={formatFlarePrice(price)}
        description="Current price from Flare FTSO v2"
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
        title="Feed ID"
        value={formatFeedId(feedId)}
        description="FTSO feed identifier"
      />
      <StatCard
        icon={Clock}
        iconColor="text-blue-500"
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
        icon={Zap}
        iconColor="text-purple-500"
        title="Network"
        value={network?.toUpperCase() || 'FLARE'}
        description="Flare network"
      />
    </>
  );
}
