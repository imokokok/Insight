/**
 * Credit wallet card for the billing panel.
 *
 * Displays the user's prepaid credit balance, recent ledger entries, and
 * top-up buttons for each credit pack. Starting a top-up creates a NOWPayments
 * invoice via /api/billing/checkout (type=topup) and redirects to the payment
 * URL.
 *
 * Extracted from BillingPanel to keep that component under the
 * max-lines-per-function lint limit.
 */

import { useEffect, useState } from 'react';

import { Coins, Loader2, Zap } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { CREDIT_PACKS, CREDIT_PACK_ORDER } from '@/lib/billing/plans';

interface CreditWalletCardProps {
  accessToken: string | null | undefined;
  onError?: (message: string) => void;
}

interface WalletData {
  balance: number;
  frozen: number;
  recent: Array<{ delta: number; kind: string; ref: string | null; createdAt: string }>;
}

export function CreditWalletCard({ accessToken, onError }: CreditWalletCardProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topUpLoading, setTopUpLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!accessToken) return;
      try {
        const response = await fetch('/api/billing/wallet', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json();
        if (response.ok && result.success && !cancelled) {
          setWallet(result.data);
        }
      } catch {
        // Wallet read is non-fatal — the card just shows a placeholder.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleTopUp = async (pack: (typeof CREDIT_PACK_ORDER)[number]) => {
    if (!accessToken) return;
    setTopUpLoading(pack);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type: 'topup', pack }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to start top-up checkout');
      }

      window.location.href = result.data.url;
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to start top-up');
      setTopUpLoading(null);
    }
  };

  return (
    <div className="mb-8 p-5 border border-slate-200 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Coins className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Credit wallet</h3>
          <p className="text-xs text-slate-500">
            Prepaid credits, spent per call by metering class (C1–C4)
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
          <div className="text-sm text-emerald-800">Available balance</div>
          <div className="text-3xl font-bold text-emerald-700 tabular-nums mt-1">
            {wallet ? Number(wallet.balance).toLocaleString() : '–'}
          </div>
          {wallet && Number(wallet.frozen) > 0 && (
            <div className="text-xs text-emerald-600/80 mt-0.5">
              {Number(wallet.frozen).toLocaleString()} reserved in-flight
            </div>
          )}
        </div>
        <div className="rounded-xl p-4 border border-slate-200 border-dashed">
          <div className="text-sm text-slate-600 mb-3">Top up credits</div>
          <div className="flex flex-wrap gap-2">
            {CREDIT_PACK_ORDER.map((pack) => (
              <Button
                key={pack}
                variant="secondary"
                size="sm"
                disabled={topUpLoading === pack}
                onClick={() => handleTopUp(pack)}
                leftIcon={
                  topUpLoading === pack ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )
                }
                className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                title={CREDIT_PACKS[pack].description}
              >
                {CREDIT_PACKS[pack].credits.toLocaleString()} · ${CREDIT_PACKS[pack].priceUsd}
              </Button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            No subscription required — a positive balance unlocks every endpoint and MCP tool.
          </p>
        </div>
      </div>

      {wallet && wallet.recent.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Recent activity
          </h4>
          <ul className="space-y-1.5">
            {wallet.recent.slice(0, 5).map((entry, idx) => {
              const positive = Number(entry.delta) > 0;
              return (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {entry.kind === 'topup'
                      ? 'Credit top-up'
                      : entry.kind === 'grant'
                        ? 'Monthly allowance'
                        : entry.kind === 'refund'
                          ? 'Refund'
                          : entry.ref?.replace('/api/v1', '').replace('/api', '') || 'API call'}
                  </span>
                  <span
                    className={`font-medium tabular-nums ${
                      positive ? 'text-emerald-600' : 'text-slate-700'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {Number(entry.delta).toLocaleString()} cr
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
