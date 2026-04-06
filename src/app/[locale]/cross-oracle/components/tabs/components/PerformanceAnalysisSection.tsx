'use client';

import { DropdownSelect } from '@/components/ui';
import { type OracleProvider } from '@/types/oracle';

import { oracleNames } from '../../../constants';

import { LatencyDistributionHistogram } from './LatencyDistributionHistogram';

import type { OraclePerformanceData } from '../../../types/index';

interface PerformanceAnalysisSectionProps {
  selectedOracles: OracleProvider[];
  selectedPerformanceOracle: OracleProvider | null;
  setSelectedPerformanceOracle: (oracle: OracleProvider | null) => void;
  performanceData: OraclePerformanceData[];
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function PerformanceAnalysisSection({
  selectedOracles,
  selectedPerformanceOracle,
  setSelectedPerformanceOracle,
  performanceData,
  getOracleLatencyData,
  t,
}: PerformanceAnalysisSectionProps) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('crossOracle.analysisTab.performanceComparison')}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('crossOracle.analysisTab.selectOracle')}
            </label>
            <DropdownSelect
              options={[
                { value: '', label: t('crossOracle.analysisTab.allOracles') },
                ...selectedOracles.map((oracle) => ({
                  value: oracle,
                  label: oracleNames[oracle],
                })),
              ]}
              value={selectedPerformanceOracle || ''}
              onChange={(value) =>
                setSelectedPerformanceOracle(value ? (value as OracleProvider) : null)
              }
              placeholder={t('crossOracle.analysisTab.selectOraclePlaceholder')}
              className="w-full"
            />
          </div>
          <LatencyDistributionHistogram
            data={getOracleLatencyData(selectedPerformanceOracle)}
            oracleName={
              selectedPerformanceOracle
                ? oracleNames[selectedPerformanceOracle]
                : t('crossOracle.analysisTab.allOracles')
            }
          />
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('crossOracle.analysisTab.summary')}
          </h3>
          <div className="space-y-4">
            {performanceData.map((data) => (
              <div
                key={data.provider}
                className={`flex items-center justify-between p-4 border transition-colors overflow-hidden rounded-lg ${
                  selectedPerformanceOracle === data.provider
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-gray-50 border-gray-100'
                }`}
                onClick={() => setSelectedPerformanceOracle(data.provider)}
                style={{ cursor: 'pointer' }}
                title={t('crossOracle.analysisTab.tooltip', {
                  name: data.name,
                  responseTime: data.responseTime,
                  accuracy: data.accuracy.toFixed(1),
                  stability: data.stability.toFixed(1),
                })}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: data.color }} />
                  <span className="font-medium text-gray-900 truncate">{data.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-gray-400">{t('crossOracle.analysisTab.responseTime')}</p>
                    <p className="font-semibold text-gray-900 truncate">{data.responseTime}ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">{t('crossOracle.analysisTab.accuracy')}</p>
                    <p className="font-semibold text-success-600">{data.accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">{t('crossOracle.analysisTab.stability')}</p>
                    <p className="font-semibold text-primary-600">{data.stability.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
