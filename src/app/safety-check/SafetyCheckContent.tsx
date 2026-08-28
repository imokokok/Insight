'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import { useSearchParams } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Calculator, Loader2 } from 'lucide-react';

import { isImportableProtocol } from '@/lib/protocols/detection';
import type { ProtocolDetection } from '@/lib/protocols/detection';
import type { EnrichedProtocolConfig } from '@/lib/protocols/dynamicData';
import type { AssetEntry, PositionInput } from '@/lib/protocols/protocolHealth';
import type { ProtocolConfig } from '@/lib/protocols/protocolRegistry';
import { PROTOCOL_REGISTRY } from '@/lib/protocols/protocolRegistry';

import { NoLendingEmptyState } from './components/NoLendingEmptyState';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { PositionForm } from './components/PositionForm';
import { ResultDashboard } from './components/ResultDashboard';
import { StepIndicator } from './components/StepIndicator';
import { WalletGate } from './components/WalletGate';
import { useEntryDemo } from './hooks/useEntryDemo';
import { usePortfolioDetect } from './hooks/usePortfolioDetect';
import { useProtocolHealth } from './hooks/useProtocolHealth';
import { useWalletConnect } from './hooks/useWalletConnect';

// 协议列表客户端缓存，避免组件 mount 时重复请求
let protocolsCache: { data: EnrichedProtocolConfig[]; timestamp: number } | null = null;
const PROTOCOLS_CACHE_TTL = 2 * 60 * 1000; // 2 分钟

interface AssetRow {
  id: string;
  symbol: string;
  amount: string;
}

function getProtocolDefaults(protocol: ProtocolConfig): {
  collateralRows: AssetRow[];
  borrowRows: AssetRow[];
  position: PositionInput | null;
} {
  if (protocol.defaultPosition) {
    const { collaterals, borrows } = protocol.defaultPosition;
    return {
      collateralRows: collaterals.map((c, i) => ({
        id: `collateral-default-${i}`,
        symbol: c.symbol,
        amount: String(c.amount),
      })),
      borrowRows: borrows.map((b, i) => ({
        id: `borrow-default-${i}`,
        symbol: b.symbol,
        amount: String(b.amount),
      })),
      position: {
        protocolId: protocol.id,
        collaterals,
        borrows,
      },
    };
  }

  const collateral = protocol.assets[0];
  const borrow = protocol.assets.find((a) => a.category === 'stablecoin') ?? protocol.assets[1];

  return {
    collateralRows: [{ id: 'collateral-default', symbol: collateral?.symbol ?? '', amount: '1.5' }],
    borrowRows: [{ id: 'borrow-default', symbol: borrow?.symbol ?? '', amount: '1000' }],
    position:
      collateral?.symbol && borrow?.symbol
        ? {
            protocolId: protocol.id,
            collaterals: [{ symbol: collateral.symbol, amount: 1.5 }],
            borrows: [{ symbol: borrow.symbol, amount: 1000 }],
          }
        : null,
  };
}

/** True when a detection's imported position has both collateral and borrow sides. */
function isCompletePosition(d: ProtocolDetection): boolean {
  return (
    d.hasPosition &&
    !!d.position &&
    d.position.collaterals.length > 0 &&
    d.position.borrows.length > 0
  );
}

/** Convert an imported position into the stress-test input shape. */
function detectionToPosition(d: ProtocolDetection): PositionInput {
  const pos = d.position!;
  return {
    protocolId: d.protocolId,
    collaterals: pos.collaterals.map((c) => ({ symbol: c.symbol, amount: c.amount })),
    borrows: pos.borrows.map((b) => ({ symbol: b.symbol, amount: b.amount })),
  };
}

