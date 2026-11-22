'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';

import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import type { PolymarketPosition } from '@/lib/polymarket/positions';

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const STORAGE_KEY = 'insight:polymarket:public-account-address';
const STORAGE_EVENT = 'insight-polymarket-address-change';

function subscribeToSavedAddress(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

function getSavedAddress(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function notifySavedAddressChanged() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

type PositionsPage = {
  data: PolymarketPosition[];
  pagination: { has_more: boolean; next_cursor: string | null };
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const quantity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

export function PolymarketPositionsClient() {
  const savedAddress = useSyncExternalStore(subscribeToSavedAddress, getSavedAddress, () => null);
  const [draftAddress, setDraftAddress] = useState<string | null>(null);
  const [rememberChoice, setRememberChoice] = useState<boolean | null>(null);
  const address =
    draftAddress ?? (savedAddress && ADDRESS_PATTERN.test(savedAddress) ? savedAddress : '');
  const rememberAddress =
    rememberChoice ?? Boolean(savedAddress && ADDRESS_PATTERN.test(savedAddress));
  const [activeAddress, setActiveAddress] = useState('');
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function loadPage(walletAddress: string, nextCursor: string | null, append: boolean) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ user: walletAddress });
      if (nextCursor) params.set('cursor', nextCursor);
      const response = await fetch(`/api/polymarket/positions?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : 'Positions could not be loaded. Try again.';
        throw new Error(message);
      }

      const page = payload as PositionsPage;
      if (
        !Array.isArray(page.data) ||
        typeof page.pagination?.has_more !== 'boolean' ||
        (page.pagination.has_more && typeof page.pagination.next_cursor !== 'string') ||
        (page.pagination.next_cursor !== null && typeof page.pagination.next_cursor !== 'string') ||
        (nextCursor !== null && page.pagination.next_cursor === nextCursor)
      ) {
        throw new Error('The positions response was incomplete. Refresh and try again.');
      }
      setPositions((current) => (append ? [...current, ...page.data] : page.data));
      setCursor(page.pagination.next_cursor);
      setHasMore(page.pagination.has_more);
      setActiveAddress(walletAddress);
      setRefreshedAt(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Positions could not be loaded. Try again.'
      );
      if (!append) {
        setPositions([]);
        setCursor(null);
        setHasMore(false);
        setActiveAddress(walletAddress);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const walletAddress = address.trim();
    if (!ADDRESS_PATTERN.test(walletAddress)) {
      setError('Enter a valid 0x wallet address with 40 hexadecimal characters.');
      return;
    }
    if (rememberAddress) {
      try {
        window.localStorage.setItem(STORAGE_KEY, walletAddress);
        notifySavedAddressChanged();
        setStorageWarning('');
      } catch {
        setStorageWarning(
          'This browser could not save the address. You can still view positions for this session.'
        );
      }
    } else {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        notifySavedAddressChanged();
        setStorageWarning('');
      } catch {
        // Continue with an in-memory-only address.
      }
    }
    void loadPage(walletAddress, null, false);
  }

  const loadedValue = positions.reduce((total, position) => total + position.current_value, 0);
  const loadedUnrealizedPnl = positions.reduce(
    (total, position) => total + position.unrealized_pnl,
    0
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <section className="border-b border-slate-900/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-700">
            Insight · Read-only account view
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Polymarket positions
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Review the open positions Polymarket reports for a public account address. Insight
                only reads the data; you keep every account and trading decision.
              </p>
            </div>
            <div className="flex items-start gap-3 border-l-2 border-blue-600 pl-4 text-sm leading-6 text-slate-600">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <p>No wallet connection, API key, signature, or trading permission is needed.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <form
          onSubmit={handleSubmit}
          className="border border-slate-900/10 bg-white p-5 shadow-sm sm:p-7"
        >
          <label
            htmlFor="polymarket-address"
            className="block text-sm font-semibold text-slate-900"
          >
            Polymarket account / proxy wallet address
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="polymarket-address"
                autoComplete="off"
                spellCheck={false}
                value={address}
                onChange={(event) => setDraftAddress(event.target.value)}
                placeholder="0x…"
                className="w-full border border-slate-300 bg-white py-3 pl-10 pr-3 font-mono text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              {loading ? 'Loading positions' : 'View positions'}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberAddress}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setRememberChoice(checked);
                  try {
                    if (checked && ADDRESS_PATTERN.test(address.trim())) {
                      window.localStorage.setItem(STORAGE_KEY, address.trim());
                      setStorageWarning('');
                    } else if (!checked) {
                      if (draftAddress === null) setDraftAddress(address);
                      window.localStorage.removeItem(STORAGE_KEY);
                      setStorageWarning('');
                    }
                    notifySavedAddressChanged();
                  } catch {
                    setStorageWarning(
                      'This browser could not save the address. You can still view positions for this session.'
                    );
                  }
                }}
                className="h-4 w-4 accent-blue-700"
              />
              Remember this public address on this device
            </label>
            <p className="text-xs leading-5 text-slate-500">
              The address is sent to Insight&apos;s read-only endpoint and Polymarket&apos;s public
              Data API.
            </p>
          </div>
          {storageWarning && (
            <p role="status" className="mt-3 text-xs text-amber-800">
              {storageWarning}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}
        </form>

        {activeAddress && (
          <div className="mt-8">
            <div className="flex flex-col gap-3 border-b border-slate-900/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Open positions
                </p>
                <p className="mt-2 break-all font-mono text-xs text-slate-500">{activeAddress}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span>
                  <strong className="font-semibold">{positions.length}</strong> loaded
                </span>
                <span>
                  <strong className="font-semibold">{currency.format(loadedValue)}</strong> loaded
                  value
                </span>
                <span
                  className={
                    loadedUnrealizedPnl >= 0
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-red-700'
                  }
                >
                  {currency.format(loadedUnrealizedPnl)} unrealized P&amp;L
                </span>
                {refreshedAt && (
                  <span className="text-xs text-slate-500">
                    Updated {refreshedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {!loading && positions.length === 0 && !error && (
              <div className="border-b border-slate-900/10 bg-white px-5 py-12 text-center">
                <p className="text-lg font-semibold">No open positions reported</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  The public Data API currently has no open positions for this address. Its index
                  can lag the Polymarket interface.
                </p>
              </div>
            )}

            {positions.length > 0 && (
              <div className="mt-4 overflow-x-auto border border-slate-900/10 bg-white">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Market / outcome</th>
                      <th className="px-4 py-3 text-right font-semibold">Shares</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg. price</th>
                      <th className="px-4 py-3 text-right font-semibold">Current value</th>
                      <th className="px-4 py-3 text-right font-semibold">Unrealized P&amp;L</th>
                      <th className="px-4 py-3 font-semibold">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/10">
                    {positions.map((position) => {
                      const eventSlug =
                        position.event_slug && /^[a-zA-Z0-9_-]+$/.test(position.event_slug)
                          ? position.event_slug
                          : null;
                      return (
                        <tr
                          key={`${position.condition_id}:${position.token_id}`}
                          className="align-top hover:bg-slate-50/70"
                        >
                          <td className="max-w-[34rem] px-4 py-4">
                            {eventSlug ? (
                              <a
                                href={`https://polymarket.com/event/${eventSlug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="group inline-flex items-start gap-2 font-medium text-slate-900 hover:text-blue-800"
                              >
                                <span>{position.title}</span>
                                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                              </a>
                            ) : (
                              <span className="font-medium">{position.title}</span>
                            )}
                            <p className="mt-1 text-xs text-slate-500">{position.outcome}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                            {quantity.format(position.current_size)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                            {position.avg_price == null ? '—' : currency.format(position.avg_price)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">
                            {currency.format(position.current_value)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums ${position.unrealized_pnl >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                          >
                            <span className="inline-flex items-center justify-end gap-1">
                              {position.unrealized_pnl >= 0 ? (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              )}
                              {currency.format(position.unrealized_pnl)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {position.redeemable ? (
                              <span className="inline-flex border border-emerald-700/20 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                                Redeemable
                              </span>
                            ) : (
                              <span className="inline-flex border border-slate-900/10 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                                Open
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {hasMore && cursor && (
              <div className="flex justify-center py-7">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadPage(activeAddress, cursor, true)}
                  className="border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-blue-700 hover:text-blue-800 disabled:opacity-60"
                >
                  {loading ? 'Loading' : 'Load more positions'}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="mt-10 border-t border-slate-900/10 pt-5 text-xs leading-5 text-slate-500">
          Position values and P&amp;L are reported by Polymarket&apos;s public Data API and may be
          delayed. Insight does not provide a buy/sell recommendation or perform wallet actions.
        </p>
      </section>
    </div>
  );
}
