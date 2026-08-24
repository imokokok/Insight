'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { DetectedWallet } from '../hooks/useWalletConnect';

interface WalletPickerProps {
  /** Controls visibility; drives enter/exit animation via AnimatePresence. */
  open: boolean;
  wallets: DetectedWallet[];
  isConnecting: boolean;
  /** rdns of the wallet currently connecting, for a per-row spinner. */
  connectingRdns: string | null;
  onSelect: (rdns: string) => void;
  onClose: () => void;
}

export function WalletPicker({
  open,
  wallets,
  isConnecting,
  connectingRdns,
  onSelect,
  onClose,
}: WalletPickerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-xl p-5"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Connect a wallet"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Connect a Wallet</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {wallets.length === 0 ? (
              <div className="text-sm text-slate-600 leading-relaxed">
                <p>No browser wallet detected.</p>
                <p className="mt-2 text-slate-500">
                  Install{' '}
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    MetaMask
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://rabby.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    Rabby
                  </a>{' '}
                  to import your on-chain position.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {wallets.map((w) => {
                  const isConnectingThis = isConnecting && connectingRdns === w.rdns;
                  return (
                    <button
                      key={w.uuid}
                      type="button"
                      disabled={isConnecting}
                      onClick={() => onSelect(w.rdns)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        'border-slate-200 hover:border-primary-300 hover:bg-primary-50/50',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    >
                      {w.icon ? (
                        // Wallet-supplied data URI; safe (no external network request).
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.icon} alt="" className="w-7 h-7 rounded-md" />
                      ) : (
                        <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-slate-500" />
                        </span>
                      )}
                      <span className="flex-1 text-sm font-medium text-slate-900">{w.name}</span>
                      {isConnectingThis && (
                        <span className="text-xs text-primary-600">Connecting…</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
