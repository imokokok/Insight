import { Hash, Settings, Globe, Database, Clock, Activity } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import { getStatRating } from '@/lib/utils/stat-rating';

interface SupraStatsProps {
  data: SupraTokenOnChainData;
}

export function SupraStats({ data }: SupraStatsProps) {
  const { decimals, supportedChainsCount, pairIndex, pairName, dataAge, source } = data;

  const dataAgeRating = dataAge !== null ? getStatRating('latency', dataAge) : null;

  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title="Pair Index"
        value={`#${pairIndex}`}
        description="Supra DORA 预言机的交易对索引号"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="价格精度"
        value={`${decimals} 位`}
        description="价格数据的小数位数，用于确定精度"
      />
      <StatCard
        icon={Globe}
        iconColor="text-indigo-500"
        title="支持链数"
        value={`${supportedChainsCount} 条`}
        description="Supra 支持的区块链网络数量"
      />
      <StatCard
        icon={Activity}
        iconColor="text-teal-500"
        title="交易对"
        value={pairName}
        description="Supra DORA 预言机追踪的交易对名称"
      />
      <StatCard
        icon={Database}
        iconColor="text-purple-500"
        title="数据源"
        value={source}
        description="Supra DORA V2 共识预言机数据来源"
      />
      <StatCard
        icon={Clock}
        iconColor="text-rose-500"
        title="数据年龄"
        value={
          dataAge !== null ? (dataAge < 60 ? `${dataAge}s` : `${Math.round(dataAge / 60)}m`) : '-'
        }
        description="距离上次价格更新的时间间隔"
        rating={dataAgeRating}
      />
    </>
  );
}
