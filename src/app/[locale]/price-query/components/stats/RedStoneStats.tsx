import { Settings, Globe, TrendingDown, TrendingUp, Database, Clock } from 'lucide-react';

import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import { cn } from '@/lib/utils';
import { getStatRating } from '@/lib/utils/stat-rating';

function StatCard({
  icon: Icon,
  iconColor,
  title,
  value,
  description,
  rating,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: React.ReactNode;
  description?: string;
  rating?: { label: string; color: string; bgColor: string } | null;
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
      <div className="flex items-baseline gap-2 flex-wrap">
        <p
          className="text-lg font-bold text-gray-900 font-mono truncate"
          title={typeof value === 'string' ? value : undefined}
        >
          {value}
        </p>
        {rating && (
          <span
            className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded"
            style={{ color: rating.color, backgroundColor: rating.bgColor }}
          >
            {rating.label}
          </span>
        )}
      </div>
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
