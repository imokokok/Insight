'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicSnapshot } from '@/lib/snapshots';
import { OracleSnapshot, formatTimestamp } from '@/lib/types/snapshot';
import { OracleProvider } from '@/lib/types/oracle';
import { providerNames } from '@/lib/constants';

const oracleNames = providerNames;

export default function SnapshotPage() {
  const params = useParams();
  const snapshotId = params.id as string;

  const [snapshot, setSnapshot] = useState<OracleSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshot();
  }, [snapshotId]);

  const loadSnapshot = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPublicSnapshot(snapshotId);
      if (data) {
        setSnapshot(data);
      } else {
        setError('快照不存在或未公开分享');
      }
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      setError('加载快照失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || '快照不存在'}
          </h1>
          <p className="text-gray-600 mb-6">
            该快照可能已被删除或未设置为公开分享
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回首页
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {snapshot.symbol} 价格快照
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  创建于 {formatTimestamp(snapshot.timestamp)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  公开分享
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">平均价格</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  ${snapshot.stats.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">加权均价</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  ${snapshot.stats.weightedAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">最高价</p>
                <p className="mt-1 text-xl font-semibold text-green-600">
                  ${snapshot.stats.maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">最低价</p>
                <p className="mt-1 text-xl font-semibold text-red-600">
                  ${snapshot.stats.minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">价格区间</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  ${snapshot.stats.priceRange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">标准偏差</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  ${snapshot.stats.standardDeviation.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">偏差百分比</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {snapshot.stats.standardDeviationPercent.toFixed(4)}%
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                选中的预言机 ({snapshot.selectedOracles.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {snapshot.selectedOracles.map((oracle) => (
                  <span
                    key={oracle}
                    className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full"
                  >
                    {oracleNames[oracle as OracleProvider]}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                价格数据详情
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        预言机
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        交易对
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        链
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        价格
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        置信度
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {snapshot.priceData.map((price, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {oracleNames[price.provider as OracleProvider]}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {price.symbol}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {price.chain || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm font-mono text-gray-900">
                            ${price.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                          {price.confidence ? `${(price.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>快照ID: {snapshot.id}</span>
              <span>快照时间: {formatTimestamp(snapshot.timestamp)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            想要创建自己的价格快照？
            <Link href="/" className="ml-1 text-indigo-600 hover:text-indigo-700 font-medium">
              立即开始使用
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
