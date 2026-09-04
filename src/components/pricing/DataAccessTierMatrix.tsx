'use client';

import { Check, Coins, Globe, Lock, Zap } from 'lucide-react';

/**
 * Data Access Matrix
 *
 * In the Codex-style model there are NO feature tiers and NO feature gating:
 * any paying user (subscription or topped-up credit wallet) can call every
 * endpoint and MCP tool. The only gate is the credit wallet — a call is
 * allowed iff the balance covers its metering-class cost.
 *
 * This component therefore documents two access surfaces:
 *   - Public website (free, no key): browse prices, protocols, rankings, reports.
 *   - API / MCP (paid, credit-metered): everything, priced per call (C1–C4).
 *
 * The authoritative per-call pricing lives in src/lib/billing/metering.ts;
 * plan definitions (Developer/Team/Enterprise) live in src/lib/billing/plans.ts.
 */

// --- Metering classes surfaced as the pricing ladder -------------------------

const METERING_CLASSES = [
  {
    cls: 'C1',
    cost: '0.5 credits',
    desc: 'Foundational data — prices, listings, daily reports',
  },
  {
    cls: 'C2',
    cost: '2 credits',
    desc: 'Deep analysis — deviation, correlation, risk, history',
  },
  {
    cls: 'C3',
    cost: '5 credits',
    desc: 'Agent gates — pre-trade safety, oracle-watch',
  },
  {
    cls: 'C4',
    cost: '10 credits',
    desc: 'Proofs & receipts — attested execution receipts',
  },
];

// --- Access surface data -----------------------------------------------------

interface AccessRow {
  label: string;
  web: boolean; // free public website (no key)
  api: boolean; // API / MCP (paid, credit-metered)
  hint?: string;
}

const accessRows: AccessRow[] = [
  {
    label: 'Prices, feed health & provider listings',
    web: true,
    api: true,
    hint: 'The website embeds these; the API serves them machine-readable.',
  },
  {
    label: 'Oracle reliability rankings & reputation',
    web: true,
    api: true,
    hint: 'Full 90-day trend on every paying key — no per-plan trend caps.',
  },
  {
    label: 'Daily reliability reports',
    web: true,
    api: true,
  },
  {
    label: 'Deviation, correlation & divergence signals',
    web: false,
    api: true,
  },
  {
    label: 'Historical snapshots (6-month archive, 15-min grain)',
    web: false,
    api: true,
  },
  {
    label: 'Protocol risk parameters & liquidation stress tests',
    web: false,
    api: true,
  },
  {
    label: 'Stablecoin depeg & wrapped-asset peg tracking',
    web: false,
    api: true,
  },
  {
    label: 'Anomaly detection (30-day window)',
    web: false,
    api: true,
  },
  {
    label: 'Oracle exposure analysis, cross-chain spreads, incidents',
    web: false,
    api: true,
  },
  {
    label: 'Pre-trade safety checks, oracle-watch & attested receipts',
    web: false,
    api: true,
  },
  {
    label: 'CSV / Excel export & batch query queue',
    web: false,
    api: true,
  },
];

// --- Cell renderer -----------------------------------------------------------

function AccessCell({ value }: { value: boolean }) {
  if (value) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="w-4 h-4 text-success-500" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center">
      <Lock className="w-3.5 h-3.5 text-slate-300" />
    </span>
  );
}

// --- Component ---------------------------------------------------------------

export function DataAccessTierMatrix({ className = '' }: { className?: string }) {
  return (
    <section className={`bg-white/35 py-16 sm:py-20 ${className}`}>
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Section header */}
        <div className="mb-12 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
          <p className="editorial-index">02 — Inspect access</p>
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              One platform, no feature gates
            </h2>
            <p className="max-w-2xl text-lg text-slate-600">
              Browsing the website is free. Calling the API is credit-metered — every endpoint and
              MCP tool is open to any paying user, priced per call by data class.
            </p>
          </div>
        </div>

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden overflow-x-auto border-y border-slate-900/15 bg-white/50 md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-900 w-2/5">
                  Data category
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    Public web
                  </span>
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">
                    free, no key
                  </span>
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-blue-700">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    API &amp; MCP
                  </span>
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">
                    paid, credit-metered
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {accessRows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <span className="text-sm text-slate-700">{row.label}</span>
                      {row.hint && <p className="text-xs text-slate-400 mt-0.5">{row.hint}</p>}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <AccessCell value={row.web} />
                  </td>
                  <td className="text-center py-3 px-4">
                    <AccessCell value={row.api} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout (hidden on desktop) */}
        <div className="md:hidden space-y-4">
          {accessRows.map((row) => (
            <div
              key={row.label}
              className="overflow-hidden border-y border-slate-900/15 bg-white/50"
            >
              <div className="p-4 bg-white">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-sm text-slate-700 flex-1">{row.label}</span>
                </div>
                {row.hint && <p className="text-xs text-slate-400 mb-2">{row.hint}</p>}
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">Web:</span>
                    <AccessCell value={row.web} />
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-slate-400">API:</span>
                    <AccessCell value={row.api} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metering classes legend */}
        <div className="mt-12 max-w-3xl overflow-hidden border-y border-slate-900/15 bg-white/50">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Coins className="w-4 h-4 text-amber-500" />
              Per-call credit pricing (API / MCP)
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {METERING_CLASSES.map((mc) => (
              <div key={mc.cls} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                    {mc.cls}
                  </span>
                  <span className="text-sm text-slate-700">{mc.desc}</span>
                </div>
                <span className="text-sm font-medium text-slate-500">{mc.cost}</span>
              </div>
            ))}
          </div>
          <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
            Credits come from your wallet — a monthly allowance with Developer/Team, or prepaid
            top-up packs. When the balance can&apos;t cover the next call, it returns HTTP 402 with
            a top-up link. Enterprise is unlimited.
          </p>
        </div>

        {/* Footnote */}
        <p className="text-xs text-slate-400 text-center mt-8 max-w-2xl mx-auto">
          New users get 30 free trial credits after email verification. API access starts at a $49
          Developer subscription (10,000 credits/mo) or a $39 prepaid Starter pack. The website
          remains free to browse.
        </p>
      </div>
    </section>
  );
}
