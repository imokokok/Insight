'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, QrCode, ScanLine } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  /** True when a WalletConnect projectId is configured (QR entry shows). */
  walletConnectEnabled: boolean;
  /** Live WalletConnect URI to render as a QR code. */
  walletConnectUri: string | null;
  /** Error specific to the WalletConnect flow. */
  walletConnectError: string | null;
  /** True while a WalletConnect session is being established (awaiting scan). */
  isWalletConnecting: boolean;
  /** Starts a WalletConnect (QR) session. */
  onWalletConnect: () => void;
  /** Aborts an in-progress WalletConnect session / clears the QR code. */
  onWalletConnectCancel: () => void;
}

export function WalletPicker({
  open,
  wallets,
  isConnecting,
  connectingRdns,
  onSelect,
  onClose,
  walletConnectEnabled,
  walletConnectUri,
  walletConnectError,
  isWalletConnecting,
  onWalletConnect,
  onWalletConnectCancel,
}: WalletPickerProps) {
  const showingQr = Boolean(walletConnectUri) || isWalletConnecting;

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
                <h3 className="text-sm font-semibold text-slate-900">
                  {showingQr ? 'Scan with WalletConnect' : 'Connect a Wallet'}
                </h3>
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

            <AnimatePresence mode="wait">
              {showingQr ? (
                <motion.div
                  key="wc-qr"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    {walletConnectUri ? (
                      <QRCodeSVG value={walletConnectUri} size={200} level="M" />
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 text-sm">
                        Preparing…
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    Open your mobile wallet app and scan this code to connect.
                  </p>
                  {walletConnectError && (
                    <p className="mt-2 text-xs text-red-600">{walletConnectError}</p>
                  )}
                  <button
                    type="button"
                    onClick={onWalletConnectCancel}
                    className="mt-4 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="wc-list"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
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
                    wallets.map((w) => {
                      const isConnectingThis = isConnecting && connectingRdns === w.rdns;
                      return (
                        <button
                          key={w.uuid}
                          type="button"
                          disabled={isConnecting || isWalletConnecting}
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
                          <span className="flex-1 text-sm font-medium text-slate-900">
                            {w.name}
                          </span>
                          {isConnectingThis && (
                            <span className="text-xs text-primary-600">Connecting…</span>
                          )}
                        </button>
                      );
                    })
                  )}

                  {walletConnectEnabled && (
                    <button
                      type="button"
                      disabled={isConnecting || isWalletConnecting}
                      onClick={onWalletConnect}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        'border-slate-200 hover:border-primary-300 hover:bg-primary-50/50',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    >
                      <span className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-white" />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-900">
                        WalletConnect
                      </span>
                      <ScanLine className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
