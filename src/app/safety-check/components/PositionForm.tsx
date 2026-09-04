'use client';

import { useEffect, useMemo, useState, type RefObject } from 'react';

import { motion } from 'framer-motion';
import { Wallet, ArrowDown, Zap, Plus, X, Download, MousePointerClick } from 'lucide-react';

import { Button } from '@/components/ui';
import { chainNames } from '@/lib/constants';
import type { EnrichedProtocolConfig } from '@/lib/protocols/dynamicData';
import type { AssetEntry } from '@/lib/protocols/protocolHealth';
import { cn } from '@/lib/utils';
import type { Blockchain } from '@/types/oracle';

import { usePositionImporter } from '../hooks/usePositionImporter';

import { AssetSelector } from './AssetSelector';
import { ProtocolSearch } from './ProtocolSearch';

interface AssetRow {
  id: string;
  symbol: string;
  amount: string;
}

let assetRowSeq = 0;

interface PositionFormProps {
  step: number;
  protocols: EnrichedProtocolConfig[];
  selectedProtocol: EnrichedProtocolConfig | null;
  onSelectProtocol: (p: EnrichedProtocolConfig) => void;
  onSubmit: (data: { collaterals: AssetEntry[]; borrows: AssetEntry[] }) => void;
  isLoading: boolean;
  collateralRows: AssetRow[];
  borrowRows: AssetRow[];
  onCollateralRowsChange: (rows: AssetRow[]) => void;
  onBorrowRowsChange: (rows: AssetRow[]) => void;
  /** Connected / pasted address from the WalletGate (primary entry). */
  address: string | null;
  /** Scrolls the manual panel into view (used by the no-lending CTA). */
  manualEntryRef?: RefObject<HTMLDivElement | null>;
}

