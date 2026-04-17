import { TrendingUp, Droplets, Percent, Clock, ArrowLeftRight, Shield, Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/ui/StatCard';
import type { TwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';
import { formatPrice } from '@/lib/utils/format';
import { getStatRating } from '@/lib/utils/stat-rating';

interface TwapStatsProps {
  data: TwapOnChainData;
}

export function TwapStats({ data }: TwapStatsProps) {
  const t = useTranslations('priceQuery.stats');

  const confidenceRating = getStatRating('confidence', data.confidence);
  const deviationRating = getStatRating('deviation', data.priceDeviation * 100);

  const formatTwapPrice = (value: number) => {
    if (!value || isNaN(value)) return '-';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
  };

  const formatLiquidity = (liquidity: string) => {
    const num = BigInt(liquidity);
    const formatted = Number(num) / 1e18;
    if (formatted >= 1e9) return `$${(formatted / 1e9).toFixed(2)}B`;
    if (formatted >= 1e6) return `$${(formatted / 1e6).toFixed(2)}M`;
    if (formatted >= 1e3) return `$${(formatted / 1e3).toFixed(2)}K`;
    return `$${formatted.toFixed(2)}`;
  };

  const formatPoolAddress = (address: string) => {
    if (!address) return '-';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <StatCard
        icon={TrendingUp}
        iconColor="text-pink-500"
        title={t('twapPrice')}
        value={formatTwapPrice(data.twapPrice)}
        description={t('twapPriceDesc')}
      />
      <StatCard
        icon={ArrowLeftRight}
        iconColor="text-blue-500"
        title={t('spotPrice')}
        value={formatPrice(data.spotPrice)}
        description={t('spotPriceDesc')}
      />
      <StatCard
        icon={Droplets}
        iconColor="text-cyan-500"
        title={t('poolLiquidity')}
        value={formatLiquidity(data.liquidity)}
        description={t('poolLiquidityDesc')}
      />
      <StatCard
        icon={Percent}
        iconColor="text-amber-500"
        title={t('feeTier')}
        value={data.feeTier ? `${data.feeTier / 10000}%` : '-'}
        description={t('feeTierDesc')}
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title={t('twapInterval')}
        value={data.twapInterval ? `${data.twapInterval / 60}m` : '-'}
        description={t('twapIntervalDesc')}
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-orange-500"
        title={t('priceDeviation')}
        value={`${(data.priceDeviation * 100).toFixed(4)}%`}
        description={t('priceDeviationDesc')}
        rating={deviationRating}
      />
      <StatCard
        icon={Hash}
        iconColor="text-indigo-500"
        title={t('poolAddress')}
        value={formatPoolAddress(data.poolAddress)}
        description={t('poolAddressDesc')}
      />
      <StatCard
        icon={Shield}
        iconColor="text-emerald-500"
        title={t('confidence')}
        value={`${(data.confidence * 100).toFixed(1)}%`}
        description={t('confidenceDesc')}
        rating={confidenceRating}
      />
    </>
  );
}
