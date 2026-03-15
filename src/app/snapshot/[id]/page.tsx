'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicSnapshot } from '@/lib/snapshots';
import { OracleSnapshot } from '@/types/oracle';
import { formatTimestamp } from '@/types/common/timestamps';
import { OracleProvider } from '@/types/oracle';
import { providerNames } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';
import { baseColors, semanticColors } from '@/lib/config/colors';

const logger = createLogger('snapshot-page');

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
      logger.error('Failed to load snapshot', err instanceof Error ? err : new Error(String(err)));
      setError('加载快照失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-48 mb-8" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
          <p className="text-red-600 mb-4">{error || '快照不存在或已被删除'}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="bg-white border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {snapshot.symbol} 价格快照
              </h1>
              <p className="text-gray-500 text-sm">创建于 {formatTimestamp(snapshot.timestamp)}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>交易对: {snapshot.symbol}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: semanticColors.success.light,
                  color: semanticColors.success.text,
                }}
              >
                公开分享
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">配置信息</h3>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">交易对:</span>
                    <span className="ml-2 font-medium">{snapshot.symbol}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">选中的预言机:</span>
                    <span className="ml-2 font-medium">{snapshot.selectedOracles.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">平均价格</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  ${snapshot.stats.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">加权均价</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  $
                  {snapshot.stats.weightedAvgPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">最高价</p>
                <p className="mt-1 text-xl font-semibold text-green-600">
                  ${snapshot.stats.maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">最低价</p>
                <p className="mt-1 text-xl font-semibold text-red-600">
                  ${snapshot.stats.minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">价格区间</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  $
                  {snapshot.stats.priceRange.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">标准偏差</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  $
                  {snapshot.stats.standardDeviation.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">偏差百分比</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {snapshot.stats.standardDeviationPercent.toFixed(4)}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">价格数据</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">
                        预言机
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">
                        交易对
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">链</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">
                        价格
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">
                        置信度
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.priceData.map((price, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-3">
                          <span
                            className="inline-flex items-center gap-2 px-2 py-1 text-sm border rounded"
                            style={{
                              backgroundColor: baseColors.primary[100],
                              color: baseColors.primary[700],
                              borderColor: baseColors.primary[200],
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded"
                              style={{ backgroundColor: baseColors.primary[700] }}
                            />
                            {oracleNames[price.provider as OracleProvider]}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-600">{price.symbol}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{price.chain || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-sm">
                          ${price.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-sm text-gray-600">
                          {price.confidence ? `${(price.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
