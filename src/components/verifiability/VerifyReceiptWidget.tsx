'use client';

import { useCallback, useState } from 'react';

import Link from 'next/link';

import {
  gateNote,
  parseReceiptInput,
  shortAddress,
  toReceiptVerification,
  type ReceiptVerification,
} from './verifyReceipt';

const VRT1_REGISTRY_URL =
  'https://github.com/Ifasola34/vrt1-spec/blob/main/registry/vendor-action-types.json';

interface WidgetState {
  status: 'idle' | 'loading' | 'done' | 'error';
  result?: ReceiptVerification;
  error?: string;
}

/**
 * Client-side demo of the public verify endpoint. No backend change: it calls
 * the existing GET /api/v1/safety/attestation/sample and
 * POST /api/v1/safety/attestation/verify endpoints.
 */
export function VerifyReceiptWidget() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<WidgetState>({ status: 'idle' });

  const runVerify = useCallback(async (receiptText: string) => {
    const parsed = parseReceiptInput(receiptText);
    if (!parsed.ok) {
      setState({ status: 'error', error: parsed.error });
      return;
    }
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/v1/safety/attestation/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation: parsed.value }),
      });
      const envelope = (await res.json()) as {
        success: boolean;
        data?: unknown;
        error?: { code?: string; message?: string };
      };
      const mapped = toReceiptVerification(envelope);
      if (!mapped.ok) {
        setState({ status: 'error', error: mapped.error });
        return;
      }
      setState({ status: 'done', result: mapped.result });
    } catch {
      setState({ status: 'error', error: 'Network error while verifying.' });
    }
  }, []);

  const loadSample = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/v1/safety/attestation/sample');
      const envelope = (await res.json()) as {
        success: boolean;
        data?: { attestation?: unknown };
      };
      if (envelope.success !== true || !envelope.data?.attestation) {
        setState({
          status: 'error',
          error: 'Sample receipt unavailable (attester key not configured here).',
        });
        return;
      }
      const text = JSON.stringify(envelope.data.attestation, null, 2);
      setInput(text);
      await runVerify(text);
    } catch {
      setState({ status: 'error', error: 'Could not fetch a sample receipt.' });
    }
  }, [runVerify]);

  const result = state.status === 'done' ? state.result : undefined;

  return (
    <div className="overflow-hidden border-y border-slate-900/15 bg-white/55">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Verify a receipt</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Runs against the public endpoint, no API key. Try it with a real sample.
            </div>
          </div>
          <button
            type="button"
            onClick={loadSample}
            disabled={state.status === 'loading'}
            className="inline-flex items-center gap-2 border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Load a real sample receipt
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste an Insight receipt (JSON) here, or load the sample…"
          spellCheck={false}
          className="h-40 w-full resize-y border border-slate-900/15 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => runVerify(input)}
            disabled={state.status === 'loading'}
            className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {state.status === 'loading' ? 'Verifying…' : 'Verify'}
          </button>
          <span className="text-xs text-slate-400">
            POST /api/v1/safety/attestation/verify · routes by schemaVersion
          </span>
        </div>

        {state.status === 'error' && (
          <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {result && (
          <div className="divide-y divide-slate-900/10 border-y border-slate-900/15">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Signature</span>
              <span
                className={`inline-flex items-center gap-1.5 border-l-2 border-current px-2.5 py-1 text-xs font-semibold ${
                  result.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {result.valid ? 'valid' : result.expired ? 'expired' : 'invalid'}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">schemaVersion</dt>
                <dd className="font-mono text-slate-900">{result.schemaVersion}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">attester</dt>
                <dd className="font-mono text-slate-900">{shortAddress(result.attester) ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">uid</dt>
                <dd className="font-mono text-slate-900 truncate max-w-[220px]">
                  {result.uid ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">checkedAt</dt>
                <dd className="font-mono text-slate-900">
                  {result.checkedAt ? new Date(result.checkedAt * 1000).toISOString() : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">validUntil</dt>
                <dd className="font-mono text-slate-900">
                  {result.validUntil ? new Date(result.validUntil * 1000).toISOString() : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">ageSeconds</dt>
                <dd className="font-mono text-slate-900">{result.ageSeconds ?? '—'}</dd>
              </div>
            </dl>
            {result.reason && (
              <div className="px-4 py-2.5 text-xs text-slate-600 bg-slate-50">
                reason: {result.reason}
              </div>
            )}
            <div className="px-4 py-3 text-xs text-slate-500 bg-slate-50/60">
              {gateNote(result.schemaVersion)}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          <Link
            className="hover:text-blue-600"
            href="/.well-known/oracle-keys.json"
            target="_blank"
          >
            published attester keys
          </Link>
          <Link
            className="hover:text-blue-600"
            href="/.well-known/vrt1-scale-declaration.json"
            target="_blank"
          >
            scale declaration
          </Link>
          <a
            className="hover:text-blue-600"
            href={VRT1_REGISTRY_URL}
            target="_blank"
            rel="noreferrer"
          >
            VRT1 §8.6 vendor registry
          </a>
        </div>
      </div>
    </div>
  );
}
