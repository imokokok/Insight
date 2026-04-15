import { Activity, Coins, Wallet, Store, Zap, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/ui/StatCard';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';

import { formatLargeNumber } from '../../utils/queryResultsUtils';

interface DIAStatsProps {
  data: DIATokenOnChainData;
}

export function DIAStats({ data }: DIAStatsProps) {
  const t = useTranslations('priceQuery.stats');

  return (
    <>
      <StatCard
        icon={Activity}
        iconColor="text-blue-500"
        title={t('change24h')}
        value={
          <span className={data.change24hPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {data.change24hPercent >= 0 ? '+' : ''}
            {data.change24hPercent.toFixed(2)}%
          </span>
        }
        description={t('change24hDesc')}
      />
      <StatCard
        icon={Coins}
        iconColor="text-amber-500"
        title={t('circulatingSupply')}
        value={data.circulatingSupply ? `${(data.circulatingSupply / 1e6).toFixed(2)}M` : '-'}
        description={t('circulatingSupplyDesc')}
      />
      <StatCard
        icon={Wallet}
        iconColor="text-emerald-500"
        title={t('marketCapCirculating')}
        value={data.marketCap ? formatLargeNumber(data.marketCap) : '-'}
        description={t('marketCapCirculatingDesc')}
      />
      <StatCard
        icon={Store}
        iconColor="text-indigo-500"
        title={t('exchangeCount')}
        value={
          data.activeExchangeCount > 0
            ? `${data.activeExchangeCount}/${data.exchangeCount}`
            : data.exchangeCount
        }
        description={t('exchangeCountDesc')}
      />
      <StatCard
        icon={Zap}
        iconColor="text-purple-500"
        title={t('tradingPairCount')}
        value={data.totalTradingPairs > 0 ? data.totalTradingPairs.toLocaleString() : '-'}
        description={t('tradingPairCountDesc')}
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-rose-500"
        title={t('volume24h')}
        value={data.totalVolume24h > 0 ? formatLargeNumber(data.totalVolume24h) : '-'}
        description={t('volume24hDesc')}
      />
    </>
  );
}
