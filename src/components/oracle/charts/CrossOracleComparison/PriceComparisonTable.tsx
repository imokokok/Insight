import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import { PriceComparisonData, DeviationData, oracleNames, oracleColors } from './crossOracleConfig';
import { TrendIndicator } from './TrendIndicator';

interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  median: number;
}

interface PriceComparisonTableProps {
  sortedPriceData: PriceComparisonData[];
  priceStats: PriceStats | null;
  deviationData: DeviationData[];
  handleSort: (field: 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name') => void;
  getSortIcon: (field: 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name') => React.ReactNode;
}

export function PriceComparisonTable({
  sortedPriceData,
  priceStats,
  deviationData,
  handleSort,
  getSortIcon,
}: PriceComparisonTableProps) {
  const t = useTranslations();

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {t('crossOracle.priceComparisonDetails')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  {t('crossOracle.oracle')}
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  {t('crossOracle.price')}
                  {getSortIcon('price')}
                </div>
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('deviation')}
              >
                <div className="flex items-center gap-1">
                  {t('crossOracle.deviation')}
                  {getSortIcon('deviation')}
                </div>
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center gap-1">
                  {t('crossOracle.confidence')}
                  {getSortIcon('confidence')}
                </div>
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('responseTime')}
              >
                <div className="flex items-center gap-1">
                  {t('crossOracleComparison.avgResponseTime')}
                  {getSortIcon('responseTime')}
                </div>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.trend')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPriceData.map((data) => {
              const deviation = priceStats
                ? ((data.price - priceStats.avg) / priceStats.avg) * 100
                : 0;
              const deviationAbs = Math.abs(deviation);
              const deviationColor =
                deviationAbs < 0.5
                  ? 'text-green-600'
                  : deviationAbs < 1
                    ? 'text-yellow-600'
                    : 'text-red-600';

              const shouldHighlight = deviationAbs > 1;
              const trendData = deviationData.find((d) => d.provider === data.provider);
              const trend = trendData?.trend || 'stable';

              return (
                <tr
                  key={data.provider}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    shouldHighlight ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-2.5 h-2.5 mr-2"
                        style={{ backgroundColor: oracleColors[data.provider] }}
                      />
                      <span className="font-medium text-gray-900">
                        {oracleNames[data.provider]}
                      </span>
                      {shouldHighlight && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {t('crossOracleComparison.highDeviation')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-900 font-mono">
                    ${data.price.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap font-mono ${deviationColor}`}>
                    {deviation > 0 ? '+' : ''}
                    {deviation.toFixed(3)}%
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                    {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                    {data.responseTime}ms
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <TrendIndicator trend={trend} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
