'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { verifyReceipt } from 'verify-insight-receipt';

import { shortAddress } from '@/components/verifiability/verifyReceipt';

import type { KeyRegistry, RoutableAttestation, VerifyResult } from 'verify-insight-receipt';

type Status = 'loading' | 'done' | 'error';
type Mode = 'sample' | 'paste';

interface DemoState {
  status: Status;
  result?: VerifyResult;
  attestation?: unknown;
  registry?: KeyRegistry;
  error?: string;
}

const KEY_STATUS_STYLES: Record<string, string> = {
  valid: 'bg-emerald-50 text-emerald-700',
  revoked: 'bg-red-50 text-red-700',
  unknown_key: 'bg-amber-50 text-amber-700',
  outside_window: 'bg-amber-50 text-amber-700',
  not_checked: 'bg-slate-100 text-slate-600',
};

function fmtTime(ts: number | null): string {
  if (ts == null) return '—';
  return new Date(ts * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function fetchRegistry(): Promise<KeyRegistry | undefined> {
  return fetch('/.well-known/oracle-keys.json')
    .then((res) => (res.ok ? res.json() : undefined))
    .catch(() => undefined);
}

export default function VerifyClient() {
  const [mode, setMode] = useState<Mode>('sample');
  const [pastedInput, setPastedInput] = useState('');
  const [state, setState] = useState<DemoState>({ status: 'loading' });

  // All verification goes through the library — this component never
  // re-implements any crypto. It only supplies the receipt + the public
  // key registry and renders whatever the library decides.
  const verifyAttestation = useCallback(
    async (attestation: RoutableAttestation, registry: KeyRegistry | undefined) => {
      const result = await verifyReceipt(attestation, registry ? { keyRegistry: registry } : {});
      setState({ status: 'done', result, attestation, registry });
    },
    []
  );

  const runSample = useCallback(async () => {
    try {
      const [sampleRes, registry] = await Promise.all([
        fetch('/api/v1/safety/attestation/sample'),
        fetchRegistry(),
      ]);

      if (!sampleRes.ok) {
        let msg = `Sample endpoint returned ${sampleRes.status}.`;
        try {
          const b = await sampleRes.json();
          if (b?.error?.message) msg = b.error.message;
        } catch {
          /* ignore parse errors, keep the status message */
        }
        setState({ status: 'error', error: msg });
        return;
      }

      const sampleBody = await sampleRes.json();
      const attestation = sampleBody?.data?.attestation;
      if (!attestation) {
        setState({ status: 'error', error: 'Sample endpoint returned no attestation.' });
        return;
      }

      await verifyAttestation(attestation, registry);
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error while verifying.',
      });
    }
  }, [verifyAttestation]);

  const runPaste = useCallback(async () => {
    let attestation: RoutableAttestation;
    try {
      attestation = JSON.parse(pastedInput) as RoutableAttestation;
    } catch {
      setState({ status: 'error', error: 'Receipt is not valid JSON.' });
      return;
    }
    try {
      const registry = await fetchRegistry();
      await verifyAttestation(attestation, registry);
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error while verifying.',
      });
    }
  }, [pastedInput, verifyAttestation]);

  useEffect(() => {
    if (mode === 'sample') void runSample();
  }, [mode, runSample]);

  const result = state.status === 'done' ? state.result : undefined;
  const verified = !!result && result.code === 'ok' && result.keyStatus === 'valid';

  const signerRole =
    result && state.registry
      ? (() => {
          const keys = (state.registry.public_keys ?? state.registry.keys ?? []) as Array<{
            public_key?: string;
            role?: string;
          }>;
          const entry = keys.find(
            (k) => k.public_key?.toLowerCase() === result.attester?.toLowerCase()
          );
          return entry?.role;
        })()
      : undefined;

  const runCurrent = mode === 'sample' ? runSample : runPaste;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider mb-3">
              Receipt Verification
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Verify a receipt in your browser
            </h1>
            <p className="text-base text-slate-500 mt-2 max-w-2xl">
              Verify an Insight OracleSafetyCheck <strong>entirely client-side</strong> with{' '}
              <code className="text-slate-700">verify-insight-receipt</code>. No server, no API key,
              no trust in Insight — Insight only serves the public sample and the public key
              registry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setState({ status: 'loading' });
              void runCurrent();
            }}
            disabled={state.status === 'loading' || (mode === 'paste' && !pastedInput.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors self-start"
          >
            {state.status === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {state.status === 'loading'
              ? 'Verifying…'
              : mode === 'sample'
                ? 'Verify again'
                : 'Verify receipt'}
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode('sample')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'sample'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live sample
            </button>
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'paste' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste a receipt
            </button>
          </div>
          <span className="text-xs text-slate-400">
            Verification runs in your browser via{' '}
            <code className="text-slate-500">verify-insight-receipt</code> — nothing leaves the
            page.
          </span>
        </div>

        {mode === 'paste' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Receipt JSON</label>
            <textarea
              value={pastedInput}
              onChange={(e) => setPastedInput(e.target.value)}
              placeholder="Paste an OracleSafetyCheck or OracleSafetyRecheck receipt JSON here…"
              spellCheck={false}
              className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
        )}

        {state.status === 'loading' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {mode === 'sample'
                ? 'Fetching a live sample & verifying in your browser…'
                : 'Verifying the receipt you pasted…'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Pulling the signed receipt and the published key registry, then recovering the
              signature locally with viem.
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {mode === 'sample' ? 'Sample unavailable' : 'Could not verify'}
                </h3>
                <p className="text-sm text-slate-500">
                  {mode === 'sample'
                    ? 'Could not load a live receipt to verify.'
                    : 'The receipt could not be verified.'}
                </p>
              </div>
            </div>
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
              {state.error}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              The production sample signer may be unconfigured on this instance. You can still
              verify any receipt locally — install the package and run the quickstart:
            </p>
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto">
              <code>{`npm i verify-insight-receipt
node node_modules/verify-insight-receipt/examples/quickstart.mjs`}</code>
            </pre>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
              <a
                className="hover:text-blue-600"
                href="https://www.npmjs.com/package/verify-insight-receipt"
                target="_blank"
                rel="noreferrer"
              >
                npm: verify-insight-receipt
              </a>
              <Link
                className="hover:text-blue-600"
                href="/.well-known/oracle-keys.json"
                target="_blank"
              >
                published attester keys
              </Link>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Verdict */}
            <div
              className={`rounded-2xl border shadow-sm p-6 ${
                verified ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    verified ? 'bg-emerald-100' : 'bg-red-100'
                  }`}
                >
                  {verified ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-600" />
                  )}
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold tracking-tight ${
                      verified ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {verified ? 'VERIFIED' : 'NOT VERIFIED'}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {verified
                      ? 'Genuine signature from a key in Insight’s published registry.'
                      : (result.reason ?? 'The receipt did not pass verification.')}
                  </p>
                </div>
                <div className="ml-auto hidden sm:flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                    code: {result.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      KEY_STATUS_STYLES[result.keyStatus] ?? KEY_STATUS_STYLES.not_checked
                    }`}
                  >
                    key: {result.keyStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
              <div className="px-5 py-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-900">Receipt details</span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm">
                <Detail label="schemaVersion" value={String(result.schemaVersion)} mono />
                <Detail
                  label="signer"
                  value={shortAddress(result.attester) ?? '—'}
                  mono
                  title={result.attester}
                />
                <Detail label="checkedAt" value={fmtTime(result.checkedAt)} mono />
                <Detail label="validUntil" value={fmtTime(result.validUntil)} mono />
                <Detail label="expired" value={result.expired ? 'yes' : 'no'} />
                <Detail label="kind" value={result.kind} />
                <div className="sm:col-span-2 flex justify-between gap-3">
                  <dt className="text-slate-500">uid</dt>
                  <dd
                    className="font-mono text-slate-900 truncate max-w-[320px]"
                    title={result.uid ?? ''}
                  >
                    {result.uid ?? '—'}
                  </dd>
                </div>
              </dl>
              {signerRole && (
                <div className="px-5 py-3 text-xs text-slate-500 bg-slate-50">
                  {signerRole === 'sample'
                    ? 'Signed by Insight’s dedicated SAMPLE key — this proves the crypto chain, not a real trade.'
                    : 'Signed by a production ATTESTER key.'}
                </div>
              )}
            </div>

            {/* Zero-trust note */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
              <p className="leading-relaxed">
                <strong className="text-slate-900">Zero trust:</strong> the signature was recovered
                in your browser with viem’s <code className="text-slate-700">verifyTypedData</code>,
                against the key registry published at{' '}
                <code className="text-slate-700">/.well-known/oracle-keys.json</code>. Insight’s
                servers only handed over the public sample and the public registry — they never told
                you the answer. The same code ships as{' '}
                <a
                  className="text-blue-600 hover:underline"
                  href="https://www.npmjs.com/package/verify-insight-receipt"
                  target="_blank"
                  rel="noreferrer"
                >
                  verify-insight-receipt
                </a>{' '}
                so anyone can verify offline.
              </p>
            </div>

            {/* Raw */}
            <details className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-900 select-none">
                Show raw receipt &amp; verification result
              </summary>
              <pre className="px-5 pb-5 text-xs text-slate-700 overflow-x-auto">
                <code>{JSON.stringify({ attestation: state.attestation, result }, null, 2)}</code>
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  title,
}: {
  label: string;
  value: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`${mono ? 'font-mono' : ''} text-slate-900 truncate`} title={title}>
        {value}
      </dd>
    </div>
  );
}
