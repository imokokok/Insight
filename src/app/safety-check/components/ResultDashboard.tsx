'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
import { RefreshCw, TrendingDown, Shield, AlertTriangle } from 'lucide-react';

import type { PositionCriticalResult } from '@/lib/protocols/protocolHealth';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

import { CircularGauge } from './CircularGauge';
import { CountUp } from './CountUp';
import { RiskChart } from './RiskChart';

interface ResultDashboardProps {
  result: PositionCriticalResult;
  onReset: () => void;
}

export function ResultDashboard({ result, onReset }: ResultDashboardProps) {
  const status = useMemo(() => {
    const hf = result.currentHealthFactor;
    if (hf < 1) return { label: '已被清算', color: 'text-gray-500', bg: 'bg-gray-50' };
    if (hf < 1.05) return { label: '清算边缘', color: 'text-red-600', bg: 'bg-red-50' };
    if (hf < 1.2) return { label: '风险较高', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: '状态安全', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  }, [result.currentHealthFactor]);

  const deviationAbs = Math.abs(result.criticalDeviationPercent);
  const isDown = result.criticalDeviationPercent < 0;

  const heatmapData = useMemo(() => {
    return result.pricePoints.map((p) => ({
      ...p,
      isCritical: Math.abs(p.deviationPercent - result.criticalDeviationPercent) < 0.5,
    }));
  }, [result]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Critical Deviation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col justify-center"
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            临界偏差
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'text-5xl font-bold tracking-tight',
                isDown ? 'text-red-600' : 'text-emerald-600'
              )}
            >
              <CountUp end={deviationAbs} duration={1200} decimals={2} />
              <span className="text-2xl ml-1">%</span>
            </span>
            <span
              className={cn(
                'text-xs font-semibold px-2 py-1 rounded-full',
                isDown ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              )}
            >
              {isDown ? '下跌' : '上涨'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            当 {result.collateralSymbol} 价格{isDown ? '下跌' : '上涨'}到{' '}
            <span className="text-gray-900 font-mono font-medium">
              {formatPrice(result.criticalCollateralPrice)}
            </span>{' '}
            时，你的仓位将面临清算
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> 当前: {formatPrice(result.collateralPrice)}
            </span>
            <span>HF: {result.currentHealthFactor.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Gauge */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col items-center justify-center"
        >
          <CircularGauge value={result.currentHealthFactor} size={140} strokeWidth={9} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 text-center"
          >
            <p className={cn('text-base font-bold', status.color)}>{status.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              清算阈值 {(result.liquidationThreshold * 100).toFixed(0)}%
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <RiskChart result={result} />
      </motion.div>

      {/* Detail Cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          {
            label: '抵押资产',
            value: `${result.collateralAmount} ${result.collateralSymbol}`,
            sub: `≈ ${formatPrice(result.collateralAmount * result.collateralPrice)}`,
            icon: Shield,
          },
          {
            label: '借款资产',
            value: `${result.borrowAmount} ${result.borrowSymbol}`,
            sub: `≈ ${formatPrice(result.borrowAmount * result.borrowPrice)}`,
            icon: AlertTriangle,
          },
          {
            label: '当前抵押率',
            value: `${(result.currentCollateralRatio * 100).toFixed(2)}%`,
            sub: `阈值: ${(result.liquidationThreshold * 100).toFixed(0)}%`,
            icon: TrendingDown,
          },
          { label: '协议', value: result.protocolName, sub: result.chain, icon: Shield },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.06 }}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <item.icon className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                {item.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{item.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
      >
        <h4 className="text-sm font-semibold text-gray-900 mb-4">价格偏差状态</h4>
        <div className="space-y-2">
          {heatmapData.map((point, index) => {
            const cfg =
              point.status === 'safe'
                ? { color: '#10b981', bg: 'bg-emerald-50', label: '安全', text: 'text-emerald-700' }
                : point.status === 'warning'
                  ? { color: '#f59e0b', bg: 'bg-amber-50', label: '警告', text: 'text-amber-700' }
                  : point.status === 'critical'
                    ? { color: '#ef4444', bg: 'bg-red-50', label: '临界', text: 'text-red-700' }
                    : { color: '#6b7280', bg: 'bg-gray-50', label: '清算', text: 'text-gray-700' };

            const barWidth = Math.min(100, Math.max(15, (point.collateralRatio / 250) * 100));

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg',
                  point.isCritical && 'bg-red-50/60 border border-red-100'
                )}
              >
                <div className="w-20 shrink-0">
                  <span
                    className={cn(
                      'text-sm font-mono font-semibold',
                      point.deviationPercent === 0 ? 'text-gray-900' : 'text-gray-500'
                    )}
                  >
                    {point.deviationPercent > 0 ? '+' : ''}
                    {point.deviationPercent.toFixed(1)}%
                  </span>
                  {point.deviationPercent === 0 && (
                    <span className="text-[10px] text-gray-400 ml-1">当前</span>
                  )}
                </div>
                <div className="w-16 shrink-0 text-right">
                  <span className="text-sm font-mono text-gray-600">
                    {formatPrice(point.collateralPrice)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-6 bg-gray-100 rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ delay: 0.6 + index * 0.05, duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-md"
                      style={{ backgroundColor: cfg.color, opacity: 0.6 }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-px bg-gray-300"
                      style={{ left: `${((result.liquidationThreshold * 100) / 250) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-14 text-right shrink-0">
                  <span className="text-sm font-mono text-gray-600">
                    {point.collateralRatio.toFixed(0)}%
                  </span>
                </div>
                <div className="w-16 shrink-0 flex justify-end">
                  <span
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                      cfg.bg,
                      cfg.text
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Reset */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex justify-center pt-2"
      >
        <button
          onClick={onReset}
          className="group flex items-center gap-2 text-sm text-gray-400 hover:text-primary-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          重新计算
        </button>
      </motion.div>
    </motion.div>
  );
}
