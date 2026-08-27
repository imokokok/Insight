'use client';

import { useState } from 'react';

import { motion } from 'framer-motion';
import { SearchX, PenLine, RefreshCw, ChevronDown, ShieldQuestion } from 'lucide-react';

import { Button } from '@/components/ui';
import { chainNames } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Blockchain } from '@/types/oracle';

interface NoLendingEmptyStateProps {
  /** The scanned address (already trimmed / validated). */
  address: string | null;
  /** Supported lending protocols that were scanned. */
  supportedProtocols: { name: string; chain: string }[];
  /** Open the manual entry panel (secondary path). */
  onManualEntry: () => void;
  /** Re-run the scan for the same address. */
  onRescan: () => void;
}

const REASONS = [
  '该地址只持有现货 / LP / 质押资产，没有在借贷协议中抵押或借款。',
  '持仓位于暂不支持的链或协议上（扫描仅覆盖已接入的借贷市场）。',
  '这是一个尚未进行过借贷操作的新钱包。',
];

export function NoLendingEmptyState({
  address,
  supportedProtocols,
  onManualEntry,
  onRescan,
}: NoLendingEmptyStateProps) {
  const [showList, setShowList] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
          <SearchX className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">未检测到借贷持仓</h3>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          我们在已支持的借贷协议上扫描了
          {address && (
            <span className="font-mono text-slate-600">
              {' '}
              {address.slice(0, 6)}…{address.slice(-4)}{' '}
            </span>
          )}
          ，没有发现任何活跃的抵押或借贷仓位。
        </p>
      </div>

      {/* Possible reasons */}
      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldQuestion className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            可能的原因
          </span>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {REASONS.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button onClick={onManualEntry} size="md" className="flex-1">
          <PenLine className="w-4 h-4" />
          <span className="ml-1">手动录入仓位</span>
        </Button>
        <Button onClick={onRescan} size="md" variant="secondary" className="flex-1">
          <RefreshCw className="w-4 h-4" />
          <span className="ml-1">重新扫描</span>
        </Button>
      </div>

      {/* Supported protocols (expandable) */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span>查看已支持的 {supportedProtocols.length} 个协议</span>
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', showList && 'rotate-180')}
          />
        </button>
        {showList && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {supportedProtocols.map((p) => (
              <div
                key={`${p.name}-${p.chain}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
              >
                <span className="text-sm text-slate-700">{p.name}</span>
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                  {chainNames[p.chain as Blockchain] ?? p.chain}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
