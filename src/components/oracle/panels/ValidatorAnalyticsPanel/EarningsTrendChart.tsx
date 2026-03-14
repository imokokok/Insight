'use client';

import { EarningsTrend } from './config';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toLocaleString();
}

export function EarningsTrendChart({ data }: { data: EarningsTrend[] }) {
  const maxDaily = Math.max(...data.map((d) => d.daily));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        <p className="text-gray-900 text-sm font-semibold">验证者收益趋势</p>
        <p className="text-gray-500 text-xs mt-0.5">30天收益趋势分析</p>
      </div>

      <div className="h-64 relative">
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-gray-100 h-0" />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
          {data.map((item, index) => {
            const dailyHeight = (item.daily / maxDaily) * 100;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col justify-end items-center group relative"
              >
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-200 group-hover:bg-blue-600"
                  style={{ height: `${dailyHeight}%` }}
                />
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                  <div>{item.day}</div>
                  <div>日收益: {item.daily.toLocaleString()}</div>
                  <div>累计: {item.cumulative.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-gray-600">日收益</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">总累计收益</p>
          <p className="text-sm font-semibold text-gray-900">
            {data.length > 0 ? formatNumber(data[data.length - 1].cumulative) : '0'}
          </p>
        </div>
      </div>
    </div>
  );
}
