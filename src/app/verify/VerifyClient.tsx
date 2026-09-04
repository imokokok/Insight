'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { verifyReceipt } from 'verify-insight-receipt';

import { EditorialWorkspaceHeader } from '@/components/editorial';
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
    if (mode !== 'sample') return;
    const timer = window.setTimeout(() => void runSample(), 0);
    return () => window.clearTimeout(timer);
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
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28">
        <EditorialWorkspaceHeader
          index="06"
          stage="Verify"
          eyebrow="Independent receipt verification. The signature, signer key, validity window, and payload are checked locally in your browser."
          title="Trust the proof you can verify yourself."
          description="Inspect an Insight OracleSafetyCheck without sending the receipt back to Insight. The public registry supplies the key; the browser reaches the verdict."
          evidence={['Signed payload', 'Published key', 'Local verdict']}
          action={
            <button
              type="button"
              onClick={() => {
                setState({ status: 'loading' });
                void runCurrent();
              }}
              disabled={state.status === 'loading' || (mode === 'paste' && !pastedInput.trim())}
              className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {state.status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {state.status === 'loading'
                ? 'Verifying…'
                : mode === 'sample'
                  ? 'Verify again'
                  : 'Verify receipt'}
            </button>
          }
        />

        <div className="grid gap-8 pt-7 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
          <aside>
            <div className="mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">01 — Choose the evidence</p>
              <span className="font-mono text-[10px] text-slate-400">INPUT</span>
            </div>

            <div className="border-y border-slate-900/15 bg-white/35 p-4 xl:sticky xl:top-24">
              <div className="mb-4 inline-flex border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setMode('sample')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    mode === 'sample'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live sample
                </button>
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    mode === 'paste'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paste a receipt
                </button>
              </div>

              <p className="text-sm leading-relaxed text-slate-500">
                Verification runs in your browser via{' '}
                <code className="text-slate-700">verify-insight-receipt</code>. Nothing leaves this
                page.
              </p>

              {mode === 'paste' && (
                <div className="mt-5 border-t border-slate-900/10 pt-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Receipt JSON
                  </label>
                  <textarea
                    value={pastedInput}
                    onChange={(e) => setPastedInput(e.target.value)}
                    placeholder="Paste an OracleSafetyCheck or OracleSafetyRecheck receipt JSON here…"
                    spellCheck={false}
                    className="h-64 w-full resize-y border border-slate-300 bg-white p-3 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0" aria-label="Receipt verification result">
            <div className="mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">02 — Read the verdict</p>
              <span className="font-mono text-[10px] text-slate-400">EVIDENCE</span>
            </div>

            {state.status === 'loading' && (
              <div className="flex flex-col items-center justify-center border-y border-slate-900/15 bg-white/35 py-20 text-center">
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
              <div className="border-y border-red-200 bg-white/45 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-red-200 bg-red-50">
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
                  className={`border-y p-6 ${
                    verified ? 'border-emerald-300 bg-emerald-50/60' : 'border-red-300 bg-red-50/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center border ${
                        verified ? 'border-emerald-200 bg-emerald-100' : 'border-red-200 bg-red-100'
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
                <div className="divide-y divide-slate-900/10 border-y border-slate-900/15 bg-white/45">
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
                <div className="border-l-2 border-blue-600 bg-blue-50/45 px-5 py-4 text-sm text-slate-600">
                  <p className="leading-relaxed">
                    <strong className="text-slate-900">Zero trust:</strong> the signature was
                    recovered in your browser with viem’s{' '}
                    <code className="text-slate-700">verifyTypedData</code>, against the key
                    registry published at{' '}
                    <code className="text-slate-700">/.well-known/oracle-keys.json</code>. Insight’s
                    servers only handed over the public sample and the public registry — they never
                    told you the answer. The same code ships as{' '}
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
                <details className="border-y border-slate-900/15 bg-white/45">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-900 select-none">
                    Show raw receipt &amp; verification result
                  </summary>
                  <pre className="px-5 pb-5 text-xs text-slate-700 overflow-x-auto">
                    <code>
                      {JSON.stringify({ attestation: state.attestation, result }, null, 2)}
                    </code>
                  </pre>
                </details>
              </div>
            )}
          </section>
        </div>
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
