'use client';

import { DataSourceTransparency } from '@/lib/oracles/dia';
import { useI18n } from '@/lib/i18n/provider';

interface DIADataTransparencyPanelProps {
  data: DataSourceTransparency[];
}

export function DIADataTransparencyPanel({ data }: DIADataTransparencyPanelProps) {
  const { t } = useI18n();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exchange':
        return t('dia.dataSourceType.exchange');
      case 'defi_protocol':
        return t('dia.dataSourceType.defi');
      case 'aggregator':
        return t('dia.dataSourceType.aggregator');
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 90) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold mb-3">{t('dia.dataTransparency.title')}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.dataTransparency.totalSources')}</p>
            <p className="text-xl font-bold text-indigo-600">{data.length}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.dataTransparency.activeSources')}</p>
            <p className="text-xl font-bold text-green-600">
              {data.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.dataTransparency.avgCredibility')}</p>
            <p className="text-xl font-bold text-indigo-600">
              {(data.reduce((acc, s) => acc + s.credibilityScore, 0) / data.length).toFixed(1)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                  {t('dia.dataTransparency.sourceName')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                  {t('dia.dataTransparency.type')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                  {t('dia.dataTransparency.credibility')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                  {t('dia.dataTransparency.status')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                  {t('dia.dataTransparency.dataPoints')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                  {t('dia.dataTransparency.verification')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((source) => (
                <tr key={source.sourceId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div className="font-medium text-gray-900">{source.name}</div>
                    <div className="text-xs text-gray-500">{source.sourceId}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {getTypeLabel(source.type)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`font-semibold ${getCredibilityColor(source.credibilityScore)}`}>
                      {source.credibilityScore}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(source.status)}`} />
                      <span className="text-sm text-gray-700 capitalize">{source.status}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-700">
                    {source.dataPoints.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-600">
                    {source.verificationMethod}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
