'use client';

import { useState } from 'react';

import { Wallet, Search, Loader2, X, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

import { WalletPicker } from './WalletPicker';

import type { UseWalletConnectReturn } from '../hooks/useWalletConnect';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface WalletGateProps {
  /** Connected / pasted address (owned by the parent). */
  address: string | null;
  /** Called with a validated-or-not address; parent runs the scan. */
  onAddress: (address: string) => void;
  /** Wallet connection state from useWalletConnect (owned by the parent). */
  wallet: UseWalletConnectReturn;
  /** True while the cross-protocol scan runs. */
  detecting: boolean;
  /** Top-level scan error (invalid address, network, server). */
  detectError: string | null;
  /** Number of protocols with a detected position, or null before first scan. */
  positionsFound: number | null;
  /** Number of supported (scannable) lending protocols. */
  supportedCount: number;
  /** Clear the address and restart. */
  onDisconnect: () => void;
}

export function WalletGate({
  address,
  onAddress,
  wallet,
  detecting,
  detectError,
  positionsFound,
  supportedCount,
  onDisconnect,
}: WalletGateProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  const handleSelectWallet = async (rdns: string) => {
    const addr = await wallet.connect(rdns);
    setPickerOpen(false);
    if (addr) onAddress(addr);
  };

  const handleWalletConnect = async () => {
    const addr = await wallet.connectWalletConnect();
    setPickerOpen(false);
    if (addr) onAddress(addr);
  };

  const handleScanPasted = () => {
    const value = pasted.trim();
    if (!value) return;
    onAddress(value);
  };

  const statusLine = (() => {
    if (detecting)
      return { text: `正在扫描 ${supportedCount} 个借贷协议…`, tone: 'muted' as const };
    if (detectError) return { text: detectError, tone: 'error' as const };
    if (positionsFound === 0 && address)
      return { text: '在所支持的借贷协议上未检测到任何持仓。', tone: 'warn' as const };
    if (positionsFound && positionsFound > 0)
      return {
        text: `在 ${positionsFound} 个协议上检测到持仓，正在计算临界偏离…`,
        tone: 'ok' as const,
      };
    return null;
  })();

  return (
    <div className="border-y border-slate-900/15 bg-white/55 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
        <h3 className="text-sm font-semibold text-slate-900">Connect Wallet</h3>
        <span className="text-xs text-slate-400 font-normal truncate">· 推荐 · 自动扫描持仓</span>
      </div>

      {/* Connected address chip */}
      {address && (
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2 border-l-2 border-blue-600 bg-primary-50 px-3 py-2">
          <span className="text-xs text-slate-600 font-mono truncate">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          <button
            type="button"
            onClick={onDisconnect}
            className="shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Primary CTA: connect wallet */}
      <Button
        onClick={() => setPickerOpen(true)}
        isLoading={wallet.isConnecting || wallet.isWalletConnecting}
        disabled={detecting}
        size="md"
        className="w-full"
      >
        <Wallet className="w-4 h-4" />
        <span>{address ? 'Switch Wallet' : 'Connect Wallet'}</span>
      </Button>

      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-[11px] text-slate-400 whitespace-nowrap">或粘贴地址</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      {/* Paste address row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleScanPasted();
          }}
          placeholder="或粘贴钱包地址 0x…"
          disabled={detecting}
          className={cn(
            'flex-1 min-w-0 w-full border bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600',
            pasted.match(ADDRESS_RE) ? 'border-primary-300' : 'border-slate-200'
          )}
        />
        <Button
          onClick={handleScanPasted}
          isLoading={detecting}
          disabled={detecting || !pasted.trim()}
          size="md"
          variant="secondary"
          className="shrink-0"
        >
          {detecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="ml-1">Scan</span>
        </Button>
      </div>

      {wallet.error && !detectError && (
        <p className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
          {wallet.error}
        </p>
      )}

      {statusLine && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 border-l-2 px-3 py-2 text-xs',
            statusLine.tone === 'error' && 'border-red-500 bg-red-50 text-red-700',
            statusLine.tone === 'warn' && 'border-amber-500 bg-amber-50 text-amber-700',
            statusLine.tone === 'ok' && 'border-emerald-500 bg-emerald-50 text-emerald-700',
            statusLine.tone === 'muted' && 'border-blue-500 bg-blue-50 text-slate-600'
          )}
        >
          {detecting && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
          {statusLine.tone !== 'muted' && <X className="w-3.5 h-3.5 shrink-0" />}
          <span>{statusLine.text}</span>
        </div>
      )}

      <WalletPicker
        open={pickerOpen}
        wallets={wallet.wallets}
        isConnecting={wallet.isConnecting}
        connectingRdns={wallet.connectingRdns}
        onSelect={handleSelectWallet}
        onClose={() => setPickerOpen(false)}
        walletConnectEnabled={wallet.walletConnectEnabled}
        walletConnectUri={wallet.walletConnectUri}
        walletConnectError={wallet.walletConnectError}
        isWalletConnecting={wallet.isWalletConnecting}
        onWalletConnect={handleWalletConnect}
        onWalletConnectCancel={wallet.cancelWalletConnect}
      />
    </div>
  );
}
