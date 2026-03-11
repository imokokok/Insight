'use client';

import { DashboardCard } from './DashboardCard';

export interface CoveragePoolData {
  totalValue: number;
  coverageRatio: number;
  historicalPayouts: number;
}

interface CoveragePoolPanelProps {
  data: CoveragePoolData;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function CoveragePoolPanel({ data }: CoveragePoolPanelProps) {
  const getCoverageStatus = (ratio: number) => {
    if (ratio >= 50) return { label: '优秀', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (ratio >= 30) return { label: '良好', color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
    if (ratio >= 20) return { label: '一般', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { label: '较低', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const coverageStatus = getCoverageStatus(data.coverageRatio);

  return (
    <DashboardCard title="保险池概览">
      <div className="space-y-5">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-sm text-gray-600">保险池总价值</span>
          </div>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(data.totalValue)}</span>
        </div>

        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm text-gray-600">覆盖比率</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-600">{data.coverageRatio}%</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${coverageStatus.bgColor} ${coverageStatus.color}`}
              >
                {coverageStatus.label}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${data.coverageRatio}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            当前保险池可覆盖 {data.coverageRatio}% 的潜在风险
          </p>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">历史赔付总额</span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(data.historicalPayouts)}
          </span>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">保险机制说明</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Coverage Pool 通过质押资金为预言机数据提供保险保障。当数据出现异常或错误时，
                受影响的用户可以从保险池中获得赔偿。质押者通过提供资金获得收益分成，
                同时承担一定的风险敞口。
              </p>
            </div>
          </div>
        </div>

        <button className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md">
          参与保险池
        </button>
        <p className="text-xs text-gray-400 text-center">为预言机数据提供保障，获取稳定收益</p>
      </div>
    </DashboardCard>
  );
}
