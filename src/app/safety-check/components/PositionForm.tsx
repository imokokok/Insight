'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
import { Wallet, ArrowDown, Zap, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui';
import type { AssetEntry } from '@/lib/protocols/protocolHealth';
import type { ProtocolConfig } from '@/lib/protocols/protocolRegistry';
import { cn } from '@/lib/utils';

import { AssetSelector } from './AssetSelector';
import { ProtocolSearch } from './ProtocolSearch';

interface AssetRow {
  symbol: string;
  amount: string;
}

interface PositionFormProps {
  step: number;
  selectedProtocol: ProtocolConfig | null;
  onSelectProtocol: (p: ProtocolConfig) => void;
  onSubmit: (data: { collaterals: AssetEntry[]; borrows: AssetEntry[] }) => void;
  isLoading: boolean;
  collateralRows: AssetRow[];
  borrowRows: AssetRow[];
  onCollateralRowsChange: (rows: AssetRow[]) => void;
  onBorrowRowsChange: (rows: AssetRow[]) => void;
}

export function PositionForm({
  step,
  selectedProtocol,
  onSelectProtocol,
  onSubmit,
  isLoading,
  collateralRows,
  borrowRows,
  onCollateralRowsChange,
  onBorrowRowsChange,
}: PositionFormProps) {
  const assets = useMemo(() => selectedProtocol?.assets ?? [], [selectedProtocol]);

  const addCollateralRow = () => {
    onCollateralRowsChange([...collateralRows, { symbol: '', amount: '' }]);
  };

  const removeCollateralRow = (index: number) => {
    if (collateralRows.length <= 1) return;
    onCollateralRowsChange(collateralRows.filter((_, i) => i !== index));
  };

  const updateCollateralRow = (index: number, field: 'symbol' | 'amount', value: string) => {
    const updated = [...collateralRows];
    updated[index] = { ...updated[index], [field]: value };
    onCollateralRowsChange(updated);
  };

  const addBorrowRow = () => {
    onBorrowRowsChange([...borrowRows, { symbol: '', amount: '' }]);
  };

  const removeBorrowRow = (index: number) => {
    if (borrowRows.length <= 1) return;
    onBorrowRowsChange(borrowRows.filter((_, i) => i !== index));
  };

  const updateBorrowRow = (index: number, field: 'symbol' | 'amount', value: string) => {
    const updated = [...borrowRows];
    updated[index] = { ...updated[index], [field]: value };
    onBorrowRowsChange(updated);
  };

  const handleCalculate = () => {
    const collaterals = collateralRows
      .filter((r) => r.symbol && parseFloat(r.amount) > 0)
      .map((r) => ({ symbol: r.symbol, amount: parseFloat(r.amount) }));
    const borrows = borrowRows
      .filter((r) => r.symbol && parseFloat(r.amount) > 0)
      .map((r) => ({ symbol: r.symbol, amount: parseFloat(r.amount) }));

    if (collaterals.length === 0 || borrows.length === 0) return;
    onSubmit({ collaterals, borrows });
  };

  const isFormComplete =
    collateralRows.some((r) => r.symbol && parseFloat(r.amount) > 0) &&
    borrowRows.some((r) => r.symbol && parseFloat(r.amount) > 0);

  // 获取已选择的 symbol，避免重复选择
  const usedCollateralSymbols = collateralRows.map((r) => r.symbol).filter(Boolean);
  const usedBorrowSymbols = borrowRows.map((r) => r.symbol).filter(Boolean);

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
            {/* Collateral Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collateral Assets
                </label>
                <button
                  type="button"
                  onClick={addCollateralRow}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="space-y-3">
                {collateralRows.map((row, index) => {
                  const assetConfig = assets.find((a) => a.symbol === row.symbol);
                  return (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <AssetSelector
                          assets={assets.filter(
                            (a) =>
                              !usedCollateralSymbols.includes(a.symbol) || a.symbol === row.symbol
                          )}
                          selected={row.symbol}
                          onSelect={(symbol) => updateCollateralRow(index, 'symbol', symbol)}
                          label=""
                          disabled={isLoading}
                          compact
                        />
                      </div>
                      <div className="w-32">
                        <div className="relative">
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => updateCollateralRow(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            disabled={isLoading}
                            className={cn(
                              'w-full px-3 py-2 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all font-mono',
                              parseFloat(row.amount) > 0 ? 'border-primary-300' : 'border-gray-200'
                            )}
                          />
                          {row.symbol && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                              {row.symbol}
                            </span>
                          )}
                        </div>
                        {assetConfig && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            CF {(assetConfig.collateralFactor * 100).toFixed(0)}% · LT{' '}
                            {(assetConfig.liquidationThreshold * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                      {collateralRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCollateralRow(index)}
                          className="mt-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            {/* Borrow Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Borrow Assets
                </label>
                <button
                  type="button"
                  onClick={addBorrowRow}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="space-y-3">
                {borrowRows.map((row, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      <AssetSelector
                        assets={assets.filter(
                          (a) => !usedBorrowSymbols.includes(a.symbol) || a.symbol === row.symbol
                        )}
                        selected={row.symbol}
                        onSelect={(symbol) => updateBorrowRow(index, 'symbol', symbol)}
                        label=""
                        disabled={isLoading}
                        compact
                      />
                    </div>
                    <div className="w-32">
                      <div className="relative">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => updateBorrowRow(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          disabled={isLoading}
                          className={cn(
                            'w-full px-3 py-2 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all font-mono',
                            parseFloat(row.amount) > 0 ? 'border-primary-300' : 'border-gray-200'
                          )}
                        />
                        {row.symbol && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                            {row.symbol}
                          </span>
                        )}
                      </div>
                    </div>
                    {borrowRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBorrowRow(index)}
                        className="mt-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
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
