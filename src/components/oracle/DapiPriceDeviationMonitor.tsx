'use client';

import { DapiPriceDeviation } from '@/lib/oracles/api3';

interface DapiPriceDeviationMonitorProps {
  data: DapiPriceDeviation[];
}

function getDeviationStatus(deviation: number): 'normal' | 'warning' | 'critical' {
  if (deviation > 0.5) return 'critical';
  if (deviation >= 0.3) return 'warning';
  return 'normal';
}

function StatusIndicator({ status }: { status: 'normal' | 'warning' | 'critical' }) {
  const config = {
    normal: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: '正常',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
      label: '警告',
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: '异常',
    },
  };

  const { bg, text, dot, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: 'expanding' | 'shrinking' | 'stable' }) {
  if (trend === 'expanding') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="text-xs">扩大</span>
      </div>
    );
  }

  if (trend === 'shrinking') {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="text-xs">缩小</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
      <span className="text-xs">稳定</span>
    </div>
  );
}

function DeviationBar({ deviation }: { deviation: number }) {
  const percentage = Math.min(deviation * 20, 100);
  const color =
    deviation > 0.5 ? 'bg-red-500' : deviation >= 0.3 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

export function DapiPriceDeviationMonitor({ data }: DapiPriceDeviationMonitorProps) {
  const sortedData = [...data].sort((a, b) => {
    if (a.status === 'critical' && b.status !== 'critical') return -1;
    if (a.status !== 'critical' && b.status === 'critical') return 1;
    if (a.status === 'warning' && b.status === 'normal') return -1;
    if (a.status === 'normal' && b.status === 'warning') return 1;
    return b.deviation - a.deviation;
  });

  const totalDapis = data.length;
  const abnormalCount = data.filter(
    (item) => item.status === 'critical' || item.status === 'warning'
  ).length;
  const avgDeviation = data.reduce((sum, item) => sum + item.deviation, 0) / data.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">dAPI 价格偏离监控</h3>
        <p className="text-sm text-gray-500 mt-1">实时监控各dAPI与市场基准价格的偏离程度</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                交易对
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                dAPI 价格
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                市场价格
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                偏离程度
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                偏离值
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                趋势
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((item, index) => {
              const isAbnormal = item.status === 'critical' || item.status === 'warning';
              return (
                <tr
                  key={index}
                  className={`transition-colors duration-150 ${
                    isAbnormal ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.symbol}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-gray-900 font-mono">${formatPrice(item.dapiPrice)}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-gray-600 font-mono">${formatPrice(item.marketPrice)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <DeviationBar deviation={item.deviation} />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`font-mono font-medium ${
                        item.deviation > 0.5
                          ? 'text-red-600'
                          : item.deviation >= 0.3
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {item.deviation.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <TrendIndicator trend={item.trend} />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <StatusIndicator status={item.status} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">总 dAPI 数量</p>
            <p className="text-2xl font-bold text-gray-900">{totalDapis}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-xs text-red-600 uppercase tracking-wider mb-1">异常数量</p>
            <p className="text-2xl font-bold text-red-600">{abnormalCount}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">平均偏离</p>
            <p className="text-2xl font-bold text-blue-600">{avgDeviation.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
