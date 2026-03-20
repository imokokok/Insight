'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors } from '../utils';
import { analyzeCointegrationPairs, CointegrationPair } from '../cointegration';
import { ResidualDiagnostics } from './ResidualDiagnostics';
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
import { chartColors, semanticColors } from '@/lib/config/colors';


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
              <span className="text-xs text-gray-500">+2σ</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-0.5 bg-danger-500"
                style={{ borderTop: `1px dashed ${semanticColors.danger.DEFAULT}` }}
              />
              <span className="text-xs text-gray-500">-2σ</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>{t('crossChain.tradingAdvice')}:</strong>{' '}
            {signal === 'long' && t('crossChain.longSpreadAdvice')}
            {signal === 'short' && t('crossChain.shortSpreadAdvice')}
            {signal === 'neutral' && t('crossChain.neutralAdvice')}
          </p>
        </div>

        {/* Residual Diagnostics */}
        <ResidualDiagnostics residuals={result.spread} maxLag={20} />
      </div>
    </div>
  );
}
