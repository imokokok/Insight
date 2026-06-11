'use client';

import { useMemo, useState } from 'react';

import { motion } from 'framer-motion';
import {
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Shield,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

import type {
  PositionCriticalResult,
  AssetDeviationResult,
  SafetyBufferAnalysis,
} from '@/lib/protocols/protocolHealth';
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
  const [showAllDeviations, setShowAllDeviations] = useState(false);

  const status = useMemo(() => {
    const hf = result.currentHealthFactor;
    if (hf < 1) return { label: 'Already Liquidated', color: 'text-gray-500', bg: 'bg-gray-50' };
    if (hf < 1.05) return { label: 'Liquidation Edge', color: 'text-red-600', bg: 'bg-red-50' };
    if (hf < 1.2) return { label: 'High Risk', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Safe', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  }, [result.currentHealthFactor]);

  const worstDeviation = result.worstDeviation;
  const deviationAbs = Math.abs(worstDeviation.criticalDeviationPercent);
  const isDown = worstDeviation.direction === 'down';

  const heatmapData = useMemo(() => {
    return result.pricePoints.map((p) => ({
      ...p,
      isCritical: Math.abs(p.deviationPercent - worstDeviation.criticalDeviationPercent) < 0.5,
    }));
  }, [result, worstDeviation]);

  const safetyConfig = useMemo(() => {
    const level = result.safetyBuffer.overallLevel;
    const configs: Record<
      SafetyBufferAnalysis['overallLevel'],
      { icon: typeof ShieldCheck; color: string; bg: string; border: string }
    > = {
      safe: {
        icon: ShieldCheck,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
      },
      moderate: {
        icon: Shield,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      },
      risky: {
        icon: ShieldAlert,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
      },
      dangerous: {
        icon: ShieldX,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
      },
    };
    return configs[level];
  }, [result.safetyBuffer.overallLevel]);

  const SafetyIcon = safetyConfig.icon;

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
            Critical Deviation
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'text-5xl font-bold tracking-tight',
                isDown ? 'text-red-600' : 'text-amber-600'
              )}
            >
              <CountUp end={deviationAbs} duration={1200} decimals={2} />
              <span className="text-2xl ml-1">%</span>
            </span>
            <span
              className={cn(
                'text-xs font-semibold px-2 py-1 rounded-full',
                isDown ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              )}
            >
              {isDown ? 'Price Drop' : 'Price Rise'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            When {worstDeviation.symbol} price {isDown ? 'drops' : 'rises'} to{' '}
            <span className="text-gray-900 font-mono font-medium">
              {formatPrice(worstDeviation.criticalPrice)}
            </span>
            , your position will face liquidation
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              {isDown ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              Current: {formatPrice(worstDeviation.currentPrice)}
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
              Liq. Threshold {(result.liquidationThreshold * 100).toFixed(0)}%
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Asset Deviations - Bidirectional Analysis */}
      {result.assetDeviations.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Asset-Level Deviation Analysis</h4>
            <button
              type="button"
              onClick={() => setShowAllDeviations(!showAllDeviations)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showAllDeviations ? 'Collapse' : 'Show All'}
              {showAllDeviations ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {(showAllDeviations ? result.assetDeviations : result.assetDeviations.slice(0, 3)).map(
              (deviation, index) => (
                <AssetDeviationCard
                  key={index}
                  deviation={deviation}
                  isWorst={deviation === worstDeviation}
                />
              )
            )}
          </div>
        </motion.div>
      )}

      {/* Safety Buffer Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn('rounded-lg border shadow-sm p-5', safetyConfig.bg, safetyConfig.border)}
      >
        <div className="flex items-center gap-2 mb-3">
          <SafetyIcon className={cn('w-5 h-5', safetyConfig.color)} />
          <h4 className="text-sm font-semibold text-gray-900">Safety Buffer Analysis</h4>
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
              safetyConfig.bg,
              safetyConfig.color
            )}
          >
            {result.safetyBuffer.overallLevel}
          </span>
        </div>
        <p className="text-sm text-gray-700 mb-3">{result.safetyBuffer.description}</p>
        {result.safetyBuffer.recommendations.length > 0 && (
          <div className="space-y-1.5">
            {result.safetyBuffer.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <Info className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

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
            label: 'Total Collateral',
            value: `$${formatCompactNumber(result.totalCollateralValue)}`,
            sub: result.collaterals.map((c) => c.symbol).join(' + '),
            icon: Shield,
          },
          {
            label: 'Total Borrow',
            value: `$${formatCompactNumber(result.totalBorrowValue)}`,
            sub: result.borrows.map((b) => b.symbol).join(' + '),
            icon: AlertTriangle,
          },
          {
            label: 'Collateral Ratio',
            value: `${(result.currentCollateralRatio * 100).toFixed(2)}%`,
            sub: `Adjusted: ${(result.currentCollateralRatio * 100).toFixed(2)}%`,
            icon: TrendingDown,
          },
          { label: 'Protocol', value: result.protocolName, sub: result.chain, icon: Shield },
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

      {/* Collateral & Borrow Details */}
      {(result.collaterals.length > 1 || result.borrows.length > 1) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Collateral Details */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Collateral Breakdown</h4>
            <div className="space-y-2">
              {result.collaterals.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{c.symbol}</span>
                    <span className="text-xs text-gray-400">
                      CF {(c.collateralFactor * 100).toFixed(0)}% · LT{' '}
                      {(c.liquidationThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-gray-700">
                      {c.amount} × {formatPrice(c.price)}
                    </span>
                    <span className="text-gray-400 ml-2">= {formatPrice(c.value)}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm font-medium">
                <span className="text-gray-600">Adjusted Total</span>
                <span className="text-gray-900 font-mono">
                  {formatPrice(result.totalAdjustedCollateralValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Borrow Details */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Borrow Breakdown</h4>
            <div className="space-y-2">
              {result.borrows.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{b.symbol}</span>
                  <div className="text-right">
                    <span className="font-mono text-gray-700">
                      {b.amount} × {formatPrice(b.price)}
                    </span>
                    <span className="text-gray-400 ml-2">= {formatPrice(b.value)}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm font-medium">
                <span className="text-gray-600">Total Borrow</span>
                <span className="text-gray-900 font-mono">
                  {formatPrice(result.totalBorrowValue)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
      >
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Price Deviation Status</h4>
        <div className="space-y-2">
          {heatmapData.map((point, index) => {
            const cfg =
              point.status === 'safe'
                ? { color: '#10b981', bg: 'bg-emerald-50', label: 'Safe', text: 'text-emerald-700' }
                : point.status === 'warning'
                  ? {
                      color: '#f59e0b',
                      bg: 'bg-amber-50',
                      label: 'Warning',
                      text: 'text-amber-700',
                    }
                  : point.status === 'critical'
                    ? { color: '#ef4444', bg: 'bg-red-50', label: 'Critical', text: 'text-red-700' }
                    : {
                        color: '#6b7280',
                        bg: 'bg-gray-50',
                        label: 'Liquidated',
                        text: 'text-gray-700',
                      };

            const barWidth = Math.min(100, Math.max(15, (point.collateralRatio / 250) * 100));

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.03 }}
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
                    <span className="text-[10px] text-gray-400 ml-1">Current</span>
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
                      transition={{ delay: 0.6 + index * 0.03, duration: 0.5, ease: 'easeOut' }}
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
          Recalculate
        </button>
      </motion.div>
    </motion.div>
  );
}

function AssetDeviationCard({
  deviation,
  isWorst,
}: {
  deviation: AssetDeviationResult;
  isWorst: boolean;
}) {
  const isDown = deviation.direction === 'down';
  const absDeviation = Math.abs(deviation.criticalDeviationPercent);

  const levelConfig =
    absDeviation < 5
      ? { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
      : absDeviation < 15
        ? { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
        : absDeviation < 30
          ? { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
          : { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        isWorst ? cn(levelConfig.bg, levelConfig.border) : 'border-gray-100 bg-gray-50/50'
      )}
    >
      <div className="flex items-center gap-2 w-20 shrink-0">
        <span className="font-medium text-gray-900 text-sm">{deviation.symbol}</span>
        {isWorst && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-600">
            WORST
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isDown ? (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        ) : (
          <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span className={cn('text-sm font-bold font-mono', levelConfig.color)}>
          {isDown ? '-' : '+'}
          {absDeviation.toFixed(2)}%
        </span>
      </div>
      <div className="text-xs text-gray-500 flex-1">
        {formatPrice(deviation.currentPrice)} → {formatPrice(deviation.criticalPrice)}
      </div>
      <div className="text-xs text-gray-400 shrink-0 max-w-[200px] truncate">
        {deviation.description}
      </div>
    </div>
  );
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}
