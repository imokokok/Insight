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

import { CheckCircle2, Coins, Loader2, Zap } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import {
  apiErrorMessage,
  parseApiEnvelope,
  requireApiData,
} from '@/lib/api/client/responseValidation';
import { CREDIT_PACKS, CREDIT_PACK_ORDER } from '@/lib/billing/plans';

interface CreditWalletCardProps {
  accessToken: string | null | undefined;
  onError?: (message: string) => void;
}

interface WalletData {
  balance: number;
  frozen: number;
  pending: Array<{
    id: string;
    credits: number;
    invoiceId: string | null;
    paymentId: string | null;
    createdAt: string;
  }>;
  recent: Array<{ delta: number; kind: string; ref: string | null; createdAt: string }>;
}

const WalletDataSchema: z.ZodType<WalletData> = z.object({
  balance: z.number(),
  frozen: z.number(),
  pending: z.array(
    z.object({
      id: z.string(),
      credits: z.number(),
      invoiceId: z.string().nullable(),
      paymentId: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
  recent: z.array(
    z.object({
      delta: z.number(),
      kind: z.string(),
      ref: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
});

const CheckoutDataSchema = z.object({ url: z.string().url() });
const ReconcileDataSchema = z
  .object({ status: z.string().optional(), providerStatus: z.string().optional() })
  .passthrough();

export function CreditWalletCard({ accessToken, onError }: CreditWalletCardProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topUpLoading, setTopUpLoading] = useState<string | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState<string | null>(null);
  const [paymentIds, setPaymentIds] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!accessToken) return;
      try {
        const response = await fetch('/api/billing/wallet', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = parseApiEnvelope(await response.json(), 'Wallet response');
        if (response.ok && result.success && !cancelled) {
          setWallet(requireApiData(result, WalletDataSchema, 'Wallet response'));
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
      const result = parseApiEnvelope(await response.json(), 'Top-up checkout response');

      if (!response.ok || !result.success) {
        throw new Error(apiErrorMessage(result, 'Failed to start top-up checkout'));
      }

      window.location.assign(
        requireApiData(result, CheckoutDataSchema, 'Top-up checkout response').url
      );
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to start top-up');
      setTopUpLoading(null);
    }
  };

  // "I've paid" — reconcile a pending top-up against NOWPayments in case the
  // IPN was lost/delayed. Idempotent server-side, so re-running is safe.
  const handleReconcile = async (id: string) => {
    if (!accessToken) return;
    setReconcileLoading(id);
    try {
      const response = await fetch('/api/billing/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: 'topup',
          id,
          ...(paymentIds[id]?.trim() ? { paymentId: paymentIds[id].trim() } : {}),
        }),
      });
      const result = parseApiEnvelope(await response.json(), 'Payment reconciliation response');

      if (!response.ok || !result.success) {
        throw new Error(apiErrorMessage(result, 'Failed to check payment'));
      }
      const reconciled = requireApiData(
        result,
        ReconcileDataSchema,
        'Payment reconciliation response'
      );

      if (reconciled.status === 'paid') {
        onError?.('Payment confirmed — credits added to your wallet');
      } else if (
        reconciled.providerStatus === 'confirmed' ||
        reconciled.providerStatus === 'finished'
      ) {
        // Fallback: server reported a settled provider state.
      }
      // Reload the wallet to reflect the reconciled state.
      const reload = await fetch('/api/billing/wallet', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const reloadResult = parseApiEnvelope(await reload.json(), 'Wallet reload response');
      if (reload.ok && reloadResult.success) {
        setWallet(requireApiData(reloadResult, WalletDataSchema, 'Wallet reload response'));
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to check payment');
    } finally {
      setReconcileLoading(null);
    }
  };

  return (
    <section className="mb-8 border-y border-slate-900/15 bg-white/35 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center border border-emerald-200 bg-emerald-50">
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
        <div className="border-y border-emerald-200 bg-emerald-50/50 p-4">
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
        <div className="border-y border-dashed border-slate-300 p-4">
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
                className="rounded-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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

      {wallet && wallet.pending.length > 0 && (
        <div className="mt-4 border-l-2 border-amber-500 bg-amber-50/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
            Pending top-ups
          </h4>
          <ul className="space-y-2">
            {wallet.pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm flex-wrap">
                <div>
                  <span className="font-medium text-slate-700">
                    {Number(p.credits).toLocaleString()} cr
                  </span>
                  <span className="text-slate-500">
                    {' '}
                    · created {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <span className="block text-xs text-slate-400">
                    Payment pending — enter the Payment ID from your NOWPayments receipt if needed.
                  </span>
                  <label className="block text-xs text-slate-600 mt-1">
                    Payment ID
                    <input
                      value={paymentIds[p.id] ?? ''}
                      onChange={(event) =>
                        setPaymentIds((current) => ({ ...current, [p.id]: event.target.value }))
                      }
                      inputMode="numeric"
                      placeholder={p.paymentId ?? 'From NOWPayments receipt'}
                      className="ml-2 rounded-sm border border-slate-300 bg-white px-2 py-1 text-sm"
                    />
                  </label>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={reconcileLoading === p.id}
                  onClick={() => handleReconcile(p.id)}
                  leftIcon={
                    reconcileLoading === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )
                  }
                  className="rounded-sm border-amber-200 text-amber-700 hover:bg-amber-100"
                >
                  {reconcileLoading === p.id ? 'Checking…' : 'I&apos;ve paid'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
    </section>
  );
}
