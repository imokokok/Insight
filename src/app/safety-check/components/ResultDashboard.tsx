'use client';

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';

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
  ExternalLink,
} from 'lucide-react';

import { useReputations } from '@/hooks/data/useReputations';
import { chainNames, providerNames } from '@/lib/constants';
import type {
  PositionCriticalResult,
  AssetDeviationResult,
  SafetyBufferAnalysis,
  PositionInput,
} from '@/lib/protocols/protocolHealth';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { Blockchain } from '@/types/oracle';

import { CircularGauge } from './CircularGauge';
import { CountUp } from './CountUp';
import { SafetyBufferBreakdown } from './SafetyBufferBreakdown';
import { SafetyPlannerPanel } from './SafetyPlannerPanel';

const RiskChart = dynamic(() => import('./RiskChart').then((m) => m.RiskChart), {
  ssr: false,
});

interface ResultDashboardProps {
  result: PositionCriticalResult;
  position: PositionInput;
  onReset: () => void;
}

const SAFETY_CONFIGS: Record<
  SafetyBufferAnalysis['overallLevel'],
  { icon: typeof ShieldCheck; color: string; bg: string; border: string }
> = {
  safe: {
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  moderate: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  risky: {
    icon: ShieldAlert,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  dangerous: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export function ResultDashboard({ result, position, onReset }: ResultDashboardProps) {
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
  const isJoint = worstDeviation.symbol === 'JOINT';

  const heatmapData = useMemo(() => {
    return result.pricePoints.map((p) => ({
      ...p,
      isCritical: Math.abs(p.deviationPercent - worstDeviation.criticalDeviationPercent) < 0.5,
    }));
  }, [result, worstDeviation]);

  const safetyConfig = SAFETY_CONFIGS[result.safetyBuffer.overallLevel];

  const SafetyIcon = safetyConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* ── Section 1: Core Conclusion ── */}
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
                isJoint
                  ? 'bg-purple-50 text-purple-700'
                  : isDown
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
              )}
            >
              {isJoint ? 'Joint Deviation' : isDown ? 'Price Drop' : 'Price Rise'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {isJoint ? (
              <>
                When all collaterals drop{' '}
                <span className="text-gray-900 font-mono font-medium">
                  {deviationAbs.toFixed(2)}%
                </span>{' '}
                AND all borrows rise{' '}
                <span className="text-gray-900 font-mono font-medium">
                  {deviationAbs.toFixed(2)}%
                </span>{' '}
                simultaneously, your position will face liquidation
              </>
            ) : (
              <>
                When {worstDeviation.symbol} price {isDown ? 'drops' : 'rises'} to{' '}
                <span className="text-gray-900 font-mono font-medium">
                  {formatPrice(worstDeviation.criticalPrice)}
                </span>
                , your position will face liquidation
              </>
            )}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            {!isJoint && (
              <span className="flex items-center gap-1">
                {isDown ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                Current: {formatPrice(worstDeviation.currentPrice)}
              </span>
            )}
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

      {/* ── Section 2: Risk Assessment & Action ── */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Risk Assessment & Action
        </h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Safety Buffer Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn('rounded-lg border shadow-sm p-5', safetyConfig.bg, safetyConfig.border)}
        >
          <div className="flex items-center gap-2 mb-3">
            <SafetyIcon className={cn('w-5 h-5', safetyConfig.color)} />
            <h4 className="text-sm font-semibold text-gray-900">Safety Buffer</h4>
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

          <SafetyBufferBreakdown safetyBuffer={result.safetyBuffer} />

          {result.safetyBuffer.recommendations.length > 0 && (
            <div className="space-y-1.5">
              {result.safetyBuffer.recommendations.map((rec) => (
                <div key={rec} className="flex items-start gap-2 text-sm text-gray-600">
                  <Info className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Oracle Reliability Warnings */}
        {result.oracleWarnings.length > 0 && (
          <OracleReliabilityWarnings warnings={result.oracleWarnings} />
        )}
      </div>

      {/* Safety Parameter Planner (反向求参数 - 行动处方) */}
      <SafetyPlannerPanel position={position} />

      {/* ── Section 3: Position Overview ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        {/* Detail stat cards as a compact header row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
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
              sub: `Collateral: ${formatCompactNumber(result.totalAdjustedCollateralValue)}`,
              icon: TrendingDown,
            },
            {
              label: 'Protocol',
              value: result.protocolName,
              sub: chainNames[result.chain as Blockchain] ?? result.chain,
              icon: Shield,
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="px-4 py-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{item.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Asset Deviations (inside the same card) */}
        <div className="p-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Deviation Analysis</h4>
            {result.assetDeviations.length > 3 && (
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
            )}
          </div>
          <div className="space-y-2">
            {/* Joint Deviation (OVer-style worst case) */}
            <JointDeviationCard
              deviation={result.jointDeviation}
              isWorst={result.jointDeviation === worstDeviation}
              deviationRatios={result.deviationRatios}
              collaterals={result.collaterals}
              borrows={result.borrows}
            />
            {/* Per-asset single deviations */}
            {(showAllDeviations ? result.assetDeviations : result.assetDeviations.slice(0, 3)).map(
              (deviation) => (
                <AssetDeviationCard
                  key={deviation.symbol}
                  deviation={deviation}
                  isWorst={deviation === worstDeviation}
                />
              )
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Section 4: Detailed Data ── */}
      <div
        className={cn(
          result.collaterals.length > 1 || result.borrows.length > 1
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
            : 'space-y-4'
        )}
      >
        {/* Left: Collateral & Borrow Details */}
        {(result.collaterals.length > 1 || result.borrows.length > 1) && (
          <div className="space-y-4">
            {/* Collateral Details */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Collateral Breakdown</h4>
              <div className="space-y-2">
                {result.collaterals.map((c) => (
                  <div key={c.symbol} className="flex items-center justify-between text-sm">
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
                  <span className="text-gray-600">Collateral Total</span>
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
                {result.borrows.map((b) => (
                  <div key={b.symbol} className="flex items-center justify-between text-sm">
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
          </div>
        )}

        {/* Chart + Heatmap */}
        <div className="space-y-4">
          <RiskChart result={result} />

          {/* Heatmap */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Price Deviation Status</h4>
            <div className="space-y-2">
              {heatmapData.map((point, index) => {
                const cfg =
                  point.status === 'safe'
                    ? {
                        color: '#10b981',
                        bg: 'bg-emerald-50',
                        label: 'Safe',
                        text: 'text-emerald-700',
                      }
                    : point.status === 'warning'
                      ? {
                          color: '#f59e0b',
                          bg: 'bg-amber-50',
                          label: 'Warning',
                          text: 'text-amber-700',
                        }
                      : point.status === 'critical'
                        ? {
                            color: '#ef4444',
                            bg: 'bg-red-50',
                            label: 'Critical',
                            text: 'text-red-700',
                          }
                        : {
                            color: '#6b7280',
                            bg: 'bg-gray-50',
                            label: 'Liquidated',
                            text: 'text-gray-700',
                          };

                const barWidth = Math.min(100, Math.max(15, (point.collateralRatio / 250) * 100));

                return (
                  <motion.div
                    key={point.deviationPercent}
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
                          transition={{
                            delay: 0.6 + index * 0.03,
                            duration: 0.5,
                            ease: 'easeOut',
                          }}
                          className="h-full rounded-md"
                          style={{ backgroundColor: cfg.color, opacity: 0.6 }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-px bg-gray-300"
                          style={{
                            left: `${((result.liquidationThreshold * 100) / 250) * 100}%`,
                          }}
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
          </div>
        </div>
      </div>

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

function JointDeviationCard({
  deviation,
  isWorst,
  deviationRatios,
  collaterals,
  borrows,
}: {
  deviation: AssetDeviationResult;
  isWorst: boolean;
  deviationRatios: Record<string, number>;
  collaterals: PositionCriticalResult['collaterals'];
  borrows: PositionCriticalResult['borrows'];
}) {
  const absDeviation = Math.abs(deviation.criticalDeviationPercent);
  // criticalDeviationPercent is now major-equivalent δ (k × 100)
  const majorEquivK = absDeviation / 100;

  // Build per-asset δ breakdown from ratios × k
  const collBreakdown = collaterals.map((c) => {
    const ratio = deviationRatios[c.symbol] ?? 1.0;
    return { symbol: c.symbol, delta: majorEquivK * ratio * 100, direction: 'down' as const };
  });
  const brwBreakdown = borrows.map((b) => {
    const ratio = deviationRatios[b.symbol] ?? 1.0;
    return { symbol: b.symbol, delta: majorEquivK * ratio * 100, direction: 'up' as const };
  });

  // Joint deviation is always the most conservative scenario — use purple accent
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
        'flex flex-col gap-2 p-3 rounded-lg border',
        isWorst
          ? cn(levelConfig.bg, levelConfig.border, 'ring-1 ring-purple-200')
          : 'border-purple-100 bg-purple-50/40'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 w-20 shrink-0">
          <span className="font-medium text-gray-900 text-sm">JOINT</span>
          {isWorst && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-600">
              WORST
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-purple-500" />
          <span className={cn('text-sm font-bold font-mono', levelConfig.color)}>
            {absDeviation.toFixed(2)}%
          </span>
          <span className="text-[10px] text-gray-400">major-equiv δ</span>
        </div>
        <div className="text-xs text-gray-500 flex-1">
          All collaterals drop & all borrows rise simultaneously (per-asset δ)
        </div>
      </div>
      {/* Per-asset δ breakdown */}
      <div className="flex flex-wrap gap-1.5 pl-[88px]">
        {collBreakdown.map((item) => (
          <span
            key={`c-${item.symbol}`}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100"
            title={`${item.symbol} collateral drops ${item.delta.toFixed(2)}%`}
          >
            {item.symbol} ↓{item.delta.toFixed(2)}%
          </span>
        ))}
        {brwBreakdown.map((item) => (
          <span
            key={`b-${item.symbol}`}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100"
            title={`${item.symbol} borrow rises ${item.delta.toFixed(2)}%`}
          >
            {item.symbol} ↑{item.delta.toFixed(2)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function OracleReliabilityWarnings({
  warnings,
}: {
  warnings: PositionCriticalResult['oracleWarnings'];
}) {
  const { data: reputationData } = useReputations();
  const reputationMap = useMemo(() => {
    const map = new Map<string, number>();
    reputationData?.data.forEach((r) => {
      map.set(r.provider, r.overall_score);
    });
    return map;
  }, [reputationData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-900">Oracle Reliability</h4>
      </div>
      <div className="space-y-2">
        {warnings.map((warning) => {
          const levelConfig = {
            healthy: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Healthy' },
            fair: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Fair' },
            degraded: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Degraded' },
            critical: { color: 'text-red-600', bg: 'bg-red-50', label: 'Critical' },
          }[warning.level];

          const reputationScore = reputationMap.get(warning.provider);

          return (
            <div
              key={warning.provider}
              className={cn(
                'rounded-lg border p-3',
                levelConfig.bg,
                warning.level === 'healthy'
                  ? 'border-emerald-200'
                  : warning.level === 'fair'
                    ? 'border-blue-200'
                    : warning.level === 'degraded'
                      ? 'border-amber-200'
                      : 'border-red-200'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/reputation/${encodeURIComponent(warning.provider)}`}
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                  >
                    {providerNames[warning.provider] ?? warning.provider}
                  </Link>
                  <Link
                    href={`/reputation/${encodeURIComponent(warning.provider)}`}
                    className="text-gray-300 hover:text-indigo-500 transition-colors"
                    title="View reputation details"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
                  {reputationScore !== undefined && (
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      7d {reputationScore.toFixed(0)}
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      levelConfig.bg,
                      levelConfig.color
                    )}
                  >
                    {levelConfig.label} · {warning.overallScore.toFixed(0)}/100
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600">{warning.message}</p>
              {warning.level !== 'healthy' && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
                  <span>Freshness: {warning.freshnessScore.toFixed(0)}</span>
                  <span>Reliability: {warning.reliabilityScore.toFixed(0)}</span>
                  <span>Avg Deviation: {warning.avgDeviationPct.toFixed(2)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}
