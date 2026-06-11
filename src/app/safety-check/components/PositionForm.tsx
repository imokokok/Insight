'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
import { Wallet, ArrowDown, Zap } from 'lucide-react';

import { Button } from '@/components/ui';
import type { ProtocolConfig } from '@/lib/protocols/protocolRegistry';
import { cn } from '@/lib/utils';

import { AssetSelector } from './AssetSelector';
import { ProtocolSearch } from './ProtocolSearch';

interface PositionFormProps {
  step: number;
  selectedProtocol: ProtocolConfig | null;
  onSelectProtocol: (p: ProtocolConfig) => void;
  onSubmit: (data: {
    collateralSymbol: string;
    collateralAmount: number;
    borrowSymbol: string;
    borrowAmount: number;
  }) => void;
  isLoading: boolean;
  collateralSymbol: string;
  collateralAmount: string;
  borrowSymbol: string;
  borrowAmount: string;
  onCollateralSymbolChange: (v: string) => void;
  onCollateralAmountChange: (v: string) => void;
  onBorrowSymbolChange: (v: string) => void;
  onBorrowAmountChange: (v: string) => void;
}

export function PositionForm({
  step,
  selectedProtocol,
  onSelectProtocol,
  onSubmit,
  isLoading,
  collateralSymbol,
  collateralAmount,
  borrowSymbol,
  borrowAmount,
  onCollateralSymbolChange,
  onCollateralAmountChange,
  onBorrowSymbolChange,
  onBorrowAmountChange,
}: PositionFormProps) {
  const assets = useMemo(() => selectedProtocol?.assets ?? [], [selectedProtocol]);
  const collateralAsset = useMemo(
    () => assets.find((a) => a.symbol === collateralSymbol),
    [assets, collateralSymbol]
  );

  const handleCalculate = () => {
    const c = parseFloat(collateralAmount);
    const b = parseFloat(borrowAmount);
    if (!collateralSymbol || !borrowSymbol || isNaN(c) || c <= 0 || isNaN(b) || b <= 0) return;
    onSubmit({ collateralSymbol, collateralAmount: c, borrowSymbol, borrowAmount: b });
  };

  const isFormComplete =
    collateralSymbol &&
    borrowSymbol &&
    parseFloat(collateralAmount) > 0 &&
    parseFloat(borrowAmount) > 0;

  return (
    <div className="space-y-4">
      {/* Protocol Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900">Select Protocol</h3>
        </div>
        <ProtocolSearch
          selectedProtocol={selectedProtocol}
          onSelect={onSelectProtocol}
          disabled={isLoading}
        />
        {selectedProtocol && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-2.5 rounded-md bg-primary-50 border border-primary-100 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{selectedProtocol.name}</span>
              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-100 capitalize">
                {selectedProtocol.chain}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{selectedProtocol.description}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Position Card */}
      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-900">Fill Position</h3>
          </div>

          <div className="space-y-4">
            <AssetSelector
              assets={assets}
              selected={collateralSymbol}
              onSelect={onCollateralSymbolChange}
              label="Collateral Asset"
              disabled={isLoading}
            />

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Collateral Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={collateralAmount}
                  onChange={(e) => onCollateralAmountChange(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className={cn(
                    'w-full px-3 py-2 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all font-mono',
                    parseFloat(collateralAmount) > 0 ? 'border-primary-300' : 'border-gray-200'
                  )}
                />
                {collateralSymbol && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    {collateralSymbol}
                  </span>
                )}
              </div>
              {collateralAsset && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Liq. Threshold {(collateralAsset.liquidationCollateralRatio * 100).toFixed(0)}%
                  {' · '}
                  Max LTV {(collateralAsset.maxLtv * 100).toFixed(0)}%
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <AssetSelector
              assets={assets}
              selected={borrowSymbol}
              onSelect={onBorrowSymbolChange}
              label="Borrow Asset"
              disabled={isLoading}
            />

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Borrow Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={borrowAmount}
                  onChange={(e) => onBorrowAmountChange(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className={cn(
                    'w-full px-3 py-2 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all font-mono',
                    parseFloat(borrowAmount) > 0 ? 'border-primary-300' : 'border-gray-200'
                  )}
                />
                {borrowSymbol && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                    {borrowSymbol}
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              isLoading={isLoading}
              size="md"
              className="w-full"
              disabled={!isFormComplete}
            >
              {isLoading ? 'Calculating...' : 'Calculate Critical Deviation'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
