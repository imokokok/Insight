import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import { OraclePerformance, oracleNames, oracleColors } from './crossOracleConfig';

interface PerformanceTableProps {
  performanceData: OraclePerformance[];
  selectedOracles: OracleProvider[];
}

export function PerformanceTable({ performanceData, selectedOracles }: PerformanceTableProps) {
  const t = useTranslations();

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {t('crossOracle.performanceComparison')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.oracle')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.stats.avgResponseTime')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.dataQualityScoreCard.metrics.updateFrequency')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracleComparison.dataSources')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracleComparison.supportedChains')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.dataQualityScoreCard.dimensions.reliability')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.metrics.accuracy')}
              </th>
            </tr>
          </thead>
          <tbody>
            {performanceData
              .filter((p) => selectedOracles.includes(p.provider))
              .map((perf) => (
                <tr key={perf.provider} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-2.5 h-2.5 mr-2"
                        style={{ backgroundColor: oracleColors[perf.provider] }}
                      />
                      <span className="font-medium text-gray-900">
                        {oracleNames[perf.provider]}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                    {perf.responseTime}ms
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                    {perf.updateFrequency < 1
                      ? `${(perf.updateFrequency * 1000).toFixed(0)}ms`
                      : `${perf.updateFrequency}s`}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                    {perf.dataSources}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-900">
                    {perf.supportedChains}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-success-600 font-medium">{perf.reliability}%</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-primary-600 font-medium">{perf.accuracy}%</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
