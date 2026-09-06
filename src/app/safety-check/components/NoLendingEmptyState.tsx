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
  'The address only holds spot, LP, or staked assets and has no lending position.',
  'The position is on a chain or protocol that is not supported yet.',
  'This is a new wallet that has not used a lending protocol.',
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
      className="border-y border-slate-900/15 bg-white/55 p-8"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center border border-amber-200 bg-amber-50">
          <SearchX className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No lending positions found</h3>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          We scanned supported lending protocols for
          {address && (
            <span className="font-mono text-slate-600">
              {' '}
              {address.slice(0, 6)}…{address.slice(-4)}{' '}
            </span>
          )}
          and found no active collateral or borrow positions.
        </p>
      </div>

      {/* Possible reasons */}
      <div className="mt-6 border-y border-slate-900/15 bg-slate-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldQuestion className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Possible reasons
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
          <span className="ml-1">Enter a position manually</span>
        </Button>
        <Button onClick={onRescan} size="md" variant="secondary" className="flex-1">
          <RefreshCw className="w-4 h-4" />
          <span className="ml-1">Scan again</span>
        </Button>
      </div>

      {/* Supported protocols (expandable) */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span>View {supportedProtocols.length} supported protocols</span>
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', showList && 'rotate-180')}
          />
        </button>
        {showList && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {supportedProtocols.map((p) => (
              <div
                key={`${p.name}-${p.chain}`}
                className="flex items-center justify-between border-b border-slate-900/10 bg-white px-3 py-2 last:border-b-0"
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
