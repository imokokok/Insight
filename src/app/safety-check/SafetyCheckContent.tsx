'use client';

import { useState, useCallback, useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Calculator } from 'lucide-react';

import type { EnrichedProtocolConfig } from '@/lib/protocols/dynamicData';
import type { AssetEntry, PositionInput } from '@/lib/protocols/protocolHealth';
import type { ProtocolConfig } from '@/lib/protocols/protocolRegistry';

import { PositionForm } from './components/PositionForm';
import { ResultDashboard } from './components/ResultDashboard';
import { StepIndicator } from './components/StepIndicator';
import { useProtocolHealth } from './hooks/useProtocolHealth';

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

  const { result, isLoading, error, calculate, clear } = useProtocolHealth();
  const [lastPosition, setLastPosition] = useState<PositionInput | null>(null);
  const [calculationKey, setCalculationKey] = useState(0);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchProtocols() {
      // 使用客户端缓存
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
    },
    [calculate]
  );

  // Auto-fill defaults and calculate on mount, optionally from URL params
  useEffect(() => {
    if (protocols.length === 0) return;

    const protocolId = searchParams.get('protocol');
    const collateralSymbol = searchParams.get('collateral');
    const borrowSymbol = searchParams.get('borrow');

    const protocol = protocols.find((p) => p.id === protocolId) ?? protocols[0];
    if (!protocol) return;

    const {
      collateralRows: defaults,
      borrowRows: borrowDefaults,
      position,
    } = getProtocolDefaults(protocol);

    // Override collateral with URL param if the asset is supported by the protocol.
    // Use a category-aware default amount: the protocol default (e.g. 2.5) is
    // calibrated for major assets like ETH (~$1792), so reusing it for a
    // stablecoin collateral would only provide ~$2.5 USD value and trigger an
    // immediate liquidation. Stablecoins need a much larger amount (~$4000) to
    // match the default collateral USD value.
    const collateralAsset = protocol.assets.find((a) => a.symbol === collateralSymbol);
    const collateralAmount =
      collateralAsset?.category === 'stablecoin' ? '4000' : (defaults[0]?.amount ?? '1.5');
    const collateralRows =
      collateralSymbol && collateralAsset
        ? [{ id: 'collateral-url', symbol: collateralSymbol, amount: collateralAmount }]
        : defaults;

    // Override borrow with URL param if the asset is supported by the protocol
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

    // Auto-calculate with default data
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

  const handleSelectProtocol = useCallback(
    (protocol: EnrichedProtocolConfig) => {
      setSelectedProtocol(protocol);
      const { collateralRows, borrowRows, position } = getProtocolDefaults(protocol);
      setCollateralRows(collateralRows);
      setBorrowRows(borrowRows);
      setStep(2);
      clear();

      // Auto-calculate with default data for the new protocol
      if (position) {
        setLastPosition(position);
        startCalculation(position);
        setStep(3);
      }
    },
    [startCalculation, clear]
  );

  const handleSubmit = useCallback(
    async (data: { collaterals: AssetEntry[]; borrows: AssetEntry[] }) => {
      if (!selectedProtocol) return;
      const position: PositionInput = {
        protocolId: selectedProtocol.id,
        collaterals: data.collaterals,
        borrows: data.borrows,
      };
      setLastPosition(position);
      await startCalculation(position);
      setStep(3);
    },
    [selectedProtocol, startCalculation]
  );

  const handleReset = useCallback(() => {
    setStep(1);
    setSelectedProtocol(null);
    setCollateralRows([{ id: 'collateral-init', symbol: '', amount: '' }]);
    setBorrowRows([{ id: 'borrow-init', symbol: '', amount: '' }]);
    setLastPosition(null);
    clear();
  }, [clear]);

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
              Enter your DeFi position to calculate the oracle price deviation that would trigger
              liquidation. Stress-test collaterals, borrows, and joint deviation scenarios.
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left sidebar */}
          <aside className="xl:w-[400px] xl:flex-shrink-0">
            <div className="xl:sticky xl:top-4 space-y-4">
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
                    Suppose you deposited <strong>1 ETH</strong> as collateral on{' '}
                    <strong>Aave V3 (Ethereum)</strong> and borrowed <strong>1000 USDC</strong>:
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
              {step === 3 && result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <ResultDashboard result={result} position={lastPosition!} onReset={handleReset} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    Start Calculating Your Critical Deviation
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Select a protocol and fill in your position parameters on the left, the system
                    will automatically calculate your personal liquidation critical value
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