export default function SafetyCheckContent() {
  const [step, setStep] = useState(1);
  const [selectedProtocol, setSelectedProtocol] = useState<EnrichedProtocolConfig | null>(null);
  const [protocols, setProtocols] = useState<EnrichedProtocolConfig[]>([]);
  const [protocolsError, setProtocolsError] = useState<string | null>(null);

  // 多资产表单状态
  const [collateralRows, setCollateralRows] = useState<AssetRow[]>([
    { id: 'collateral-init', symbol: '', amount: '' },
  ]);
  const [borrowRows, setBorrowRows] = useState<AssetRow[]>([
    { id: 'borrow-init', symbol: '', amount: '' },
  ]);

  // 钱包优先入口
  const wallet = useWalletConnect();
  const [address, setAddress] = useState<string | null>(null);
  const manualEntryRef = useRef<HTMLDivElement>(null);

  // 跨协议自动探测
  const { detecting, detections, detectError, detect, reset: resetDetect } = usePortfolioDetect();

  const { result, isLoading, error, refreshError, calculate, clear } = useProtocolHealth();
  const [lastPosition, setLastPosition] = useState<PositionInput | null>(null);
  const [calculationKey, setCalculationKey] = useState(0);
  const searchParams = useSearchParams();
  const hasDeepLink = Boolean(
    searchParams.get('protocol') || searchParams.get('collateral') || searchParams.get('borrow')
  );

  // ── Live refresh (price / health-factor drift) ──
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [prevSnapshot, setPrevSnapshot] = useState<{ hf: number; critical: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function fetchProtocols() {
      if (protocolsCache && Date.now() - protocolsCache.timestamp < PROTOCOLS_CACHE_TTL) {
        setProtocols(protocolsCache.data);
        return;
      }
      try {
        const response = await fetch('/api/protocols');
        const json = (await response.json()) as {
          success?: boolean;
          data?: EnrichedProtocolConfig[];
          error?: { message?: string };
        };
        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error?.message || 'Failed to fetch protocols');
        }
        protocolsCache = { data: json.data, timestamp: Date.now() };
        setProtocols(json.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setProtocolsError(message);
      }
    }

    fetchProtocols();
  }, []);

  const startCalculation = useCallback(
    async (position: PositionInput) => {
      setCalculationKey((k) => k + 1);
      await calculate(position);
      setLastRefreshedAt(Date.now());
      setPrevSnapshot(null);
    },
    [calculate, setLastRefreshedAt, setPrevSnapshot]
  );

  // Background refresh: recompute with the same position to pick up current prices
  // and health factor. Never blanks the dashboard on a transient error.
  const handleRefresh = useCallback(async () => {
    if (!lastPosition || isRefreshing) return;
    if (result) {
      setPrevSnapshot({
        hf: result.currentHealthFactor,
        critical: Math.abs(result.worstDeviation.criticalDeviationPercent),
      });
    }
    setIsRefreshing(true);
    try {
      await calculate(lastPosition, { keepResultOnError: true });
      setLastRefreshedAt(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  }, [lastPosition, isRefreshing, result, calculate]);

  // Auto-refresh every 45s while a result is on screen (paused when tab hidden).
  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  useEffect(() => {
    if (step !== 3 || !lastPosition) return;
    const AUTO_REFRESH_MS = 45 * 1000;
    const id = setInterval(() => {
      if (!document.hidden) handleRefreshRef.current();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [step, lastPosition]);

  // Deep-link params (shared report URLs) still auto-calculate a sample; the
  // wallet-first flow otherwise waits for the user to connect / paste an address.
  useEffect(() => {
    if (protocols.length === 0) return;

    const protocolId = searchParams.get('protocol');
    const collateralSymbol = searchParams.get('collateral');
    const borrowSymbol = searchParams.get('borrow');

    if (!protocolId && !collateralSymbol && !borrowSymbol) return;

    const protocol = protocols.find((p) => p.id === protocolId) ?? protocols[0];
    if (!protocol) return;

    const {
      collateralRows: defaults,
      borrowRows: borrowDefaults,
      position,
    } = getProtocolDefaults(protocol);

    const collateralAsset = protocol.assets.find((a) => a.symbol === collateralSymbol);
    const collateralAmount =
      collateralAsset?.category === 'stablecoin' ? '4000' : (defaults[0]?.amount ?? '1.5');
    const collateralRows =
      collateralSymbol && collateralAsset
        ? [{ id: 'collateral-url', symbol: collateralSymbol, amount: collateralAmount }]
        : defaults;

    const borrowRows =
      borrowSymbol && protocol.assets.some((a) => a.symbol === borrowSymbol)
        ? [
            {
              id: 'borrow-url',
              symbol: borrowSymbol,
              amount: borrowDefaults[0]?.amount ?? '1000',
            },
          ]
        : borrowDefaults;

    setSelectedProtocol(protocol);
    setCollateralRows(collateralRows);
    setBorrowRows(borrowRows);
    setStep(2);

    if (position) {
      const urlPosition: PositionInput = {
        protocolId: protocol.id,
        collaterals: collateralRows
          .filter((r) => r.symbol && r.amount)
          .map((r) => ({ symbol: r.symbol, amount: Number(r.amount) })),
        borrows: borrowRows
          .filter((r) => r.symbol && r.amount)
          .map((r) => ({ symbol: r.symbol, amount: Number(r.amount) })),
      };
      setLastPosition(urlPosition);
      startCalculation(urlPosition);
      setStep(3);
    }
  }, [startCalculation, searchParams, protocols]);

  // 钱包地址变化 → 自动扫描所有协议
  const handleAddressChange = useCallback(
    async (addr: string) => {
      setAddress(addr);
      clear();
      setStep(1);
      setLastPosition(null);
      await detect(addr);
    },
    [clear, detect]
  );

  // 自动扫描结果：若恰好一个完整仓位 → 自动计算；否则交由组合视图渲染
  useEffect(() => {
    if (!detections) return;
    const complete = detections.filter(isCompletePosition);
    const withPositions = detections.filter((d) => d.hasPosition);
    if (complete.length === 1 && withPositions.length === 1) {
      const position = detectionToPosition(complete[0]);
      setLastPosition(position);
      void startCalculation(position).then(() => setStep(3));
    }
  }, [detections, startCalculation]);

  const handleSelectProtocol = useCallback(
    (protocol: EnrichedProtocolConfig) => {
      resetDetect(); // 手动路径：清除自动探测视图
      setSelectedProtocol(protocol);
      const { collateralRows, borrowRows, position } = getProtocolDefaults(protocol);
      setCollateralRows(collateralRows);
      setBorrowRows(borrowRows);
      setStep(2);
      clear();

      if (position) {
        setLastPosition(position);
        startCalculation(position);
        setStep(3);
      }
    },
    [resetDetect, startCalculation, clear]
  );

  // 首次进入（未连接钱包、无分享链接）→ 用默认协议的演示仓位自动计算一次，
  // 页面一进来就展示结果，同时左侧手动输入框可见可编辑；
  // 用户连接钱包后，handleAddressChange 会清空演示状态并切换到钱包扫描流程。
  const resetDemo = useEntryDemo(protocols, address, hasDeepLink, handleSelectProtocol);

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    resetDetect();
    clear();
    setStep(1);
    setSelectedProtocol(null);
    setCollateralRows([{ id: 'collateral-init', symbol: '', amount: '' }]);
    setBorrowRows([{ id: 'borrow-init', symbol: '', amount: '' }]);
    setLastPosition(null);
    resetDemo(); // 断开钱包后回到默认演示状态
    wallet.disconnect();
  }, [resetDetect, clear, wallet, resetDemo]);

  const handleSubmit = useCallback(
    async (data: { collaterals: AssetEntry[]; borrows: AssetEntry[] }) => {
      if (!selectedProtocol) return;
      const position: PositionInput = {
        protocolId: selectedProtocol.id,
        collaterals: data.collaterals,
        borrows: data.borrows,
      };
      resetDetect(); // 手动路径：清除自动探测视图，确保展示手动结果
      setLastPosition(position);
      await startCalculation(position);
      setStep(3);
    },
    [selectedProtocol, startCalculation, resetDetect]
  );

  const handleReset = useCallback(() => {
    handleDisconnect();
  }, [handleDisconnect]);

  const handleManualEntry = useCallback(() => {
    manualEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!selectedProtocol && protocols.length > 0) {
      handleSelectProtocol(protocols[0]);
    }
  }, [manualEntryRef, selectedProtocol, protocols, handleSelectProtocol]);

  // 派生视图状态
  const supportedProtocols = useMemo(
    () =>
      PROTOCOL_REGISTRY.filter(isImportableProtocol).map((p) => ({ name: p.name, chain: p.chain })),
    []
  );
  const supportedCount = supportedProtocols.length;
  const positionsFound = detections ? detections.filter((d) => d.hasPosition).length : null;

  const completeCount = detections ? detections.filter(isCompletePosition).length : 0;
  const withPositionsCount = detections ? detections.filter((d) => d.hasPosition).length : 0;

  const view:
    | 'result'
    | 'calculating'
    | 'single-pending'
    | 'detecting'
    | 'portfolio'
    | 'empty'
    | 'idle' =
    result && step === 3
      ? 'result'
      : detections && completeCount === 1 && withPositionsCount === 1
        ? 'single-pending'
        : detecting
          ? 'detecting'
          : isLoading && !result
            ? 'calculating'
            : detections
              ? withPositionsCount >= 1
                ? 'portfolio'
                : 'empty'
              : 'idle';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-semibold uppercase tracking-wider mb-3">
              Liquidation Risk Stress Test
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Position Critical Deviation
            </h1>
            <p className="text-base text-slate-500 mt-2 max-w-2xl">
              连接钱包，自动扫描你在各大借贷协议上的持仓并实时计算清算临界偏离；也可手动选择协议录入。
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left sidebar */}
          <aside className="xl:w-[400px] xl:flex-shrink-0">
            <div className="xl:sticky xl:top-4 space-y-4">
              <WalletGate
                address={address}
                onAddress={handleAddressChange}
                wallet={wallet}
                detecting={detecting}
                detectError={detectError}
                positionsFound={positionsFound}
                supportedCount={supportedCount}
                onDisconnect={handleDisconnect}
              />

              <StepIndicator
                key={calculationKey}
                isCalculating={isLoading}
                hasResult={!!result}
                hasError={!!error}
              />

              {protocolsError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-red-700 text-sm font-semibold">{protocolsError}</p>
                </div>
              )}

              <PositionForm
                step={step}
                protocols={protocols}
                selectedProtocol={selectedProtocol}
                onSelectProtocol={handleSelectProtocol}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                collateralRows={collateralRows}
                borrowRows={borrowRows}
                onCollateralRowsChange={setCollateralRows}
                onBorrowRowsChange={setBorrowRows}
                address={address}
                manualEntryRef={manualEntryRef}
              />

              {/* Example hint */}
              {!selectedProtocol && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Example</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    假设你在 <strong>Aave V3 (Ethereum)</strong> 抵押 <strong>1 ETH</strong> 并借出{' '}
                    <strong>1000 USDC</strong>：
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <span className="text-xs text-slate-500">Liquidation Threshold</span>
                      <p className="font-semibold text-slate-900 mt-0.5">82.5%</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <span className="text-xs text-slate-500">Collateral Factor</span>
                      <p className="font-semibold text-slate-900 mt-0.5">80%</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <span className="text-xs text-slate-500">Collateral Value</span>
                      <p className="font-semibold text-slate-900 mt-0.5">$3,000</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <span className="text-xs text-slate-500">Critical Deviation</span>
                      <p className="font-semibold text-red-600 mt-0.5">-40.05%</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Supports multiple collateral/borrow assets with bidirectional deviation analysis
                  </p>
                </motion.div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-red-700 text-sm font-semibold">{error}</p>
                </div>
              )}
            </div>
          </aside>

          {/* Right content */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {view === 'result' && result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <ResultDashboard
                    result={result}
                    position={lastPosition!}
                    onReset={handleReset}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    lastRefreshedAt={lastRefreshedAt}
                    prevSnapshot={prevSnapshot}
                    refreshError={refreshError}
                  />
                </motion.div>
              ) : view === 'portfolio' && detections ? (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <PortfolioDashboard detections={detections} onReset={handleReset} />
                </motion.div>
              ) : view === 'empty' && detections ? (
                <motion.div
                  key="empty-lending"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <NoLendingEmptyState
                    address={address}
                    supportedProtocols={supportedProtocols}
                    onManualEntry={handleManualEntry}
                    onRescan={() => address && detect(address)}
                  />
                </motion.div>
              ) : view === 'detecting' || view === 'single-pending' || view === 'calculating' ? (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex flex-col items-center justify-center text-center"
                >
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    {view === 'detecting' ? '正在扫描借贷协议…' : '正在计算临界偏离…'}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    {view === 'detecting'
                      ? `跨 ${supportedCount} 个已支持协议并行读取链上仓位，请稍候。`
                      : '正在读取市场价格并计算临界偏离，请稍候。'}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">连接钱包开始分析</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    连接钱包或粘贴地址即可自动扫描你的借贷持仓；也可以在左侧手动选择协议录入。
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
