import { Hash, Settings, Database, Clock, Shield } from 'lucide-react';

import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

interface WINkLinkStatsProps {
  data: WINkLinkTokenOnChainData;
}

export function WINkLinkStats({ data }: WINkLinkStatsProps) {
  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Hash className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Feed合约</p>
        </div>
        <p
          className="text-lg font-bold text-gray-900 font-mono truncate"
          title={data.feedContractAddress || ''}
        >
          {data.feedContractAddress
            ? `${data.feedContractAddress.slice(0, 6)}...${data.feedContractAddress.slice(-4)}`
            : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Settings className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">价格精度</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{data.decimals ?? '-'}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">数据喂价</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{data.dataFeedsCount}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">响应时间</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{data.avgResponseTime}ms</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">数据年龄</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.priceUpdateTime !== null
            ? data.priceUpdateTime < 60
              ? `${data.priceUpdateTime}s`
              : `${Math.round(data.priceUpdateTime / 60)}m`
            : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">节点可用性</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">{data.nodeUptime.toFixed(2)}%</p>
      </div>
    </>
  );
}
