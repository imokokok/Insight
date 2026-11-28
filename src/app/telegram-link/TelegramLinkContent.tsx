'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useSession } from '@/stores/authStore';

export default function TelegramLinkContent({ challenge }: { challenge: string }) {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState('');
  const loginUrl = `/login?redirect=${encodeURIComponent(`/telegram-link?challenge=${challenge}`)}`;

  async function linkAccount() {
    if (!session?.access_token || !challenge) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/telegram/link/claim', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ challenge }),
        signal: AbortSignal.timeout(15_000),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          body !== null &&
          typeof body === 'object' &&
          'message' in body &&
          typeof body.message === 'string'
            ? body.message
            : 'This link expired or could not be used.';
        throw new Error(message);
      }
      setLinked(true);
      window.history.replaceState({}, '', '/telegram-link?linked=1');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not link the Telegram account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Insight × Telegram
        </p>
        <h1 className="mb-4 text-3xl font-semibold text-slate-950">
          Connect your Telegram account
        </h1>
        {linked ? (
          <div role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
            Telegram is linked to your Insight account. Return to your private bot chat to continue.
          </div>
        ) : !challenge ? (
          <div role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">
            This link is incomplete. Start again from the private Telegram bot chat.
          </div>
        ) : !session ? (
          <div className="space-y-5">
            <p className="text-slate-700">
              Sign in or create an Insight account first. You will review and confirm the link after
              you return here.
            </p>
            <Link
              className="inline-flex rounded-lg bg-slate-950 px-5 py-3 font-medium text-white"
              href={loginUrl}
            >
              Sign in to Insight
            </Link>
            <p className="text-sm text-slate-600">
              The one-time link expires in 15 minutes. Linking does not authorize or submit any
              transaction.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-slate-700">
              You are signed in. Confirm that this Telegram chat should be associated with your
              Insight account.
            </p>
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </p>
            )}
            <button
              className="rounded-lg bg-slate-950 px-5 py-3 font-medium text-white disabled:opacity-60"
              disabled={busy}
              onClick={() => void linkAccount()}
            >
              {busy ? 'Linking…' : 'Confirm account link'}
            </button>
            <p className="text-sm text-slate-600">
              This only connects your accounts so the bot can check your Insight credit balance and
              usage. It does not connect a wallet or grant transaction authority.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
