'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import {
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Layers,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { chainNames } from '@/lib/constants';
import type { ProtocolDetection } from '@/lib/protocols/detection';
import { buildCombinedPortfolio, type ProtocolHealthEntry } from '@/lib/protocols/portfolio';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { Blockchain } from '@/types/oracle';

import { usePortfolioHealth } from '../hooks/usePortfolioHealth';

interface PortfolioDashboardProps {
  /** Full detection set returned by the scan. */
  detections: ProtocolDetection[];
  /** Return to the wallet entry point. */
  onReset: () => void;
}

function UpdatedAgo({ since }: { since: number | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (!since) return <span>just now</span>;
  const secs = Math.max(0, Math.round((Date.now() - since) / 1000));
  if (secs < 5) return <span>just now</span>;
  if (secs < 60) return <span>Updated {secs}s ago</span>;
  const mins = Math.floor(secs / 60);
  return <span>Updated {mins}m ago</span>;
}

export function PortfolioDashboard({ detections, onReset }: PortfolioDashboardProps) {
  const { entries, isLoading, error, refreshError, computeAll, refresh } = usePortfolioHealth();

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [prevDistance, setPrevDistance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute (and recompute) whenever a new detection set arrives.
  useEffect(() => {
    void computeAll(detections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections]);

  const combined = useMemo<ReturnType<typeof buildCombinedPortfolio> | null>(() => {
    if (!entries || entries.length === 0) return null;
    return buildCombinedPortfolio(entries);
  }, [entries]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    if (combined) setPrevDistance(combined.combinedLiquidationDistancePercent);
    setIsRefreshing(true);
    try {
      await refresh();
      setLastRefreshedAt(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, combined, refresh]);

  // Auto-refresh every 45s while mounted (paused when the tab is hidden).
  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  useEffect(() => {
    if (!combined) return;
    const id = setInterval(() => {
      if (!document.hidden) handleRefreshRef.current();
    }, 45 * 1000);
    return () => clearInterval(id);
  }, [combined]);

  // Partition detections for display.
  const complete = useMemo(
    () =>
      detections.filter(
        (d) =>
          d.hasPosition &&
          d.position &&
          d.position.collaterals.length > 0 &&
          d.position.borrows.length > 0
      ),
    [detections]
  );
  const incomplete = useMemo(
    () =>
      detections.filter(
        (d) =>
          d.hasPosition &&
          (!d.position || d.position.collaterals.length === 0 || d.position.borrows.length === 0)
      ),
    [detections]
  );
  const errored = useMemo(() => detections.filter((d) => d.supported && d.error), [detections]);

  // Skipped (un-configured) on-chain assets live on the detection, not the calc result.
  const skippedByProtocol = useMemo(() => {
    const map: Record<string, { symbol: string; reason: string }[]> = {};
    for (const d of detections) {
      if (d.position?.skippedAssets?.length) {
        map[d.protocolId] = d.position.skippedAssets.map((a) => ({
          symbol: a.symbol,
          reason: a.reason,
        }));
      }
    }
    return map;
  }, [detections]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Live refresh bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
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
        <Button onClick={handleRefresh} isLoading={isRefreshing} size="sm" variant="secondary">
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      {/* Combined summary */}
      {combined && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-sm p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5" />
            <h3 className="text-base font-semibold">Portfolio Liquidation Guard</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Metric label="抵押总值" value={formatPrice(combined.totalCollateralUsd)} />
            <Metric label="借款总值" value={formatPrice(combined.totalBorrowUsd)} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-blue-100">组合清算距离</p>
              <p className="text-2xl font-bold mt-1">
                {combined.combinedLiquidationDistancePercent.toFixed(1)}%
              </p>
              {prevDistance !== null &&
                combined.combinedLiquidationDistancePercent !== prevDistance && (
                  <Drift
                    delta={combined.combinedLiquidationDistancePercent - prevDistance}
                    unit="%"
                  />
                )}
              <p className="text-[11px] text-blue-100 mt-1">价格再跌这么多最先爆仓</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-blue-100">最弱协议</p>
              <p className="text-lg font-semibold mt-2 truncate" title={combined.weakestName ?? ''}>
                {combined.weakestName ?? '—'}
              </p>
            </div>
          </div>
          {combined.correlations.length > 0 && (
            <div className="mt-4 bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span className="text-xs font-semibold text-amber-100">相关性风险</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {combined.correlations.map((c) => (
                  <span key={c.symbol} className="text-xs bg-white/15 rounded-full px-2.5 py-1">
                    <span className="font-mono font-semibold">{c.symbol}</span> 出现在{' '}
                    {c.protocols.join('、')}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-blue-100 mt-2">
                同一资产跨多池，单笔价格下跌会同时冲击多个仓位。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading / error */}
      {isLoading && !entries && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 flex items-center justify-center text-slate-400 text-sm">
          正在计算各协议临界偏离…
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-red-700 text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Per-protocol cards */}
      {entries && entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <ProtocolCard
              key={entry.protocolId}
              entry={entry}
              skipped={skippedByProtocol[entry.protocolId] ?? []}
            />
          ))}
        </div>
      )}

      {/* Incomplete (single-sided) detections */}
      {incomplete.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2">
            以下协议只检测到单侧持仓，无法计算清算临界（需同时有抵押与借贷）：
          </p>
          <ul className="space-y-1">
            {incomplete.map((d) => (
              <li key={d.protocolId} className="text-xs text-amber-700 flex items-center gap-2">
                <span>
                  {d.name}（{chainNames[d.chain as Blockchain] ?? d.chain}）—{' '}
                  {d.position?.collaterals.length
                    ? '仅抵押'
                    : d.position?.borrows.length
                      ? '仅借贷'
                      : '空'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errored detections */}
      {errored.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 mb-2">以下协议扫描失败：</p>
          <ul className="space-y-1">
            {errored.map((d) => (
              <li key={d.protocolId} className="text-xs text-red-600 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {d.name}（{chainNames[d.chain as Blockchain] ?? d.chain}）— {d.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {complete.length === 0 && !isLoading && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-sm text-slate-500">
          没有可用于压力测试的完整仓位（需要同时有抵押与借贷资产）。可返回手动补录，或在其他协议上检查。
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        返回重新连接钱包
      </button>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-blue-100">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Drift({ delta, unit }: { delta: number; unit: string }) {
  const up = delta > 0;
  return (
    <p
      className={cn(
        'text-[11px] mt-0.5 flex items-center gap-0.5',
        up ? 'text-emerald-200' : 'text-red-200'
      )}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}
      {delta.toFixed(2)}
      {unit}
    </p>
  );
}

function ProtocolCard({
  entry,
  skipped,
}: {
  entry: ProtocolHealthEntry;
  skipped: { symbol: string; reason: string }[];
}) {
  const { result } = entry;
  const hf = result.currentHealthFactor;
  const distance = Math.abs(result.worstDeviation.criticalDeviationPercent);
  const isDown = result.worstDeviation.direction === 'down';
  const band = result.liquidationPriceBand;

  const hfColor = hf < 1.05 ? 'text-red-600' : hf < 1.2 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{entry.name}</h4>
          <p className="text-xs text-slate-400">
            {chainNames[entry.chain as Blockchain] ?? entry.chain}
          </p>
        </div>
        <span className={cn('text-lg font-bold', hfColor)}>HF {hf.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-50 rounded-lg p-2.5">
          <span className="text-xs text-slate-500">清算临界偏离</span>
          <p className="font-semibold text-slate-900 mt-0.5">
            {isDown ? '↓' : '↑'} {distance.toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <span className="text-xs text-slate-500">抵押 / 借款</span>
          <p className="font-semibold text-slate-900 mt-0.5">
            {result.collaterals.length} / {result.borrows.length}
          </p>
        </div>
      </div>

      {!band.unknown && (
        <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
          <span>清算价区间</span>
          <span className="font-mono text-slate-600">
            {formatPrice(band.lower)} – {formatPrice(band.upper)}
          </span>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="mt-2 text-xs text-amber-700">
          未导入：
          {skipped
            .map((a) => (a.reason === 'unsupported' ? `${a.symbol} (not configured)` : a.symbol))
            .join(', ')}
        </div>
      )}
    </div>
  );
}
