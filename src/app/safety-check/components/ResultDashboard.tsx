'use client';

import { useMemo, useState, useEffect } from 'react';

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
  Info,
  ExternalLink,
} from 'lucide-react';

import { chainNames, providerNames } from '@/lib/constants';
import type {
  PositionCriticalResult,
  AssetDeviationResult,
  SafetyBufferAnalysis,
  PositionInput,
  DeviationScenario,
} from '@/lib/protocols/protocolHealth';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { Blockchain } from '@/types/oracle';

import { CircularGauge } from './CircularGauge';
import { CountUp } from './CountUp';
import { LendingSafetySection } from './LendingSafetySection';
import { SafetyBufferBreakdown } from './SafetyBufferBreakdown';
import { SafetyPlannerPanel } from './SafetyPlannerPanel';

const RiskChart = dynamic(() => import('./RiskChart').then((m) => m.RiskChart), {
  ssr: false,
});

interface ResultDashboardProps {
  result: PositionCriticalResult;
  position: PositionInput;
  onReset: () => void;
  /** Manual refresh of prices / health factor. */
  onRefresh: () => void;
  /** True while a background or manual refresh is in flight. */
  isRefreshing: boolean;
  /** Timestamp (ms) of the last successful calculation/refresh. */
  lastRefreshedAt: number | null;
  /** Metric snapshot captured before the most recent refresh, for drift display. */
  prevSnapshot: { hf: number; critical: number } | null;
  /** Last background-refresh error (result is kept on screen). */
  refreshError: string | null;
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

export function ResultDashboard({
  result,
  position,
  onReset,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
  prevSnapshot,
  refreshError,
}: ResultDashboardProps) {
  const status = useMemo(() => {
    const hf = result.currentHealthFactor;
    if (hf < 1) return { label: 'Already Liquidated', color: 'text-slate-500', bg: 'bg-slate-50' };
    if (hf < 1.05) return { label: 'Liquidation Edge', color: 'text-red-600', bg: 'bg-red-50' };
    if (hf < 1.2) return { label: 'High Risk', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Safe', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  }, [result.currentHealthFactor]);

  const worstDeviation = result.worstDeviation;
  const deviationAbs = Math.abs(worstDeviation.criticalDeviationPercent);
  const isDown = worstDeviation.direction === 'down';
  const isJoint = worstDeviation.symbol === 'JOINT';

  const safetyConfig = SAFETY_CONFIGS[result.safetyBuffer.overallLevel];

  const SafetyIcon = safetyConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* ── Live refresh bar (price / health-factor drift) ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className="relative flex h-2 w-2"
            title="Prices & health factor refresh automatically. Position amounts reflect your last import."
          >
            {isRefreshing && (
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                isRefreshing ? 'bg-emerald-400' : 'bg-emerald-500'
              )}
            />
          </span>
          <span className="font-medium text-slate-600">Live prices</span>
          <span className="text-slate-300">·</span>
          <UpdatedAgo since={lastRefreshedAt} />
          {refreshError && (
            <span className="text-red-600 ml-1" title={refreshError}>
              refresh failed
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {prevSnapshot && (
            <span className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>
                HF {prevSnapshot.hf.toFixed(2)}→{result.currentHealthFactor.toFixed(2)}
                <DriftArrow delta={result.currentHealthFactor - prevSnapshot.hf} />
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Crit {prevSnapshot.critical.toFixed(2)}%→
                {Math.abs(result.worstDeviation.criticalDeviationPercent).toFixed(2)}%
                <DriftArrow
                  delta={
                    Math.abs(result.worstDeviation.criticalDeviationPercent) - prevSnapshot.critical
                  }
                />
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh prices & health factor"
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Section 1: Core Conclusion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Critical Deviation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-center"
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
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
                  ? 'bg-blue-50 text-blue-700'
                  : isDown
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
              )}
            >
              {isJoint ? 'Joint Deviation' : isDown ? 'Price Drop' : 'Price Rise'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            {isJoint ? (
              <>
                When all collaterals drop{' '}
                <span className="text-slate-900 font-mono font-medium">
                  {deviationAbs.toFixed(2)}%
                </span>{' '}
                AND all borrows rise{' '}
                <span className="text-slate-900 font-mono font-medium">
                  {deviationAbs.toFixed(2)}%
                </span>{' '}
                simultaneously, your position will face liquidation
              </>
            ) : (
              <>
                When {worstDeviation.symbol} price {isDown ? 'drops' : 'rises'} to{' '}
                <span className="text-slate-900 font-mono font-medium">
                  {formatPrice(worstDeviation.criticalPrice)}
                </span>
                {result.liquidationPriceBand.adversePercent > 0 && (
                  <>
                    {' '}
                    ±
                    <span className="font-mono font-medium text-blue-700">
                      {result.liquidationPriceBand.adversePercent.toFixed(2)}%
                    </span>
                  </>
                )}
                , your position will face liquidation
                {result.liquidationPriceBand.adversePercent > 0 && (
                  <span className="mt-1 block text-[11px] leading-snug text-blue-700/90">
                    Oracle uncertainty: liquidation price may actually be{' '}
                    <span className="font-mono">
                      {formatPrice(result.liquidationPriceBand.lower)} –{' '}
                      {formatPrice(result.liquidationPriceBand.upper)}
                    </span>
                    {result.liquidationPriceBand.unknown && (
                      <span className="ml-1 rounded bg-blue-100/70 px-1 text-[9px] text-blue-700">
                        unverified
                      </span>
                    )}
                  </span>
                )}
              </>
            )}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
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
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center justify-center"
        >
          <CircularGauge value={result.currentHealthFactor} size={140} strokeWidth={9} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 text-center"
          >
            <p className={cn('text-base font-bold', status.color)}>{status.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Liq. Threshold {((1 / result.liquidationThreshold) * 100).toFixed(0)}%
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Section 1.5: User-Friendly Risk Summary ── */}
      <UserRiskSummary result={result} />

      {/* ── Section 1.6: Fixed Deviation Scenarios (1% / 3% / 5%) ── */}
      <DeviationScenarioPanel scenarios={result.deviationScenarios} />

      {/* ── Section 1.7: Data Source Disclaimer ── */}
      <ProtocolDisclaimer />

      {/* ── Section 2: Risk Assessment & Action ── */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Risk Assessment & Action
        </h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Safety Buffer Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn('rounded-2xl border shadow-sm p-5', safetyConfig.bg, safetyConfig.border)}
        >
          <div className="flex items-center gap-2 mb-3">
            <SafetyIcon className={cn('w-5 h-5', safetyConfig.color)} />
            <h4 className="text-sm font-semibold text-slate-900">Safety Buffer</h4>
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
          <p className="text-sm text-slate-700 mb-3">{result.safetyBuffer.description}</p>

          <SafetyBufferBreakdown
            safetyBuffer={result.safetyBuffer}
            liquidationPriceBand={result.liquidationPriceBand}
          />

          {result.safetyBuffer.recommendations.length > 0 && (
            <div className="space-y-1.5">
              {result.safetyBuffer.recommendations.map((rec) => (
                <div key={rec} className="flex items-start gap-2 text-sm text-slate-600">
                  <Info className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
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

      {/* Pre-Trade Lending Safety: live pre-trade check answering "is it safe to
          open / increase this borrow right now?" for the position's protocol+asset. */}
      <LendingSafetySection
        protocolId={result.protocolId}
        asset={result.collateralSymbol}
        chain={result.chain}
      />

      {/* Safety Parameter Planner (inverse solver — action prescription) */}
      <SafetyPlannerPanel position={position} existingResult={result} />

      {/* ── Section 3: Position Overview ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm"
      >
        {/* Detail stat cards as a compact header row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
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
                <item.icon className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{item.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Joint Deviation (OVer-style worst case) */}
        <div className="p-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900">Worst-Case Joint Deviation</h4>
          </div>
          <div className="space-y-2">
            <JointDeviationCard
              deviation={result.jointDeviation}
              isWorst={result.jointDeviation === worstDeviation}
              deviationRatios={result.deviationRatios}
              collaterals={result.collaterals}
              borrows={result.borrows}
            />
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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Collateral Breakdown</h4>
              <div className="space-y-2">
                {result.collaterals.map((c) => (
                  <div key={c.symbol} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{c.symbol}</span>
                      <span className="text-xs text-slate-400">
                        CF {(c.collateralFactor * 100).toFixed(0)}% · LT{' '}
                        {((1 / c.liquidationThreshold) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-slate-700">
                        {c.amount} × {formatPrice(c.price)}
                      </span>
                      <span className="text-slate-400 ml-2">= {formatPrice(c.value)}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-medium">
                  <span className="text-slate-600">Collateral Total</span>
                  <span className="text-slate-900 font-mono">
                    {formatPrice(result.totalAdjustedCollateralValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Borrow Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Borrow Breakdown</h4>
              <div className="space-y-2">
                {result.borrows.map((b) => (
                  <div key={b.symbol} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{b.symbol}</span>
                    <div className="text-right">
                      <span className="font-mono text-slate-700">
                        {b.amount} × {formatPrice(b.price)}
                      </span>
                      <span className="text-slate-400 ml-2">= {formatPrice(b.value)}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-medium">
                  <span className="text-slate-600">Total Borrow</span>
                  <span className="text-slate-900 font-mono">
                    {formatPrice(result.totalBorrowValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="space-y-4">
          <RiskChart result={result} />
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
          className="group flex items-center gap-2 text-sm text-slate-400 hover:text-primary-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Recalculate
        </button>
      </motion.div>
    </motion.div>
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

  // Joint deviation is always the most conservative scenario — use the product blue accent.
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
        'flex flex-col gap-2 p-3 rounded-2xl border',
        isWorst
          ? cn(levelConfig.bg, levelConfig.border, 'ring-1 ring-blue-200')
          : 'border-blue-100 bg-blue-50/40'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 w-20 shrink-0">
          <span className="font-medium text-slate-900 text-sm">JOINT</span>
          {isWorst && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700">
              WORST
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
          <span className={cn('text-sm font-bold font-mono', levelConfig.color)}>
            {absDeviation.toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-400">major-equiv δ</span>
        </div>
        <div className="text-xs text-slate-500 flex-1">
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-900">Oracle Reliability</h4>
      </div>
      <div className="space-y-3">
        {warnings.map((warning) => {
          const levelConfig = {
            healthy: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Healthy' },
            fair: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Fair' },
            degraded: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Degraded' },
            critical: { color: 'text-red-600', bg: 'bg-red-50', label: 'Critical' },
          }[warning.level];

          return (
            <div
              key={warning.provider}
              className={cn(
                'rounded-2xl border p-4',
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/reputation/${encodeURIComponent(warning.provider)}`}
                    className="text-sm font-medium text-slate-900 hover:text-blue-700 transition-colors"
                  >
                    {providerNames[warning.provider] ?? warning.provider}
                  </Link>
                  <Link
                    href={`/reputation/${encodeURIComponent(warning.provider)}`}
                    className="text-slate-300 hover:text-blue-600 transition-colors"
                    title="View reputation details"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
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

              <p className={cn('text-sm leading-relaxed mb-2', levelConfig.color)}>
                {warning.impact}
              </p>

              {warning.affectedSymbols.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {warning.affectedSymbols.map((symbol) => (
                    <span
                      key={symbol}
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                        levelConfig.bg,
                        levelConfig.color,
                        warning.level === 'healthy'
                          ? 'border-emerald-200'
                          : warning.level === 'fair'
                            ? 'border-blue-200'
                            : warning.level === 'degraded'
                              ? 'border-amber-200'
                              : 'border-red-200'
                      )}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500">{warning.message}</p>
              {warning.level !== 'healthy' && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
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

function UserRiskSummary({ result }: { result: PositionCriticalResult }) {
  const criticalScenarios = result.deviationScenarios.filter((s) => s.status !== 'safe');
  const worstScenario = criticalScenarios.sort((a, b) => a.healthFactor - b.healthFactor)[0];

  if (result.currentHealthFactor < 1) {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-4">
        <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
        Your position is currently eligible for liquidation. Please take action immediately.
      </div>
    );
  }

  if (!worstScenario) {
    return (
      <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
        <ShieldCheck className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
        Your position is currently safe. Even if collateral prices drop 5%, there is still a
        comfortable buffer before liquidation.
      </div>
    );
  }

  const isJoint = worstScenario.isJoint;
  return (
    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl p-4">
      <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
      Watch out: if <strong>{worstScenario.label}</strong>, your Health Factor would drop to{' '}
      <strong>{worstScenario.healthFactor.toFixed(2)}</strong>, leaving only{' '}
      <strong>{worstScenario.distanceToLiquidationPercent.toFixed(2)}%</strong> before liquidation.
      {isJoint
        ? ' This is a joint-deviation risk across multiple assets. Consider adding collateral or reducing debt in advance.'
        : ' Consider adding collateral or reducing debt in advance.'}
    </div>
  );
}

function ScenarioStatusBadge({ status }: { status: DeviationScenario['status'] }) {
  const config = {
    safe: { label: 'Safe', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    warning: { label: 'Warning', bg: 'bg-amber-100', text: 'text-amber-700' },
    critical: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700' },
    liquidated: { label: 'Liquidated', bg: 'bg-slate-800', text: 'text-white' },
  }[status];

  return (
    <span
      className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', config.bg, config.text)}
    >
      {config.label}
    </span>
  );
}

function DeviationScenarioPanel({ scenarios }: { scenarios: DeviationScenario[] }) {
  if (!scenarios || scenarios.length === 0) return null;

  const singleScenarios = scenarios.filter((s) => !s.isJoint);
  const jointScenarios = scenarios.filter((s) => s.isJoint);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-900">
          What if oracle price deviates 1% / 3% / 5%?
        </h4>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Joint deviation is the OVer-style worst case and the primary risk metric. */}
        <ScenarioGroup
          title="Joint deviation"
          subtitle="All oracles move together — the risk that actually liquidates positions."
          scenarios={jointScenarios}
          variant="primary"
        />
        <ScenarioGroup
          title="Isolated single-asset drop"
          subtitle="For reference: only the primary collateral's oracle moves."
          scenarios={singleScenarios}
          variant="secondary"
        />
      </div>

      <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
        Deviation ratios combine asset-category stress estimates with each protocol&apos;s own
        liquidation-threshold parameters. Data source: on-chain protocol risk configs.
      </p>
    </motion.div>
  );
}

function ScenarioGroup({
  title,
  subtitle,
  scenarios,
  variant,
}: {
  title: string;
  subtitle: string;
  scenarios: DeviationScenario[];
  variant: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'rounded-2xl p-3.5',
        isPrimary ? 'bg-primary-50/50 border border-primary-100' : 'bg-slate-50'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <h5
          className={cn('text-xs font-semibold', isPrimary ? 'text-primary-900' : 'text-slate-500')}
        >
          {title}
        </h5>
        {isPrimary && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">
            Primary
          </span>
        )}
      </div>
      <p
        className={cn(
          'text-[11px] mb-3 leading-relaxed',
          isPrimary ? 'text-primary-700/80' : 'text-slate-400'
        )}
      >
        {subtitle}
      </p>
      <div className="space-y-2">
        {scenarios.map((s) => (
          <div
            key={s.label}
            className={cn(
              'flex items-center justify-between p-2.5 rounded-2xl',
              isPrimary ? 'bg-white border border-primary-100' : 'bg-white border border-slate-100'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-medium text-slate-900 w-16">{s.label}</span>
              <ScenarioStatusBadge status={s.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                HF <span className="font-mono text-slate-900">{s.healthFactor.toFixed(2)}</span>
              </span>
              <span>
                Distance{' '}
                <span className="font-mono text-slate-900">
                  {s.distanceToLiquidationPercent.toFixed(2)}%
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolDisclaimer() {
  return (
    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2">
      <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
      <p>
        Risk parameters are sourced from public protocol documentation and represent commonly
        published liquidation thresholds / LLTVs. Parameters vary by chain and may change after
        governance votes. Always verify current on-chain values on the official protocol interface
        before taking action.
      </p>
    </div>
  );
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function UpdatedAgo({ since }: { since: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  // Lightweight 5s ticker so only this tiny label re-renders, not the whole dashboard.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  if (!since) return <span>Not yet calculated</span>;
  const secs = Math.max(0, Math.round((now - since) / 1000));
  if (secs < 60) return <span>Updated {secs}s ago</span>;
  const mins = Math.floor(secs / 60);
  return (
    <span>
      Updated {mins}m {secs % 60}s ago
    </span>
  );
}

function DriftArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.005) return <span className="text-slate-400">→</span>;
  const up = delta > 0;
  return (
    <span className={up ? 'text-emerald-600' : 'text-red-600'}>
      {up ? ' ▲' : ' ▼'} {Math.abs(delta).toFixed(2)}
    </span>
  );
}
