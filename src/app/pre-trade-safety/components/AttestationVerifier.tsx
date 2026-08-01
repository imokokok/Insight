'use client';

/**
 * Public attestation verification panel.
 *
 * Anyone who received an Insight oracle-safety attestation (e.g. relayed by an
 * AI agent in a tx memo) can paste it here to confirm the EIP-712 signature is
 * genuine and see the exact verdict + evidence Insight signed at time T. This
 * is the public "narrative + evidence" outlet for the agent-economy positioning
 * layer — verification is unauthenticated (Tier 0) on purpose.
 *
 * A pre-trade check run in the sibling PreTradeSafetyDemo can fill this panel
 * one-click via the `externalAttestation` prop so users can self-verify the
 * attestation they just received.
 */
import { useEffect, useState } from 'react';

import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, ShieldX, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type {
  OracleSafetyAttestation,
  VerificationResult,
} from '@/lib/attestations/oracleSafetyAttestation';

const VERDICT_BADGE: Record<string, string> = {
  PASS: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CAUTION: 'text-amber-700 bg-amber-50 border-amber-200',
  DANGER: 'text-orange-700 bg-orange-50 border-orange-200',
  BLOCK: 'text-red-700 bg-red-50 border-red-200',
};

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  56: 'BNB Chain',
  137: 'Polygon',
  10: 'Optimism',
  43114: 'Avalanche',
  0: 'Chain-agnostic',
};

function shortAddr(a: string): string {
  return a && a.length > 14 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a;
}

function timeFromUnix(u: number | null): string {
  if (!u) return '—';
  return `${new Date(u * 1000).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

/** Reverse the attestation's integer scaling (see oracleSafetyAttestation). */
function unscalePrice(n: number): string {
  return (n / 1e8).toLocaleString('en-US', { maximumFractionDigits: 4 });
}
function unscaleDev(n: number): string {
  return `${(n / 100).toFixed(2)}%`;
}
function unscaleRisk(n: number): string {
  return (n / 10000).toFixed(2);
}

export function AttestationVerifier({
  externalAttestation,
  onConsume,
}: {
  externalAttestation?: OracleSafetyAttestation | null;
  onConsume?: () => void;
}) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [parsed, setParsed] = useState<OracleSafetyAttestation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!externalAttestation) return;
    setInput(JSON.stringify(externalAttestation, null, 2));
    setParsed(externalAttestation);
    onConsume?.();
    void verify(externalAttestation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalAttestation]);

  async function verify(att?: OracleSafetyAttestation) {
    setError(null);
    setResult(null);

    let toVerify = att;
    if (!toVerify) {
      const trimmed = input.trim();
      if (!trimmed) {
        setError('Paste an attestation first.');
        return;
      }
      try {
        toVerify = JSON.parse(trimmed) as OracleSafetyAttestation;
      } catch {
        setError('Invalid JSON — paste the full attestation object.');
        return;
      }
    }
    setParsed(toVerify);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/safety/attestation/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation: toVerify }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? 'Verification request failed');
        return;
      }
      setResult(json.data as VerificationResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const verdict = parsed?.data?.verdict;
  const verdictBadge = verdict
    ? (VERDICT_BADGE[verdict] ?? 'text-slate-700 bg-slate-50 border-slate-200')
    : '';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-900">Verify an attestation</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            Paste an Insight oracle-safety attestation to confirm its signature is genuine and
            review the signed verdict + evidence. Open to anyone — no auth required.
          </p>
        </div>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          '{\n  "uid": "0x…",\n  "attester": "0x…",\n  "signature": "0x…",\n  "data": { … },\n  …\n}'
        }
        spellCheck={false}
        className="w-full h-44 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
      />

      <Button
        onClick={() => verify()}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying…
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            Verify signature
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Verification verdict */}
          <div
            className={`p-4 rounded-xl border-2 ${
              result.valid && !result.expired
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {result.valid && !result.expired ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <ShieldX className="w-6 h-6 text-red-600" />
              )}
              <div>
                <div
                  className={`text-base font-bold ${
                    result.valid && !result.expired ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {result.valid
                    ? result.expired
                      ? 'STALE — signature valid but expired'
                      : 'VERIFIED — signature genuine'
                    : 'INVALID — signature does not verify'}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {result.reason ??
                    (result.valid
                      ? `Issued by Insight attester ${shortAddr(result.attester)}`
                      : 'The signature does not recover to the attester address.')}
                </div>
              </div>
            </div>
          </div>

          {/* Verification details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail label="UID" value={result.uid ? shortAddr(result.uid) : '—'} mono />
            <Detail label="Attester" value={shortAddr(result.attester)} mono />
            <Detail label="Checked at" value={timeFromUnix(result.checkedAt)} />
            <Detail
              label="Age"
              value={result.ageSeconds !== null ? `${result.ageSeconds}s` : '—'}
              warn={result.expired}
            />
          </div>

          {/* Signed evidence (the "narrative + evidence" payload) */}
          {parsed?.data && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Signed evidence</span>
                {verdict && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded border ${verdictBadge}`}>
                    {verdict}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm p-4">
                <Detail label="Asset" value={parsed.data.asset} mono />
                <Detail
                  label="Chain"
                  value={CHAIN_NAMES[parsed.data.chainId] ?? `#${parsed.data.chainId}`}
                />
                <Detail label="Action" value={parsed.data.action} />
                <Detail
                  label="Trade size"
                  value={`$${(parsed.data.tradeAmountUsd / 1e6).toLocaleString('en-US')}`}
                />
                <Detail
                  label="Consensus price"
                  value={`$${unscalePrice(parsed.data.consensusPrice)}`}
                />
                <Detail
                  label="Max deviation"
                  value={unscaleDev(parsed.data.maxDeviationBps)}
                  warn={parsed.data.maxDeviationBps >= 300}
                />
                <Detail
                  label="Manipulation risk"
                  value={unscaleRisk(parsed.data.manipulationRiskBps)}
                  warn={parsed.data.manipulationRiskBps >= 4000}
                />
                <Detail label="Providers" value={String(parsed.data.participantCount)} />
              </div>
            </div>
          )}

          {result.valid && !result.expired && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
              <span>
                A valid signature only proves Insight signed this verdict at the checked time. It is
                not an endorsement of the trade&apos;s outcome — oracle state can change within the
                {` ${parsed?.validForSeconds ?? 600}s `} validity window.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span
        className={`${mono ? 'font-mono' : ''} font-medium ${warn ? 'text-red-600' : 'text-slate-800'}`}
      >
        {value}
      </span>
    </div>
  );
}
