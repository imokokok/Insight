'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';

import { PreTradeSafetyDemo } from '@/app/ai/components/PreTradeSafetyDemo';
import type { OracleSafetyAttestation } from '@/lib/attestations/oracleSafetyAttestation';

import { AttestationVerifier } from './components/AttestationVerifier';

/**
 * Pre-Trade Oracle Safety — the operational home for the oracle immune-system
 * check (decoupled from the /ai agent-integration hub) AND the public outlet
 * for verifying the EIP-712 attestations the check issues.
 *
 * Two halves:
 *  1. Run a check: reuse the same PreTradeSafetyDemo component as /ai, but
 *     surfaced as a first-class tool. The result now carries anomalyScore,
 *     dual-horizon ML scores and the issued attestation.
 *  2. Verify an attestation: anyone (protocol, explorer, user, another agent)
 *     pastes an attestation to confirm the signature + review the signed
 *     evidence. A freshly-run check can fill this one-click.
 *
 * Cross-links to /ai (the agent integration hub) sit at top and bottom so the
 * two surfaces stay connected without duplicating each other's purpose.
 */
export default function PreTradeSafetyContent() {
  const [lastAttestation, setLastAttestation] = useState<OracleSafetyAttestation | null>(null);
  const [toVerify, setToVerify] = useState<OracleSafetyAttestation | null>(null);

  function verifyLatest() {
    if (!lastAttestation) return;
    setToVerify(lastAttestation);
    requestAnimationFrame(() => {
      document.getElementById('verifier')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            Oracle Immune System
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Pre-Trade Oracle Safety
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Run a cross-oracle safety check before any on-chain trade — consensus, deviation,
            manipulation risk, anomaly detection and a PASS/CAUTION/DANGER/BLOCK verdict. Each check
            issues a signed EIP-712 attestation anyone can verify below.
          </p>
          <Link
            href="/ai"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <Bot className="w-4 h-4" />
            AI Agent integration (MCP / REST)
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Section 1 — Run a check */}
        <section className="mt-12 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Run a pre-trade check</h2>
            {lastAttestation && (
              <button
                onClick={verifyLatest}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify this attestation
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 sm:p-6">
            <PreTradeSafetyDemo onResult={(r) => setLastAttestation(r.attestation)} />
          </div>
        </section>

        {/* Section 2 — Verify an attestation */}
        <section id="verifier" className="mt-12 space-y-4 scroll-mt-8">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Verify an attestation</h2>
            <p className="text-sm text-slate-500">
              Paste an attestation relayed by an agent or pasted from a transaction to confirm its
              signature and review the signed verdict + evidence.
            </p>
          </div>
          <AttestationVerifier externalAttestation={toVerify} onConsume={() => setToVerify(null)} />
        </section>

        {/* Bottom cross-link to /ai */}
        <div className="mt-12 pt-8 border-t border-slate-100">
          <Link
            href="/ai"
            className="group inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <Bot className="w-4 h-4" />
            Building an AI agent? Connect the MCP server and explore 32 tools on the
            <span className="font-medium text-slate-900 group-hover:text-blue-600">
              AI Agents
            </span>{' '}
            page.
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