export function PositionForm({
  step,
  protocols,
  selectedProtocol,
  onSelectProtocol,
  onSubmit,
  isLoading,
  collateralRows,
  borrowRows,
  onCollateralRowsChange,
  onBorrowRowsChange,
  address,
  manualEntryRef,
}: PositionFormProps) {
  const assets = useMemo(() => selectedProtocol?.assets ?? [], [selectedProtocol]);

  const [importAddress, setImportAddress] = useState('');
  const { isImporting, importError, importedPosition, importPosition } = usePositionImporter();

  // Curated, user-facing status for the import flow (success / warn / error).
  // Keeps the wallet-import → calculate journey closed-loop with clear feedback.
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'warn' | 'error';
    message: string;
  } | null>(null);

  const canImport = Boolean(
    selectedProtocol?.contracts?.poolDataProvider ||
    selectedProtocol?.contracts?.comet ||
    selectedProtocol?.contracts?.comptroller ||
    selectedProtocol?.contracts?.morpho
  );

  // Prefill the import box with the connected address from the WalletGate.
  useEffect(() => {
    if (address) setImportAddress(address);
  }, [address]);

  // Clear any import status when the user switches protocol.
  useEffect(() => {
    setImportStatus(null);
  }, [selectedProtocol?.id]);

  const handleImport = async () => {
    const addr = (importAddress || address || '').trim();
    setImportStatus(null);

    if (!selectedProtocol) return;

    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      setImportStatus({ type: 'error', message: '请输入有效的 0x 钱包地址（42 位字符）。' });
      return;
    }
    if (!canImport) {
      setImportStatus({
        type: 'error',
        message: `${selectedProtocol.name} 暂不支持链上导入，请手动填写仓位。`,
      });
      return;
    }

    const position = await importPosition(addr, selectedProtocol.id);
    if (!position) {
      // Hook sets `importError` on failure (chain / server error).
      return;
    }

    const hasCollateral = position.collaterals.length > 0;
    const hasBorrow = position.borrows.length > 0;

    onCollateralRowsChange(
      hasCollateral
        ? position.collaterals.map((c) => ({
            id: `asset-${++assetRowSeq}`,
            symbol: c.symbol,
            amount: String(c.amount),
          }))
        : [{ id: `asset-${++assetRowSeq}`, symbol: '', amount: '' }]
    );

    onBorrowRowsChange(
      hasBorrow
        ? position.borrows.map((b) => ({
            id: `asset-${++assetRowSeq}`,
            symbol: b.symbol,
            amount: String(b.amount),
          }))
        : [{ id: `asset-${++assetRowSeq}`, symbol: '', amount: '' }]
    );

    if (hasCollateral && hasBorrow) {
      // Both sides present → close the loop: run the stress test immediately.
      onSubmit({
        collaterals: position.collaterals.map((c) => ({ symbol: c.symbol, amount: c.amount })),
        borrows: position.borrows.map((b) => ({ symbol: b.symbol, amount: b.amount })),
      });
      setImportStatus({
        type: 'success',
        message: `已导入 ${position.collaterals.length} 项抵押 / ${position.borrows.length} 项借贷，正在计算临界偏离…`,
      });
    } else if (hasCollateral || hasBorrow) {
      // One side only — cannot calculate without both; nudge the user.
      setImportStatus({
        type: 'warn',
        message: hasCollateral
          ? `检测到 ${position.collaterals.length} 项抵押，但未检测到借贷。请补充借出资产后再计算。`
          : `检测到 ${position.borrows.length} 项借贷，但未检测到抵押。请补充抵押资产后再计算。`,
      });
    } else {
      // Address imported fine but holds no position on this protocol.
      setImportStatus({
        type: 'warn',
        message: `在 ${selectedProtocol.name} 上未检测到该地址的任何持仓。可换一个协议重试，或手动填写。`,
      });
    }
  };

  const addCollateralRow = () => {
    onCollateralRowsChange([
      ...collateralRows,
      { id: `asset-${++assetRowSeq}`, symbol: '', amount: '' },
    ]);
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
    onBorrowRowsChange([...borrowRows, { id: `asset-${++assetRowSeq}`, symbol: '', amount: '' }]);
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

  // Track already-selected symbols to avoid duplicates
  const usedCollateralSymbols = collateralRows.map((r) => r.symbol).filter(Boolean);
  const usedBorrowSymbols = borrowRows.map((r) => r.symbol).filter(Boolean);

  return (
    <div className="space-y-4" ref={manualEntryRef}>
      {/* Protocol Card (secondary / manual path) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-y border-slate-900/15 bg-white/55 p-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <MousePointerClick className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">手动选择协议（可选）</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          钱包自动扫描为主；此处用于指定某一协议，或用一个不同的地址导入。
        </p>
        <ProtocolSearch
          protocols={protocols}
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
              <span className="font-medium text-slate-900">{selectedProtocol.name}</span>
              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                {chainNames[selectedProtocol.chain as Blockchain] ?? selectedProtocol.chain}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{selectedProtocol.description}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Position Card */}
      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border-y border-slate-900/15 bg-white/55 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Fill Position</h3>
          </div>

          {canImport ? (
            <div className="mb-4 space-y-2 border-y border-slate-900/15 bg-slate-50/70 p-3">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Import On-Chain Position
              </label>
              {address && (
                <div className="flex items-center gap-2 border-l-2 border-primary-600 bg-primary-50 px-3 py-2">
                  <Wallet className="w-3.5 h-3.5 text-primary-600" />
                  <span className="text-xs text-slate-600 font-mono">
                    使用连接地址 {address.slice(0, 6)}…{address.slice(-4)}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importAddress}
                  onChange={(e) => {
                    setImportAddress(e.target.value);
                    setImportStatus(null);
                  }}
                  placeholder="0x...（或连接钱包后自动填入）"
                  disabled={isLoading || isImporting}
                  className={cn(
                    'flex-1 min-w-0 border bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600',
                    importAddress.match(/^0x[a-fA-F0-9]{40}$/)
                      ? 'border-primary-300'
                      : 'border-slate-200'
                  )}
                />
                <Button
                  onClick={handleImport}
                  isLoading={isImporting}
                  disabled={isLoading || isImporting || !importAddress.match(/^0x[a-fA-F0-9]{40}$/)}
                  size="md"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Import</span>
                </Button>
              </div>
              {importStatus && (
                <p
                  className={cn(
                    'text-xs',
                    importStatus.type === 'success' && 'text-emerald-600',
                    importStatus.type === 'warn' && 'text-amber-700',
                    importStatus.type === 'error' && 'text-red-600'
                  )}
                >
                  {importStatus.message}
                </p>
              )}
              {!importStatus && importError && (
                <p className="text-xs text-red-600">{importError}</p>
              )}

              {importedPosition && importedPosition.skippedAssets.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
                  <p className="font-medium">The following on-chain assets were not imported:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {importedPosition.skippedAssets.map((asset) => (
                      <li key={asset.underlyingAsset}>
                        {asset.symbol}
                        {asset.reason === 'unsupported' && (
                          <span className="text-amber-600"> (not configured)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 border-y border-slate-900/15 bg-slate-50/70 p-3">
              <p className="text-xs text-slate-500">
                该协议暂不支持链上导入，请手动填写抵押与借出资产。
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Collateral Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                    <div key={row.id} className="flex gap-2 items-start">
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
                              'w-full border bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600',
                              parseFloat(row.amount) > 0 ? 'border-primary-300' : 'border-slate-200'
                            )}
                          />
                          {row.symbol && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                              {row.symbol}
                            </span>
                          )}
                        </div>
                        {assetConfig && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            CF {(assetConfig.collateralFactor * 100).toFixed(0)}% · LT{' '}
                            {((1 / assetConfig.liquidationThreshold) * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                      {collateralRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCollateralRow(index)}
                          className="mt-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
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
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Borrow Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                  <div key={row.id} className="flex gap-2 items-start">
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
                            'w-full border bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600',
                            parseFloat(row.amount) > 0 ? 'border-primary-300' : 'border-slate-200'
                          )}
                        />
                        {row.symbol && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                            {row.symbol}
                          </span>
                        )}
                      </div>
                    </div>
                    {borrowRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBorrowRow(index)}
                        className="mt-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
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
              disabled={!isFormComplete || isImporting}
            >
              {isLoading ? 'Calculating...' : 'Calculate Critical Deviation'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
