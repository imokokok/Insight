'use client';

import { useMemo } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors, semanticColors } from '@/lib/config/colors';

import { analyzeCointegrationPairs, type CointegrationPair } from '../cointegration';
import { type useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors } from '../utils';

import { ResidualDiagnostics } from './ResidualDiagnostics';

interface CointegrationAnalysisProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CointegrationAnalysis({ data }: CointegrationAnalysisProps) {
  const t = useTranslations();
  const { filteredChains, historicalPrices } = data;

  const cointegrationPairs = useMemo(() => {
    const priceMap: Partial<Record<string, number[]>> = {};
    filteredChains.forEach((chain) => {
      priceMap[chain] = historicalPrices[chain]?.map((p) => p.price) || [];
    });
    return analyzeCointegrationPairs(priceMap, filteredChains);
  }, [historicalPrices, filteredChains]);

  if (cointegrationPairs.length === 0) {
    return (
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
          {t('crossChain.cointegrationAnalysis')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">{t('crossChain.cointegrationDesc')}</p>
        <div className="bg-gray-50 border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">{t('crossChain.noCointegrationDetected')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('crossChain.needMoreData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-2">
        {t('crossChain.cointegrationAnalysis')}
      </h3>
      <p className="text-xs text-gray-500 mb-4">{t('crossChain.cointegrationDesc')}</p>

      <div className="space-y-6">
        {cointegrationPairs.map((pair) => (
          <CointegrationPairCard key={`${pair.chainX}-${pair.chainY}`} pair={pair} />
        ))}
      </div>
    </div>
  );
}

function CointegrationPairCard({ pair }: { pair: CointegrationPair }) {
  const t = useTranslations();
  const { chainX, chainY, result, currentZScore, signal } = pair;

  // Prepare chart data
  const chartData = useMemo(() => {
    return result.spread.map((value, index) => ({
      index,
      spread: value,
      upperBand: result.spreadMean + 2 * result.spreadStd,
      lowerBand: result.spreadMean - 2 * result.spreadStd,
      mean: result.spreadMean,
    }));
  }, [result]);

  const getSignalColor = () => {
    switch (signal) {
      case 'long':
        return 'text-success-600 bg-success-50';
      case 'short':
        return 'text-danger-600 bg-danger-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSignalText = () => {
    switch (signal) {
      case 'long':
        return t('crossChain.longSpread');
      case 'short':
        return t('crossChain.shortSpread');
      default:
        return t('crossChain.neutral');
    }
  };

  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: chainColors[chainX] }} />
              <span className="text-sm font-medium">{chainNames[chainX]}</span>
            </div>
            <span className="text-gray-400">-</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: chainColors[chainY] }} />
              <span className="text-sm font-medium">{chainNames[chainY]}</span>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 ${getSignalColor()}`}>
            {getSignalText()}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">{t('crossChain.hedgeRatio')}</div>
            <div className="text-lg font-semibold font-mono">{result.hedgeRatio.toFixed(4)}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">{t('crossChain.halfLife')}</div>
            <div className="text-lg font-semibold font-mono">{result.halfLife.toFixed(1)}</div>
            <div className="text-xs text-gray-400">{t('crossChain.periods')}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">{t('crossChain.adfStatistic')}</div>
            <div
              className={`text-lg font-semibold font-mono ${
                result.adfStatistic < result.criticalValue ? 'text-success-600' : 'text-danger-600'
              }`}
            >
              {result.adfStatistic.toFixed(3)}
            </div>
            <div className="text-xs text-gray-400">
              {t('crossChain.criticalValue')}: {result.criticalValue}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">{t('crossChain.currentZScore')}</div>
            <div
              className={`text-lg font-semibold font-mono ${
                Math.abs(currentZScore) > 2 ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {currentZScore.toFixed(3)}
            </div>
            <div className="text-xs text-gray-400">
              {t('crossChain.mean')}: {result.spreadMean.toFixed(2)}, {t('crossChain.stdDev')}:{' '}
              {result.spreadStd.toFixed(2)}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">{t('crossChain.spreadSeries')}</div>
          <div className="h-48 bg-gray-50 border border-gray-200 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 10 }}
                  hide
                />
                <YAxis stroke={chartColors.recharts.axis} tick={{ fontSize: 10 }} width={50} />
                <RechartsTooltip
                  formatter={(value) => [Number(value).toFixed(4), '']}
                  labelFormatter={() => ''}
                />
                <ReferenceLine
                  y={result.spreadMean}
                  stroke={semanticColors.info.DEFAULT}
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={result.spreadMean + 2 * result.spreadStd}
                  stroke={semanticColors.success.DEFAULT}
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={result.spreadMean - 2 * result.spreadStd}
                  stroke={semanticColors.danger.DEFAULT}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="spread"
                  stroke={semanticColors.info.DEFAULT}
                  strokeWidth={2}
                  dot={false}
                  name={t('crossChain.spread')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-indigo-500" />
              <span className="text-xs text-gray-500">{t('crossChain.spread')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-0.5 bg-indigo-500 border-dashed"
                style={{ borderTop: `1px dashed ${semanticColors.info.DEFAULT}` }}
              />
              <span className="text-xs text-gray-500">{t('crossChain.mean')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-0.5 bg-success-500"
                style={{ borderTop: `1px dashed ${semanticColors.success.DEFAULT}` }}
              />
              <span className="text-xs text-gray-500">{t('crossChain.plus2Sigma')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-0.5 bg-danger-500"
                style={{ borderTop: `1px dashed ${semanticColors.danger.DEFAULT}` }}
              />
              <span className="text-xs text-gray-500">{t('crossChain.minus2Sigma')}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-2">
            <p>
              <strong>{t('crossChain.analysisReference')}:</strong>{' '}
              {signal === 'long' && t('crossChain.longSpreadAdvice')}
              {signal === 'short' && t('crossChain.shortSpreadAdvice')}
              {signal === 'neutral' && t('crossChain.neutralAdvice')}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 p-3 mt-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-xs text-red-800">
                <p className="font-semibold mb-1">{t('crossChain.riskWarning')}</p>
                <ul className="space-y-0.5 text-red-700">
                  <li>• {t('crossChain.riskNotInvestmentAdvice')}</li>
                  <li>• {t('crossChain.riskForReferenceOnly')}</li>
                  <li>• {t('crossChain.riskOwnResponsibility')}</li>
                  <li>• {t('crossChain.riskMarketWarning')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Residual Diagnostics */}
        <ResidualDiagnostics residuals={result.spread} maxLag={20} />
      </div>
    </div>
  );
}
