'use client';

import { Clock, RefreshCw } from 'lucide-react';
import { REFRESH_OPTIONS } from '../constants';

interface RefreshControlProps {
  refreshInterval: number;
  setRefreshInterval: (interval: 0 | 30000 | 60000 | 300000) => void;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  fetchData: () => void;
  locale: string;
}

export default function RefreshControl({
  refreshInterval,
  setRefreshInterval,
  refreshStatus,
  showRefreshSuccess,
  fetchData,
  locale,
}: RefreshControlProps) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
        <Clock className="w-4 h-4 text-gray-500" />
        <select
          value={refreshInterval}
          onChange={(e) =>
            setRefreshInterval(Number(e.target.value) as 0 | 30000 | 60000 | 300000)
          }
          className="text-sm bg-transparent border-none focus:outline-none cursor-pointer font-medium text-gray-700"
        >
          {REFRESH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={fetchData}
        disabled={refreshStatus === 'refreshing'}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${
          refreshStatus === 'error'
            ? 'bg-red-600 hover:bg-red-700'
            : refreshStatus === 'success' && showRefreshSuccess
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-900 hover:bg-gray-800'
        } disabled:opacity-50`}
      >
        <RefreshCw
          className={`w-4 h-4 ${refreshStatus === 'refreshing' ? 'animate-spin' : ''}`}
        />
        {refreshStatus === 'refreshing'
          ? locale === 'zh-CN'
            ? '刷新中...'
            : 'Refreshing...'
          : showRefreshSuccess
            ? locale === 'zh-CN'
              ? '已更新'
              : 'Updated'
            : locale === 'zh-CN'
              ? '刷新'
              : 'Refresh'}
      </button>
    </>
  );
}
