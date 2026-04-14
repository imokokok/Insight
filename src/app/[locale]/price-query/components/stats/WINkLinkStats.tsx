import { Hash, Settings, Database, Clock, Shield } from 'lucide-react';

import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';
import { cn } from '@/lib/utils';

interface WINkLinkStatsProps {
  data: WINkLinkTokenOnChainData;
}

function StatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: React.ReactNode;
  description?: string;
}) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm',
        description && 'group'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-lg font-bold text-gray-900 font-mono">{value}</p>
      {description && (
        <div
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg',
            'whitespace-nowrap pointer-events-none',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
          role="tooltip"
        >
          {description}
          <span
            className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 -mt-1',
              'w-2 h-2 bg-gray-900 border-4 border-gray-900',
              'border-l-transparent border-r-transparent border-b-transparent'
            )}
          />
        </div>
      )}
    </div>
  );
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
