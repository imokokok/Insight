'use client';

import { useCallback, useState } from 'react';

type PairBinding = {
  preTradeUidMatch: boolean;
  requestHashMatch: boolean;
  /** v3 only: the destination gate the receipt commits to was presented and
   *  its uid matched. Absent on v1/v2 responses. */
  destinationPreTradeUidMatch?: boolean;
  /** v3 only: the signed preTradeUidsHash recomputed from the presented gates.
   *  Absent on v1/v2 responses. */
  preTradeUidsHashMatch?: boolean;
  chainMatch: boolean;
  assetMatch: boolean;
};

type PairResult = {
  pairedValid: boolean;
  closedLoopStatus: string;
  reason: string;
  binding: PairBinding;
  preTrade: {
    valid: boolean;
    expired: boolean;
    uid: string | null;
    schemaVersion: number;
    attester: string;
    reason?: string;
  };
  execution: { valid: boolean; expired: boolean; executionStatus: string | null; reason: string };
};

type Envelope = {
  success: boolean;
  data?: PairResult;
  error?: { code?: string; message?: string };
};

function statusTone(status: string): string {
  if (status === 'CLOSED_FAITHFUL' || status === 'PRICE_CLOSED_FAITHFUL')
    return 'bg-emerald-50 text-emerald-700';
  if (status === 'PAIR_INVALID') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

function yesNo(v: boolean | undefined): string {
  if (v === undefined) return 'n/a (v1/v2)';
  return v ? 'match' : 'mismatch';
}

export function VerifyExecutionPairWidget() {
  const [preTrade, setPreTrade] = useState('');
  const [receipt, setReceipt] = useState('');
  const [destinationPreTrade, setDestinationPreTrade] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<PairResult | undefined>();
  const [error, setError] = useState<string | undefined>();

  const runVerify = useCallback(
    async (preTradeText: string, receiptText: string, destinationText: string) => {
      let preTradeJson: unknown;
      let receiptJson: unknown;
      let destinationJson: unknown;
      try {
        preTradeJson = JSON.parse(preTradeText);
        receiptJson = JSON.parse(receiptText);
        destinationJson = destinationText.trim() ? JSON.parse(destinationText) : null;
      } catch {
        setState('error');
        setError('Both inputs must be valid JSON.');
        return;
      }
      setState('loading');
      setError(undefined);
      try {
        const res = await fetch('/api/v1/execution/attestation/verify-pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preTradeAttestation: preTradeJson,
            executionReceipt: receiptJson,
            ...(destinationJson ? { destinationPreTradeAttestation: destinationJson } : {}),
          }),
        });
        const envelope = (await res.json()) as Envelope;
        if (envelope.success !== true || !envelope.data) {
          setState('error');
          setError(envelope.error?.message ?? 'Verification failed.');
          return;
        }
        setResult(envelope.data);
        setState('done');
      } catch {
        setState('error');
        setError('Network error while verifying the pair.');
      }
    },
    []
  );

  return (
    <div className="mt-8 overflow-hidden border-y border-slate-900/15 bg-white/55">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="text-sm font-semibold text-slate-900">Verify a closed execution loop</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Paste the pre-trade attestation(s) and the Execution Receipt. Proves the certify → execute
          → prove loop actually closed — and that the receipt is bound to THIS gate, not a forged
          one. A v3 receipt that commits to a destination gate needs that gate pasted too. Public,
          no API key.
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-medium text-slate-600 mb-1.5">
              Pre-trade attestation <span className="text-slate-400">(source leg)</span>
            </div>
            <textarea
              value={preTrade}
              onChange={(e) => setPreTrade(e.target.value)}
              placeholder="Paste the pre-trade oracle-safety attestation (source leg)…"
              spellCheck={false}
              className="h-40 w-full resize-y border border-slate-900/15 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600 mb-1.5">Execution Receipt</div>
            <textarea
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              placeholder="Paste the Execution Receipt (from execution_receipt)…"
              spellCheck={false}
              className="h-40 w-full resize-y border border-slate-900/15 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600 mb-1.5">
              Destination pre-trade <span className="text-slate-400">(v3, optional)</span>
            </div>
            <textarea
              value={destinationPreTrade}
              onChange={(e) => setDestinationPreTrade(e.target.value)}
              placeholder="Only if the receipt commits to a destination gate…"
              spellCheck={false}
              className="h-40 w-full resize-y border border-slate-900/15 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => runVerify(preTrade, receipt, destinationPreTrade)}
            disabled={state === 'loading'}
            className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {state === 'loading' ? 'Verifying…' : 'Verify pair'}
          </button>
          <span className="text-xs text-slate-400">
            POST /api/v1/execution/attestation/verify-pair · checks the cryptographic binding
          </span>
        </div>

        {state === 'error' && (
          <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="divide-y divide-slate-900/10 border-y border-slate-900/15">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Closed-loop status</span>
              <span
                className={`inline-flex items-center gap-1.5 border-l-2 border-current px-2.5 py-1 text-xs font-semibold ${statusTone(
                  result.closedLoopStatus
                )}`}
              >
                {result.closedLoopStatus}
              </span>
            </div>
            <div className="px-4 py-2.5 text-xs text-slate-600 bg-slate-50">{result.reason}</div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">paired valid</dt>
                <dd className="font-mono text-slate-900">{String(result.pairedValid)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">execution status</dt>
                <dd className="font-mono text-slate-900">
                  {result.execution.executionStatus ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">preTrade uid</dt>
                <dd className="font-mono text-slate-900">
                  {yesNo(result.binding.preTradeUidMatch)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">requestHash</dt>
                <dd className="font-mono text-slate-900">
                  {yesNo(result.binding.requestHashMatch)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">destination gate (v3)</dt>
                <dd className="font-mono text-slate-900">
                  {yesNo(result.binding.destinationPreTradeUidMatch)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">uids hash (v3)</dt>
                <dd className="font-mono text-slate-900">
                  {yesNo(result.binding.preTradeUidsHashMatch)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">chain</dt>
                <dd className="font-mono text-slate-900">{yesNo(result.binding.chainMatch)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">asset</dt>
                <dd className="font-mono text-slate-900">{yesNo(result.binding.assetMatch)}</dd>
              </div>
            </dl>

            <div className="px-4 py-3 text-xs text-slate-500 bg-slate-50/60">
              pairedValid is true only when both receipts verify AND preTradeUid + requestHash bind
              the Execution Receipt to this pre-trade gate (plus, on v3, the destination gate and
              the signed uids hash). A FAITHFUL verdict still only means the fill matched the
              certified price within the bound — the v3 PRICE_ prefix states that scope in the name
              — not that the price was correct (verification ≠ endorsement).
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          <a className="hover:text-blue-600" href="/.well-known/oracle-keys.json" target="_blank">
            published attester keys
          </a>
        </div>
      </div>
    </div>
  );
}
