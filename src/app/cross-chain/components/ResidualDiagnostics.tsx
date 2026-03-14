'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts';
import { calculateACF, calculateLjungBox, calculateResidualHistogram } from '../cointegration';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface ResidualDiagnosticsProps {
  residuals: number[];
  maxLag?: number;
}

export function ResidualDiagnostics({ residuals, maxLag = 20 }: ResidualDiagnosticsProps) {
  const acfData = useMemo(() => {
    return calculateACF(residuals, maxLag);
  }, [residuals, maxLag]);

  const ljungBox = useMemo(() => {
    return calculateLjungBox(residuals, maxLag);
  }, [residuals, maxLag]);

  const histogramData = useMemo(() => {
    return calculateResidualHistogram(residuals, 15);
  }, [residuals]);

  // Calculate confidence interval (±1.96/√n for 95% confidence)
  const confidenceInterval = useMemo(() => {
    const n = residuals.length;
    return n > 0 ? 1.96 / Math.sqrt(n) : 0;
  }, [residuals]);

  const residualStats = useMemo(() => {
    const n = residuals.length;
    if (n === 0) return { mean: 0, std: 0, min: 0, max: 0 };

    const mean = residuals.reduce((a, b) => a + b, 0) / n;
    const variance = residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    const min = Math.min(...residuals);
    const max = Math.max(...residuals);

    return { mean, std, min, max };
  }, [residuals]);

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="text-sm font-medium text-gray-900 mb-4">残差诊断 (Residual Diagnostics)</h4>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACF Chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">自相关函数 (ACF)</span>
            <div className="text-xs text-gray-400">
              Ljung-Box: Q = {ljungBox.statistic.toFixed(2)}, p = {ljungBox.pValue.toFixed(3)}
            </div>
          </div>
          <div className="h-40 bg-gray-50 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acfData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} vertical={false} />
                <XAxis dataKey="lag" stroke={chartColors.recharts.axis} tick={{ fontSize: 9 }} tickCount={6} />
                <YAxis
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 9 }}
                  domain={[-1, 1]}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(4), 'ACF']}
                  labelFormatter={(label) => `Lag ${label}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <ReferenceLine y={0} stroke={chartColors.recharts.secondaryAxis} strokeWidth={1} />
                <ReferenceLine
                  y={confidenceInterval}
                  stroke={semanticColors.danger.main}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <ReferenceLine
                  y={-confidenceInterval}
                  stroke={semanticColors.danger.main}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <Bar
                  dataKey="autocorrelation"
                  fill={semanticColors.info.main}
                  stroke={semanticColors.info.dark}
                  strokeWidth={1}
                  radius={[1, 1, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-indigo-500 rounded-sm" />
              <span className="text-xs text-gray-500">自相关系数</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0 border-t border-dashed border-red-500" />
              <span className="text-xs text-gray-500">
                95%置信区间 (±{confidenceInterval.toFixed(3)})
              </span>
            </div>
          </div>
        </div>

        {/* Residual Distribution Histogram */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">残差分布 (Residual Distribution)</span>
            <div className="text-xs text-gray-400">
              μ = {residualStats.mean.toFixed(3)}, σ = {residualStats.std.toFixed(3)}
            </div>
          </div>
          <div className="h-40 bg-gray-50 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={histogramData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} vertical={false} />
                <XAxis
                  dataKey="bin"
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 8 }}
                  interval={2}
                  angle={-45}
                  textAnchor="end"
                  height={30}
                />
                <YAxis
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => Number(v).toExponential(1)}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const label = name === 'density' ? '经验密度' : '正态密度';
                    return [Number(value).toExponential(3), label];
                  }}
                  labelFormatter={(label) => `Bin: ${label}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="density"
                  fill={semanticColors.success.main}
                  stroke={semanticColors.success.dark}
                  strokeWidth={1}
                  fillOpacity={0.6}
                  name="density"
                />
                <Line
                  type="monotone"
                  dataKey="normalDensity"
                  stroke={semanticColors.danger.main}
                  strokeWidth={2}
                  dot={false}
                  name="normalDensity"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-green-500/60 rounded-sm" />
              <span className="text-xs text-gray-500">经验分布</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-500" />
              <span className="text-xs text-gray-500">正态分布</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <p className="font-medium mb-1">诊断说明:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>ACF图:</strong> 若自相关系数超出置信区间（红色虚线），表明残差存在自相关。
            Ljung-Box检验p值 &lt; 0.05 表示拒绝原假设，残差存在显著自相关。
          </li>
          <li>
            <strong>分布图:</strong> 比较残差的经验分布与正态分布。若两者差异较大，
            可能违反协整检验的正态性假设。
          </li>
          <li>
            <strong>当前状态:</strong>{' '}
            {ljungBox.pValue < 0.05 ? (
              <span className="text-amber-600">残差存在自相关，模型可能需要改进。</span>
            ) : (
              <span className="text-green-600">残差无明显自相关，模型拟合良好。</span>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
