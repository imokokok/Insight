import { Hash, Settings, Database, Clock, Shield } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

interface WINkLinkStatsProps {
  data: WINkLinkTokenOnChainData;
}

export function WINkLinkStats({ data }: WINkLinkStatsProps) {
  return (
    <>
      <StatCard
        icon={Hash}
        iconColor="text-blue-500"
        title="Feed合约"
        value={
          data.feedContractAddress
            ? `${data.feedContractAddress.slice(0, 6)}...${data.feedContractAddress.slice(-4)}`
            : '-'
        }
        description="WINkLink 价格喂价合约地址"
      />
      <StatCard
        icon={Settings}
        iconColor="text-amber-500"
        title="价格精度"
        value={data.decimals ?? '-'}
        description="价格数据的小数位数，用于确定精度"
      />
      <StatCard
        icon={Database}
        iconColor="text-emerald-500"
        title="数据喂价"
        value={data.dataFeedsCount}
        description="WINkLink 节点提供的数据喂价数量"
      />
      <StatCard
        icon={Clock}
        iconColor="text-indigo-500"
        title="响应时间"
        value={`${data.avgResponseTime}ms`}
        description="预言机节点平均响应时间，越短越好"
      />
      <StatCard
        icon={Clock}
        iconColor="text-purple-500"
        title="数据年龄"
        value={
          data.priceUpdateTime !== null
            ? data.priceUpdateTime < 60
              ? `${data.priceUpdateTime}s`
              : `${Math.round(data.priceUpdateTime / 60)}m`
            : '-'
        }
        description="距离上次价格更新的时间间隔"
      />
      <StatCard
        icon={Shield}
        iconColor="text-rose-500"
        title="节点可用性"
        value={`${data.nodeUptime.toFixed(2)}%`}
        description="预言机节点的在线可用率，越高越可靠"
      />
    </>
  );
}
