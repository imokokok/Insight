import { Hash, Settings, BarChart3, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import { formatOracleTimestamp, truncateAddress, formatConfidenceScore } from '@/lib/utils/format';
import type { OnChainVerification } from '@/types/oracle/price';

import { VerificationStatCard } from './VerificationStatCard';

interface PythStatsProps {
  priceId?: string;
  exponent?: number;
  conf?: number;
  publishTime?: number;
  confidenceInterval?: {
    widthPercentage?: number;
  };
  confidence?: number;
  verification?: OnChainVerification;
}

export function PythStats({
  priceId,
  exponent,
  conf,
  publishTime,
  confidenceInterval,
  confidence,
  verification,
}: PythStatsProps) {
  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-purple-500"
        title="Price ID"
        value={truncateAddress(priceId)}
        description="Unique identifier for the price feed"
      />
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title="Exponent"
        value={exponent !== undefined ? `10^${exponent}` : '-'}
        description="Price exponent for decimal calculation"
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-emerald-500"
        title="Confidence (Absolute)"
        value={conf !== undefined ? `$${conf.toFixed(4)}` : '-'}
        description="Absolute confidence interval value"
      />
      <StatCard
        icon={Clock}
        iconColor="text-amber-500"
        title="Publish Time"
        value={formatOracleTimestamp(publishTime)}
        description="Time when price was published"
      />
      <StatCard
        icon={BarChart3}
        iconColor="text-indigo-500"
        title="Confidence Width"
        value={
          confidenceInterval?.widthPercentage !== undefined
            ? `${confidenceInterval.widthPercentage.toFixed(4)}%`
            : '-'
        }
        description="Confidence interval width percentage"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title="Confidence Score"
        value={formatConfidenceScore(confidence)}
        description="Overall confidence score"
      />
      <VerificationStatCard verification={verification} />
    </>
  );
}
