import { ShieldCheck, TriangleAlert, CircleDashed, CircleCheck } from 'lucide-react';

import { listEvidencePacks } from '@/lib/settlementEvidence/repository';
import type { SettlementEvidenceGrade } from '@/lib/settlementEvidence/types';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Bound the worst case so a slow Supabase read cannot hold a 2 GB Fluid
// instance for the 300s Hobby default.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Prediction-Market Settlement Evidence — Insight',
  description:
    'Signed, independent settlement evidence for prediction-market crypto price contracts: the declared outcome vs Insight’s multi-source verdict, with manipulation-risk grading and offline-verifiable EIP-712 attestations.',
  keywords: [
    'prediction market settlement evidence',
    'Polymarket manipulation forensics',
    'independent price verification',
    'signed oracle evidence',
  ],
};

const GRADE_STYLES: Record<
  SettlementEvidenceGrade,
  { label: string; badge: string; icon: typeof ShieldCheck }
> = {
  inconsistent: {
    label: 'Inconsistent',
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: TriangleAlert,
  },
  consistent: {
    label: 'Consistent',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CircleCheck,
  },
  insufficient_data: {
    label: 'Insufficient data',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: CircleDashed,
  },
};

function formatBps(value: number | null): string {
  if (value === null) return 'n/a';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} bps`;
}

function formatTime(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function EvidenceRow({ pack }: { pack: Awaited<ReturnType<typeof listEvidencePacks>>[number] }) {
  const p = pack.payload;
  const style = GRADE_STYLES[p.grade];
  const Icon = style.icon;
  return (
    <li className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${style.badge}`}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {style.label}
        </span>
        <span className="font-mono text-sm text-neutral-900">{p.marketSlug}</span>
        <span className="text-xs text-neutral-500">
          {p.asset} · {p.windowSeconds / 60}min · {formatTime(p.windowStartMs)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-neutral-500">Declared</span>{' '}
          <span className="font-medium text-neutral-900">{p.declaredOutcome ?? '—'}</span>
        </div>
        <div>
          <span className="text-neutral-500">Independent</span>{' '}
          <span className="font-medium text-neutral-900">{p.independentOutcome ?? '—'}</span>
        </div>
        <div>
          <span className="text-neutral-500">Δ window</span>{' '}
          <span className="font-medium text-neutral-900">{formatBps(p.priceChangeBps)}</span>
        </div>
        <div>
          <span className="text-neutral-500">Oracle dev</span>{' '}
          <span className="font-medium text-neutral-900">{formatBps(p.oracleDeviationBps)}</span>
        </div>
      </div>
      {p.gradeReasonCodes.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">{p.gradeReasonCodes.join(' · ')}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400 font-mono truncate">
        {pack.attestation ? `attested ${pack.attestation.attester}` : 'unsigned'} ·{' '}
        {pack.payloadHash}
      </p>
    </li>
  );
}

export default async function SettlementEvidencePage() {
  let packs: Awaited<ReturnType<typeof listEvidencePacks>> = [];
  let unavailable: string | null = null;
  try {
    packs = await listEvidencePacks(100);
  } catch {
    unavailable =
      'Settlement evidence is temporarily unavailable. Packs appear after watched prediction markets resolve.';
  }

  const byGrade = packs.reduce<Record<SettlementEvidenceGrade, number>>(
    (acc, pack) => {
      acc[pack.grade] += 1;
      return acc;
    },
    { consistent: 0, inconsistent: 0, insufficient_data: 0 }
  );
  const inconsistencies = packs.filter((pack) => pack.grade === 'inconsistent');

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900">
          Prediction-Market Settlement Evidence
        </h1>
        <p className="mt-3 text-neutral-600 leading-relaxed">
          For every watched prediction-market crypto price contract, Insight compares the market’s{' '}
          <strong>declared outcome</strong> against its own independent sources — settlement-window
          exchange candles and the platform’s multi-provider oracle consensus — and signs the
          result. Every pack is delivered as derived analytics and carries an offline-verifiable
          EIP-712 attestation. Raw venue data is never redistributed.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Insight supplies verifiable evidence; it does not arbitrate resolutions.
        </p>
      </header>

      {byGrade.inconsistent > 0 && (
        <section
          aria-label="Inconsistency alerts"
          className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <h2 className="flex items-center gap-2 text-red-800 font-semibold">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            {byGrade.inconsistent} inconsistent resolution{byGrade.inconsistent > 1 ? 's' : ''} in
            the recent set
          </h2>
          <p className="mt-1 text-sm text-red-700">
            A declared outcome differs from Insight’s independent verdict under full candle
            coverage. These windows warrant review by the resolution oracle or affected venues.
          </p>
        </section>
      )}

      <section aria-label="Grade summary" className="mb-8 grid grid-cols-3 gap-3">
        {(
          [
            ['consistent', byGrade.consistent],
            ['inconsistent', byGrade.inconsistent],
            ['insufficient_data', byGrade.insufficient_data],
          ] as Array<[SettlementEvidenceGrade, number]>
        ).map(([grade, count]) => {
          const style = GRADE_STYLES[grade];
          const Icon = style.icon;
          return (
            <div key={grade} className="border border-neutral-200 rounded-lg p-4 text-center">
              <Icon className="mx-auto h-4 w-4 text-neutral-500" aria-hidden />
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{count}</p>
              <p className={`text-xs font-semibold ${style.badge.split(' ')[1]}`}>{style.label}</p>
            </div>
          );
        })}
      </section>

      {inconsistencies.length > 0 && (
        <section aria-label="Inconsistent windows" className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">Inconsistent windows</h2>
          <ul className="space-y-3">
            {inconsistencies.map((pack) => (
              <EvidenceRow key={pack.payload.marketSlug} pack={pack} />
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Recent evidence packs">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">
          Recent evidence packs {packs.length > 0 && `(${packs.length})`}
        </h2>
        {unavailable ? (
          <p className="text-neutral-500 border border-neutral-200 rounded-lg p-4">{unavailable}</p>
        ) : packs.length === 0 ? (
          <p className="text-neutral-500 border border-neutral-200 rounded-lg p-4">
            No packs yet. Evidence appears after watched prediction markets resolve.
          </p>
        ) : (
          <ul className="space-y-3">
            {packs.map((pack) => (
              <EvidenceRow key={pack.payload.marketSlug} pack={pack} />
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-500">
        <p className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            Machine-readable access:{' '}
            <code className="font-mono text-xs">
              GET /api/v1/markets/settlement-evidence?slug=&lt;market-slug&gt;
            </code>{' '}
            or the <code className="font-mono text-xs">get_settlement_evidence</code> MCP tool.
            Packs verify offline via the published EIP-712 domain “Insight Settlement Evidence” v1.
          </span>
        </p>
      </footer>
    </main>
  );
}
