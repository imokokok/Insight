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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-900">Connect Wallet</h3>
        <span className="text-xs text-slate-400 font-normal">· 自动扫描你的借贷持仓</span>
      </div>

      {/* Connected address chip */}
      {address && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-primary-50 border border-primary-100 px-3 py-2">
          <span className="text-xs text-slate-600 font-mono">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Connect + paste row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => setPickerOpen(true)}
          isLoading={wallet.isConnecting || wallet.isWalletConnecting}
          disabled={detecting}
          size="md"
          className="sm:w-auto"
        >
          <Wallet className="w-4 h-4" />
          <span className="ml-1">{address ? 'Switch Wallet' : 'Connect Wallet'}</span>
        </Button>

        <div className="flex gap-2 flex-1">
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
              'flex-1 min-w-0 px-3 py-2 bg-white border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all font-mono',
              pasted.match(ADDRESS_RE) ? 'border-primary-300' : 'border-slate-200'
            )}
          />
          <Button
            onClick={handleScanPasted}
            isLoading={detecting}
            disabled={detecting || !pasted.trim()}
            size="md"
            variant="secondary"
          >
            {detecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="hidden sm:inline ml-1">Scan</span>
          </Button>
        </div>
      </div>

      {wallet.error && !detectError && <p className="text-xs text-red-600 mt-2">{wallet.error}</p>}

      {statusLine && (
        <div
          className={cn(
            'mt-3 text-xs flex items-center gap-2',
            statusLine.tone === 'error' && 'text-red-600',
            statusLine.tone === 'warn' && 'text-amber-700',
            statusLine.tone === 'ok' && 'text-emerald-600',
            statusLine.tone === 'muted' && 'text-slate-500'
          )}
        >
          {detecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {statusLine.tone !== 'muted' && <X className="w-3.5 h-3.5" />}
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
