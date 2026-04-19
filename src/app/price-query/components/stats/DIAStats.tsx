import { Activity, Coins, Wallet, Store, Zap, TrendingUp } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import { addThousandSeparators } from '@/lib/utils/format';

import { formatLargeNumber } from '../../utils/queryResultsUtils';

interface DIAStatsProps {
  data: DIATokenOnChainData;
}

export function DIAStats({ data }: DIAStatsProps) {
  return (
    <>
      <StatCard
        icon={Activity}
        iconColor="text-blue-500"
        title="24h Change"
        value={
          <span className={data.change24hPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {data.change24hPercent >= 0 ? '+' : ''}
            {data.change24hPercent.toFixed(2)}%
          </span>
        }
        description="Price change in 24 hours"
      />
      <StatCard
        icon={Coins}
        iconColor="text-amber-500"
        title="Circulating Supply"
        value={data.circulatingSupply ? `${(data.circulatingSupply / 1e6).toFixed(2)}M` : '-'}
        description="Total circulating supply"
      />
      <StatCard
        icon={Wallet}
        iconColor="text-emerald-500"
        title="Market Cap"
        value={data.marketCap ? formatLargeNumber(data.marketCap) : '-'}
        description="Market capitalization"
      />
      <StatCard
        icon={Store}
        iconColor="text-indigo-500"
        title="Exchange Count"
        value={
          data.activeExchangeCount > 0
            ? `${data.activeExchangeCount}/${data.exchangeCount}`
            : data.exchangeCount
        }
        description="Number of exchanges"
      />
      <StatCard
        icon={Zap}
        iconColor="text-purple-500"
        title="Trading Pair Count"
        value={
          data.totalTradingPairs > 0
            ? addThousandSeparators(data.totalTradingPairs.toString())
            : '-'
        }
        description="Total trading pairs"
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-rose-500"
        title="24h Volume"
        value={data.totalVolume24h > 0 ? formatLargeNumber(data.totalVolume24h) : '-'}
        description="Total volume in 24 hours"
      />
    </>
  );
}
