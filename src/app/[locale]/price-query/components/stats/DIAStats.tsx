import { Activity, Coins, Wallet, Store, Zap, TrendingUp } from 'lucide-react';

import type { DIATokenOnChainData } from '@/lib/oracles/diaDataService';

import { formatLargeNumber } from '../../utils/queryResultsUtils';

interface DIAStatsProps {
  data: DIATokenOnChainData;
}

export function DIAStats({ data }: DIAStatsProps) {
  return (
    <>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">24h 涨跌</p>
        </div>
        <p
          className={`text-lg font-bold font-mono ${
            data.change24hPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {data.change24hPercent >= 0 ? '+' : ''}
          {data.change24hPercent.toFixed(2)}%
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">流通供应量</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.circulatingSupply ? `${(data.circulatingSupply / 1e6).toFixed(2)}M` : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wallet className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">流通市值</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.marketCap ? formatLargeNumber(data.marketCap) : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Store className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">交易所数量</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.activeExchangeCount > 0
            ? `${data.activeExchangeCount}/${data.exchangeCount}`
            : data.exchangeCount}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">交易对数量</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.totalTradingPairs > 0 ? data.totalTradingPairs.toLocaleString() : '-'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">24h 交易量</p>
        </div>
        <p className="text-lg font-bold text-gray-900 font-mono">
          {data.totalVolume24h > 0 ? formatLargeNumber(data.totalVolume24h) : '-'}
        </p>
      </div>
    </>
  );
}
