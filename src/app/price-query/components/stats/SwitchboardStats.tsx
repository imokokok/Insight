import { Hash, Users, Settings, Shield, Globe, Clock } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import {
  formatOracleTimestamp,
  truncateAddress,
  formatConfidenceScore,
  formatDecimals,
} from '@/lib/utils/format';

interface SwitchboardStatsProps {
  feedId?: string;
  numOracles?: number;
  decimals?: number;
  confidence?: number;
  source?: string;
  ingestionTimestamp?: number;
}

export function SwitchboardStats({
  feedId,
  numOracles,
  decimals,
  confidence,
  source,
  ingestionTimestamp,
}: SwitchboardStatsProps) {
  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-teal-500"
        title="Feed Hash"
        value={truncateAddress(feedId)}
        description="Deterministic Surge feed hash (Crossbar /v2/update/{feedHash})"
      />
      <StatCard
        icon={Users}
        iconColor="text-blue-500"
        title="Oracle Sources"
        value={numOracles !== undefined ? numOracles : '-'}
        description="Number of aggregated median responses"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="Price Precision"
        value={formatDecimals(decimals)}
        description="Number of decimal places"
      />
      <StatCard
        icon={Shield}
        iconColor="text-blue-600"
        title="Confidence Score"
        value={formatConfidenceScore(confidence)}
        description="Overall confidence score"
      />
      <StatCard
        icon={Globe}
        iconColor="text-blue-700"
        title="Source"
        value={source || '-'}
        description="Data source gateway"
      />
      <StatCard
        icon={Clock}
        iconColor="text-blue-600"
        title="Ingestion Time"
        value={formatOracleTimestamp(ingestionTimestamp)}
        description="When the price was ingested"
      />
    </>
  );
}
