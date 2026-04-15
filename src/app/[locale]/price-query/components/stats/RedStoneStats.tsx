import { Settings, Globe, TrendingDown, TrendingUp, Database, Clock } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import { getStatRating } from '@/lib/utils/stat-rating';

interface RedStoneStatsProps {
  data: RedStoneTokenOnChainData;
}

export function RedStoneStats({ data }: RedStoneStatsProps) {
  const dataAgeRating = data.dataAge !== null ? getStatRating('latency', data.dataAge) : null;

  return (
    <>
      <StatCard
        icon={Settings}
        iconColor="text-blue-500"
        title="价格精度"
        value={`${data.decimals} 位`}
        description="价格数据的小数位数，用于确定精度"
      />
      <StatCard
        icon={Globe}
        iconColor="text-amber-500"
        title="支持链数"
        value={`${data.supportedChainsCount} 条`}
        description="RedStone 支持的区块链网络数量"
      />
      <StatCard
        icon={TrendingDown}
        iconColor="text-emerald-500"
        title="买入价"
        value={data.bid ? `$${data.bid.toFixed(4)}` : '-'}
        description="RedStone 报出的买入价格"
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-indigo-500"
        title="卖出价"
        value={data.ask ? `$${data.ask.toFixed(4)}` : '-'}
        description="RedStone 报出的卖出价格"
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title="数据源"
        value={data.provider ? data.provider.replace('redstone-', '').toUpperCase() : '-'}
        description="RedStone 数据提供商标识"
      />
      <StatCard
        icon={Clock}
        iconColor="text-rose-500"
        title="数据年龄"
        value={
          data.dataAge !== null
            ? data.dataAge < 60
              ? `${data.dataAge}s`
              : `${Math.round(data.dataAge / 60)}m`
            : '-'
        }
        description="距离上次价格更新的时间间隔"
        rating={dataAgeRating}
      />
    </>
  );
}
