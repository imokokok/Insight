import { Hash, Layers, Settings, FileText, History, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import { formatTimeString } from '@/lib/utils/format';

interface ChainlinkStatsProps {
  roundId?: string;
  answeredInRound?: string;
  decimals?: number;
  version?: string | bigint;
  startedAt?: number;
  source?: string;
}

export function ChainlinkStats({
  roundId,
  answeredInRound,
  decimals,
  version,
  startedAt,
  source,
}: ChainlinkStatsProps) {
  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title="Round ID"
        value={roundId ? `#${roundId.slice(-6)}` : '-'}
        description="Current round identifier"
      />
      <StatCard
        icon={Layers}
        iconColor="text-indigo-500"
        title="Answered In Round"
        value={answeredInRound ? `#${answeredInRound.slice(-6)}` : '-'}
        description="Round ID where answer was provided"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="Decimals"
        value={decimals ?? '-'}
        description="Number of decimal places"
      />
      <StatCard
        icon={FileText}
        iconColor="text-emerald-500"
        title="Version"
        value={version ?? '-'}
        description="Feed version number"
      />
      <StatCard
        icon={History}
        iconColor="text-purple-500"
        title="Round Started"
        value={startedAt ? formatTimeString(new Date(startedAt)) : '-'}
        description="Time when current round started"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title="Feed Description"
        value={source || '-'}
        description="Description of the price feed"
      />
    </>
  );
}
