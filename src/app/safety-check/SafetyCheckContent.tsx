'use client';

import { useState, useCallback, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Calculator } from 'lucide-react';

import type { AssetEntry, PositionInput } from '@/lib/protocols/protocolHealth';
import type { ProtocolConfig } from '@/lib/protocols/protocolRegistry';
import { PROTOCOL_REGISTRY } from '@/lib/protocols/protocolRegistry';

import { PositionForm } from './components/PositionForm';
import { ResultDashboard } from './components/ResultDashboard';
import { StepIndicator } from './components/StepIndicator';
import { useProtocolHealth } from './hooks/useProtocolHealth';

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
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolConfig | null>(null);

  // 多资产表单状态
  const [collateralRows, setCollateralRows] = useState<AssetRow[]>([
    { id: 'collateral-init', symbol: '', amount: '' },
  ]);
  const [borrowRows, setBorrowRows] = useState<AssetRow[]>([
    { id: 'borrow-init', symbol: '', amount: '' },
  ]);

  const { result, isLoading, error, calculate, clear } = useProtocolHealth();
  const [lastPosition, setLastPosition] = useState<PositionInput | null>(null);

  // Auto-fill defaults and calculate on mount
  useEffect(() => {
    const protocol = PROTOCOL_REGISTRY[0];
    if (!protocol) return;

    const { collateralRows, borrowRows, position } = getProtocolDefaults(protocol);

    setSelectedProtocol(protocol);
    setCollateralRows(collateralRows);
    setBorrowRows(borrowRows);
    setStep(2);

    // Auto-calculate with default data
    if (position) {
      setLastPosition(position);
      calculate(position);
      setStep(3);
    }
  }, [calculate]);

  const handleSelectProtocol = useCallback(
    (protocol: ProtocolConfig) => {
      setSelectedProtocol(protocol);
      const { collateralRows, borrowRows, position } = getProtocolDefaults(protocol);
      setCollateralRows(collateralRows);
      setBorrowRows(borrowRows);
      setStep(2);
      clear();

      // Auto-calculate with default data for the new protocol
      if (position) {
        setLastPosition(position);
        calculate(position);
        setStep(3);
      }
    },
    [calculate, clear]
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
      await calculate(position);
      setStep(3);
    },
    [selectedProtocol, calculate]
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Position Critical Deviation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter your DeFi position to calculate the oracle price deviation at which your
              position gets liquidated
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left sidebar */}
          <aside className="xl:w-[400px] xl:flex-shrink-0">
            <div className="xl:sticky xl:top-4 space-y-4">
              <StepIndicator currentStep={step} />

              <PositionForm
                step={step}
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
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="w-4 h-4 text-primary-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Example</h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Suppose you deposited <strong>1 ETH</strong> as collateral on{' '}
                    <strong>Aave V3 (Ethereum)</strong> and borrowed <strong>1000 USDC</strong>:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 rounded-md p-2.5">
                      <span className="text-xs text-gray-500">Liquidation Threshold</span>
                      <p className="font-medium text-gray-900 mt-0.5">82.5%</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2.5">
                      <span className="text-xs text-gray-500">Collateral Factor</span>
                      <p className="font-medium text-gray-900 mt-0.5">80%</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2.5">
                      <span className="text-xs text-gray-500">Collateral Value</span>
                      <p className="font-medium text-gray-900 mt-0.5">$3,000</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2.5">
                      <span className="text-xs text-gray-500">Critical Deviation</span>
                      <p className="font-medium text-red-600 mt-0.5">-40.05%</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Supports multiple collateral/borrow assets with bidirectional deviation analysis
                  </p>
                </motion.div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
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
                  className="bg-white rounded-lg border border-gray-200 shadow-sm py-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-primary-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Start Calculating Your Critical Deviation
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
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
