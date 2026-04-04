'use client';

import { useEffect, useState } from 'react';

import { verifyTellorData, type VerificationResult } from '@/lib/oracles/tellorVerification';
import { useTranslations } from '@/i18n';

export default function TellorVerifyPage() {
  const t = useTranslations('tellor');
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    verifyTellorData().then((data) => {
      setResults(data);
      setIsLoading(false);
    });
  }, []);

  const realCount = results.filter((r) => r.isRealData).length;
  const fallbackCount = results.filter((r) => r.status === 'fallback').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tellor 数据真实性验证</h1>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证数据...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{realCount}</div>
              <div className="text-sm text-green-800">真实链上数据</div>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-600">{fallbackCount}</div>
              <div className="text-sm text-yellow-800">回退数据</div>
            </div>
            <div className="bg-red-100 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-red-800">获取失败</div>
            </div>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.method}
                className={`p-4 rounded-lg border ${
                  result.isRealData
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'fallback'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{result.method}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      result.isRealData
                        ? 'bg-green-200 text-green-800'
                        : result.status === 'fallback'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {result.isRealData
                      ? t('tellor.realData')
                      : result.status === 'fallback'
                        ? t('tellor.fallback')
                        : t('tellor.failed')}
                  </span>
                </div>

                {result.dataSource && (
                  <p className="text-sm text-gray-600 mb-2">{t('tellor.dataSourceLabel')}: {result.dataSource}</p>
                )}

                {result.sampleData ? (
                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.sampleData, null, 2)}
                  </pre>
                ) : null}

                {result.error && <p className="text-sm text-red-600 mt-2">{t('tellor.error')}: {result.error}</p>}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold mb-2">验证说明</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                ✅ <strong>真实数据</strong>: 从 Ethereum 主网或其他链上合约直接获取
              </li>
              <li>
                ⚠️ <strong>回退数据</strong>: 链上获取失败，使用预设的默认值
              </li>
              <li>
                ❌ <strong>失败</strong>: 获取过程中发生错误
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
