import { Settings, Globe, TrendingDown, TrendingUp, Database, Clock } from 'lucide-react';

import type { RedStoneTokenOnChainData } from '@/lib/services/oracle/clients/redstone';

interface RedStoneStatsProps {
  data: RedStoneTokenOnChainData;
}

export function RedStoneStats({ data }: RedStoneStatsProps) {
  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Settings className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">价格精度</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{data.decimals} 位</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Globe className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">支持链数</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{data.supportedChainsCount} 条</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">买入价(Bid)</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.bid ? `$${data.bid.toFixed(4)}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">卖出价(Ask)</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.ask ? `$${data.ask.toFixed(4)}` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Database className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">数据源</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.provider ? data.provider.replace('redstone-', '').toUpperCase() : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3.5 h-3.5 text-rose-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">数据年龄</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.dataAge !== null
            ? data.dataAge < 60
              ? `${data.dataAge}s`
              : `${Math.round(data.dataAge / 60)}m`
            : '-'}
        </p>
      </div>
    </>
  );
}
