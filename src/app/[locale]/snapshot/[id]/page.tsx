'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
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
  const locale = useLocale();
  const isZh = isChineseLocale(locale);

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
        setError(
          isZh ? '快照不存在或未公开分享' : 'Snapshot does not exist or is not publicly shared'
        );
      }
    } catch (err) {
      logger.error('Failed to load snapshot', err instanceof Error ? err : new Error(String(err)));
      setError(isZh ? '加载快照失败' : 'Failed to load snapshot');
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
        <div className="bg-danger-50 border border-danger-200 rounded p-6 text-center">
          <p className="text-danger-600 mb-4">
            {error ||
              (isZh ? '快照不存在或已被删除' : 'Snapshot does not exist or has been deleted')}
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            {isZh ? '返回首页' : 'Back to Home'}
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
            {isZh ? '返回首页' : 'Back to Home'}
          </Link>
        </div>

        <div className="bg-white border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {snapshot.symbol} {isZh ? '价格快照' : 'Price Snapshot'}
              </h1>
              <p className="text-gray-500 text-sm">
                {isZh ? '创建于' : 'Created at'} {formatTimestamp(snapshot.timestamp)}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>
                  {isZh ? '交易对' : 'Trading Pair'}: {snapshot.symbol}
                </span>
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
                {isZh ? '公开分享' : 'Public Share'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {isZh ? '配置信息' : 'Configuration'}
              </h3>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{isZh ? '交易对' : 'Trading Pair'}:</span>
                    <span className="ml-2 font-medium">{snapshot.symbol}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">
                      {isZh ? '选中的预言机' : 'Selected Oracles'}:
                    </span>
                    <span className="ml-2 font-medium">{snapshot.selectedOracles.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '平均价格' : 'Average Price'}</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  ${snapshot.stats.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '加权均价' : 'Weighted Avg Price'}</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  $
                  {snapshot.stats.weightedAvgPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '最高价' : 'Highest Price'}</p>
                <p className="mt-1 text-xl font-semibold text-success-600">
                  ${snapshot.stats.maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '最低价' : 'Lowest Price'}</p>
                <p className="mt-1 text-xl font-semibold text-danger-600">
                  ${snapshot.stats.minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '价格区间' : 'Price Range'}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  $
                  {snapshot.stats.priceRange.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '标准偏差' : 'Standard Deviation'}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  $
                  {snapshot.stats.standardDeviation.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-500">{isZh ? '偏差百分比' : 'Deviation Percent'}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {snapshot.stats.standardDeviationPercent.toFixed(4)}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {isZh ? '价格数据' : 'Price Data'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">
                        {isZh ? '预言机' : 'Oracle'}
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">
                        {isZh ? '交易对' : 'Trading Pair'}
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">
                        {isZh ? '链' : 'Chain'}
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">
                        {isZh ? '价格' : 'Price'}
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">
                        {isZh ? '置信度' : 'Confidence'}
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
            {isZh ? '想要创建自己的价格快照？' : 'Want to create your own price snapshot?'}
            <Link href="/" className="ml-1 text-indigo-600 hover:text-indigo-700 font-medium">
              {isZh ? '立即开始使用' : 'Get Started Now'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
