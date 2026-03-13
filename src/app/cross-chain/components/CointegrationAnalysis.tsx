'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors } from '../utils';
import {
  analyzeCointegrationPairs,
  CointegrationPair,
  calculateSpreadZScore,
} from '../cointegration';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface CointegrationAnalysisProps {
  data: ReturnType<typeof useCrossChainData>;
}

export function CointegrationAnalysis({ data }: CointegrationAnalysisProps) {
  const { t } = useI18n();
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
          协整分析 (Cointegration Analysis)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          协整分析用于检测两条链价格之间是否存在长期均衡关系。通过Engle-Granger两步法检验，
          识别统计套利机会。当前数据未检测到显著的协整关系（需要至少30个数据点）。
        </p>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500">未检测到协整关系</p>
          <p className="text-xs text-gray-400 mt-1">需要更多历史数据进行检验</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-2">
        协整分析 (Cointegration Analysis)
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        协整分析用于检测两条链价格之间是否存在长期均衡关系。ADF统计量小于临界值(-2.86)表示存在协整。
        半衰期表示价格偏离后回归均衡的平均时间。
      </p>

      <div className="space-y-6">
        {cointegrationPairs.map((pair) => (
          <CointegrationPairCard key={`${pair.chainX}-${pair.chainY}`} pair={pair} />
        ))}
      </div>
    </div>
  );
}

function CointegrationPairCard({ pair }: { pair: CointegrationPair }) {
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
        return 'text-green-600 bg-green-50';
      case 'short':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSignalText = () => {
    switch (signal) {
      case 'long':
        return '做多价差 (Long Spread)';
      case 'short':
        return '做空价差 (Short Spread)';
      default:
        return '中性 (Neutral)';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chainColors[chainX] }}
              />
              <span className="text-sm font-medium">{chainNames[chainX]}</span>
            </div>
            <span className="text-gray-400">-</span>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chainColors[chainY] }}
              />
              <span className="text-sm font-medium">{chainNames[chainY]}</span>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${getSignalColor()}`}>
            {getSignalText()}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">对冲比率 (Hedge Ratio)</div>
            <div className="text-lg font-semibold font-mono">{result.hedgeRatio.toFixed(4)}</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">半衰期 (Half-life)</div>
            <div className="text-lg font-semibold font-mono">{result.halfLife.toFixed(1)}</div>
            <div className="text-xs text-gray-400">periods</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">ADF统计量</div>
            <div
              className={`text-lg font-semibold font-mono ${
                result.adfStatistic < result.criticalValue ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {result.adfStatistic.toFixed(3)}
            </div>
            <div className="text-xs text-gray-400">临界值: {result.criticalValue}</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 mb-1">当前Z-Score</div>
            <div
              className={`text-lg font-semibold font-mono ${
                Math.abs(currentZScore) > 2 ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {currentZScore.toFixed(3)}
            </div>
            <div className="text-xs text-gray-400">
              均值: {result.spreadMean.toFixed(2)}, 标准差: {result.spreadStd.toFixed(2)}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">价差序列 (Spread)</div>
          <div className="h-48 bg-gray-50 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="index" stroke="#9ca3af" tick={{ fontSize: 10 }} hide />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={50} />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(4), '']}
                  labelFormatter={() => ''}
                />
                <ReferenceLine y={result.spreadMean} stroke="#6366F1" strokeDasharray="3 3" />
                <ReferenceLine
                  y={result.spreadMean + 2 * result.spreadStd}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={result.spreadMean - 2 * result.spreadStd}
                  stroke="#EF4444"
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="spread"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                  name="Spread"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-indigo-500" />
              <span className="text-xs text-gray-500">价差</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-0.5 bg-indigo-500 border-dashed"
                style={{ borderTop: '1px dashed #6366F1' }}
              />
              <span className="text-xs text-gray-500">均值</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-500" style={{ borderTop: '1px dashed #10B981' }} />
              <span className="text-xs text-gray-500">+2σ</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-500" style={{ borderTop: '1px dashed #EF4444' }} />
              <span className="text-xs text-gray-500">-2σ</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>交易建议:</strong>{' '}
            {signal === 'long' &&
              '价差处于历史低位，建议做多价差（买入被低估的资产，卖出被高估的资产），预期价差回归均值。'}
            {signal === 'short' &&
              '价差处于历史高位，建议做空价差（卖出被高估的资产，买入被低估的资产），预期价差回归均值。'}
            {signal === 'neutral' && '价差在合理区间内波动，建议观望等待更好的入场时机。'}
          </p>
        </div>
      </div>
    </div>
  );
}
