'use client';

import { useState } from 'react';

import {
  convertCalculatedMetricsToPerformance,
  mergePerformanceData,
  defaultPerformanceData,
} from '@/components/oracle/charts/CrossOracleComparison/crossOracleConfig';
import { useCrossOracleWithMetrics } from '@/hooks/oracles';
import { OracleProvider } from '@/types/oracle';

// 这个组件演示如何使用自定义性能指标计算系统
export function CalculatedPerformanceMetricsDemo() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [selectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.BAND_PROTOCOL,
    OracleProvider.API3,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
    OracleProvider.TELLOR,
  ]);

  // 使用新的 hook，它会自动收集数据并计算性能指标
  const {
    priceData,
    isLoading,
    performanceMetrics,
    isCalculating,
    lastCalculated,
    stats,
    refetchAll,
    clearHistory,
  } = useCrossOracleWithMetrics({
    selectedSymbol,
    selectedOracles,
    enabled: true,
    refetchInterval: 10000, // 每10秒刷新一次
    useCalculatedMetrics: true,
  });

  // 合并静态数据和动态计算数据
  const mergedPerformanceData = mergePerformanceData(defaultPerformanceData, performanceMetrics);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">自定义性能指标计算演示</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refetchAll()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '加载中...' : '刷新数据'}
          </button>
          <button
            onClick={() => clearHistory()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            清除历史
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-100 p-4 rounded">
          <div className="text-sm text-gray-600">数据点总数</div>
          <div className="text-2xl font-bold">{stats.totalDataPoints}</div>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <div className="text-sm text-gray-600">活跃预言机</div>
          <div className="text-2xl font-bold">{stats.providerCount}</div>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <div className="text-sm text-gray-600">最后计算时间</div>
          <div className="text-lg font-bold">
            {lastCalculated ? lastCalculated.toLocaleTimeString() : '从未'}
          </div>
        </div>
      </div>

      {/* 性能指标表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">预言机</th>
              <th className="border p-2 text-right">响应时间 (ms)</th>
              <th className="border p-2 text-right">更新频率 (s)</th>
              <th className="border p-2 text-right">准确性 (%)</th>
              <th className="border p-2 text-right">可靠性 (%)</th>
              <th className="border p-2 text-right">去中心化评分</th>
              <th className="border p-2 text-center">数据来源</th>
            </tr>
          </thead>
          <tbody>
            {mergedPerformanceData.map((item) => (
              <tr
                key={item.provider}
                className={item.isCalculated ? 'bg-green-50' : 'bg-yellow-50'}
              >
                <td className="border p-2 font-medium">
                  {item.provider}
                  {item.isCalculated ? (
                    <span className="ml-2 text-xs text-green-600">(计算)</span>
                  ) : (
                    <span className="ml-2 text-xs text-yellow-600">(默认)</span>
                  )}
                </td>
                <td className="border p-2 text-right">{item.responseTime}</td>
                <td className="border p-2 text-right">{item.updateFrequency}</td>
                <td className="border p-2 text-right">{item.accuracy.toFixed(2)}%</td>
                <td className="border p-2 text-right">{item.reliability.toFixed(2)}%</td>
                <td className="border p-2 text-right">{item.decentralization}</td>
                <td className="border p-2 text-center">
                  {item.isCalculated ? '真实数据' : '静态配置'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 原始价格数据 */}
      <div>
        <h3 className="text-lg font-bold mb-3">当前价格数据</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {priceData.map((data) => (
            <div key={data.provider} className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-gray-600">{data.provider}</div>
              <div className="text-xl font-bold">${data.price.toFixed(2)}</div>
              <div className="text-xs text-gray-500">响应: {data.responseTime}ms</div>
            </div>
          ))}
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 p-4 rounded text-sm">
        <h4 className="font-bold mb-2">说明：</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <span className="text-green-600 font-medium">绿色行</span>
            ：基于真实数据计算的性能指标
          </li>
          <li>
            <span className="text-yellow-600 font-medium">黄色行</span>
            ：使用静态默认配置（数据不足时回退）
          </li>
          <li>响应时间：实际 API 调用耗时</li>
          <li>准确性：与所有预言机中位数价格的对比</li>
          <li>可靠性：成功请求的比例</li>
        </ul>
      </div>
    </div>
  );
}

export default CalculatedPerformanceMetricsDemo;
