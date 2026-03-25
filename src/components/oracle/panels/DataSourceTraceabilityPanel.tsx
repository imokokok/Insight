'use client';

import { useState, useEffect, useRef } from 'react';
import { DataSourceInfo } from '@/lib/oracles/api3';
import { DashboardCard } from '../common/DashboardCard';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

interface DataSourceTraceabilityPanelProps {
  data: DataSourceInfo[];
}

function getScoreColor(score: number): string {
  if (score >= 90) return chartColors.semantic.success;
  if (score >= 70) return chartColors.recharts.primary;
  if (score >= 50) return chartColors.semantic.warning;
  return chartColors.semantic.danger;
}

function getScoreColorClass(score: number): string {
  if (score >= 90) return 'text-success-600';
  if (score >= 70) return 'text-primary-600';
  if (score >= 50) return 'text-warning-600';
  return 'text-danger-600';
}

function getScoreBgClass(score: number): string {
  if (score >= 90) return 'bg-success-50 border-green-200';
  if (score >= 70) return 'bg-primary-50 border-primary-200';
  if (score >= 50) return 'bg-warning-50 border-yellow-200';
  return 'bg-danger-50 border-danger-200';
}

function CircularProgress({
  score,
  size = 80,
  strokeWidth = 8,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={chartColors.recharts.grid}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${getScoreColorClass(score)}`}>{score}</span>
      </div>
    </div>
  );
}

function DataSourceTypeIcon({ type }: { type: DataSourceInfo['type'] }) {
  if (type === 'exchange') {
    return (
      <div className="w-10 h-10  bg-gray-100 border border-gray-200 flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
    );
  }

  if (type === 'traditional_finance') {
    return (
      <div className="w-10 h-10  bg-gray-100 border border-gray-200 flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-10 h-10  bg-gray-100 border border-gray-200 flex items-center justify-center">
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        />
      </svg>
    </div>
  );
}

function getTypeLabel(type: DataSourceInfo['type'], t: (key: string) => string): string {
  const labels: Record<DataSourceInfo['type'], string> = {
    exchange: t('dataSourceTraceability.panel.typeExchange'),
    traditional_finance: t('dataSourceTraceability.panel.typeTraditionalFinance'),
    other: t('dataSourceTraceability.panel.typeOther'),
  };
  return labels[type];
}

function getTypeBadgeClass(type: DataSourceInfo['type']): string {
  const classes: Record<DataSourceInfo['type'], string> = {
    exchange: 'bg-purple-100 text-purple-700',
    traditional_finance: 'bg-primary-100 text-primary-700',
    other: 'bg-gray-100 text-gray-700',
  };
  return classes[type];
}

function CopyButton({ text, t }: { text: string; t: (key: string) => string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-gray-100 transition-colors group"
      title={
        copied
          ? t('dataSourceTraceability.panel.copied')
          : t('dataSourceTraceability.panel.copyAddress')
      }
    >
      {copied ? (
        <svg
          className="w-4 h-4 text-success-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-gray-400 group-hover:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

function DataFlowDiagram({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8  bg-gray-100 border border-gray-200 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        </div>
        <span className="text-xs text-gray-500 mt-1">
          {t('dataSourceTraceability.panel.dataSource')}
        </span>
      </div>

      <div className="flex items-center">
        <div className="w-8 h-0.5 bg-gray-100 border border-gray-200"></div>
        <svg className="w-4 h-4 text-primary-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-8 h-8  bg-gray-100 border border-gray-200 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        </div>
        <span className="text-xs text-gray-500 mt-1">Airnode</span>
      </div>

      <div className="flex items-center">
        <div className="w-8 h-0.5 bg-gray-100 border border-gray-200"></div>
        <svg className="w-4 h-4 text-indigo-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-8 h-8  bg-gray-100 border border-gray-200 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <span className="text-xs text-gray-500 mt-1">dAPI</span>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  max = 100,
  unit = '',
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
}) {
  const percentage = (value / max) * 100;
  const color = getScoreColor(percentage);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-700">
          {value}
          {unit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100  overflow-hidden">
        <div
          className="h-full  transition-all duration-500"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function DataSourceCard({ source, t }: { source: DataSourceInfo; t: (key: string) => string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`border  overflow-hidden transition-all duration-200 ${getScoreBgClass(source.credibilityScore)}`}
    >
      <div
        className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DataSourceTypeIcon type={source.type} />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900">{source.name}</h4>
                <span className={`px-2 py-0.5 text-xs  ${getTypeBadgeClass(source.type)}`}>
                  {getTypeLabel(source.type, t)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{source.chain}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {t('dataSourceTraceability.panel.credibilityScore')}
              </p>
              <CircularProgress score={source.credibilityScore} size={50} strokeWidth={5} />
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              {t('dataSourceTraceability.panel.dataFlowPath')}
            </h5>
            <DataFlowDiagram t={t} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50  p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  {t('dataSourceTraceability.panel.airnodeAddress')}
                </span>
                <CopyButton text={source.airnodeAddress} t={t} />
              </div>
              <p className="text-xs font-mono text-gray-700 break-all">{source.airnodeAddress}</p>
            </div>

            <div className="bg-gray-50  p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  {t('dataSourceTraceability.panel.dapiContractAddress')}
                </span>
                <CopyButton text={source.dapiContract} t={t} />
              </div>
              <p className="text-xs font-mono text-gray-700 break-all">{source.dapiContract}</p>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              {t('dataSourceTraceability.panel.detailedMetrics')}
            </h5>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200  p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-success-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-gray-500">
                    {t('dataSourceTraceability.panel.accuracy')}
                  </span>
                </div>
                <p className={`text-lg font-bold ${getScoreColorClass(source.accuracy)}`}>
                  {source.accuracy}%
                </p>
                <MetricBar label="" value={source.accuracy} />
              </div>

              <div className="bg-white border border-gray-200  p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs text-gray-500">
                    {t('dataSourceTraceability.panel.responseSpeed')}
                  </span>
                </div>
                <p
                  className={`text-lg font-bold ${source.responseSpeed < 100 ? 'text-success-600' : source.responseSpeed < 150 ? 'text-primary-600' : 'text-warning-600'}`}
                >
                  {source.responseSpeed}ms
                </p>
                <MetricBar label="" value={source.responseSpeed} max={200} />
              </div>

              <div className="bg-white border border-gray-200  p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-gray-500">
                    {t('dataSourceTraceability.panel.availability')}
                  </span>
                </div>
                <p className={`text-lg font-bold ${getScoreColorClass(source.availability)}`}>
                  {source.availability}%
                </p>
                <MetricBar label="" value={source.availability} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataSourceTraceabilityPanel({ data }: DataSourceTraceabilityPanelProps) {
  const t = useTranslations();

  const avgCredibility =
    data.length > 0
      ? Math.round(data.reduce((sum, s) => sum + s.credibilityScore, 0) / data.length)
      : 0;

  const typeDistribution = data.reduce(
    (acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <DashboardCard>
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {t('dataSourceTraceability.panel.title')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{t('dataSourceTraceability.panel.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 ">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('dataSourceTraceability.panel.dataSourceCount')}
            </p>
            <p className="text-2xl font-bold text-gray-900">{data.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('dataSourceTraceability.panel.avgCredibility')}
            </p>
            <div className="flex items-center justify-center">
              <CircularProgress score={avgCredibility} size={50} strokeWidth={5} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('dataSourceTraceability.panel.exchange')}
            </p>
            <p className="text-2xl font-bold text-purple-600">
              {typeDistribution['exchange'] || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('dataSourceTraceability.panel.traditionalFinance')}
            </p>
            <p className="text-2xl font-bold text-primary-600">
              {typeDistribution['traditional_finance'] || 0}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((source) => (
            <DataSourceCard key={source.id} source={source} t={t} />
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>{t('dataSourceTraceability.panel.noData')}</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
