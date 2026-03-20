import { useTranslations } from 'next-intl';
import { DeviationData } from './crossOracleConfig';

interface DeviationTableProps {
  deviationData: DeviationData[];
}

export function DeviationTable({ deviationData }: DeviationTableProps) {
  const t = useTranslations();

  if (deviationData.length === 0) return null;

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {t('crossOracle.differenceAnalysisPanel')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.oraclePerformanceRanking.rank')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.oracle')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.price')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.stats.deviationFromAverage')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.confidence')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracleComparison.avgResponseTime')}
              </th>
            </tr>
          </thead>
          <tbody>
            {deviationData
              .sort((a, b) => b.deviationPercent - a.deviationPercent)
              .map((data) => (
                <tr key={data.provider} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium ${
                        data.rank === 1
                          ? 'bg-danger-100 text-danger-800'
                          : data.rank === 2
                            ? 'bg-warning-100 text-orange-800'
                            : data.rank === 3
                              ? 'bg-warning-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {data.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 mr-2" style={{ backgroundColor: data.color }} />
                      <span className="font-medium text-gray-900">{data.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900 font-mono">
                    ${data.price.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 whitespace-nowrap font-mono ${
                      data.deviationFromAvg > 0 ? 'text-success-600' : 'text-danger-600'
                    }`}
                  >
                    {data.deviationFromAvg > 0 ? '+' : ''}
                    {data.deviationFromAvg.toFixed(3)}%
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {data.responseTime}ms
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
