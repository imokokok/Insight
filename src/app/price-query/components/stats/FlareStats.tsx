import { Hash, Clock, Database, Timer, FileDigit, Zap } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { FlareTokenOnChainData } from '@/lib/oracles/clients/flare';
import {
  formatDataAge,
  formatDecimals,
  formatOraclePrice,
  formatOracleTimestamp,
  truncateAddress,
} from '@/lib/utils/format';
import { getStatRating } from '@/lib/utils/stat-rating';

interface FlareStatsProps {
  data: FlareTokenOnChainData;
}

export function FlareStats({ data }: FlareStatsProps) {
  const { price, decimals, feedId, dataAge, lastUpdated, network } = data;

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  return (
    <>
      <StatCard
        icon={Database}
        iconColor="text-orange-500"
        title="FTSO Price"
        value={formatOraclePrice(price, 2, decimals ?? 2)}
        description="Current price from Flare FTSO v2"
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
        iconColor="text-blue-700"
        title="Feed ID"
        value={truncateAddress(feedId, 10, 6)}
        description="FTSO feed identifier"
      />
      <StatCard
        icon={Clock}
        iconColor="text-blue-500"
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
        icon={Zap}
        iconColor="text-blue-600"
        title="Network"
        value={network ? network.toUpperCase() : '-'}
        description="Flare network"
      />
    </>
  );
}
