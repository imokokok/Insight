import { TrendingUp, Droplets, Percent, Clock, ArrowLeftRight, Shield, Hash } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { TwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';
import {
  formatPrice,
  formatOraclePrice,
  truncateAddress,
  formatConfidenceScore,
} from '@/lib/utils/format';
import { getStatRating } from '@/lib/utils/stat-rating';

interface TwapStatsProps {
  data: TwapOnChainData;
}

export function TwapStats({ data }: TwapStatsProps) {
  const confidenceRating = getStatRating('confidence', data.confidence);
  const deviationRating = getStatRating('deviation', data.priceDeviation * 100);

  const formatLiquidity = (liquidity: string) => {
    try {
      const num = BigInt(liquidity);
      const formatted = Number(num) / 1e18;
      if (formatted >= 1e9) return `$${(formatted / 1e9).toFixed(2)}B`;
      if (formatted >= 1e6) return `$${(formatted / 1e6).toFixed(2)}M`;
      if (formatted >= 1e3) return `$${(formatted / 1e3).toFixed(2)}K`;
      return `$${formatted.toFixed(2)}`;
    } catch {
      return '-';
    }
  };

  return (
    <>
      <StatCard
        icon={TrendingUp}
        iconColor="text-pink-500"
        title="TWAP Price"
        value={formatOraclePrice(data.twapPrice, 2, 6)}
        description="Time-weighted average price"
      />
      <StatCard
        icon={ArrowLeftRight}
        iconColor="text-blue-500"
        title="Spot Price"
        value={formatPrice(data.spotPrice)}
        description="Current spot price"
      />
      <StatCard
        icon={Droplets}
        iconColor="text-cyan-500"
        title="Pool Liquidity"
        value={formatLiquidity(data.liquidity)}
        description="Total liquidity in pool"
      />
      <StatCard
        icon={Percent}
        iconColor="text-amber-500"
        title="Fee Tier"
        value={data.feeTier ? `${data.feeTier / 10000}%` : '-'}
        description="Pool fee tier"
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title="TWAP Interval"
        value={data.twapInterval ? `${data.twapInterval / 60}m` : '-'}
        description="Time interval for TWAP calculation"
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-orange-500"
        title="Price Deviation"
        value={`${(data.priceDeviation * 100).toFixed(4)}%`}
        description="Deviation from spot price"
        rating={deviationRating}
      />
      <StatCard
        icon={Hash}
        iconColor="text-indigo-500"
        title="Pool Address"
        value={truncateAddress(data.poolAddress)}
        description="Liquidity pool address"
      />
      <StatCard
        icon={Shield}
        iconColor="text-emerald-500"
        title="Confidence Score"
        value={formatConfidenceScore(data.confidence, 1)}
        description="Overall confidence score"
        rating={confidenceRating}
      />
    </>
  );
}
