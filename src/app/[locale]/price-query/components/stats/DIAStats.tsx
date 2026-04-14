import { Activity, Coins, Wallet, Store, Zap, TrendingUp } from 'lucide-react';

import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import { cn } from '@/lib/utils';

import { formatLargeNumber } from '../../utils/queryResultsUtils';

interface DIAStatsProps {
  data: DIATokenOnChainData;
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

export function DIAStats({ data }: DIAStatsProps) {
  return (
    <>
      <StatCard
        icon={Activity}
        iconColor="text-blue-500"
        title="24h 涨跌"
        value={
          <span className={data.change24hPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {data.change24hPercent >= 0 ? '+' : ''}
            {data.change24hPercent.toFixed(2)}%
          </span>
        }
        description="过去24小时价格变动百分比"
      />
      <StatCard
        icon={Coins}
        iconColor="text-amber-500"
        title="流通供应量"
        value={data.circulatingSupply ? `${(data.circulatingSupply / 1e6).toFixed(2)}M` : '-'}
        description="当前市场上流通的代币总量"
      />
      <StatCard
        icon={Wallet}
        iconColor="text-emerald-500"
        title="流通市值"
        value={data.marketCap ? formatLargeNumber(data.marketCap) : '-'}
        description="流通供应量 × 当前价格，反映资产规模"
      />
      <StatCard
        icon={Store}
        iconColor="text-indigo-500"
        title="交易所数量"
        value={
          data.activeExchangeCount > 0
            ? `${data.activeExchangeCount}/${data.exchangeCount}`
            : data.exchangeCount
        }
        description="活跃交易所与总交易所数量"
      />
      <StatCard
        icon={Zap}
        iconColor="text-purple-500"
        title="交易对数量"
        value={data.totalTradingPairs > 0 ? data.totalTradingPairs.toLocaleString() : '-'}
        description="DIA 数据源覆盖的交易对总数"
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-rose-500"
        title="24h 交易量"
        value={data.totalVolume24h > 0 ? formatLargeNumber(data.totalVolume24h) : '-'}
        description="过去24小时的总交易量"
      />
    </>
  );
}
